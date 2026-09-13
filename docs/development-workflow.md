# SkillBridge Git & Collaboration Workflow

This document outlines the collaborative engineering workflow for the SkillBridge platform. Both developers work within a single shared GitHub repository: **`SkillBridge`** (`manavPatel10-ML/SkillBridge`).

---

## 1. Branch Strategy

| Branch | Purpose | Protection Rules |
|---|---|---|
| `main` | **Stable Production Code**. Deployed to Vercel production. | Direct pushes restricted. Only merge tested code via Pull Requests. |
| `develop` | **Integration & Staging Branch**. Central branch for testing merged features. | Default target branch for feature PRs. |
| `frontend/*` | **Frontend Developer Branches** (e.g., `frontend/manav`, `frontend/assessment-ui`). | Created from `develop`. Owned by Developer 1 (Manav). |
| `backend/*` | **Backend Developer Branches** (e.g., `backend/auth-enhancements`, `backend/rules-audit`). | Created from `develop`. Owned by Developer 2 (Friend). |
| `shared/*` | **Shared Contracts / Refactor Branches**. | Coordinate before merging. |

---

## 2. Daily Development Lifecycle

### Step 1: Sync with Latest Changes
Before starting any new task, ensure your local `develop` branch is up to date:
```bash
git checkout develop
git pull origin develop
```

### Step 2: Create a Feature Branch
Branch naming convention reflects ownership and purpose:
```bash
# Frontend feature
git checkout -b frontend/<feature-name>

# Backend feature
git checkout -b backend/<feature-name>
```

### Step 3: Local Development & Verification
Ensure all quality gates pass locally before committing:
```bash
# 1. Typecheck (0 errors required)
npx tsc --noEmit

# 2. Production build verification
npm run build

# 3. Content parity & regression verification
npx tsx scripts/test_production_content_parity.ts
```

### Step 4: Commit & Push
Review all changed files before committing:
```bash
git status
git diff

# Add tracked modifications
git add .

# Conventional commit message
git commit -m "feat(frontend): implement responsive practical task cards"

# Push to origin
git push -u origin <branch-name>
```

---

## 3. Pull Request & Merging Flow

```
Feature Branch (frontend/* or backend/*)
            ↓
       Pull Request
            ↓
         develop (Automated CI & Integration Testing)
            ↓
          Testing & Acceptance
            ↓
          main (Production Release)
            ↓
    Vercel Production Deployment
```

### Pull Request Rules
1. **Always PR into `develop` first**. Do NOT PR directly into `main` unless it is an emergency hotfix.
2. **Review Ownership**:
   - Frontend changes must be reviewed by Developer 1 (Manav).
   - Backend & Firebase changes must be reviewed by Developer 2 (Friend).
   - Any modifications to `shared/` or `firebase/` require mutual approval.
3. **No Force Pushes (`git push --force`)**: Never force push to shared branches (`main`, `develop`).
4. **Clean Branches**: Delete feature branches after merging into `develop`.

---

## 4. Environment & Secrets Safety
- Never commit `.env`, `.env.local`, `.env.production.local`, or service account keys.
- Sensitive environment variables are managed directly in Vercel Project Settings and local `.env.local` files protected by `.gitignore`.
