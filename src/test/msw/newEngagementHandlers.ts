import { http, HttpResponse } from "msw";
import { randomUUID } from "node:crypto";

const providerId = randomUUID();
const organizationId = randomUUID();
const engagementId = randomUUID();

export const newEngagementTestIds = { providerId, organizationId, engagementId };

type CreatedEngagement = Record<string, unknown> & { id: string };

let lastCreatedEngagement: CreatedEngagement | null = null;
let engagementPatchState: CreatedEngagement = {
  id: engagementId,
  engagement_type: "intro_call",
  provider_id: providerId,
  organization_id: organizationId,
  planning_mode: "quick_add",
  planning_status: "not_planned",
  briefing_id: null,
  prepared_at: null,
  pre_call_plan_updated_at: null,
};

export function resetNewEngagementHandlerState() {
  lastCreatedEngagement = null;
  engagementPatchState = {
    id: engagementId,
    engagement_type: "intro_call",
    provider_id: providerId,
    organization_id: organizationId,
    planning_mode: "quick_add",
    planning_status: "not_planned",
    briefing_id: null,
    prepared_at: null,
    pre_call_plan_updated_at: null,
  };
}

export function getLastCreatedEngagement() {
  return lastCreatedEngagement;
}

export const newEngagementHandlers = [
  http.get("/api/portal/sales/surgical-contacts", () =>
    HttpResponse.json({
      ok: true,
      contacts: [
        {
          id: providerId,
          first_name: "Jordan",
          last_name: "Rivera",
          organization_links: [
            {
              account_id: organizationId,
              is_primary_org: true,
              is_active: true,
              accounts: { id: organizationId, name: "Metro General" },
            },
          ],
        },
      ],
    }),
  ),
  http.get("/api/portal/sales/surgical-accounts", () =>
    HttpResponse.json({
      ok: true,
      organizations: [{ id: organizationId, name: "Metro General" }],
    }),
  ),
  http.get("/api/portal/sales/opportunities", () =>
    HttpResponse.json({ ok: true, opportunities: [] }),
  ),
  http.get("/api/portal/sales/surgical-cases", () =>
    HttpResponse.json({ ok: true, cases: [] }),
  ),
  http.get("/api/portal/sales/engagements/wizard-prep", () =>
    HttpResponse.json({
      ok: true,
      suggested_template_id: null,
      templates: [],
      playbook: null,
    }),
  ),
  http.get(`/api/portal/sales/providers/${providerId}`, () =>
    HttpResponse.json({
      ok: true,
      organization_links: [
        {
          account_id: organizationId,
          is_primary_org: true,
          is_active: true,
          accounts: { id: organizationId, name: "Metro General" },
        },
      ],
      primary_organization: { id: organizationId, name: "Metro General" },
    }),
  ),
  http.post("/api/portal/sales/engagements", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const id = randomUUID();
    lastCreatedEngagement = {
      id,
      ...body,
      planning_mode: body.planning_mode ?? "plan_first",
      planning_status: body.planning_status ?? "not_planned",
      briefing_id: body.briefing_id ?? null,
    };
    return HttpResponse.json({
      ok: true,
      engagement_id: id,
      engagement: lastCreatedEngagement,
    });
  }),
  http.get(`/api/portal/sales/engagements/${engagementId}`, () =>
    HttpResponse.json({
      ok: true,
      engagement: engagementPatchState,
    }),
  ),
  http.patch(`/api/portal/sales/engagements/${engagementId}`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.start_field_briefing === true) {
      engagementPatchState = {
        ...engagementPatchState,
        planning_mode: "plan_first",
        planning_status: "planning_in_progress",
      };
    } else {
      engagementPatchState = { ...engagementPatchState, ...body };
    }
    if (engagementPatchState.planning_status === "planned" && !engagementPatchState.briefing_id) {
      engagementPatchState.briefing_id = engagementId;
    }
    return HttpResponse.json({
      ok: true,
      engagement: engagementPatchState,
    });
  }),
  http.post(`/api/portal/sales/engagements/${engagementId}/prepare/open`, () => {
    engagementPatchState = {
      ...engagementPatchState,
      planning_mode: "plan_first",
      planning_status: "planning_in_progress",
    };
    return HttpResponse.json({
      ok: true,
      briefing_opened: true,
      suggestions_generated_at: "2026-06-01T12:00:00.000Z",
      engagement: engagementPatchState,
      prepare: {
        engagement_id: engagementId,
        provider_snapshot: { provider_id: "provider-1", display_name: "Dr. Test" },
        upcoming_engagement: { type_label: "Intro Call", status_label: "Planned" },
        what_matters_most: { title: "Tactical Priorities", lines: [] },
        plan_fields: {},
        preparation: { is_prepared: false },
      },
    });
  }),
];
