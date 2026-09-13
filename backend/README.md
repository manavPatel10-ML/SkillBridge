# Backend Services & API Architecture

**Owner**: Developer 2 — Friend (Backend & Firebase Lead)

This directory houses the backend serverless services, authentication middleware, and server configurations:
- `services/`: Firebase Admin, Piston execution engine, Stripe billing, Adaptive Engine, ML telemetry.
- `middleware/`: Token verification (`api-auth.ts`) and role guards.
- `controllers/`: Endpoint handlers for Next.js Route Handlers in `src/app/api/`.
- `config/`: Backend-specific environment variables and configs.

All API routes in `src/app/api/` delegate directly to services and controllers in this directory.
