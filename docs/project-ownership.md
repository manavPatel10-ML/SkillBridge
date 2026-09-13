# SkillBridge Project Ownership & Domain Boundaries

To enable efficient pair programming and prevent merge collisions between two developers working on the same codebase, SkillBridge adheres to strict domain ownership.

---

## 1. FRONTEND — Developer 1 (Manav)
**Primary Responsibility**: User Interface, User Experience, Client State, Client Routing, and Presentation Logic.

### Owned Directories & Files:
- `frontend/`
  - `frontend/components/`: Modular UI components (learning views, verified public profile cards, candidate modals, route guards).
  - `frontend/context/`: Client-side state and providers (`AuthContext.tsx`).
  - `frontend/services/`: Client-side Firebase SDK configuration (`firebase-client.ts`).
  - `frontend/styles/`: Global styling, CSS modules, and Tailwind configurations (`globals.css`).
  - `frontend/hooks/`: Custom React hooks for interactive UI state.
- `src/app/` (Presentation Layer):
  - All UI page routes: `/`, `/auth/*`, `/dashboard/*`, `/profile/[studentId]`, `/onboarding`.
- `public/`: Static brand assets, fonts, and illustrations.

### Key Guidelines for Frontend Developer:
- Never query Firestore directly using bypasses or mock objects; use the authenticated client SDK.
- Do not modify Firestore security rules (`firebase/firestore.rules`) directly. Request backend modifications from Developer 2.
- UI components should consume canonical types from `@shared/types`.

---

## 2. BACKEND — Developer 2 (Friend)
**Primary Responsibility**: API Architecture, Serverless Function Endpoints, Database Security, Firebase Admin, Stripe Billing, and Progression/ML Telemetry Engines.

### Owned Directories & Files:
- `backend/`
  - `backend/services/`: Server-side services (`firebase-admin.ts`, `piston.ts`, `billing/`, `adaptive-engine.ts`, `adaptive-progression/`, `ml-telemetry/`, `ml-inference/`, `ml-features/`).
  - `backend/middleware/`: Security middleware, token verification, and role guards (`api-auth.ts`).
  - `backend/controllers/`: Serverless request handlers.
  - `backend/config/`: Server-side environment configuration.
- `firebase/`
  - `firebase/firestore.rules`: Authoritative database security rules and role-based permissions.
  - `firebase/firestore.indexes.json`: Composite query index configurations.
  - `firebase/firebase.json`: Firebase CLI and emulator settings.
- `src/app/api/` (API Route Handlers):
  - Next.js serverless route handlers (`/api/admin/*`, `/api/assessments/*`, `/api/cron/*`, `/api/ml-telemetry/*`, `/api/recommendations/*`, `/api/execute`, `/api/health`, `/api/webhooks/*`).

### Key Guidelines for Backend Developer:
- Never trust user-supplied identity in request bodies; enforce identity via Firebase ID token verification.
- Enforce that `AdaptiveEngine` remains the deterministic authority for student recommendations (Model 1 & Model 2 remain shadow-only).
- Ensure all database queries avoid unindexed composite index requirements.

---

## 3. SHARED — Both Developers
**Primary Responsibility**: Core Domain Contracts, Types, and Reusable Constants.

### Owned Directories & Files:
- `shared/`
  - `shared/types/`: Single source of truth for TypeScript domain types (`StudentProfile`, `Assessment`, `PracticalTask`, `CandidateApplication`, `CompanyProfile`, etc.).
  - `shared/constants/`: Canonical content catalog (`roles`, `skills`, `learning-topics`, `practice-problems`, `assessments`, `practical-tasks`).
  - `shared/utils/`: Common formatting, CSS class merging (`cn`), candidate matching algorithms.
  - `shared/schemas/`: Shared validation schemas.
- `docs/`: System documentation, architecture diagrams, and workflow protocols.
- Project-level build configuration (`package.json`, `tsconfig.json`, `next.config.ts`, `vercel.json`).

### Rules for Shared Files:
1. **Coordination Required**: Neither developer may unilaterally alter a type or canonical catalog item without discussing the impact on the other's layer.
2. **Backward Compatibility**: When updating shared models, ensure changes are additive to prevent breaking active frontend components or existing database documents.
3. **Automated Verification**: Any change in `shared/` must immediately pass `scripts/test_production_content_parity.ts`.
