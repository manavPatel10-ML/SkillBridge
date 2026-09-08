import { NextRequest, NextResponse } from 'next/server';
import { BillingService, BillingWebhookEvent } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('stripe-signature') || req.headers.get('x-webhook-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // 1. Signature Verification
    if (webhookSecret) {
      if (!signatureHeader) {
        return NextResponse.json({ error: 'Missing webhook signature header' }, { status: 400 });
      }

      const isValid = BillingService.verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    } else {
      // In BETA_MANAGED mode without secrets, reject external unauthorized webhooks
      const adminSecret = req.headers.get('x-admin-billing-key');
      if (adminSecret !== process.env.ADMIN_BILLING_KEY && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ 
          error: 'Billing webhooks are unconfigured or restricted in Beta Managed mode.' 
        }, { status: 403 });
      }
    }

    // 2. Parse payload
    let event: BillingWebhookEvent;
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // 3. Process Event
    const result = await BillingService.processWebhookEvent(event);

    return NextResponse.json({
      received: true,
      processed: result.processed,
      reason: result.reason
    });

  } catch (error: any) {
    console.error('Billing Webhook Route Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
