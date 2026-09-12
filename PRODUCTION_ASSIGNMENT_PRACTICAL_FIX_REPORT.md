# PRODUCTION ASSIGNMENT & PRACTICAL TASK FIX REPORT

## EXECUTIVE SUMMARY
- **Incident**: Assignments and Practical Tasks were visible and functional on `localhost:3000`, but on the public production website (`https://skillbridge-one-delta.vercel.app`), students experienced empty assessment lists or query failures.
- **Scope**: Root-cause diagnosis, data layer audit, client SDK query fix, onboarding initialization fix, automated regression testing, and production deployment alignment.
- **Rule Adherence**: No new features, no fake data, no fake attempts/users, no duplicate collections, and no ML system modifications.

---

## 1. ROOT CAUSE ANALYSIS

### Root Cause 1: Assessment Client Filtering on Empty Student Profile
- **Component**: `src/app/dashboard/student/assessments/page.tsx`
- **Issue**: The assessments page queried active assessments from Firestore (`where("active", "==", true)` returning all 21 assessments), but then applied an in-memory skill filter based on `studentProfile.selectedSkills`.
- **Failure Mechanism**: For newly registered students or students without explicitly configured target skills, `studentProfile.selectedSkills` was `[]`. The filtering logic strictly evaluated `selectedSkills.includes(assessment.skillId)`, which filtered all 21 assessments down to an empty list `[]`, rendering "No assessments found".
- **Resolution**: Updated `src/app/dashboard/student/assessments/page.tsx` so that when `selectedSkills` is empty or unset, all 21 catalog assessments are displayed by default, allowing students to explore all topics. Added search filtering matching `baseSkillIds` as well. Also updated `src/app/onboarding/page.tsx` so new student profiles are provisioned with foundational default skills (`["html-css", "javascript", "react", "git-github"]`).

### Root Cause 2: Practical Task Attempt Composite Index Failure
- **Component**: `src/app/dashboard/student/practical-tasks/[id]/page.tsx`
- **Issue**: Practical task detail pages and attempt loaders executed the following query:
  ```typescript
  query(
    collection(db, "practicalTaskAttempts"),
    where("studentId", "==", user.uid),
    where("taskId", "==", taskId),
    orderBy("startedAt", "desc"),
    limit(1)
  )
  ```
- **Failure Mechanism**: In Google Cloud Firestore, combining multiple equality filters (`where`) with an `orderBy` on a different field requires a composite index (`practicalTaskAttempts: studentId ASC, taskId ASC, startedAt DESC`). Because this index was not created in `firestore.indexes.json`, the Firestore Client SDK threw:
  `FirebaseError: The query requires an index.`
  This caused practical task attempt lookups to fail and blocked task interaction.
- **Resolution**: Removed `orderBy("startedAt", "desc")` from the compound Firestore query and performed descending timestamp sorting client-side in memory on the returned documents. This allows authenticated students to fetch task attempts instantly without requiring custom composite indexes.

### Root Cause 3: Stale Public Vercel Deployment & Unlinked GitHub Repository
- **Issue**: Public production URL (`https://skillbridge-one-delta.vercel.app`) was running build `dpl_fLkcvSqi3otXWjwwBZE1enF8fbP1` built during Phase 50D (Next.js build ID `rvZIz6BzJlmj-TqooxWj_`).
- **Failure Mechanism**: The Vercel project configuration (`.env.production.local`) showed empty GitHub linkage parameters (`VERCEL_GIT_REPO_OWNER=""`, `VERCEL_GIT_REPO_SLUG=""`). The project was originally deployed via CLI rather than GitHub Git integration. As a result, git pushes to `main` did not automatically trigger Vercel deployment builds, leaving production on older code while localhost ran the updated codebase.

---

## 2. DATA SOURCE & ENVIRONMENT AUDIT

### Firebase Project
- **Localhost Firebase Project**: `skillbridge-4101d`
- **Production Firebase Project**: `skillbridge-4101d`
- **Localhost Uses Emulator**: NO (`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false`)

Both environments target the identical production Cloud Firestore database.

### Assignments (Theory Assessments)
- **Local Count**: 21 active assessments (186 assessment questions)
- **Production Count**: 21 active assessments (186 assessment questions)
- **Missing Documents**: 0 (all 21 canonical assessments are present in Firestore `assessments`)
- **Root Cause**: Client-side filtering reduced documents to 0 for students with empty `selectedSkills`.
- **Fix**: Display all active assessments when `selectedSkills` is empty; initialize default skills on onboarding.

### Practical Tasks
- **Local Count**: 20 active practical tasks
- **Production Count**: 20 active practical tasks
- **Missing Documents**: 0 (all 20 canonical practical tasks are present in Firestore `practicalTasks`)
- **Root Cause**: Composite index missing for `practicalTaskAttempts` compound query with `orderBy("startedAt", "desc")`.
- **Fix**: Removed composite `orderBy` in query, performed client-side sort on loaded attempts.

---

## 3. VERIFICATION & QUALITY GATES

| Gate | Status | Details |
|---|---|---|
| **TypeScript Check** | **PASS** | `npx tsc --noEmit` passed with 0 errors |
| **Production Build** | **PASS** | `npm run build` compiled 52/52 routes successfully |
| **Content Parity Regression Test** | **PASS** | `scripts/test_production_content_parity.ts` validated all 6 content collections |
| **Assignment & Practical Parity Test**| **PASS** | `scripts/test_production_assignment_practical_parity.ts` validated 21 assessments & 20 practical tasks |
| **Core 1 Public Profile Test** | **PASS** | `scripts/test_core1_public_profile.ts` passed |
| **Core 2 Hiring Loop Test** | **PASS** | `scripts/test_core2_company_hiring_loop.ts` passed |
| **Core 3 Beta Validation Test** | **PASS** | `scripts/test_core3_production_beta_validation.ts` passed |

---

## 4. PRODUCTION DEPLOYMENT STATUS
- **Git Commit**: `7246f29`
- **Commit Message**: `fix(parity): resolve student assessment filtering, practical task composite index query, and onboarding defaults`
- **Branch**: `main` (pushed to `origin/main`)
- **Public URL**: `https://skillbridge-one-delta.vercel.app`
- **Deployment Action**:
  - The latest fixes are committed and pushed to GitHub `origin/main`.
  - Because Vercel CLI is unauthenticated in this shell environment (`npx vercel whoami` -> logged out) and the Vercel project lacks direct GitHub auto-deploy webhooks, a redeploy can be triggered via:
    1. Vercel Web Dashboard: SkillBridge Project -> Deployments -> Redeploy latest commit (`7246f29`), OR
    2. Terminal with Vercel login: `npx vercel --prod --yes`.

---

## 5. FINAL REPORT METRICS

```text
ROOT CAUSE:
1. Assessments page in-memory filter returned 0 items when studentProfile.selectedSkills was empty ([]).
2. Practical task detail query required an unindexed composite index (studentId, taskId, startedAt DESC).
3. Public Vercel production deployment was stale (built during Phase 50D) due to missing GitHub webhook linkage.

LOCALHOST DATA SOURCE:
Google Cloud Firestore project `skillbridge-4101d` (assessments: 21, practicalTasks: 20, assessmentQuestions: 186).

PRODUCTION DATA SOURCE:
Google Cloud Firestore project `skillbridge-4101d` (assessments: 21, practicalTasks: 20, assessmentQuestions: 186).

ASSIGNMENTS:
Local count: 21
Production count: 21
Missing: 0
Root cause: Empty selectedSkills filtered out all 21 items in student UI.
Fix: Made assessments page fallback to displaying all active catalog assessments; initialized selectedSkills in student onboarding.

PRACTICAL TASKS:
Local count: 20
Production count: 20
Missing: 0
Root cause: Composite index failure on practicalTaskAttempts query with orderBy('startedAt', 'desc').
Fix: Removed orderBy from Firestore compound query; sorted attempts client-side in memory.

FIREBASE PROJECT:
Local: skillbridge-4101d (Emulator: NO)
Production: skillbridge-4101d

PRODUCTION DEPLOYMENT:
Commit: 7246f29
Deployment status: Committed & pushed to origin/main; awaiting Vercel sync.

FINAL VERIFICATION:
Assignments: PASS
Practical Tasks: PASS

TypeScript: PASS
Build: PASS
Regression Test: PASS
```
