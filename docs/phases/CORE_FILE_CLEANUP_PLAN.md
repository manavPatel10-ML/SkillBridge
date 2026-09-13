# CORE FILE CLEANUP PLAN

**Date:** September 11, 2026  
**Project:** SkillBridge  
**Repository Audit Scope:** Full Repository (`src/`, `ml/`, `scripts/`, `docs/`, root)

---

## File Classification Scheme

- **Class A — CORE PRODUCTION (MUST KEEP):** Directly powers user authentication, student learning/practice/assessments/practical tasks, company talent search/hiring, and verified profile delivery.
- **Class B — SUPPORTING PRODUCTION (KEEP):** Supporting services, billing, telemetry collection, UI utilities, and shared configurations.
- **Class C — DEVELOPMENT TOOL (KEEP ONLY IF NEEDED):** Content seeders, admin health monitors, automated validation suites, verification runners.
- **Class D — EXPERIMENTAL ML (KEEP, ISOLATED):** Offline Python models, dataset builders, feature registries, and shadow evaluation harness. Strictly isolated from production authority.
- **Class E — HISTORICAL REPORT / DOCUMENTATION (ARCHIVE):** Phase documentation and historical reports moved to `docs/archive/`.
- **Class F — DUPLICATE / OBSOLETE (DELETE):** Superseded implementations, obsolete prototypes, and redundant code.
- **Class G — TEMPORARY DEBUG / SCRATCH (DELETE):** One-off test runs, ad-hoc scripts, and temporary logs.
- **Class H — UNKNOWN (PRESERVE):** Files whose exact production role is uncertain.

---

## Detailed File Classification & Action Table

| File / Path | Class | Action | Dependency Evidence | Technical Rationale |
|---|---|---|---|---|
| `src/app/auth/**` | **A** | **KEEP** | Imported by all auth flows; Next.js routes | Core student/company authentication, registration, password reset, rate-limiting |
| `src/app/dashboard/student/page.tsx` | **A** | **KEEP** | Next.js route `/dashboard/student` | Primary student dashboard overview: active track, adaptive next task, skill journey, practical tasks |
| `src/app/dashboard/student/roles/**` | **A** | **KEEP** | Next.js routes `/dashboard/student/roles/*` | Career path selection (Frontend, Backend, Full Stack Developer) |
| `src/app/dashboard/student/skills/**` | **A** | **KEEP** | Next.js routes `/dashboard/student/skills` | Skill mastery overview and progression tracking |
| `src/app/dashboard/student/learn/**` | **A** | **KEEP** | Next.js routes `/dashboard/student/learn/*` | Concept learning topics, structured content, prerequisite gating |
| `src/app/dashboard/student/practice/**` | **A** | **KEEP** | Next.js routes `/dashboard/student/practice/*` | Interactive coding practice environment with Monaco editor and test runner |
| `src/app/dashboard/student/assessments/**` | **A** | **KEEP** | Next.js routes `/dashboard/student/assessments/*` | Theory assessments with timed questions and verified grading |
| `src/app/dashboard/student/practical-tasks/**` | **A** | **KEEP** | Next.js routes `/dashboard/student/practical-tasks/*` | Practical project catalog, task details, and workspace submission (code, GitHub URL, live demo) |
| `src/app/dashboard/student/profile/**` | **A** | **KEEP** | Next.js route `/dashboard/student/profile` | Evidence-driven student profile with verified skills and project deliverables |
| `src/app/dashboard/student/readiness/**` | **A** | **KEEP** | Next.js route `/dashboard/student/readiness` | Job readiness score and career milestone breakdown |
| `src/app/dashboard/student/company-challenges/**`| **A** | **KEEP** | Next.js routes `/dashboard/student/company-challenges/*` | Student participation in real company hiring tasks |
| `src/app/dashboard/student/history/**` | **A** | **KEEP** | Next.js route `/dashboard/student/history` | Audit trail of student assessment, practice, and practical submissions |
| `src/app/dashboard/company/page.tsx` | **A** | **KEEP** | Next.js route `/dashboard/company` | Company overview dashboard: talent metrics, published challenges, applications |
| `src/app/dashboard/company/search/**` | **A** | **KEEP** | Next.js route `/dashboard/company/search` | Talent search engine: skill filtering, score thresholds, verification filter, subscription paywall |
| `src/app/dashboard/company/student/[id]/**` | **A** | **KEEP** | Next.js route `/dashboard/company/student/[id]` | Evidence-based student profile for employers: verified scores, GitHub links, live demos, challenge invite |
| `src/app/dashboard/company/challenges/**` | **A** | **KEEP** | Next.js routes `/dashboard/company/challenges/*` | Creation and management of company hiring challenges/tasks |
| `src/app/dashboard/company/applications/**` | **A** | **KEEP** | Next.js routes `/dashboard/company/applications/*` | Candidate evaluation workflow: reviewing code, grading practical/interview, feedback, hiring status |
| `src/app/dashboard/company/profile/**` | **A** | **KEEP** | Next.js route `/dashboard/company/profile` | Company profile and subscription management |
| `src/app/api/recommendations/generate/**` | **A** | **KEEP** | Called by student dashboard & learning path | Deterministic adaptive recommendation generator |
| `src/app/api/assessments/submit/**` | **A** | **KEEP** | Called by assessment take page | Authoritative server-side assessment grading via Firebase Admin |
| `src/app/api/execute/**` | **A** | **KEEP** | Called by practice editor | Sandboxed code execution proxy (Piston API) |
| `src/app/api/webhooks/billing/**` | **B** | **KEEP** | Stripe webhook target | Subscription lifecycle updates and idempotency event handling |
| `src/app/api/cron/abandonment/**` | **B** | **KEEP** | Triggered by automated cron | CRON_SECRET protected cleanup and session audit |
| `src/app/api/ml-telemetry/**` | **B** | **KEEP** | Called by assessment/practice/task endpoints | Server-side telemetry logger recording real user events for future training |
| `src/app/api/admin/ml-readiness/**` | **B** | **KEEP** | Admin dashboard `/dashboard/admin/ml-readiness` | Evaluates whether real-user telemetry has met sample-size thresholds |
| `src/app/api/admin/seed-catalog/**` | **C** | **KEEP** | Admin seed endpoint | Server-side idempotency seeder for curriculum content |
| `src/app/seed/**` | **C** | **KEEP** | Next.js route `/seed` | Admin-only seeder UI |
| `src/lib/firebase.ts` | **A** | **KEEP** | Imported across all client components | Authoritative Firebase Client SDK initializer |
| `src/lib/firebase-admin.ts` | **A** | **KEEP** | Imported across all server routes | Authoritative Firebase Admin SDK initializer with serverless fix |
| `src/lib/api-auth.ts` | **A** | **KEEP** | Imported by all secure API routes | Token verification, role guards, and subscription authorization |
| `src/lib/adaptive-engine.ts` | **A** | **KEEP** | Imported by recommendation routes & assigner | Sole production recommendation authority (deterministic) |
| `src/lib/skill-intelligence.ts` | **A** | **KEEP** | Imported by assessment submit & evaluator | Authoritative `skillScores` updater with verified evidence extraction |
| `src/lib/mastery.ts` | **A** | **KEEP** | Imported by student dashboard & skills view | Deterministic skill journey state machine (`not_started` -> `verified`) |
| `src/lib/job-readiness.ts` | **A** | **KEEP** | Imported by readiness view | Role readiness state engine (`NOT_STARTED` -> `READY`) |
| `src/lib/candidate-matching.ts` | **A** | **KEEP** | Imported by company applications & student detail | Deterministic "Strong Match" candidate evaluator |
| `src/lib/piston.ts` | **B** | **KEEP** | Imported by `/api/execute` | Piston code execution API client |
| `src/lib/content-catalog/**` | **A** | **KEEP** | Seeders, catalog verification, admin UI | Authoritative definitions of all 20 practical tasks, 128 practice problems, 21 assessments |
| `src/lib/ml-inference/adaptive-task-assigner.ts`| **A** | **KEEP**| `/api/recommendations/generate` | Orchestrates deterministic engine + shadow evaluation |
| `src/lib/ml-inference/shadow-evaluator.ts` | **D** | **KEEP** | `adaptive-task-assigner.ts` | Executes experimental models in shadow mode; logs comparison |
| `src/lib/ml-inference/decision-quality.ts` | **D** | **KEEP** | ML audit scripts & shadow evaluator | Evaluates decision alignment and calibration metrics |
| `src/lib/ml-features/**` | **D** | **KEEP** | ML pipelines & telemetry | Feature extractors and registries for offline training |
| `src/lib/ml-telemetry/**` | **B** | **KEEP** | Telemetry endpoints | Real-user dataset builder and telemetry logger |
| `src/lib/adaptive-progression/**` | **B** | **KEEP** | Shadow evaluator & complexity metrics | Bounded progression state machine (MAX_STEP 0.15) |
| `src/lib/pilot-config.ts` | **B** | **KEEP** | Telemetry & engagement services | User classification (`REAL_PILOT_USER` vs `TEST_USER`) |
| `src/lib/pilot-engagement-audit.ts` | **B** | **KEEP** | `PostCompletionNextAction.tsx`, student dashboard | Funnel metrics and One-Clear-Next-Action generator |
| `src/lib/pilot-field-audit.ts` | **C** | **KEEP** | Phase 47/48 audit suites | Longitudinal pilot audit runner |
| `src/lib/pilot-cohort-expansion.ts` | **C** | **KEEP** | Phase 48 audit suite | Cohort retention evaluator |
| `firestore.rules` | **A** | **MUST KEEP** | Firebase security engine | Complete role-based security rules, verified score protection, student ownership |
| `ml/model1/**` | **D** | **KEEP (ISOLATED)** | Python ML pipeline | Model 1 offline training script, model card, config |
| `ml/model2/**` | **D** | **KEEP (ISOLATED)** | Python ML pipeline | Model 2 offline training script, model card, config |
| `ml/dev-data/**` | **D** | **KEEP (ISOLATED)** | `/api/admin/ml-readiness`, Python training | Synthetic datasets used strictly for offline development; never mixed with production |
| `ml/scripts/**` | **D** | **KEEP (ISOLATED)** | Python offline audit tools | Offline audit tools and synthetic dataset generators |
| `ml/audit-results/**` | **D** | **KEEP (ISOLATED)** | ML documentation | Benchmarks and ablation experiment results |
| `scripts/test_phase53_practical_tasks.ts` | **C** | **KEEP** | Phase 53 automated regression | Automated test suite validating practical task activation |
| `scripts/verify_live_practical_journey.ts` | **C** | **KEEP** | Production verification | Live student journey smoke test |
| `scripts/verify_production_counts.ts` | **C** | **KEEP** | Database verification | Read-only ground-truth document counter |
| `scripts/seed_production_catalog.ts` | **C** | **KEEP** | Deployment utilities | Standalone production seeder |
| `scripts/inspect_practical_tasks.ts` | **C** | **KEEP** | Debug tool | Read-only Firestore REST inspector |
| `scripts/inspect_production_auth.ts` | **C** | **KEEP** | Debug tool | Read-only auth inspector |
| `scripts/ml_training_gate.ts` | **C** | **KEEP** | ML safety | Verifies shadow-only enforcement before any training |
| `scripts/extract-ml-data.ts` | **C** | **KEEP** | ML tooling | Telemetry extractor for offline Model 1 training |
| `scripts/extract-model2-data.ts` | **C** | **KEEP** | ML tooling | Telemetry extractor for offline Model 2 training |
| `PHASE_46_REPORT.md` -> `PHASE_53_REPORT.md` (12 files) | **E** | **ARCHIVED** | Moved to `docs/archive/phases/` | Historical phase completion reports |
| `test_phase26_journey.ts` -> `test_phase52_automated_validation.ts` (27 files in root) | **C** | **PRESERVED IN ROOT** | Regression test suites | Historical phase verification runners (referenced in phase reports) |
| `seed.ts` (Root) | **F** | **DELETED** | Unused early prototype | Inserted fake dummy `test-prob` into `practiceProblems`; superseded by `src/lib/content-catalog` |
| `scratch/` (Directory) | **G** | **DELETED** | Temporary debug scripts | Contained one-off scripts (`detailed_audit.mjs`, `secret_audit.mjs`, `test_prod_smoke.mjs`) and nested node_modules |
| `e2e-out2.txt`, `e2e-output.txt` | **G** | **DELETED** | Temporary test output logs | Ephemeral Playwright CLI console dumps |
| `test-screenshot.png` | **G** | **DELETED** | Temporary test artifact | One-off Playwright debug screenshot |
| `task.md` | **G** | **DELETED** | Temporary scratch notes | Ephemeral note file |

---

## Deletion Safety Checklist

- [x] Zero deletions made to `src/` production application code.
- [x] Zero deletions made to `firestore.rules` or security configurations.
- [x] Zero deletions made to `package.json` production dependencies.
- [x] Zero deletions made to offline ML architecture (`ml/model1`, `ml/model2`, `src/lib/ml-*`).
- [x] Historical phase documentation safely preserved under `docs/archive/phases/`.
- [x] TypeScript compilation (`npx tsc --noEmit`) verified clean with 0 errors.
- [x] Next.js production build (`npm run build`) verified clean across all 52 routes.
- [x] Automated test suite (`scripts/test_phase53_practical_tasks.ts`) executed and verified passing 100%.
