# PHASE 50B — Production Authentication & Password Reset Security Hardening Report

**Date:** 2026-09-08  
**Scope:** SkillBridge production application — authentication, API authorization, security headers, and error handling  
**Result:** All critical and high-severity vulnerabilities remediated. Build passing.

---

## Executive Summary

A comprehensive security audit of the SkillBridge production codebase was performed. The foundational authentication architecture (Firebase ID token verification via Admin SDK on every API route) was found to be sound. Three critical and five high/medium vulnerabilities were identified and remediated. Firestore security rules required no changes.

---

## Vulnerabilities Remediated

### 🔴 Critical (All Fixed)

#### C1 — Unauthenticated ML Telemetry Quality Report Endpoint
- **File:** `src/app/api/ml-telemetry/quality-report/route.ts`
- **Finding:** The `/api/ml-telemetry/quality-report` GET endpoint had **zero authentication**. Any anonymous caller (no token required) could read ML telemetry quality data, including student ID classification, duplicate detection, and data integrity reports.
- **Fix:** Added Firebase ID token verification + Firestore admin role check via the new shared `verifyBearerToken()` + `requireAdmin()` helper. Route now returns `401` for unauthenticated requests and `403` for non-admin authenticated requests.

#### C2 — CRON_SECRET Optional in Production (Open Endpoint)
- **File:** `src/app/api/cron/abandonment/route.ts`
- **Finding:** The cron abandonment cleanup endpoint was marked with `// Optional secret verification if CRON_SECRET is configured`. If the `CRON_SECRET` environment variable is not set (which is a valid deployment state), the state-mutating endpoint accepted **any caller with no authentication**.
- **Fix:** Implemented `verifyCronSecret()` in `src/lib/api-auth.ts`. In **production** (`NODE_ENV === 'production'`): if `CRON_SECRET` is absent, the endpoint returns `503 Service Unavailable` rather than running unauthenticated. In **development**: absence of the secret is permitted for local convenience. If the secret is set (in any environment), it is enforced strictly.

#### C3 — Admin Role Check Was a No-Op (ML Dataset Export)
- **File:** `src/app/api/ml-telemetry/export/route.ts`
- **Finding:** The admin role check for the ML telemetry CSV export endpoint was a **commented-out no-op**:
  ```typescript
  // Just as an extra security check, though for real prod we should enforce this strictly.
  if (decodedToken.role !== 'admin') {
    // (empty block — no enforcement)
  }
  ```
  Any authenticated user (student or company) could download the full ML training dataset containing all student IDs, skill scores, and recommendation histories.
- **Fix:** Replaced with a hard Firestore-backed admin role check via `requireAdmin(uid)`. Students and companies now receive `403 Forbidden`.

---

### 🟠 High (All Fixed)

#### H1 — Raw `error.message` Returned to API Clients
- **Files:** 10 API route handlers
- **Finding:** All API route catch blocks returned `error.message` directly in the HTTP response body. Internal error messages can expose Firestore collection names, internal file paths, Node.js module paths, and query structure details.
- **Fix:** All 500-level catch blocks now return the generic string `"Internal server error"`. Error details are still logged server-side via `console.error`. A `sanitizeApiError()` utility is provided in `api-auth.ts` for structured error handling.
- **Routes patched:**
  - `api/recommendations/generate`
  - `api/ml-telemetry/record`
  - `api/ml-telemetry/outcome`
  - `api/ml-telemetry/quality-report`
  - `api/ml-telemetry/export`
  - `api/cron/abandonment`
  - `api/beta/feedback` (POST + GET)
  - `api/admin/beta-health`
  - `api/admin/ml-readiness`
  - `api/assessments/[id]/questions`
  - `api/assessments/submit`
  - `api/webhooks/billing`

#### H2/H3 — Missing Critical Security Headers
- **Files:** `next.config.ts`, `vercel.json`
- **Finding:** The application was missing `Strict-Transport-Security`, `Content-Security-Policy`, and `Permissions-Policy` headers. The headers in `vercel.json` were incomplete and only applied to the CDN layer (not to server-rendered responses or API routes).
- **Fix:** Added a comprehensive `headers()` function to `next.config.ts` that applies to **all routes** including SSR pages and API routes:

  | Header | Value |
  |--------|-------|
  | `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
  | `Content-Security-Policy` | Structured policy allowing Firebase/Google APIs |
  | `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` |
  | `X-Content-Type-Options` | `nosniff` |
  | `X-Frame-Options` | `DENY` |
  | `Referrer-Policy` | `strict-origin-when-cross-origin` |
  | `X-XSS-Protection` | `0` (disabled — modern browsers use CSP; legacy value creates vulnerabilities) |

  `vercel.json` was simplified to remove redundant/incomplete header definitions.

#### H4/H5 — Password Minimum Below NIST Recommendations
- **Files:** `src/app/auth/reset-password/page.tsx`, `src/app/auth/register/page.tsx`
- **Finding:** Password minimum was 6 characters (Firebase SDK minimum). NIST SP 800-63B recommends 8+ characters minimum for user-created passwords.
- **Fix:** Raised client-side validation to 8 characters in both registration and password reset confirmation. The `minLength` HTML attribute and validation logic updated accordingly.

---

### 🟡 Medium (All Fixed)

#### M1 — Firebase Admin Silent Fallback on Missing Credentials
- **File:** `src/lib/firebase-admin.ts`
- **Finding:** If neither `FIREBASE_SERVICE_ACCOUNT_KEY` nor any project identifier was set, `initializeApp()` was called with no arguments and would silently fail or use no credentials. This could allow a misconfigured production deployment to start without raising an error.
- **Fix:** Added explicit environment checks. In production without credentials: throws a descriptive `Error` at module initialization time. In development without credentials: permits `initializeApp()` for emulator compatibility. Provides clear error messages for debugging.

#### M2 — No Client-Side Cooldown on Forgot-Password Submission
- **File:** `src/app/auth/forgot-password/page.tsx`
- **Finding:** After submitting a reset request, the "Send another reset link" button immediately reset all state, allowing rapid repeated submissions. Firebase's server-side rate limiting is the authoritative control, but a UI-level cooldown provides defense-in-depth.
- **Fix:** Added a 60-second client-side countdown timer after each submission. The "Send another reset link" button is disabled and shows the remaining cooldown time. The cooldown persists even if the user clicks the button (preventing reset circumvention). Firebase rate limiting remains the primary control.

#### M4 — Login Page Exposed Raw Firebase Error Messages
- **File:** `src/app/auth/login/page.tsx`
- **Finding:** The catch block fallback was `setError(err.message || "Failed to log in")`. Unexpected Firebase SDK errors (network issues, malformed responses, etc.) could expose raw SDK error messages to users.
- **Fix:** Replaced with `"An unexpected error occurred. Please try again."` for all unrecognized error codes.

---

## Files Not Changed (Correct As-Is)

| File | Reason |
|------|--------|
| `firestore.rules` | Comprehensive and correct. All sensitive collections have appropriate access controls. `mlTelemetry` and `betaFeedback` are server-write-only. `skillScores` write rules prevent forgery. |
| `src/contexts/AuthContext.tsx` | Correct implementation. Role fetched from Firestore on auth state change. |
| `src/components/ProtectedRoute.tsx` | Correct client-side guard. Server-side enforcement is done via API token verification. |
| `src/lib/firebase.ts` | Correct client SDK initialization with emulator support. |
| ML architecture files | Explicitly excluded per user constraints. |

---

## New Files Created

| File | Purpose |
|------|---------|
| `src/lib/api-auth.ts` | Shared auth utility: `verifyBearerToken()`, `requireAdmin()`, `sanitizeApiError()`, `verifyCronSecret()` |

---

## Security Architecture: Invariants Maintained

1. **Identity is always derived from the verified Firebase ID token** — never from `request.body.uid` or any user-supplied claim.
2. **Admin role is verified via Firestore** — consistent with the rest of the codebase and Firestore rules.
3. **Firebase Authentication remains the sole auth provider** — no custom tokens, no custom reset flows.
4. **Firebase Admin credentials are server-only** — `FIREBASE_SERVICE_ACCOUNT_KEY` is never exposed with a `NEXT_PUBLIC_` prefix.
5. **Account enumeration protection** — forgot-password flow always responds the same way regardless of whether the email exists.
6. **Deterministic AdaptiveEngine remains SOLE PRODUCTION AUTHORITY** — no ML architecture changes made.

---

## Residual Risk

| Risk | Level | Note |
|------|-------|------|
| Firebase client API key is public | Accepted | This is by design. Firebase client keys are safe to expose; they identify the project, not grant admin access. Firestore rules are the security boundary. |
| Client-side password minimum (8 chars) can be bypassed via direct Firebase API calls | Accepted | Firebase's own minimum is 6. The 8-char client validation is UX hardening only. No backend enforcement is possible without a custom password endpoint (which would violate the no-custom-reset-system requirement). |
| CRON_SECRET must be set in Vercel environment for production cron to work | Action required | Ensure `CRON_SECRET` is set in Vercel Dashboard → Settings → Environment Variables. Without it, the cron endpoint returns 503. |

---

## Deployment

- All changes committed and pushed to `main` branch.
- Vercel auto-deploy triggered from `main`.
- Production URL: `https://skillbridge-one-delta.vercel.app`
