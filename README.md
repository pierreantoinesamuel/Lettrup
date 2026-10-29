<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# CVPilot

CVPilot is a French career platform for resume creation, ATS analysis, cover letters, interview preparation, portfolios, recruiter workflows, and subscription billing.

## Requirements

- Node.js 20 or newer
- Supabase project and CLI for database migrations
- Stripe account and webhook endpoint
- Resend and Upstash credentials for production

## Local development

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The server runs Vite development middleware and API routes together. Never put service-role, Stripe secret, Resend, Upstash, or provider credentials in variables prefixed with `VITE_`.

## Checks

```text
npm run lint
npm test
npm run build
npm audit --omit=dev
```

## Database

Apply `src/database/migrations` in numeric order to a clean Supabase project. Migrations are the canonical schema source. The root SQL files are historical snapshots and must not replace the migration sequence.

## Production

Configure Supabase, Stripe secrets and webhook signing secret, Resend, Upstash Redis, the server-only AI provider key, `APP_URL`, and public PostHog/Sentry variables from `.env.example`. Configure Stripe to send subscription and checkout events to `/api/stripe/webhook`.

```text
npm run build
npm start
```

AI access, exports, and admin mutations are checked on the server. Public contact endpoints are rate-limited. Do not commit `.env` files, tokens, test output, or generated credentials.
