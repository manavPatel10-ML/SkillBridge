# SkillBridge Frontend Architecture & Guide

**Owner**: Developer 1 — Manav (Frontend & UX Lead)

Welcome to the frontend domain of SkillBridge! This directory houses all client-side UI components, hooks, client services, contexts, styles, and utilities.

---

## 1. Directory Structure

```
frontend/
├── components/
│   ├── common/           # Generic shared UI (ProtectedRoute, LoadingSpinner, EmptyState)
│   ├── feedback/         # User feedback & issue reporting (BetaFeedbackModal)
│   ├── navigation/       # Topbars, sidebars, mobile drawers (Sidebar, MobileHeader)
│   ├── layout/           # Dashboard shell and layout containers (DashboardShell)
│   ├── learning/         # Lessons, post-completion actions, recommendation cards
│   ├── practical-tasks/  # Practical engineering challenge cards & filters
│   ├── assessments/      # Theory quiz/assessment cards & timers
│   ├── assignments/      # Verified challenge assignment cards & trackers
│   ├── projects/         # Student project showcase cards
│   ├── profile/          # Verified talent badges & social share controls
│   └── dashboard/        # Overview stat cards and skill journey status badges
│
├── context/              # React Context Providers (AuthContext)
├── hooks/                # Custom React hooks (useAuth, useDebounce, useMediaQuery)
├── services/
│   ├── firebase/         # Client Firebase Web SDK (auth, db, storage)
│   └── api/              # Typed frontend fetch client & API wrappers
│
├── utils/                # Frontend formatting helpers (cn, duration formatters, score styling)
├── styles/               # globals.css, Tailwind styles, CSS variables
├── types/                # Frontend-specific UI types and view states
├── index.ts              # Public module barrel exports
└── README.md             # This documentation
```

---

## 2. Architectural Relationship

SkillBridge uses the Next.js 16 App Router hosted on Vercel:

```
src/app/ (Route Pages & Layouts)
   │
   ▼
frontend/components/ (Domain UI components)
   │
   ▼
frontend/hooks/ & frontend/context/ (Client state & lifecycle)
   │
   ▼
frontend/services/ (Firebase Web Client & Typed API calls)
   │
   ▼
shared/types/ & shared/constants/ (Canonical data contracts)
```

- `src/app/` serves as thin page and layout entrypoints at the root for Vercel build compatibility.
- All presentation logic, UI components, client state, and client-side SDK interactions belong in `frontend/`.
- Serverless route handlers (`src/app/api/*`) and Firebase Admin logic belong exclusively in `backend/`.

---

## 3. Developer Guidelines for Manav

1. **Adding New UI Components**:
   - Place components in the matching domain folder under `frontend/components/<domain>/`.
   - Export them through the domain's `index.ts` and the main `frontend/components/index.ts`.
2. **Calling Backend APIs**:
   - Use `frontend/services/api/` rather than raw `fetch()` calls.
   - The `apiClient` automatically injects Firebase authentication tokens for authorized endpoints.
3. **Domain Contracts & Data**:
   - Always import canonical entities (User, Student, PracticalTask, Assessment) from `@shared/types`.
   - Never duplicate database model interfaces in frontend types.
4. **Coordination with Backend (Friend)**:
   - When modifying files in `shared/types/`, `shared/constants/`, or `package.json`, coordinate with the backend developer.
   - Do NOT edit files in `backend/` or `firebase/`.
