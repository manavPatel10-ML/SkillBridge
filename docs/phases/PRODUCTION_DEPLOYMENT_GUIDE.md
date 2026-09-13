# SKILLBRIDGE PRODUCTION DEPLOYMENT GUIDE

**Repository:** `https://github.com/manavPatel10-ML/SkillBridge.git`  
**Production URL:** `https://skillbridge-one-delta.vercel.app`  
**Target Firestore Project:** `skillbridge-4101d`  
**Vercel Project ID:** `prj_cHYf8dUeO2gpThmw7Lo3kOcrH9UU`  
**Document Version:** 1.0.0 (September 12, 2026)

---

## 1. The Canonical Delivery Workflow

"Works on localhost" is never sufficient. A feature, fix, or content update is considered **done** only when it is validated locally, pushed to GitHub `main`, deployed to Vercel production, verified against production Firestore, and live on the public URL.

```
Developer Workspace (Localhost)
       │
       ▼
[1] Local Validation
    ├── npm run verify:production
    ├── npx tsc --noEmit
    └── npm run build
       │
       ▼
[2] Git Commit & Push
    ├── git commit -m "feat/fix: ..."
    └── git push origin main
       │
       ▼
[3] Vercel Production Build
    └── Auto-triggered on main branch push
       │
       ▼
[4] Production Verification
    ├── curl https://skillbridge-one-delta.vercel.app/api/health
    └── npm run verify:production
       │
       ▼
[5] Firebase Content Provisioning (If Catalog Changed)
    └── npm run deploy:content
```

---

## 2. Step-by-Step Delivery Process

### Step 1: Make Code or Content Changes
Edit application files under `src/` or catalog definitions under `src/lib/content-catalog/`.

### Step 2: Run Local Validation Suite
Always run the parity and regression tests before committing:
```bash
npm run verify:production
npx tsx scripts/test_core1_public_profile.ts
npx tsx scripts/test_core2_company_hiring_loop.ts
npx tsx scripts/test_core3_production_beta_validation.ts
```

### Step 3: Run Strict TypeScript Verification
Ensure zero type errors exist across all 52 static and dynamic routes:
```bash
npx tsc --noEmit
```

### Step 4: Run Production Next.js Build
Simulate the exact production bundle compilation that Vercel executes:
```bash
npm run build
```

### Step 5: Commit to Git
Write a conventional commit describing the change:
```bash
git add <modified-files>
git commit -m "fix(area): descriptive summary"
```

### Step 6: Push to GitHub `main`
```bash
git push origin main
```

### Step 7: Automatic Vercel Production Deployment
Vercel detects the push to `main` and initiates a production build and deployment.
*(To link automatic deployment if unlinked, see Section 4 below).*

### Step 8: Verify Deployed Commit via `/api/health`
Query the lightweight public health endpoint to confirm the deployed Git SHA matches your local commit:
```bash
curl -s https://skillbridge-one-delta.vercel.app/api/health | jq
```
Expected response:
```json
{
  "status": "ok",
  "environment": "production",
  "appEnv": "production",
  "version": "0.1.0",
  "gitCommitSha": "8026f2a...",
  "gitCommitRef": "main",
  "firebaseProjectId": "skillbridge-4101d",
  "contentCatalog": {
    "roles": 3,
    "skills": 10,
    "learningTopics": 16,
    "practiceProblems": 128,
    "assessments": 16,
    "practicalTasks": 12
  }
}
```

### Step 9: Verify Public Production URL
Navigate to `https://skillbridge-one-delta.vercel.app` in an incognito browser window as a student to confirm the changes are visible and functional.

### Step 10: Provision Database Content (If Curriculum Changed)
If the change included new roles, skills, topics, problems, assessments, or practical tasks, execute the idempotent content seeder:
```bash
npm run deploy:content
```

---

## 3. Separation of Concerns: Code vs Data vs Security Rules

Pushing code to GitHub and Vercel **only** updates frontend assets and serverless API handlers. It does **not** update Firestore documents or security rules.

| Artifact Type | Delivery Channel | How to Deploy | Verification Command |
|---|---|---|---|
| **Next.js Code / Pages / API routes** | Vercel Serverless & CDN | Push to GitHub `main` | `curl https://skillbridge-one-delta.vercel.app/api/health` |
| **Canonical Content Catalog** | Google Cloud Firestore | `npm run deploy:content` | `npm run verify:production` |
| **Database Security Rules** | Firebase Cloud Firestore | `npx firebase deploy --only firestore:rules` | Security rule test suites |
| **Environment Variables** | Vercel Platform Secrets | Vercel Project Dashboard | Inspect `/api/health` or serverless logs |

---

## 4. Connecting Automatic GitHub → Vercel Deployments

If pushing to `main` does not automatically deploy, the Vercel project was originally created via manual CLI and lacks the GitHub repository webhook link.

### One-Time Link in Vercel Dashboard:
1. Open the [Vercel Dashboard](https://vercel.com).
2. Select the **`skillbridge`** project (`prj_cHYf8dUeO2gpThmw7Lo3kOcrH9UU`).
3. Navigate to **Settings** → **Git**.
4. Under **Connected Git Repository**, click **Connect**.
5. Select repository: **`manavPatel10-ML/SkillBridge`**.
6. Set **Production Branch** to **`main`**.
7. Ensure **Deploy Hooks** or automatic deployments on push are enabled.

Once linked, every `git push origin main` will trigger a production deployment automatically.

### Manual Fallback Deployment (CLI):
If you need to deploy immediately from your terminal without waiting for the dashboard:
```bash
npx vercel --prod --yes
```

---

## 5. Safe Canonical Content Provisioning Contract

When updating product curriculum, use `npm run deploy:content` (or `scripts/seed_production_catalog.ts`):

- **Deterministic & Idempotent:** Document IDs are predictable (e.g. `roles/frontend-developer`, `practiceProblems/prob-fe-001`). Rerunning the command never creates duplicate documents.
- **Batch Safe:** Operations are committed in batches of $\le 400$ writes to prevent Firestore batch limit violations.
- **Merge-Safe:** Uses `{ merge: true }` so existing metadata is preserved.
- **ZERO Synthetic / Fake Data:**
  - ZERO fake students or user profiles created.
  - ZERO fake companies created.
  - ZERO fake attempts or submissions recorded.
  - ZERO fake skill scores generated.
  - ZERO fake ML telemetry logged.
- Only legitimate canonical static learning content is provisioned.

---

## 6. How to Diagnose Localhost vs Production Discrepancies

If a feature works locally but appears missing or broken on `https://skillbridge-one-delta.vercel.app`:

1. **Check Deployment Age & Git Commit:**
   ```bash
   curl -I https://skillbridge-one-delta.vercel.app/api/health
   ```
   Inspect the `age` header and `gitCommitSha`. If the age is days old or the SHA does not match `git rev-parse HEAD`, the Vercel deployment is stale.
2. **Check Content Parity:**
   ```bash
   npm run verify:production
   ```
   If count mismatches exist, run `npm run deploy:content`.
3. **Check Auth State Timing:**
   Ensure client pages (`"use client"`) wait for `user` from `useAuth()` before executing Firestore queries (`where("active", "==", true)`). Unauthenticated calls fail with `permission-denied`.
4. **Check Browser Console & Network Tab:**
   Check for 403/404 HTTP errors, CORS rejections, or Firestore rule violations.
