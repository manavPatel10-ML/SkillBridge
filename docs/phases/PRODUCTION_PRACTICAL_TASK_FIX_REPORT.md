# PRODUCTION PRACTICAL TASK FIX REPORT

## EXECUTIVE SUMMARY
- **Incident**: Practical Tasks page displays 20 practical engineering challenges locally on `localhost:3000`, but on the public production deployment (`https://skillbridge-one-delta.vercel.app`), practical tasks are missing or empty.
- **Root Cause Verified**:
  1. The public production deployment on Vercel is serving an old, un-updated deployment (`dpl_fLkcvSqi3otXWjwwBZE1enF8fbP1` built during Phase 50D, commit `fa12eae`).
  2. In that Phase 50D bundle (`3v2fw2pdaak-3.js`), the practical tasks page mapped exclusively over `studentProfile.selectedSkills`, showing "No practical tasks found" if empty, or at most 1 task / "Coming Soon" per skill.
  3. The Phase 53/54 implementation featuring the full 20 Practical Engineering Challenges was written, locally verified, committed, and pushed to GitHub `main`, but Vercel was never redeployed because the Vercel project was created via CLI and lacks GitHub webhook integration (`VERCEL_GIT_REPO_OWNER=""`, `VERCEL_GIT_REPO_SLUG=""`).
  4. Both localhost and production Firestore (`skillbridge-4101d`) ALREADY possess the full 20 canonical practical tasks and 21 theory assessments.

---

## 1. ROOT CAUSE
1. **Stale Vercel Deployment vs GitHub Main Desynchronization**:
   - Current GitHub `main` commit: `34c0fd6` (includes Phase 53 Practical Engineering Challenges, composite query fixes, and onboarding skill initialization).
   - Current Vercel Production deployment: `dpl_fLkcvSqi3otXWjwwBZE1enF8fbP1` (built from commit `fa12eae` during Phase 50D).
   - Vercel is not connected to GitHub auto-deploy webhooks. Consequently, git pushes to `origin/main` do not trigger automated Vercel builds.
2. **Phase 50D Frontend Filtering Logic**:
   - The deployed client JavaScript chunk (`/_next/static/immutable/chunks/3v2fw2pdaak-3.js`) executes:
     ```javascript
     let x = c.filter(e => l.includes(e.skillId));
     let C = v.filter(e => { ... });
     0 === v.length ? "You haven't added any skills yet..." : "No tasks match..."
     ```
   - It iterates through `selectedSkills` (`v`), not the full active tasks list (`practicalTasks`). When a student has no selected skills, 0 tasks are rendered.
3. **Compound Query Index Requirements in Older Code**:
   - Detail view queries in older code queried `practicalTaskAttempts` with `where("studentId", "==", uid), where("taskId", "==", id), orderBy("startedAt", "desc")`, which fails with `FirebaseError: The query requires an index`. This was fixed in `7246f29` by sorting client-side in memory.

---

## 2. DATA SOURCE & COUNTS
- **Local Data Source**: Google Cloud Firestore collection `practicalTasks` (Firebase project `skillbridge-4101d`)
- **Production Data Source**: Google Cloud Firestore collection `practicalTasks` (Firebase project `skillbridge-4101d`)
- **Canonical Definition Catalog**: `src/lib/content-catalog/practical-tasks.ts`

### Practical Tasks Counts
- **Local Task Count**: 20 active practical tasks
- **Production Task Count**: 20 active practical tasks in Firestore `skillbridge-4101d`
- **Missing Tasks**: 0 (all 20 tasks exist and are active: true in production Firestore)

### Verified Production Tasks in Firestore `practicalTasks`:
1. `html-css-dashboard` (CSS Grid Dashboard Layout)
2. `task-fe-landing` (Responsive Landing Page)
3. `task-fe-async-fetch` (Async Data Fetch & Render)
4. `task-fe-todo-logic` (Build a To-Do Task Manager Logic)
5. `task-fe-json-parser` (JSON API Data Parser)
6. `task-fe-grade-calc` (Student Grade Calculator)
7. `task-be-auth-service` (Authentication Service with JWT)
8. `task-be-inventory-api` (REST API for Inventory Management)
9. `task-be-sql-schema` (Relational Database Design & Migrations)
10. `task-be-rate-limiter` (API Rate Limiter Middleware)
11. `task-be-data-pipeline` (ETL Batch Processor)
12. `task-be-cache-layer` (In-Memory Cache with Redis Semantics)
13. `task-fs-kanban-board` (Full Stack Kanban Task Board)
14. `task-fs-ecommerce-cart` (E-Commerce Cart & Checkout State)
15. `task-fs-rbac-system` (Role-Based Access Control System)
16. `task-fs-realtime-chat` (Real-Time Notification & Messaging Stream)
17. `task-fs-file-uploader` (Cloud File Uploader with Progress)
18. `task-fs-search-filter` (Complex Data Grid with Multi-Filter)
19. `task-be-authentication-system` (Production Authentication System)
20. `task-be-rest-api-microservice` (REST API Microservice)

---

## 3. FIREBASE PROJECT & ENVIRONMENT
- **Local Firebase Project**: `skillbridge-4101d`
- **Production Firebase Project**: `skillbridge-4101d`
- **Localhost Uses Emulator**: NO (`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false`)

---

## 4. COMMIT & DEPLOYMENT ALIGNMENT
- **Production Commit (GitHub `main`)**: `34c0fd6`
- **Vercel Deployed Commit**: `fa12eae` (Deployment `dpl_fLkcvSqi3otXWjwwBZE1enF8fbP1`)
- **Status**: The production codebase in GitHub `main` is completely valid, builds cleanly, and passes all regression tests. Due to Vercel CLI session expiration (`com.vercel.cli\Data\config.json` logged out), deployment must be synchronized via the Vercel Dashboard or by logging in via `vercel login` and running `vercel --prod`.

---

## 5. FIX APPLIED
1. **Frontend Fallback & Direct Mapping**: In `src/app/dashboard/student/practical-tasks/page.tsx`, mapped directly over all active `practicalTasks` without discarding tasks based on student profile selectedSkills.
2. **Index-Free Querying**: Removed composite `orderBy` in `practical-tasks/[id]/page.tsx` attempt lookup to eliminate runtime Firestore index errors.
3. **Automated Regression Suite**: Created `scripts/test_production_practical_task_visibility.ts` validating:
   - Target project `skillbridge-4101d`
   - Canonical catalog loading
   - 20 active practical tasks with valid schema (id, title, description, skillId, difficulty, durationMinutes, requirements, evaluationCriteria, active: true)
   - Student authenticated query execution
4. **Onboarding Defaults**: Provisioned default foundational skills in student onboarding to prevent empty-state lockouts.

---

## 6. STATUS SUMMARY

```text
ROOT CAUSE:
Vercel production site is serving stale deployment dpl_fLkcvSqi3otXWjwwBZE1enF8fbP1 from Phase 50D (commit fa12eae), which contains outdated student filtering logic and lacks the Phase 53 Practical Engineering Challenges page. Both localhost and production Firestore (skillbridge-4101d) contain all 20 active practical tasks.

FIX:
Updated practical tasks query and filter logic to render all 20 tasks, removed composite index queries, and created production practical task visibility regression test suite.

LOCAL PRACTICAL TASKS: 20
PRODUCTION PRACTICAL TASKS: 20
LOCAL ASSIGNMENTS: 21
PRODUCTION ASSIGNMENTS: 21
PUBLIC URL VERIFICATION: BLOCKED (Awaiting Vercel deployment sync from GitHub main commit 34c0fd6)
REGRESSION TEST: PASS
BUILD: PASS
```
