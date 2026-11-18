import { http, HttpResponse } from "msw";
import { randomUUID } from "node:crypto";

const accountId = randomUUID();
const surgeonId = "surgeon-launch-001";
const productId = randomUUID();
const skuId = randomUUID();

const planningCaseId = "planning-case-test-001";

export const newCaseTestIds = { accountId, surgeonId, productId, skuId, planningCaseId };

export const newSurgicalCaseHandlers = [
  http.get("/api/portal/me", () =>
    HttpResponse.json({ ok: true, user: { id: randomUUID() } }),
  ),
  http.get("/api/portal/sales/surgical-accounts", () =>
    HttpResponse.json({
      ok: true,
      organizations: [{ id: accountId, name: "Metro General" }],
    }),
  ),
  http.get("/api/portal/sales/surgical-catalog/products", () =>
    HttpResponse.json({
      ok: true,
      products: [{ id: productId, name: "ACSIS" }],
    }),
  ),
  http.get("/api/portal/sales/surgical-cases/case-templates", () =>
    HttpResponse.json({ ok: true, templates: [] }),
  ),
  http.get("/api/portal/sales/opportunities", () =>
    HttpResponse.json({ ok: true, opportunities: [] }),
  ),
  http.get("/api/portal/sales/surgical-catalog/skus", () =>
    HttpResponse.json({
      ok: true,
      skus: [{ id: skuId, sku: "SKU-100", description: "Test SKU" }],
    }),
  ),
  http.get("/api/portal/sales/surgical-accounts/:accountId", () =>
    HttpResponse.json({ ok: true, contacts: [], relationships: [] }),
  ),
  http.get("/api/portal/sales/surgical-contacts", () =>
    HttpResponse.json({ ok: true, contacts: [] }),
  ),
  http.get("/api/portal/sales/surgical-contact-relationships", () =>
    HttpResponse.json({ ok: true, relationships: [] }),
  ),
  http.get("/api/portal/sales/providers", () =>
    HttpResponse.json({ ok: true, providers: [] }),
  ),
  http.get(`/api/portal/sales/providers/${surgeonId}`, () =>
    HttpResponse.json({
      ok: true,
      provider: {
        id: surgeonId,
        first_name: "Alex",
        last_name: "Surgeon",
        provider_procedure_focus: "interest_in_acsis_discussed",
        provider_evaluation_openness: "yes",
      },
      specialty: "General surgery",
      primary_organization: { id: accountId, name: "Metro General", territory: null },
      organization_links: [{ account_id: accountId, accounts: { id: accountId, name: "Metro General" } }],
      planning_completion: {
        status: "in_progress",
        sections: [],
        percent: 40,
      },
      opportunities: [],
    }),
  ),
  http.get("/api/portal/sales/surgical-cases/new-defaults", () =>
    HttpResponse.json({
      ok: true,
      defaults: {
        preferred_surgeon_contact_id: null,
        sku_rank: [],
        suggested_expected_quantity: 1,
        suggested_procedure_type: null,
        procedure_suggestions: [],
        recent_cases: [],
      },
    }),
  ),
  http.post("/api/portal/sales/surgical-cases", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ok: true,
      case: { id: randomUUID(), ...body },
    });
  }),
  http.get(`/api/portal/sales/surgical-cases/${planningCaseId}`, () =>
    HttpResponse.json({
      ok: true,
      case: {
        id: planningCaseId,
        account_id: accountId,
        surgeon_contact_id: surgeonId,
        case_date: "2026-05-27",
        case_time: "",
        case_type: "observation",
        procedure_type: "General surgery",
        status: "draft",
        notes: null,
        follow_up_needed: false,
        related_opportunity_id: null,
        observation_goal: "",
        observation_key_questions: "",
        observation_signals_to_validate: "",
        observation_access_scheduling_owner: "",
        observation_access_pathway: null,
        observation_access_credentialing: "unknown",
        observation_access_vendor_restrictions: null,
        observation_access_preferred_timing: null,
      },
      account: { id: accountId, name: "Metro General" },
    }),
  ),
  http.patch(`/api/portal/sales/surgical-cases/${planningCaseId}`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ok: true,
      case: { id: planningCaseId, ...body },
    });
  }),
];

export function productSupportPlanningCaseHandler() {
  return http.get(`/api/portal/sales/surgical-cases/${planningCaseId}`, () =>
    HttpResponse.json({
      ok: true,
      case: {
        id: planningCaseId,
        account_id: accountId,
        surgeon_contact_id: surgeonId,
        case_date: "2026-05-27",
        case_time: "",
        case_type: "product_support",
        procedure_type: "Lap chole support",
        status: "draft",
      },
      account: { id: accountId, name: "Metro General" },
    }),
  );
}
