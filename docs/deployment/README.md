# SkillBridge Deployment Architecture

SkillBridge is deployed on Vercel Serverless Edge network connected to Firebase Cloud Firestore.

---

## 1. Hosting Architecture
- **Framework**: Next.js 16 (App Router with Turbopack)
- **Host**: Vercel (Production URL: `https://skillbridge-one-delta.vercel.app`)
- **Serverless Runtime**: AWS Lambda Node.js 24.x
- **Database**: Google Cloud Firestore (`skillbridge-4101d`)

---

## 2. Environment Variables Required

| Variable | Description | Exposure |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key | Client |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | Client |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `skillbridge-4101d` | Client |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Cloud Storage bucket | Client |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID | Client |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID | Client |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Full service account JSON | Server-only |
| `FIREBASE_PROJECT_ID` | Firebase Admin Project ID | Server-only |
| `CRON_SECRET` | Secret token for CRON execution | Server-only |
| `STRIPE_SECRET_KEY` | Stripe billing private key | Server-only |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Server-only |

---

## 3. Production Deployment Verification
After any deployment, verify the live deployment using:
```bash
# Health check endpoint returns deployed commit SHA & version
curl https://skillbridge-one-delta.vercel.app/api/health
```
