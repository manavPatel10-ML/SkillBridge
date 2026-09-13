# SkillBridge API Architecture

SkillBridge utilizes Next.js Serverless Route Handlers deployed under `src/app/api/` that delegate business logic to `@backend/services/*` and `@backend/middleware/*`.

---

## Endpoint Catalog

| Route | Method | Auth Required | Purpose |
|---|:---:|:---:|---|
| `/api/health` | GET | Public | Verifies deployment commit SHA, environment, and safe project ID |
| `/api/assessments/[id]/questions` | GET | Student | Fetches randomized questions for active theory assessment |
| `/api/assessments/submit` | POST | Student | Evaluates submitted theory answers and updates skill scores |
| `/api/execute` | POST | Student | Executes coding practice solutions via Piston sandbox |
| `/api/recommendations/generate` | POST | Student | Deterministic adaptive recommendations via `AdaptiveEngine` |
| `/api/cron/abandonment` | POST | Cron Secret | Cleans up abandoned sessions and recommendations |
| `/api/ml-telemetry/record` | POST | Authenticated | Records ML telemetry for shadow model validation |
| `/api/ml-telemetry/export` | GET | Admin | Exports telemetry dataset for offline ML evaluation |
| `/api/beta/feedback` | POST | Authenticated | Captures user feedback across 13 categories |
| `/api/webhooks/billing` | POST | Stripe Signature | Processes subscription activations and cancellations |
| `/api/admin/seed-catalog` | POST | Admin | Deterministic provisioning of canonical catalog |
| `/api/admin/beta-health` | GET | Admin | Audits system readiness and collection statistics |

---

## Authentication Standard
All authenticated endpoints require an `Authorization: Bearer <FIREBASE_ID_TOKEN>` header verified server-side by `verifyBearerToken()` in `@backend/middleware/api-auth`.
