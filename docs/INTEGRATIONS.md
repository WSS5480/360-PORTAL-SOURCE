# Integrations

No real credentials belong in this file. Names match `.env.example`.

## Supabase

- **Purpose.** Postgres, Auth, and Storage for the whole app.
- **Variables.** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, optional `SUPABASE_STORAGE_URL`, `SUPABASE_PRIVATE_BUCKET`, `IVR_PRIVATE_BUCKET`, `SUPABASE_EMAIL_HOOK_SECRET`.
- **Local.** Point the three core variables at a new Supabase project. Run `db/baseline/schema.sql`, then `db/baseline/storage.sql`, in the SQL editor. Do not replay `db/migrations` on top of that baseline. See [db/baseline/README.md](../db/baseline/README.md). `supabase start` does not load `db/migrations`, and automatic seed is disabled. The service role bypasses RLS. Do not expose it to the browser.
- **Production.** Hosted or self-hosted Supabase. Auth redirect URLs must include this app's invite, recovery, and callback paths. The Send Email hook calls `/api/auth/send-email-hook` and must send `SUPABASE_EMAIL_HOOK_SECRET`.

## Stripe

- **Purpose.** Card payments on invoices and saved payment methods. Webhooks reconcile payment state.
- **Variables.** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Optional `STRIPE_API_HOST`, `STRIPE_API_PORT`, `STRIPE_API_PROTOCOL` only for the local mock.
- **Local.** Use `pk_test_` / `sk_test_` keys, or the mock started by `scripts/local-integration`. The portal hides card payment when the publishable key is empty.
- **Production.** Live keys and a webhook endpoint at `/api/stripe/webhook`. Never put `sk_live_` in `.env.local` for day-to-day development.

Wire instructions on invoices come from `INVOICE_WIRE_INSTRUCTIONS` or `PORTAL_WIRE_INSTRUCTIONS`. If both are empty, the app uses the remittance text in `src/lib/billing/invoiceWireInstructions.ts`.

## Microsoft Graph (email)

- **Purpose.** Send invite, order, IVR, and support mail. This is not user login.
- **Variables.** `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`, `EMAIL_MODE`. Optional type-specific from-addresses, `EMAIL_REPLY_TO`, `EMAIL_TEST_TO`, `ORDER_NOTIFY_TO`, `ORDER_NOTIFY_CC`, `IVR_STAFF_NOTIFY_TO`, `IVR_TEAM_NOTIFY_TO`, `IVR_TEAM_EMAILS`, `SUPPORT_REQUEST_EMAIL`.
- **Local.** `EMAIL_MODE=disabled`, or leave it unset. Unset does not send. `EMAIL_MODE=graph` sends when Azure credentials exist.
- **Production.** `EMAIL_MODE=graph` with an app registration that can send as the from-address (`Mail.Send`, client credentials). If `EMAIL_MODE` is unset in production, mail is disabled.

Support requests are stored even when no recipient is configured. Set `SUPPORT_REQUEST_EMAIL` so they are also emailed. IVR team notifications go to `IVR_TEAM_NOTIFY_TO`, then `EMAIL_TEST_TO`. There is no hardcoded recipient.

## FedEx

- **Purpose.** Shipping labels and rate quotes for fulfillments.
- **Variables.** `FEDEX_ENV`, `FEDEX_CLIENT_ID`, `FEDEX_CLIENT_SECRET`, `FEDEX_ACCOUNT_NUMBER`, ship-from address variables, optional `FEDEX_LABEL_STOCK_TYPE` and `FEDEX_DEBUG`.
- **Local.** Leave `FEDEX_ENV` unset or set it to `sandbox`. The client uses the sandbox unless `FEDEX_ENV=production`.
- **Production.** Production credentials and `FEDEX_ENV=production`. Label validation steps are in `docs/FedEx_Label_Validation_Steps.md`.

## OpenAI

- **Purpose.** Note extraction, debrief atomic facts, transcription, product-intelligence research, and optional briefing drafts.
- **Variables.** `OPENAI_API_KEY`. Optional model overrides listed in `.env.example`.
- **Local.** Leave the key unset to exercise rule-based and fixture paths. `AI_NOTE_CAPTURE_MOCK_ONLY=1` forces the mock capture path. `OBSERVATION_FACT_LLM_FALLBACK=0` disables the observation LLM fallback.
- **Production.** Set the key. GPT is the primary Universal Facts extractor only when `USE_GPT_UNIVERSAL_FACT_EXTRACTOR=1`. Otherwise rules remain primary and GPT is used where individual call sites already require a key.

## Document conversion

- **Purpose.** Turn DOCX IVR templates into PDF.
- **Variables.** `CLOUDCONVERT_API_KEY`, `CONVERTAPI_SECRET`, optional `LIBREOFFICE_PATH`.
- **Local.** LibreOffice via `LIBREOFFICE_PATH` when it is installed. Cloud APIs are optional.
- **Production.** On Vercel, LibreOffice is unavailable, so CloudConvert or ConvertAPI is required. Details are in `docs/PDF_CONVERSION.md`.

## Partner orders (Nimble)

- **Purpose.** External partners submit orders and receive fulfillment callbacks.
- **Variables.** `INTEGRATION_CREDENTIALS_KEY` (encrypts stored partner secrets), `INTEGRATION_WORKER_SECRET`, `INTEGRATION_OUTBOUND_ENABLED`. Partner API keys are created in Admin → Integrations and stored as a hash, not as env vars. `NIMBLE_STAGING_KEY` is read only by `scripts/local-integration` for the local lab.
- **Local.** `npm run dev:local-integration` uses the `embedded-postgres` and `pg` devDependencies. It starts Postgres, a mock Stripe, and Next on port 3010 using `.env.local.test`. It refuses production hosts, live Stripe keys, and `FEDEX_ENV=production`. Outbound delivery stays disabled unless you turn it on for that lab.
- **Production.** Inbound `Authorization: Bearer` keys issued in admin. Outbound jobs run through `/api/internal/integrations/outbound/worker` with `INTEGRATION_WORKER_SECRET`. Leave `INTEGRATION_OUTBOUND_ENABLED` false until callbacks are meant to leave the network.

Contract: `docs/openapi/partner-orders-v1.yaml` and `docs/integrations/nimble-developer-guide.md`.

## Vercel

- **Purpose.** Hosting. `VERCEL` and `VERCEL_URL` are set by the platform.
- **Local.** Ignore them. A `VERCEL_OIDC_TOKEN` in a developer `.env.local` is a local CLI token. Do not share that file.
- **Production.** Configure the variables from `.env.example` in the Vercel project. Do not commit `.vercel`.

## Internal accounts

`PRODUCT_FILES_ACCOUNT_ID` is an `accounts.id` used when a product file has no account of its own. `INTERNAL_VENDOR_ACCOUNT_ID` is the `accounts.id` that owns the internal dropship vendor directory on fulfillment screens. If the vendor variable is unset, the fulfillment code accepts `PRODUCT_FILES_ACCOUNT_ID` as a legacy fallback. Neither path uses a hardcoded account id. A missing or invalid value is shown as a configuration error, and the order's own vendors still load.

## Cron

`/api/cron/surgical-case-notifications` expects `Authorization` using `SURGICAL_CASE_NOTIFICATIONS_CRON_SECRET`. Email sending for that job also requires `SURGICAL_CASE_NOTIFICATIONS_EMAIL=true`.
