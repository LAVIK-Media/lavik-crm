This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment variables

- **AUTH_JWT_SECRET** – Secret for session JWT (required in prod).
- **AUTH_ALLOWED_EMAIL_DOMAIN** – Allowed login domain, e.g. `lavik-media.com` (only `*@<domain>` can log in).
- **AUTH_INITIAL_PASSWORD** – One-time setup password for first login; after first login users set a personal password (server-only, never exposed to client).
- **BOT_API_KEY** – API key for `/api/bot/*` endpoints (server-only).
- **TURSO_DATABASE_URL** / **TURSO_AUTH_TOKEN** – For production (Turso). Local dev uses SQLite in `prisma/dev.db`.

After adding the User table, run the Turso user migration once:  
`node scripts/apply-turso-user-migration.mjs` (with `TURSO_*` env set).

After adding Lead audit columns (optional but recommended for bot ingest), run:  
`node scripts/apply-turso-lead-audit-migration.mjs` (with `TURSO_*` env set).

## OpenClaw / Bot ingest

Create leads via:

- `POST /api/bot/leads`
- Auth: `Authorization: Bearer $BOT_API_KEY` (or `x-bot-api-key: $BOT_API_KEY`)
- Body: same shape as the normal lead create API (`companyName`, `phoneNumber`, `website?`, `contactPerson?`, `notes?`, `status?`) plus optional `sourceRef` and `raw`.

Example:

```bash
curl -X POST "https://<your-domain>/api/bot/leads" \
  -H "Authorization: Bearer $BOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Example GmbH",
    "phoneNumber": "+43 660 1234567",
    "website": "https://example.com",
    "contactPerson": "Max Mustermann",
    "notes": "Scraped overnight.",
    "status": "NEW",
    "sourceRef": "job-2026-03-18#42",
    "raw": { "scrapeUrl": "https://example.com/impressum" }
  }'
```

Expected responses:

- `201`: created
- `409`: duplicate (company name or phone exists) — bot should skip
- `400`: validation error — bot should log and continue
- `401`: missing/invalid API key

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
