# SkillBridge Architecture Overview

SkillBridge is an evidence-based student talent and practical hiring platform built using Next.js 16 (Turbopack, App Router) and Google Cloud Firebase.

---

## 1. Startup Value Loop

```
Student:
Learn (Curated Topics)
  ↓
Practice (Automated Code Execution)
  ↓
Build (Practical Engineering Tasks)
  ↓
Verify (Theory & Practical Rubric Scoring)
  ↓
Evidence (Shareable Verified Profile at /profile/[studentId])
  ↓
Company:
Discover (Candidate Search & Role Matching)
  ↓
Evaluate (Review Real GitHub Repos & Deliverables)
  ↓
Challenge (Custom Practical Hiring Tasks)
  ↓
Shortlist & Hire (Full Hiring Lifecycle)
```

---

## 2. Directory Architecture

```
SkillBridge/
├── frontend/             # Owned by Developer 1 (Manav)
│   ├── components/       # UI Components (Learning, Profile, Modals)
│   ├── context/          # React Context (AuthContext)
│   ├── services/         # Firebase Client SDK
│   └── styles/           # Global styles and Tailwind
│
├── backend/              # Owned by Developer 2 (Friend)
│   ├── services/         # Server services (Firebase Admin, AdaptiveEngine, Billing, ML)
│   ├── middleware/       # API Auth token verification
│   └── config/           # Server configuration
│
├── firebase/             # Owned by Developer 2 (Friend)
│   ├── firestore.rules   # Authoritative database security rules
│   └── firestore.indexes.json # Composite indexes
│
├── shared/               # Shared between Both Developers
│   ├── types/            # Single source of truth for TypeScript types
│   ├── constants/        # Canonical content catalog (20 tasks, 21 assessments, etc.)
│   └── utils/            # Shared formatting and matching contracts
│
├── src/
│   └── app/              # Next.js App Router (Thin routing integration layer)
│       ├── api/          # Serverless route handlers -> delegating to @backend/*
│       └── (pages)/      # Presentation routes -> rendering @frontend/*
│
└── docs/                 # Engineering documentation hub
```
