import { http, HttpResponse } from "msw";
import { randomUUID } from "node:crypto";
import {
  newEngagementHandlers,
  newEngagementTestIds,
  resetNewEngagementHandlerState,
} from "@/test/msw/newEngagementHandlers";

export { newEngagementTestIds };

let logUpdateCallCount = 0;
let lastLogUpdateBody: Record<string, unknown> | null = null;

export function resetEngagementCreationRegressionState() {
  resetNewEngagementHandlerState();
  logUpdateCallCount = 0;
  lastLogUpdateBody = null;
}

export function getLogUpdateCallCount() {
  return logUpdateCallCount;
}

export function getLastLogUpdateBody() {
  return lastLogUpdateBody;
}

const introCallSuggestedPrepare = {
  engagement_id: newEngagementTestIds.engagementId,
  provider_snapshot: {
    provider_id: newEngagementTestIds.providerId,
    display_name: "Jordan Rivera",
    specialty: "General Surgery",
    organization_name: "Metro General",
    location_label: null,
    relationship_status_label: "Developing",
    influence_level_label: null,
    last_engagement_date_label: null,
    last_engagement_title: null,
    last_engagement_href: null,
  },
  upcoming_engagement: {
    title: "Intro Call",
    engagement_type: "intro_call",
    type_label: "Intro Call",
    status_label: "Planned",
    datetime_label: null,
    organization_name: "Metro General",
    opportunity_label: null,
    opportunity_href: null,
    office_visit_context: null,
  },
  at_a_glance_stats: [],
  known_intelligence: { bullets: [], last_key_insight: null },
  recent_activity: { items: [], timeline_href: null },
  suggested_talking_points: { points: ["Who coordinates OR access from the office side?"], context_label: null },
  suggested_goal: {
    goal: "Confirm whether observation is realistic and who owns scheduling on the office side.",
    why: "Intro calls should clarify access path before deeper discovery.",
  },
  risks_barriers: { risks: [] },
  recommended_next_actions: { actions: [], primary_cta: null },
  what_matters_most: {
    title: "Tactical Priorities",
    lines: [
      {
        id: "discovery_goal",
        label: "Discovery focus",
        value: "Confirm whether observation is realistic and who owns scheduling on the office side.",
      },
      {
        id: "important_unknown",
        label: "Operational unknown",
        value: "Who coordinates OR access from the office side?",
      },
    ],
  },
  preparation: {
    is_prepared: false,
    prepared_at: null,
    prepared_at_label: null,
    checklist: [],
  },
  outcome: { status: "planned", capture_label: null, capture_href: null },
  plan_fields: {
    observation_goal: null,
    pre_observation_probes: null,
    pre_observation_value_hypothesis: null,
    pre_observation_planned_close: null,
    engagement_purpose: null,
    next_action: null,
  },
  tactical_asks: [],
  edit_plan_href: `/portal/sales/engagements/${newEngagementTestIds.engagementId}?focus=pre_call`,
  provider_href: `/portal/sales/providers/${newEngagementTestIds.providerId}?tab=overview`,
  capture_scope: {
    providerId: newEngagementTestIds.providerId,
    providerLabel: "Jordan Rivera",
    organizationId: newEngagementTestIds.organizationId,
    organizationLabel: "Metro General",
    engagementTypeLabel: "Intro Call",
  },
};

export const engagementCreationRegressionHandlers = [
  ...newEngagementHandlers,
  http.post(
    `/api/portal/sales/providers/${newEngagementTestIds.providerId}/log-update`,
    async ({ request }) => {
      logUpdateCallCount += 1;
      lastLogUpdateBody = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ ok: true, saved: { fields: [], note: false } });
    },
  ),
  http.post(
    `/api/portal/sales/engagements/${newEngagementTestIds.engagementId}/prepare/open`,
    () =>
      HttpResponse.json({
        ok: true,
        briefing_opened: true,
        suggestions_generated_at: "2026-06-01T12:00:00.000Z",
        engagement: { id: newEngagementTestIds.engagementId, engagement_type: "intro_call" },
        prepare: introCallSuggestedPrepare,
      }),
  ),
  http.post("/api/portal/sales/engagements/:engagementId/prepare/open", ({ params }) =>
    HttpResponse.json({
      ok: true,
      briefing_opened: true,
      suggestions_generated_at: "2026-06-01T12:00:00.000Z",
      engagement: { id: String(params.engagementId), engagement_type: "intro_call" },
      prepare: {
        ...introCallSuggestedPrepare,
        engagement_id: String(params.engagementId),
      },
    }),
  ),
  http.post(
    `/api/portal/sales/engagements/${newEngagementTestIds.engagementId}/prepare/debrief/analyze`,
    async ({ request }) => {
      const body = (await request.json()) as { narrative?: string };
      const narrative = String(body.narrative ?? "");
      return HttpResponse.json({
        ok: true,
        analysis: {
          insights: [],
          log_update: {
            sourceText: narrative,
            suggestedUpdates: [],
            fieldUpdates: [
              {
                id: "ai-partial-0",
                label: "Scheduling contact partially mapped",
                dbKey: "provider_scheduling_contact",
                proposedValue: "[Partial lead] Karen\nKaren handles scheduling.",
                accepted: false,
                conflict: null,
                proposedScope: "provider",
                scopeReason: "",
                proposedDestination: "provider",
                destinationReason: "",
              },
            ],
            intelligenceReview: {
              confirmedUpdates: [],
              partiallyConfirmed: [],
              stillWorthConfirming: [],
              relatedOperationalAreas: [],
            },
            stillMissing: [],
            saveAsNoteAccepted: false,
            usesProviderIntelligence: true,
            aiMapping: {
              summary: narrative,
              confidence: "medium",
              reasoning: "",
              source_scope: "debrief",
              operational_signals: [],
              confirmed_updates: [],
              partial_updates: [
                {
                  domain: "scheduling",
                  label: "Scheduling contact partially mapped",
                  value: "[Partial lead] Karen\nKaren handles scheduling.",
                  still_needs: ["Confirm contact info"],
                  confidence: "medium",
                  save_target: "provider",
                  reasoning: "Named scheduling contact",
                },
              ],
              still_to_validate: [],
              recommended_next_moves: [],
              do_not_update: [],
            },
            mappingSource: "openai",
          },
        },
        propagation_targets: [],
        discovery_context: null,
        provider_contact_snapshot: {},
      });
    },
  ),
  http.patch("/api/portal/sales/engagements/:engagementId", async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(params.engagementId);
    return HttpResponse.json({
      ok: true,
      engagement: {
        id,
        engagement_type: "intro_call",
        status: body.status ?? "completed",
        provider_id: newEngagementTestIds.providerId,
        organization_id: newEngagementTestIds.organizationId,
        planning_mode: "plan_first",
        planning_status: body.mark_debrief_completed ? "planned" : "not_planned",
        briefing_id: null,
        notes: body.notes ?? null,
        debrief_completed: Boolean(body.mark_debrief_completed),
        debrief_completed_at: body.mark_debrief_completed ? new Date().toISOString() : null,
      },
    });
  }),
  http.get("/api/portal/sales/engagements/:engagementId", ({ params }) =>
    HttpResponse.json({
      ok: true,
      engagement: {
        id: String(params.engagementId),
        engagement_type: "intro_call",
        status: "planned",
        provider_id: newEngagementTestIds.providerId,
        organization_id: newEngagementTestIds.organizationId,
        planning_mode: "quick_add",
        planning_status: "not_planned",
        briefing_id: null,
        prepared_at: null,
        pre_call_plan_updated_at: null,
        observation_goal: null,
        notes: null,
        debrief_completed: false,
      },
      provider: { id: newEngagementTestIds.providerId, display_name: "Jordan Rivera" },
      organization: { id: newEngagementTestIds.organizationId, name: "Metro General" },
      preparation: {
        is_prepared: false,
        prepared_at: null,
        prepared_at_label: null,
        checklist: [],
      },
      plan_progress: { filled: 0, total: 5 },
    }),
  ),
];

export function createdEngagementIdFromResponse() {
  return randomUUID();
}
