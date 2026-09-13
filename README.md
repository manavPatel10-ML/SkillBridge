# SkillBridge

SkillBridge is a web platform designed to help students build practical and technical skills and provide companies with trustworthy skill-based hiring evidence. By combining secure code execution with verifiable project assessments, SkillBridge bridges the gap between learning and employment.

## Core Features

**Student:**
- Technical Learning
- Coding Practice
- Secure Code Execution
- Personalized Practice
- Skill Journey
- Role Paths
- Assessments
- Practical Projects
- Verified Skills
- Company Challenges
- Applications

**Company:**
- Student Discovery
- Verified Skill Search
- Strong Match
- Hiring Challenges
- Candidate Evaluation
- Verified Project Evidence

**Admin:**
- Skill Management
- Assessments
- Questions
- Practical Tasks
- Learning Topics
- Coding Problems
- Role Paths
- Evaluations

## Technology Stack

- **Next.js** (App Router)
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Firebase Authentication**
- **Cloud Firestore**
- **Firebase Security Rules**
- **Firebase Admin**
- **Monaco Editor**
- **Piston** execution infrastructure

## Architecture Principles

- **Role-based access:** Granular access controls mapped to student, company, and admin profiles.
- **Firestore security rules:** Zero-trust database interactions ensuring students cannot manipulate scores or access unauthorized data.
- **Server-side privileged operations:** Critical aggregations, like skill scoring, are locked behind Firebase Admin APIs and Next.js route handlers.
- **Practice/verification separation:** Dedicated boundaries between exploratory learning (sandbox) and verified execution.
- **Verified Project Evidence:** Strict submission pipelines requiring administrative evaluation to grant verified status.
- **Secure coding execution:** Integrated with the Piston API to sandbox untrusted user code execution safely.

## Local Development

Install dependencies:
```bash
npm install
```

Start the Next.js development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Environment Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Add your Firebase public client configuration to the `NEXT_PUBLIC_FIREBASE_*` variables.
3. Configure the required server-side `FIREBASE_SERVICE_ACCOUNT_KEY` (stringified JSON) and `FIREBASE_PROJECT_ID`.
4. If testing locally with emulators, set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`.
5. **Never commit `.env.local` to version control.**

## Testing

Run the Playwright End-to-End tests:
```bash
npm run test:e2e
```

Run tests with the Playwright UI:
```bash
npm run test:e2e:ui
```

**Note on Emulators:**
The `test:ci` command automatically boots the Firebase Local Emulator Suite. Note that running the Firebase Emulator requires **Java 21** or later to be installed on your local machine.

## Build

To check for TypeScript errors without emitting files:
```bash
npx tsc --noEmit
```

To create an optimized production build:
```bash
npm run build
```

## Documentation

Project documentation and architecture reports are organized under the [`docs/`](./docs) directory:
- Architecture, API, and database references: [`docs/`](./docs)
- Phase completion and audit reports: [`docs/phases/`](./docs/phases)
- Historical phase verification suites: [`tests/phases/`](./tests/phases)

