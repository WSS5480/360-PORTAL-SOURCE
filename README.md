# 360 Portal

360 Portal is the operating system for 360 Medical. Customers use it to place orders, pay invoices, submit insurance verification (IVR) requests, and manage documents. Internal staff use the admin tools for fulfillment, inventory, billing, and FedEx labels. The surgical sales workspace is a provider-centric CRM: reps capture intro calls, observations, debriefs, and product-support cases, and the intelligence layer turns those notes into evidence-backed provider knowledge and pipeline movement.

## Stack

- Next.js 16 (App Router) and React 19
- TypeScript
- Supabase (Postgres, Auth, Storage)
- Stripe
- Microsoft Graph for outbound email (Azure app registration)
- OpenAI for note extraction, transcription, and briefing drafts
- FedEx, CloudConvert or ConvertAPI for document conversion
- Tailwind CSS 4
- Vitest and Playwright

## Repository structure

| Path | What it is |
| --- | --- |
| `src/app` | Routes. `admin` is staff. `portal` is customers and sales. `api` is route handlers. |
| `src/lib/surgical-sales` | Sales CRM and the intelligence pipeline. Treat this as production logic. |
| `src/lib` | Billing, orders, fulfillment, integrations, auth, email. |
| `src/components` | Shared UI. |
| `db/migrations` | Ordered SQL migrations. This is the schema history. |
| `scripts` | Seeds, e2e helpers, and destructive maintenance scripts. |
| `scripts/local-integration` | Isolated local lab for the partner order API. Not the full app database. |
| `tests/e2e` | Playwright. |
| `docs` | Developer references that are still worth reading. |
| `supabase/config.toml` | Local Supabase CLI config. Migrations are not stored under `supabase/migrations`. |

## Local setup

Requirements: Node.js 20+, npm, and a Supabase project (hosted or local CLI).

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open http://localhost:3000. Sign-in is at `/login`. Admin is `/admin`. The sales workspace is `/portal/sales`.

`npm run dev` uses webpack and binds to `localhost:3000`. `npm run dev:turbo` is the Turbopack alternative.

Fill `.env.local` from `.env.example`. The minimum to boot the app is:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Stripe, FedEx, Azure email, and OpenAI can be left blank while you read the code. Features that call those services fail or skip until the variables are set. See [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

`.env.local` and `.env.local.test` are gitignored. Do not commit them or paste them into chat.

## Database

A new Supabase database is created by running `db/baseline/schema.sql`, then `db/baseline/storage.sql`. That baseline is the current portal schema and contains no business rows. Do not apply `db/migrations` on top of it. Those files are already reflected in the baseline. An existing portal database should not be reloaded from the baseline. New changes go in a new file under `db/migrations`. Read [db/baseline/README.md](db/baseline/README.md).

`supabase/config.toml` does not point at `db/migrations`, and automatic seed is off. `scripts/local-integration/*.sql` is only the partner-order lab.

After the baseline is loaded, create an Auth user and run `scripts/bootstrap-local-admin.sql` with your own email. The script stops if the placeholder email is left in place.

`scripts/local-integration` is an isolated partner-order lab. It is not the application database. `npm run dev:local-integration` uses the `embedded-postgres` and `pg` packages from this project. It refuses production hosts and live Stripe keys.

Product catalog imports, if you need them, are `scripts/import-odoo-*.mjs`. They write to whatever Supabase URL is in the environment. The tracked TSV exports under `scripts/data/` are operational inventory files and are gitignored for new checkouts. Read the script before running it.

`scripts/README-RESET.md` describes a destructive reset that keeps products and one user. It aborts until you edit the email in the SQL file.

## Authentication

Users sign in with Supabase email and password. Middleware refreshes the session cookie. New users arrive through admin invites, set a password, and enroll TOTP MFA. Password reset uses Supabase recovery links routed back to this app.

Set `APP_URL_FOR_INVITES` or `NEXT_PUBLIC_APP_URL` to the URL that should appear in invite and reset emails. Azure credentials are for sending mail through Microsoft Graph. They are not the user login provider.

`/debug/session` shows whether the server can see the current session. It redirects away outside `next dev`.

## Tests

```bash
npm test
npm run test:watch
npm run test:intelligence-regression
npm run test:observation-intelligence
npm run test:debrief-parity
npm run test:e2e
```

Intelligence regression loads JSON fixtures under `src/lib/surgical-sales/intelligenceRegression/fixtures` and checks rendered output, including the rules that mentioned is not used, interest is not evaluation, and a future action is not a completed action.

Playwright needs `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, and usually `E2E_TOTP_SECRET`. Those tests hit a running app and a real Supabase project. Do not point them at production.

```bash
npx tsc --noEmit
npm run lint
```

`npm run lint` runs `eslint .` and works on Windows and macOS. The repository already has a large set of existing ESLint errors, mostly `no-explicit-any`. That debt is not a formatter problem.

## Intelligence system

The provider is the sales object. Organizations and facilities are separate. Cases and engagements hang off the provider.

Universal Facts (`universal_surgical_facts`) is the canonical clinical intelligence record: a note capture plus evidence-backed facts. Extraction and the screens that render those facts are separate. Rendering should cite evidence. Assertion levels distinguish what was reported, observed, supported by a case, validated, rejected, evaluated, or reported as an outcome. A lower assertion must not overwrite a stronger one.

The debrief pipeline turns a transcript into atomic facts, classifies them, and shows review cards the rep accepts before CRM fields change. Observation intelligence and the older field models still feed screens when Universal Facts is off or has no rows. Do not delete those paths because a single screen looks duplicated. Flags are listed in `.env.example`. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing this area.

## Domain objects

- **Account.** Customer clinic or company. Orders, invoices, IVR, and portal users belong here.
- **Provider.** A surgeon contact in the sales CRM. Primary intelligence object.
- **Organization.** Facility or group. Separate from the provider.
- **Case.** Observation or product-support case linked to a provider.
- **Engagement.** Intro call, observation, discussion, debrief, and related meetings.
- **Opportunity.** Pipeline row with stages from discovery through won or lost. Providers do not automatically create opportunities.
- **Universal Fact.** One evidence-backed clinical statement from a declared source type.

## Integrations

Supabase, Stripe, Microsoft Graph, FedEx, OpenAI, document conversion, and the Nimble partner order API. Configuration, mocks, and production behavior are in [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md). The partner contract is `docs/openapi/partner-orders-v1.yaml` and `docs/integrations/nimble-developer-guide.md`.

## Deployment

The app is a standard Next.js server build (`npm run build`, `npm start`) and is set up to run on Vercel. Production needs the same environment variables as `.env.example`, with live keys only in the host's secret store.

Unset `EMAIL_MODE` does not send mail. Set `EMAIL_MODE=graph` to send. Unset `FEDEX_ENV` uses the FedEx sandbox. Set `FEDEX_ENV=production` for live labels.

Supabase Auth redirect URLs must include this app's `/auth/callback`, `/auth/client-callback`, `/reset-password`, `/invite/accept`, and `/set-password`. The Send Email hook uses `SUPABASE_EMAIL_HOOK_SECRET`.

Outbound partner callbacks are off unless `INTEGRATION_OUTBOUND_ENABLED=true`, and the worker route requires `INTEGRATION_WORKER_SECRET`.

## More documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md)
- [docs/HIPAA-IVR.md](docs/HIPAA-IVR.md) and [docs/HIPAA_COMPLIANCE_PLAN.md](docs/HIPAA_COMPLIANCE_PLAN.md)
- [docs/SMOKE_TEST_CHECKLIST.md](docs/SMOKE_TEST_CHECKLIST.md)
- [docs/PDF_CONVERSION.md](docs/PDF_CONVERSION.md), [docs/STORAGE_TROUBLESHOOTING.md](docs/STORAGE_TROUBLESHOOTING.md), [docs/FedEx_Label_Validation_Steps.md](docs/FedEx_Label_Validation_Steps.md)
