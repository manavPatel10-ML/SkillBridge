import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export type SubscriptionPlan = 'free' | 'pilot_starter' | 'growth_talent' | 'enterprise_hiring';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'inactive';

export interface BillingWebhookEvent {
  id: string;
  type: 
    | 'customer.subscription.created'
    | 'customer.subscription.updated'
    | 'customer.subscription.deleted'
    | 'invoice.payment_succeeded'
    | 'invoice.payment_failed';
  created: number;
  data: {
    companyId?: string;
    customerId?: string;
    subscriptionId?: string;
    status?: SubscriptionStatus;
    plan?: SubscriptionPlan;
    currentPeriodEnd?: number | string;
    amountPaid?: number;
    currency?: string;
    attemptCount?: number;
  };
}

export interface CompanyAccessResult {
  canAccessTalent: boolean;
  reason: string;
  status: SubscriptionStatus;
  tier: SubscriptionPlan;
  currentPeriodEnd?: string;
  isBetaManaged: boolean;
}

export class BillingService {

  /**
   * Verifies whether live external payment processing is active.
   * If secrets are not present, SkillBridge safely defaults to BETA_MANAGED mode.
   */
  public static isLiveBillingActive(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  }

  /**
   * Cryptographically verifies incoming webhook signature using HMAC-SHA256.
   * Format: t=timestamp,v1=signature
   */
  public static verifyWebhookSignature(payload: string, header: string, secret: string): boolean {
    if (!payload || !header || !secret) return false;

    try {
      const parts = header.split(',');
      const timestampPart = parts.find(p => p.startsWith('t='));
      const signaturePart = parts.find(p => p.startsWith('v1='));

      if (!timestampPart || !signaturePart) return false;

      const timestamp = timestampPart.split('=')[1];
      const signature = signaturePart.split('=')[1];

      // Prevent replay attacks (tolerance: 5 minutes)
      const now = Math.floor(Date.now() / 1000);
      const eventTime = parseInt(timestamp, 10);
      if (isNaN(eventTime) || Math.abs(now - eventTime) > 300) {
        return false;
      }

      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf-8'),
        Buffer.from(expectedSignature, 'utf-8')
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Authoritative server-side company access validation with expiration enforcement.
   */
  public static async checkCompanyAccess(companyId: string): Promise<CompanyAccessResult> {
    if (!companyId) {
      return {
        canAccessTalent: false,
        reason: 'INVALID_COMPANY_ID',
        status: 'inactive',
        tier: 'free',
        isBetaManaged: !this.isLiveBillingActive()
      };
    }

    const companyDoc = await adminDb.collection('companyProfiles').doc(companyId).get();
    if (!companyDoc.exists) {
      return {
        canAccessTalent: false,
        reason: 'COMPANY_NOT_FOUND',
        status: 'inactive',
        tier: 'free',
        isBetaManaged: !this.isLiveBillingActive()
      };
    }

    const data = companyDoc.data()!;
    let status: SubscriptionStatus = data.subscriptionStatus || 'inactive';
    const tier: SubscriptionPlan = data.subscriptionTier || (status === 'active' ? 'pilot_starter' : 'free');
    const currentPeriodEnd: string | undefined = data.currentPeriodEnd;

    // Check expiration if a period end timestamp exists
    if (currentPeriodEnd && (status === 'active' || status === 'trialing')) {
      const expiryMs = new Date(currentPeriodEnd).getTime();
      if (!isNaN(expiryMs) && expiryMs < Date.now()) {
        status = 'inactive';
        // Synchronize expired status in Firestore
        await companyDoc.ref.update({
          subscriptionStatus: 'inactive',
          expiredAt: FieldValue.serverTimestamp()
        });
      }
    }

    const canAccess = status === 'active' || status === 'trialing';

    return {
      canAccessTalent: canAccess,
      reason: canAccess ? 'AUTHORIZED_SUBSCRIPTION' : `SUBSCRIPTION_${status.toUpperCase()}`,
      status,
      tier,
      currentPeriodEnd,
      isBetaManaged: !this.isLiveBillingActive()
    };
  }

  /**
   * Idempotently processes and synchronizes subscription webhook events.
   */
  public static async processWebhookEvent(event: BillingWebhookEvent): Promise<{ processed: boolean; reason?: string }> {
    if (!event || !event.id || !event.type) {
      return { processed: false, reason: 'INVALID_EVENT_PAYLOAD' };
    }

    // 1. Idempotency check: Reject duplicate webhooks
    const eventRef = adminDb.collection('webhookEvents').doc(event.id);
    const existingSnap = await eventRef.get();
    if (existingSnap.exists) {
      return { processed: false, reason: 'DUPLICATE_EVENT' };
    }

    // 2. Identify target company
    let companyId = event.data.companyId;
    if (!companyId && event.data.customerId) {
      const snap = await adminDb.collection('companyProfiles')
        .where('stripeCustomerId', '==', event.data.customerId)
        .limit(1)
        .get();
      if (!snap.empty) {
        companyId = snap.docs[0].id;
      }
    }

    if (!companyId) {
      await eventRef.set({
        eventId: event.id,
        eventType: event.type,
        status: 'unmatched_company',
        receivedAt: FieldValue.serverTimestamp()
      });
      return { processed: false, reason: 'COMPANY_NOT_FOUND' };
    }

    const companyRef = adminDb.collection('companyProfiles').doc(companyId);

    // 3. State synchronization by event type
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'invoice.payment_succeeded': {
        const newStatus: SubscriptionStatus = event.data.status || 'active';
        const updateData: any = {
          subscriptionStatus: newStatus,
          subscriptionTier: event.data.plan || 'pilot_starter',
          updatedAt: FieldValue.serverTimestamp()
        };
        if (event.data.currentPeriodEnd) {
          updateData.currentPeriodEnd = typeof event.data.currentPeriodEnd === 'number'
            ? new Date(event.data.currentPeriodEnd * 1000).toISOString()
            : event.data.currentPeriodEnd;
        }
        if (event.data.subscriptionId) {
          updateData.stripeSubscriptionId = event.data.subscriptionId;
        }
        if (event.data.customerId) {
          updateData.stripeCustomerId = event.data.customerId;
        }
        await companyRef.update(updateData);
        break;
      }

      case 'invoice.payment_failed': {
        await companyRef.update({
          subscriptionStatus: 'past_due',
          lastPaymentFailedAt: FieldValue.serverTimestamp()
        });
        break;
      }

      case 'customer.subscription.deleted': {
        await companyRef.update({
          subscriptionStatus: 'canceled',
          canceledAt: FieldValue.serverTimestamp()
        });
        break;
      }
    }

    // 4. Record event as successfully processed for idempotency
    await eventRef.set({
      eventId: event.id,
      eventType: event.type,
      companyId,
      status: 'processed',
      receivedAt: FieldValue.serverTimestamp()
    });

    return { processed: true };
  }
}
