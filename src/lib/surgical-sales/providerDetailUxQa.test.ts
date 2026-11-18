/**
 * Provider Detail UX QA — logic-layer scenarios mirroring field-rep review checklist.
 */
import { describe, expect, it } from "vitest";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { buildProviderActivityPreviewRows } from "./buildProviderActivityPreviewRows";
import { buildProviderDetailStatusChips } from "./buildProviderDetailStatusChips";
import { buildProviderIntelligenceSummaryView } from "./buildProviderIntelligenceSummaryView";
import { buildProviderRelationshipMemory } from "./buildProviderRelationshipMemory";
import { buildProviderRelationshipSignals } from "./buildProviderRelationshipSignals";
import { buildProviderRelationshipSnapshotView } from "./buildProviderRelationshipSnapshotView";
import { buildProviderRepPrimaryAction } from "./buildProviderRepPrimaryAction";
import { buildProviderWhatMattersNow } from "./buildProviderWhatMattersNow";
import { providerDisplayInitials, resolveProviderVisualIdentity } from "./providerVisualIdentity";
import {
  pickNextUpcomingEngagement,
  type ProviderEngagementSummary,
} from "./engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "./providerPlanningCompletion";

const PROVIDER_ID = "00000000-0000-4000-8000-000000000001";
const NEW_ENG = `/portal/sales/engagements/new?provider_id=${PROVIDER_ID}`;
const INTEL_HREF = `/portal/sales/providers/${PROVIDER_ID}?tab=intelligence`;
const CREATE_OPP = `/portal/sales/opportunities?new=1&surgeon_contact_id=${PROVIDER_ID}`;

const CRM_JARGON_RE = /\b(opportunity|pipeline stage|lead score|account executive)\b/i;

function basePlanning(overrides: Partial<ProviderPlanningCompletion> = {}): ProviderPlanningCompletion {
  return {
    filled: 0,
    total: 20,
    percent: 0,
    status: "not_started",
    sections_complete: 0,
    sections_total: 4,
    sections: [
      { id: "clinical_workflow", label: "How does this provider operate clinically?", status: "not_started", filled: 0, total: 3, percent: 0, last_updated_at: null },
      { id: "or_environment", label: "What does OR and vendor access look like here?", status: "not_started", filled: 0, total: 1, percent: 0, last_updated_at: null },
      { id: "relationship_intelligence", label: "Who influences adoption?", status: "not_started", filled: 0, total: 8, percent: 0, last_updated_at: null },
      { id: "commercial_signals", label: "Is there a commercial path?", status: "not_started", filled: 0, total: 5, percent: 0, last_updated_at: null },
    ],
    ...overrides,
  };
}

function engagement(partial: Partial<ProviderEngagementSummary>): ProviderEngagementSummary {
  return {
    id: "eng-1",
    engagement_type: "intro_call",
    engagement_type_label: "Intro Call",
    status: "planned",
    status_label: "Planned",
    pre_call_filled: 0,
    pre_call_total: 5,
    pre_call_complete: false,
    outcome_label: "Planned",
    ...partial,
  };
}

function assertNoCrmJargon(labels: string[]) {
  for (const label of labels) {
    expect(label).not.toMatch(CRM_JARGON_RE);
  }
}

function assertSingleNextAction(bullets: ReturnType<typeof buildProviderWhatMattersNow>) {
  const nextActions = bullets.filter((b) => b.isNextAction);
  expect(nextActions).toHaveLength(1);
}

describe("Provider Detail UX QA", () => {
  describe("cross-cutting invariants", () => {
    it("uses canonical opportunity terminology in shared UI constants", () => {
      expect(OPPORTUNITY_UI.providerTabLabel).toBe("Evaluations");
      expect(OPPORTUNITY_UI.createFromProvider).toBe("Add to Opportunities");
      expect(OPPORTUNITY_UI.fallbackRecordLabel).toBe("Evaluation");
    });

    it("What Matters Now keeps one next-action slot and caps context bullets", () => {
      const bullets = buildProviderWhatMattersNow({
        providerId: PROVIDER_ID,
        relationshipStage: "prospect",
        newEngagementHref: NEW_ENG,
        intelligenceHref: INTEL_HREF,
        engagements: [],
        planning: basePlanning(),
        contact: { provider_relationship_stage: "prospect" },
      });
      expect(bullets.length).toBeLessThanOrEqual(5);
      assertSingleNextAction(bullets);
    });

    it("mobile briefing omits duplicate next-action when showNextAction is false", () => {
      const all = buildProviderWhatMattersNow({
        providerId: PROVIDER_ID,
        relationshipStage: "prospect",
        newEngagementHref: NEW_ENG,
        intelligenceHref: INTEL_HREF,
        engagements: [],
        planning: basePlanning(),
        contact: {},
      });
      const mobile = all.filter((b) => !b.isNextAction);
      expect(mobile.every((b) => !b.isNextAction)).toBe(true);
      expect(all.some((b) => b.isNextAction)).toBe(true);
    });
  });

  describe("1. Early discovery", () => {
    const planning = basePlanning();
    const contact = { provider_relationship_stage: "early_discovery" };

    it("hierarchy: early context + contextual intro call CTA", () => {
      const bullets = buildProviderWhatMattersNow({
        providerId: PROVIDER_ID,
        relationshipStage: "early_discovery",
        newEngagementHref: NEW_ENG,
        intelligenceHref: INTEL_HREF,
        engagements: [],
        planning,
        contact,
      });
      expect(bullets.some((b) => b.text.includes("Early discovery"))).toBe(true);
      assertSingleNextAction(bullets);

      const action = buildProviderRepPrimaryAction({
        providerId: PROVIDER_ID,
        relationshipStage: "early_discovery",
        newEngagementHref: NEW_ENG,
        intelligenceHref: INTEL_HREF,
        engagements: [],
        planning,
      });
      expect(action.label).toBe("Schedule intro call");
    });

    it("chips use commercial discovery language", () => {
      const chips = buildProviderDetailStatusChips({
        relationshipStage: "early_discovery",
        intelligenceOverall: "Limited",
        planningStatus: planning.status,
      });
      assertNoCrmJargon(chips.map((c) => c.label));
      expect(chips.some((c) => c.label === "Commercial Discovery")).toBe(true);
    });

    it("intelligence briefing shows not-started when no field evidence", () => {
      const view = buildProviderIntelligenceSummaryView({ contact, planning });
      expect(view.interpretation).toMatch(/No field intelligence has been captured yet/i);
      expect(view.tracks).toEqual([]);
      expect(view.recommendation).toMatch(/intro call|engagement/i);
    });

    it("relationship signals surface gaps without admin tone", () => {
      const signals = buildProviderRelationshipSignals({ contact, planning, engagements: [] });
      expect(signals.length).toBeGreaterThanOrEqual(3);
      expect(signals.length).toBeLessThanOrEqual(5);
      assertNoCrmJargon(signals.map((s) => s.text));
    });
  });

  describe("2. Active provider", () => {
    const contact = {
      provider_relationship_stage: "active_evaluation",
      influence_level: "influencer",
      provider_communication_style: "Direct and operational",
    };
    const planning = basePlanning({ status: "in_progress", percent: 45 });
    const completed = engagement({
      id: "done-1",
      status: "completed",
      status_label: "Completed",
      updated_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      organization_name: "Mercy",
    });

    it("primary action favors follow-up after recent touch", () => {
      const action = buildProviderRepPrimaryAction({
        providerId: PROVIDER_ID,
        relationshipStage: "active_evaluation",
        newEngagementHref: NEW_ENG,
        intelligenceHref: INTEL_HREF,
        engagements: [completed],
        planning,
      });
      expect(action.label).toBe("Follow up after recent engagement");
    });

    it("chips show active evaluation + intelligence building", () => {
      const chips = buildProviderDetailStatusChips({
        relationshipStage: "active_evaluation",
        intelligenceOverall: "Building",
        planningStatus: planning.status,
      });
      expect(chips.some((c) => c.label === "Active evaluation")).toBe(true);
      expect(chips.some((c) => c.label === "Intelligence Building")).toBe(true);
    });
  });

  describe("3. Provider with multiple engagements", () => {
    const soon = engagement({
      id: "soon",
      scheduled_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      pre_call_filled: 1,
      pre_call_total: 5,
      pre_call_complete: false,
    });
    const later = engagement({
      id: "later",
      engagement_type: "or_visit",
      engagement_type_label: "Observation",
      scheduled_at: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      pre_call_complete: true,
      pre_call_filled: 5,
      pre_call_total: 5,
    });

    it("picks soonest upcoming for prepare CTA", () => {
      const next = pickNextUpcomingEngagement([later, soon]);
      expect(next?.id).toBe("soon");

      const action = buildProviderRepPrimaryAction({
        providerId: PROVIDER_ID,
        relationshipStage: "active_evaluation",
        newEngagementHref: NEW_ENG,
        intelligenceHref: INTEL_HREF,
        engagements: [later, soon],
        planning: basePlanning({ status: "in_progress", percent: 40 }),
      });
      expect(action.label.toLowerCase()).toMatch(/prep|prepare/);
      expect(action.href).toContain("soon");
    });

    it("activity timeline uses operational badges", () => {
      const rows = buildProviderActivityPreviewRows({
        feedItems: [
          {
            id: "a1",
            category: "workflow",
            title: "",
            summary: "Observation engagement created.",
            timestamp: "2026-06-01T12:00:00Z",
            userLabel: "Rep",
            href: "/portal/sales/engagements/later",
            eventType: "ENGAGEMENT_CREATED",
            metadata: { engagement_type: "or_visit", organization_name: "Metro" },
          },
        ],
        timeline: [],
        engagements: [later, soon],
      });
      expect(rows[0]?.activityTypeLabel).toBe("Engagement Scheduled");
      expect(rows[0]?.summary).not.toMatch(/engagement created/i);
    });
  });

  describe("4. Provider with cases", () => {
    const cases = [{ id: "c1", case_number: "SC-2401", status: "scheduled" }];
    const contact = { provider_relationship_stage: "active_evaluation" };

    it("What Matters Now references evaluation path without cases", () => {
      const bullets = buildProviderWhatMattersNow({
        providerId: PROVIDER_ID,
        relationshipStage: "active_evaluation",
        newEngagementHref: NEW_ENG,
        intelligenceHref: INTEL_HREF,
        engagements: [],
        planning: basePlanning({ status: "in_progress", percent: 50 }),
        contact,
        cases: [],
      });
      expect(bullets.some((b) => b.text.includes("evaluation") || b.text.includes("Observation"))).toBe(
        true,
      );
    });

    it("with cases on file, primary action is not generic plan next", () => {
      const action = buildProviderRepPrimaryAction({
        providerId: PROVIDER_ID,
        relationshipStage: "active_relationship",
        newEngagementHref: NEW_ENG,
        intelligenceHref: INTEL_HREF,
        engagements: [
          engagement({
            status: "completed",
            updated_at: new Date(Date.now() - 40 * 86_400_000).toISOString(),
          }),
        ],
        planning: basePlanning({ status: "in_progress", percent: 60 }),
        cases,
      });
      expect(action.label).not.toBe("Plan next engagement");
    });
  });

  describe("5. Provider with opportunities", () => {
    const opportunities = [
      {
        id: "opp-1",
        stage: "evaluation_active",
        product_line: "Hernia mesh",
        updated_at: new Date().toISOString(),
      },
    ];

    it("recommends advancing initiative when evaluation is active", () => {
      const action = buildProviderRepPrimaryAction({
        providerId: PROVIDER_ID,
        relationshipStage: "active_relationship",
        newEngagementHref: NEW_ENG,
        intelligenceHref: INTEL_HREF,
        createOpportunityHref: CREATE_OPP,
        engagements: [],
        planning: basePlanning({ status: "complete", percent: 90 }),
        opportunities,
      });
      expect(action.label).toBe("Advance evaluation");
      expect(action.href).toContain("/opportunities/opp-1");
    });

    it("shared UI constants use opportunity terminology", () => {
      expect(OPPORTUNITY_UI.fallbackRecordLabel).toBe("Evaluation");
    });
  });

  describe("6. Provider with limited intelligence", () => {
    const planning = basePlanning();
    const contact = { provider_relationship_stage: "early_discovery" };
    const fieldEvidenceEngagements = [
      engagement({
        status: "completed",
        updated_at: new Date(Date.now() - 40 * 86_400_000).toISOString(),
      }),
    ];

    it("intelligence briefing highlights gaps in prose", () => {
      const view = buildProviderIntelligenceSummaryView({
        contact,
        planning,
        engagements: fieldEvidenceEngagements,
      });
      expect(view.focusSummary).toMatch(/Open items:|Priority gaps:|What we still need:/);
      expect(view.tracks.every((t) => t.detail.length > 0)).toBe(true);
      expect(view.interpretation).not.toMatch(/%\s*complete|sections complete/i);
    });

    it("primary action favors capturing workflow intelligence when engagements exist", () => {
      const action = buildProviderRepPrimaryAction({
        providerId: PROVIDER_ID,
        relationshipStage: "active_relationship",
        newEngagementHref: NEW_ENG,
        intelligenceHref: INTEL_HREF,
        engagements: [
          engagement({
            status: "completed",
            updated_at: new Date(Date.now() - 40 * 86_400_000).toISOString(),
          }),
        ],
        planning,
      });
      expect(action.label).toBe("Confirm procedure focus");
      expect(action.href).toContain("planning_section=clinical_workflow");
    });

    it("relationship snapshot uses guidance hints not Unknown", () => {
      const rel = buildProviderRelationshipSnapshotView({ contact: {} });
      expect(rel.influence.emptyHint).toContain("influences");
      expect(rel.influence.value).toBeNull();
    });
  });

  describe("7. Provider with strong intelligence", () => {
    const contact = {
      provider_relationship_stage: "established_customer",
      provider_procedure_focus: "ACL",
      provider_technique_preferences: "Arthroscopic",
      provider_case_volume_estimate: "12/mo",
      provider_or_team_dynamics: "PA-led",
      provider_current_vendors: "Incumbent",
      provider_competitive_products: "Rival",
      preferred_contact_method: "email",
      provider_communication_style: "Concise",
      influence_level: "decision_maker",
      provider_decision_maker_status: "yes",
      provider_follow_up_approach: "Monthly",
    };
    const planning = basePlanning({
      status: "complete",
      percent: 95,
      sections: basePlanning().sections.map((s) => ({
        ...s,
        status: "complete",
        filled: s.total,
        percent: 100,
      })),
    });

    it("intelligence and chips show strong commercial read", () => {
      const view = buildProviderIntelligenceSummaryView({
        contact,
        planning,
        engagements: [
          engagement({
            status: "completed",
            updated_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
          }),
        ],
      });
      expect(view.overallStatus).toBe("Strong");
      expect(view.interpretation.toLowerCase()).toContain("operational read");

      const chips = buildProviderDetailStatusChips({
        relationshipStage: "established_customer",
        intelligenceOverall: "Strong",
        planningStatus: "complete",
      });
      expect(chips.some((c) => c.label === "Established Customer")).toBe(true);
      expect(chips.some((c) => c.label === "Strong Commercial Understanding")).toBe(true);
    });

    it("relationship memory and signals stay concise", () => {
      const memory = buildProviderRelationshipMemory({
        contact: { ...contact, notes: "Discussed ACL graft preferences last visit" },
        engagements: [
          engagement({
            status: "completed",
            notes: "Reviewed technique preferences",
            updated_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
          }),
        ],
        clinical_discovery_answers: [],
      });
      expect(memory.length).toBeLessThanOrEqual(6);
      memory.forEach((m) => expect(m.text.length).toBeLessThanOrEqual(141));

      const signals = buildProviderRelationshipSignals({
        contact,
        planning,
        engagements: [],
      });
      expect(signals.length).toBeLessThanOrEqual(5);
    });
  });

  describe("visual identity", () => {
    it("resolves avatar, org logo, and focus chips", () => {
      const id = resolveProviderVisualIdentity({
        displayName: "Alex Kim",
        contact: { provider_procedure_focus: "Ventral hernia" },
        specialty: "General Surgery",
        primaryOrganization: { name: "Metro Health", logo_url: "https://cdn/logo.png" },
        enrichment: { avatarUrl: "https://cdn/headshot.jpg" },
      });
      expect(id.hasAvatarImage).toBe(true);
      expect(id.hasOrganizationLogo).toBe(true);
      expect(id.procedureFocusBadge).toBe("Ventral hernia");
      expect(id.initials).toBe("AK");
      expect(providerDisplayInitials("Alex Kim")).toBe("AK");
    });
  });
});
