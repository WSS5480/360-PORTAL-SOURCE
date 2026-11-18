# Architecture

360 Portal is one Next.js app with three surfaces: the customer portal, the internal admin console, and the surgical sales workspace. They share Supabase Auth, Postgres, and Storage. Sales intelligence is a separate domain inside `src/lib/surgical-sales` and must stay evidence-based.

## Request flow

Browser routes live in `src/app`. Server Components and route handlers call `src/lib`. The browser Supabase client is `src/lib/supabase/browser.ts`. Server code uses `src/lib/supabase/server.ts` for the user session and `src/lib/supabase/admin.ts` for the service role. Middleware in `src/middleware.ts` refreshes the auth cookie and gates `/admin` and `/portal`.

Service-role keys never belong in client components. `NEXT_PUBLIC_*` values are baked into the browser bundle at build time.

## Sales objects

```
Organization (facility)
        │
        ▼
Provider (surgical_sales_contacts)  ← primary intelligence object
        │
        ├── Engagements (intro call, observation, discussion, debrief, …)
        ├── Cases (observation or product support)
        └── Opportunities (pipeline / revenue stages; created explicitly)
```

A provider is not an organization. A case is not an engagement. An opportunity is not created when a provider or case is saved. Opportunity stages are `discovery`, `clinical_validation`, `evaluation_planned`, `evaluation_active`, `outcome_review`, `preference_card_progress`, `adoption_expanding`, `won`, and `lost` (`src/lib/sales/stages.ts`).

## Intelligence principles

These rules are enforced by extractors, review cards, and regression fixtures. Do not collapse them into one status.

- Mentioned is not used.
- Interested is not evaluating.
- Evaluating is not using.
- A future action is not a completed action.
- Extraction and presentation are separate. Models return facts and evidence. Screens render templates and quotes.
- Fixes belong in the shared pipeline so the next note behaves the same way, not in a one-note special case.
- Snapshot and evidence corrections have to show up on the provider intelligence timeline, not only on the note that was just saved.

## Universal Facts

Universal Facts is the canonical clinical record when it is enabled.

1. A capture row stores the raw note and a **declared** source type (`intro_call`, `observation_case`, `debrief_note`, `product_support_case`, and the other values in `UNIVERSAL_DECLARED_SOURCE_TYPES`). The caller sets the source. The model does not guess it.
2. Facts are rows on `universal_surgical_facts`: concept, assertion level, confidence, evidence text, negation, and links back to the provider, organization, case, or engagement.
3. Read models and adapters turn those rows into briefing lines, “what we know,” and timeline events. If the flag is off or no rows exist, older observation and field-intelligence builders still supply the screen.

Assertion levels on a fact: `provider_reported`, `observed`, `case_supported`, `validated`, `rejected`, `evaluated`, `outcome_reported`. Precedence work under `ASSERTION_AWARE_INTELLIGENCE` ranks provider-reported below observed below validated, so a weaker note cannot block a stronger observation.

Relevant flags, all default off unless set to `1`:

| Flag | Effect |
| --- | --- |
| `UNIVERSAL_SURGICAL_FACTS_PERSIST` | Extract and store canonical facts. |
| `USE_GPT_UNIVERSAL_FACT_EXTRACTOR` | GPT is the primary extractor. Rules still validate and fall back. |
| `UNIVERSAL_FACTS_READ_MODEL` | Screens prefer Universal Facts over legacy read paths. |
| `UNIVERSAL_SURGICAL_FACTS_PANEL` / `NEXT_PUBLIC_UNIVERSAL_SURGICAL_FACTS_PANEL` | Shows the experimental comparison panel. |
| `ASSERTION_AWARE_INTELLIGENCE` | Stamps assertion and enforces precedence together. |

Code: `src/lib/surgical-sales/universalExtractor/`. Tables: `db/migrations/20260667_universal_surgical_facts.sql` and the follow-up concept migrations.

## Debrief and review

Engagement debrief dictation is a workflow, not a second source of clinical truth.

```
Transcript
  → atomic facts (OpenAI, facts only)
  → normalize and dedupe
  → classify and apply rules
  → review cards from templates
  → rep accepts
  → CRM field updates and tasks
```

The rep-facing cards are built in `src/lib/surgical-sales/debriefIntelligencePipeline/`. Card copy is deterministic. The model does not write the labels the rep clicks. Accepting a card is what writes CRM fields. Universal Facts can supply the clinical evidence behind those cards when the read flags are on. Contacts, credentialing, and next actions stay workflow state. They are not clinical facts.

## Observation and product support

Observation cases run an observation intelligence path (note save, findings, evidence pillars, debrief readiness) in `src/lib/surgical-sales/observationIntelligence/`. Product-support cases have their own briefing and intelligence views. Both can also emit Universal Facts. Leave the legacy builders in place until a flag-gated read path fully covers that screen and the regression suite agrees.

Dev-only runners:

- `/dev/observation-intelligence-tests` runs the in-repo observation suite. It 404s in production.
- `npm run test:intelligence-regression` is the fixture suite to run before changing extraction or rendering.

## Orders, billing, and IVR

Customer orders, invoices, Stripe payments, wire proof, fulfillment, inventory lots, and FedEx labels are the admin and portal side of the app. IVR requests can contain PHI (patient and insurance data) and use a private storage bucket. Read `docs/HIPAA-IVR.md` before changing IVR storage or email.

Partner clinics can create orders through `POST /api/integrations/v1/orders`. Credentials are hashed. Outbound status callbacks sit in an outbox and are delivered only when the worker is enabled. See `docs/INTEGRATIONS.md`.

## What not to simplify

Several modules look overlapping because the system was migrated in stages: observation intelligence, debrief atomic facts, Universal Facts, commercial reasoning, and stored CRM columns. Each still has callers. Trace a screen to its builder before deleting a function. Named-provider traces and one-off audit notes are not part of the design. The behavior they described, when it was kept, is in the pipeline and the regression fixtures.
