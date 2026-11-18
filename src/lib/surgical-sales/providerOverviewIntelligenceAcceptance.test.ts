/**
 * Acceptance criteria — Provider Overview & Intelligence redesign.
 * Maps product requirements to automated regression checks.
 */

import { describe, expect, it } from "vitest";
import { deriveSalesPathwayState } from "./deriveSalesPathwayState";
import {
  isDiscoveryReadyForObserve,
  type PathwayGateInput,
} from "./pathwayStageGates";
import {
  EXECUTION_INTELLIGENCE_DB_KEYS,
  intelligenceDbKeyBlocksPathwayAdvancement,
  isExecutionIntelligenceDbKey,
  pathwayStageHardGateBlockers,
} from "./pathway/pathwayProgressionPolicy";
import {
  INTELLIGENCE_REFERENCE_COPY,
  buildProviderIntelligenceReferenceView,
} from "./buildProviderIntelligenceReferenceView";
import { buildProviderOpenQuestions } from "./buildProviderOpenQuestions";
import { buildProviderOverviewMissionCardView } from "./buildProviderOverviewMissionCardView";
import { buildProviderOverviewWhatMattersSummary } from "./buildProviderOverviewWhatMattersSummary";
import { buildProviderFieldIntelligenceModel } from "./providerFieldIntelligenceModel";
import {
  buildProviderOverviewExecutionCtas,
  type ProviderOverviewExecutionActionId,
} from "./buildProviderOverviewExecutionCtas";
import { resolveNormalizedObservationPermission } from "./observationPermissionModel";
import { PATHWAY_VALIDATED_FIELD_META } from "./salesPathwayTestFixtures";
import { isOverviewAbsenceCopy } from "./providerOverviewSparsePresentation";

const APPROVAL_ONLY_CONTACT: Record<string, unknown> = {
  provider_observation_feasibility: "approved",
  provider_intelligence_field_metadata: {
    provider_observation_feasibility: PATHWAY_VALIDATED_FIELD_META,
  },
};

const GATE_INPUT: PathwayGateInput = {
  contact: APPROVAL_ONLY_CONTACT,
  engagements: [],
  cases: [],
};

describe("Provider Overview & Intelligence acceptance criteria", () => {
  describe("1. Discovery → Observation requires only observation permission confirmed", () => {
    it("advances when observation approved = Yes with no optional intel on file", () => {
      expect(isDiscoveryReadyForObserve(GATE_INPUT)).toBe(true);
      const state = deriveSalesPathwayState({
        providerId: "p-accept",
        contact: APPROVAL_ONLY_CONTACT,
        engagements: [],
        cases: [],
      });
      expect(state.currentStage).toBe("observe");
    });
  });

  describe("2–3. Optional intelligence never blocks progression", () => {
    const optionalKeys = [
      "provider_observation_coordinator_contact",
      "provider_observation_credentialing_needed",
      "provider_observation_access_path",
      "provider_procedure_focus",
      "provider_technique_preferences",
      "provider_workflow_pain_points",
    ];

    it("classifies scheduler, credentialing, coordinator, workflow, and clinical notes as execution intelligence", () => {
      for (const key of optionalKeys) {
        expect(EXECUTION_INTELLIGENCE_DB_KEYS.has(key) || isExecutionIntelligenceDbKey(key)).toBe(
          true,
        );
        expect(intelligenceDbKeyBlocksPathwayAdvancement(key)).toBe(false);
      }
    });

    it("does not surface optional intel as discovery hard-gate blockers", () => {
      const blockers = pathwayStageHardGateBlockers("discovery", {
        contact: { provider_observation_feasibility: "interested" },
      });
      expect(blockers).toHaveLength(1);
      expect(blockers[0].label).toMatch(/observation permission/i);
      expect(blockers.some((b) => /scheduler|credential|coordinator|workflow|clinical/i.test(b.label))).toBe(
        false,
      );
    });
  });

  describe("4. Overview stays mission-oriented — field notes use Mission Board capture", () => {
    it("routes Field note through the Mission Board field note shortcut", () => {
      const card = buildProviderOverviewMissionCardView({
        contact: {},
        providerId: "p1",
        stageId: "discovery",
        newEngagementHref: "/engagements/new",
        noteHref: "/note",
        intelligenceHref: "/portal/sales/providers/p1?tab=intelligence",
      });
      const addIntel = card.quickActions.find((action) => action.id === "add_intelligence");
      expect(addIntel?.label).toBe("Field note");
      expect(addIntel?.href).toBeUndefined();
      expect(addIntel?.missionBoardShortcutId).toBe("dictate");
      expect(addIntel?.customAction).toBeUndefined();
    });

    it("does not surface clinical procedure inventories in What Matters", () => {
      const lines = buildProviderOverviewWhatMattersSummary({
        providerId: "p1",
        relationshipStage: "early_discovery",
        newEngagementHref: "/engagements/new",
        intelligenceHref: "/intel",
        engagements: [],
        contact: { provider_procedure_focus: "Robotic ventral hernia repair" },
      });
      expect(lines.some((line) => /robotic ventral/i.test(line.text))).toBe(false);
    });
  });

  describe("5. Provider Overview surfaces mission-control essentials", () => {
    const missionCard = buildProviderOverviewMissionCardView({
      contact: { provider_observation_feasibility: "interested" },
      providerId: "p-accept",
      stageId: "discovery",
      newEngagementHref: "/engagements/new",
      noteHref: "/note",
      intelligenceHref: "/intel",
      engagements: [],
    });

    it("includes stage objective, permission, recommended next move, and quick actions", () => {
      expect(missionCard.stageLabel).toBeTruthy();
      expect(missionCard.objective).toBeTruthy();
      expect(missionCard.observationPermission).toBeTruthy();
      expect(missionCard.recommendedNextMove).toBeTruthy();
      expect(missionCard.primary.label).toBeTruthy();
      expect(missionCard.quickActions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("6. Provider Overview avoids CRM-style completeness and negative framing", () => {
    it("does not emit gap lists, confidence scores, or missing-data language in What Matters", () => {
      const lines = buildProviderOverviewWhatMattersSummary({
        providerId: "p-sparse",
        relationshipStage: "early_discovery",
        newEngagementHref: "/engagements/new",
        intelligenceHref: "/intel",
        engagements: [],
        contact: {},
        planning: { status: "not_started", sections: [] },
      });

      const corpus = lines.map((l) => l.text).join(" ");
      expect(corpus).not.toMatch(/confidence|completeness|%\s*complete/i);
      expect(corpus).not.toMatch(/priority learning|intelligence gap|still open/i);
      expect(lines.every((line) => !isOverviewAbsenceCopy(line.text))).toBe(true);
    });

    it("does not duplicate Intelligence-tab open questions on the overview", () => {
      const contact = {
        id: "p1",
        provider_observation_feasibility: "interested",
        provider_observation_coordinator_contact: "Jennifer — contact info missing",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "intro_call",
            updated_at: "2026-06-01T12:00:00Z",
            lifecycle_state: "confirmed",
          },
        },
      };
      const model = buildProviderFieldIntelligenceModel({ contact });
      const openQuestions = buildProviderOpenQuestions({ contact, model });
      const overviewLines = buildProviderOverviewWhatMattersSummary({
        providerId: "p1",
        relationshipStage: "early_discovery",
        newEngagementHref: "/eng",
        intelligenceHref: "/intel",
        engagements: [],
        contact,
      });

      expect(openQuestions.length).toBeGreaterThan(0);
      for (const question of openQuestions) {
        expect(overviewLines.some((line) => line.text.toLowerCase() === question.text.toLowerCase())).toBe(
          false,
        );
      }
    });

    it("does not show credentialing required after credentialing is complete", () => {
      const lines = buildProviderOverviewWhatMattersSummary({
        providerId: "p-cred-complete",
        relationshipStage: "early_discovery",
        newEngagementHref: "/eng",
        intelligenceHref: "/intel",
        engagements: [],
        contact: {
          provider_observation_feasibility: "credentialing_required",
          provider_observation_credentialing_needed: "cleared",
          provider_credentialing_status: "cleared",
          provider_intelligence_field_metadata: {
            provider_credentialing_status: PATHWAY_VALIDATED_FIELD_META,
          },
        },
      });

      expect(lines.map((line) => line.text).join(" | ")).not.toMatch(/Credentialing required/i);
    });
  });

  describe("7. Intelligence tab organizes field evidence into five sections", () => {
    it("exposes canonical section labels for the reference brief", () => {
      expect(INTELLIGENCE_REFERENCE_COPY.accessPermission).toBe("Access & permission");
      expect(INTELLIGENCE_REFERENCE_COPY.clinicalSignals).toBe("Clinical focus");
      expect(INTELLIGENCE_REFERENCE_COPY.relationships).toBe("Relationships");
      expect(INTELLIGENCE_REFERENCE_COPY.openQuestions).toBe("Still exploring");
      expect(INTELLIGENCE_REFERENCE_COPY.evidenceTimeline).toBe("Evidence timeline");
    });

    it("populates reference sections from field evidence without mission CTAs", () => {
      const view = buildProviderIntelligenceReferenceView({
        contact: {
          id: "p1",
          first_name: "Alex",
          last_name: "Kim",
          provider_observation_feasibility: "approved",
          provider_procedure_focus: "Robotic ventral hernia",
          provider_intelligence_field_metadata: {
            provider_observation_feasibility: PATHWAY_VALIDATED_FIELD_META,
            provider_procedure_focus: PATHWAY_VALIDATED_FIELD_META,
          },
        },
        providerId: "p1",
        engagements: [],
      });

      expect(view.accessPermission.length).toBeGreaterThan(0);
      expect(view.clinicalSignals.length).toBeGreaterThan(0);
    });
  });

  describe("8. Open questions are evidence-based, not blank-field-based", () => {
    it("returns no open questions for a blank provider record", () => {
      const model = buildProviderFieldIntelligenceModel({ contact: { id: "blank" } });
      expect(buildProviderOpenQuestions({ contact: { id: "blank" }, model })).toEqual([]);
    });
  });

  describe("9. Observation permission is consistent across surfaces", () => {
    it("uses one normalized permission label on mission card and intelligence reference", () => {
      const contact = { provider_observation_feasibility: "interested" };
      const permission = resolveNormalizedObservationPermission({ contact });
      const missionCard = buildProviderOverviewMissionCardView({
        contact,
        providerId: "p1",
        stageId: "discovery",
        newEngagementHref: "/eng",
        noteHref: "/note",
        intelligenceHref: "/intel",
      });
      const reference = buildProviderIntelligenceReferenceView({
        contact,
        providerId: "p1",
      });

      expect(missionCard.observationPermission).toBe(permission.overviewLabel);
      expect(
        reference.accessPermission.find((row) => row.label === "Observation permission")?.value,
      ).toBe(permission.label);
    });
  });

  describe("10. CTAs offer flexible workflows — never a single trap door", () => {
    it("always exposes multiple distinct quick-action paths", () => {
      const ctas = buildProviderOverviewExecutionCtas({
        contact: {},
        providerId: "p1",
        newEngagementHref: "/engagements/new",
        noteHref: "/note",
        intelligenceHref: "/intel",
      });

      const quickIds = new Set<ProviderOverviewExecutionActionId>([
        ...ctas.quickActions.map((a) => a.id),
        ctas.primary.id,
      ]);

      expect(quickIds.has("update_permission_status")).toBe(true);
      expect(quickIds.has("log_interaction")).toBe(false);
      expect(ctas.quickActions.every((action) => !action.href?.includes("mapping=1"))).toBe(true);
      expect(ctas.quickActions.every((action) => !action.href?.includes("openMapping"))).toBe(true);
      expect(ctas.quickActions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("11. Sparse data produces a simple useful page", () => {
    it("returns an empty What Matters list for a net-new provider with no touches", () => {
      const lines = buildProviderOverviewWhatMattersSummary({
        providerId: "p-new",
        relationshipStage: "early_discovery",
        newEngagementHref: "/eng",
        intelligenceHref: "/intel",
        engagements: [],
        contact: {},
      });
      expect(lines).toEqual([]);
    });

    it("still renders a mission card with permission status and a next move for sparse accounts", () => {
      const card = buildProviderOverviewMissionCardView({
        contact: {},
        providerId: "p-new",
        stageId: "discovery",
        newEngagementHref: "/eng",
        noteHref: "/note",
        intelligenceHref: "/intel",
      });
      expect(card.observationPermission).toBeTruthy();
      expect(card.recommendedNextMove).toBeTruthy();
      expect(card.primary.label).toBeTruthy();
    });
  });
});
