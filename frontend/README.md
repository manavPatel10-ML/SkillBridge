# Frontend Architecture & UI Modules

**Owner**: Developer 1 — Manav (Frontend & UX Lead)

This directory houses the client-side UI application layer:
- `components/`: UI components (learning interfaces, verified profile view, modals, route protection).
- `context/`: React context providers (e.g., `AuthContext`).
- `services/`: Client-side Firebase SDK initialization (`firebase-client.ts`) and client data queries.
- `styles/`: Global Tailwind and custom theme styles.
- `hooks/`: Custom client-side React hooks.

Next.js App Router pages in `src/app/` import components, contexts, and services directly from this directory.
