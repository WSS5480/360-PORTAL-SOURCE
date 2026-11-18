/**
 * Post-debrief pathway — end-to-end logic tests (Pathways A–D).
 *
 * Verifies that the Mission Board route (buildProviderMissionBoardCardModel)
 * and the Provider page route (buildProviderOverviewExecutionCtas) read the
 * same records, derive the same stage through pathway gates, and present the
 * expected primary action at every step.
 */

import { describe, expect, it } from "vitest";

import { buildProviderMissionBoardCardModel } from "@/lib/surgical-sales/buildProviderMissionBoardCardModel";
import { buildProviderOverviewExecutionCtas } from "@/lib/surgical-sales/buildProviderOverviewExecutionCtas";
import { deriveMissionBoardSecondaryActions } from "@/lib/surgical-sales/deriveMissionBoardCardActions";
import { deriveGatedPathwayStage } from "@/lib/surgical-sales/pathwayStageGates";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

type Step = {
  contact: Record<string, unknown>;
  engagements?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
};

function gateStage(step: Step) {
  return deriveGatedPathwayStage({
    contact: step.contact,
    engagements: step.engagements as never,
    cases: step.cases,
  });
}

/** Directory row the providers API would emit for this provider state. */
function missionBoardRow(step: Step): ProviderDirectoryRow {
  const stage = gateStage(step);
  const evaluationEng = (step.engagements ?? []).find((e) =>
    ["product_demo", "office_visit_360", "in_service_training", "peer_discussion"].includes(
      String(e.engagement_type ?? ""),
    ),
  );
  const debriefEng = (step.engagements ?? []).find(
    (e) => String(e.engagement_type ?? "") === "provider_debrief",
  );

  return {
    ...(step.contact as ProviderDirectoryRow),
    id: "p1",
    relationship_pathway_stage_id: stage,
    organization_count: 1,
    specialty: "General Surgery",
    primary_organization_name: "Mercy West",
    primary_organization_id: "org-1",
    additional_organizations_count: 0,
    territory: null,
    planning_status: "in_progress",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: null,
    provider_debrief_engagement: debriefEng
      ? {
          id: String(debriefEng.id),
          status: String(debriefEng.status),
          debrief_completed: Boolean(debriefEng.debrief_completed),
          prepared_at: null,
          planning_status: null,
        }
      : null,
    provider_evaluation_engagement: evaluationEng
      ? {
          id: String(evaluationEng.id),
          engagement_type: String(evaluationEng.engagement_type),
          status: String(evaluationEng.status),
          prepared_at: null,
          planning_status: null,
        }
      : null,
  } as ProviderDirectoryRow;
}

/** Provider page CTA view for the same provider state. */
function providerPageCtas(step: Step) {
  return buildProviderOverviewExecutionCtas({
    contact: step.contact,
    providerId: "p1",
    newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",
    noteHref: "/notes",
    intelligenceHref: "/intel",
    engagements: step.engagements as ProviderEngagementSummary[],
    cases: step.cases,
    stageId: gateStage(step),
  });
}

const observationApprovedContact = {
  provider_observation_feasibility: "easy",
  provider_intelligence_field_metadata: {
    provider_observation_feasibility: { validated_at: "2026-01-01" },
  },
};

const fiveCompletedObservations = Array.from({ length: 5 }, (_, i) => ({
  id: `obs-${i + 1}`,
  case_type: "observation",
  status: "completed",
}));

const completedDebrief = {
  id: "debrief-1",
  engagement_type: "provider_debrief",
  status: "completed",
  debrief_completed: true,
};

describe("post-debrief pathway end-to-end (logic layer)", () => {
  describe("Pathway A — Discovery → Observation → Debrief → 360 Experience → Commitment → Outcomes", () => {
    it("starts in discovery before observation approval", () => {
      const step: Step = { contact: {} };
      expect(gateStage(step)).toBe("discovery");
    });

    it("advances to observe once approval is validated on file", () => {
      const step: Step = { contact: { ...observationApprovedContact } };
      expect(gateStage(step)).toBe("observe");
    });

    it("advances to debrief after five completed observations", () => {
      const step: Step = {
        contact: { ...observationApprovedContact },
        cases: fiveCompletedObservations,
      };
      expect(gateStage(step)).toBe("debrief");
    });

    it("stays in debrief until product fit is validated, then advances to evaluation", () => {
      const debriefOnly: Step = {
        contact: { ...observationApprovedContact },
        cases: fiveCompletedObservations,
        engagements: [completedDebrief],
      };
      expect(gateStage(debriefOnly)).toBe("debrief");

      const confirmed: Step = {
        ...debriefOnly,
        contact: {
          ...debriefOnly.contact,
          provider_product_fit_validated: "yes",
          provider_evaluation_path: "360 Experience",
        },
      };
      expect(gateStage(confirmed)).toBe("evaluation");
    });

    it("evaluation with no engagement → Schedule 360 Experience on both routes", () => {
      const step: Step = {
        contact: {
          ...observationApprovedContact,
          provider_product_fit_validated: "yes",
          provider_evaluation_path: "360 Experience",
        },
        cases: fiveCompletedObservations,
        engagements: [completedDebrief],
      };

      const card = buildProviderMissionBoardCardModel(missionBoardRow(step));
      expect(card.pathwayStageId).toBe("evaluation");
      expect(card.primaryCta.label).toBe("Schedule 360 Experience");
      expect(card.progressLabel).toBe("360 Experience · Not Scheduled");

      const ctas = providerPageCtas(step);
      expect(ctas.phase).toBe("evaluation");
      expect(ctas.primary.id).toBe("schedule_evaluation");
      expect(ctas.primary.label).toBe("Schedule 360 Experience");
    });

    it("scheduled 360 engagement → Start (MB) / Prepare (provider page), status Planned", () => {
      const step: Step = {
        contact: {
          ...observationApprovedContact,
          provider_product_fit_validated: "yes",
          provider_evaluation_path: "360 Experience",
        },
        cases: fiveCompletedObservations,
        engagements: [
          completedDebrief,
          { id: "eval-1", engagement_type: "office_visit_360", status: "planned" },
        ],
      };

      const card = buildProviderMissionBoardCardModel(missionBoardRow(step));
      expect(card.pathwayStageId).toBe("evaluation");
      expect(card.primaryCta.label).toBe("Start Evaluation");
      expect(card.primaryCta.kind).toBe("evaluation_start");
      expect(card.progressLabel).toBe("360 Experience · Planned");
      expect(card.secondaryActions.some((a) => a.id === "evaluation_prepare")).toBe(true);

      const ctas = providerPageCtas(step);
      expect(ctas.primary.id).toBe("prepare_evaluation");
      expect(ctas.primary.label).toBe("Prepare Evaluation");
    });

    it("active 360 engagement → Resume Evaluation on both routes, status Active", () => {
      const step: Step = {
        contact: {
          ...observationApprovedContact,
          provider_product_fit_validated: "yes",
          provider_evaluation_path: "360 Experience",
        },
        cases: fiveCompletedObservations,
        engagements: [
          completedDebrief,
          { id: "eval-1", engagement_type: "office_visit_360", status: "in_progress" },
        ],
      };

      const card = buildProviderMissionBoardCardModel(missionBoardRow(step));
      expect(card.primaryCta.label).toBe("Resume Evaluation");
      expect(card.progressLabel).toBe("360 Experience · Active");

      const ctas = providerPageCtas(step);
      expect(ctas.primary.id).toBe("resume_evaluation");
      expect(ctas.primary.label).toBe("Resume Evaluation");
    });

    it("completed 360 engagement → gates advance to commitment, Confirm Structured Use", () => {
      const step: Step = {
        contact: {
          ...observationApprovedContact,
          provider_product_fit_validated: "yes",
          provider_evaluation_path: "360 Experience",
        },
        cases: fiveCompletedObservations,
        engagements: [
          completedDebrief,
          { id: "eval-1", engagement_type: "office_visit_360", status: "completed" },
        ],
      };
      expect(gateStage(step)).toBe("commitment");

      const card = buildProviderMissionBoardCardModel(missionBoardRow(step));
      expect(card.pathwayStageId).toBe("commitment");
      expect(card.primaryCta.label).toBe("Confirm structured use");
      expect(card.primaryCta.kind).toBe("commitment_modal");

      const ctas = providerPageCtas(step);
      expect(ctas.phase).toBe("commitment");
      expect(ctas.primary.id).toBe("confirm_commitment");
      expect(ctas.primary.label).toBe("Confirm Structured Use");
      expect(ctas.quickActions.some((a) => a.id === "review_evaluation")).toBe(true);
    });

    it("structured commitment saved → Move to Outcomes; outcomes tracking active → outcomes stage", () => {
      const committed: Step = {
        contact: {
          ...observationApprovedContact,
          provider_product_fit_validated: "yes",
          provider_evaluation_path: "360 Experience",
          provider_commitment_confirmed: "yes",
          provider_commitment_type: "structured_use",
          provider_commitment_notes: "Provider wants 360 support for first 3 cases.",
        },
        cases: fiveCompletedObservations,
        engagements: [
          completedDebrief,
          { id: "eval-1", engagement_type: "office_visit_360", status: "completed" },
        ],
      };
      expect(gateStage(committed)).toBe("commitment");

      const card = buildProviderMissionBoardCardModel(missionBoardRow(committed));
      expect(card.primaryCta.label).toBe("Move to Outcomes");

      const ctas = providerPageCtas(committed);
      expect(ctas.primary.id).toBe("move_to_outcomes");
      expect(ctas.primary.label).toBe("Move to Outcomes");

      const tracking: Step = {
        ...committed,
        contact: { ...committed.contact, provider_outcomes_tracking_active: "yes" },
      };
      expect(gateStage(tracking)).toBe("outcomes");

      const outcomesCard = buildProviderMissionBoardCardModel(missionBoardRow(tracking));
      expect(outcomesCard.pathwayStageId).toBe("outcomes");
      expect(outcomesCard.primaryCta.label).toBe("Log Outcome Update");
      expect(
        deriveMissionBoardSecondaryActions(missionBoardRow(tracking), "outcomes").some(
          (a) => a.id === "log_product_use",
        ),
      ).toBe(true);

      const outcomesCtas = providerPageCtas(tracking);
      expect(outcomesCtas.phase).toBe("outcomes");
      expect(outcomesCtas.primary.label).toBe("Log Outcome Update");
      expect(outcomesCtas.quickActions.some((a) => a.id === "log_product_use")).toBe(true);
    });
  });

  describe("Pathway B — Product Trial", () => {
    const base: Step = {
      contact: {
        ...observationApprovedContact,
        provider_product_fit_validated: "yes",
        provider_evaluation_path: "Product Trial",
      },
      cases: fiveCompletedObservations,
      engagements: [completedDebrief],
    };

    it("path selected, no engagement → Schedule product trial case on both routes", () => {
      const card = buildProviderMissionBoardCardModel(missionBoardRow(base));
      expect(card.pathwayStageId).toBe("evaluation");
      expect(card.primaryCta.label).toBe("Schedule product trial case");
      expect(card.primaryCta.href).toContain("case_type=product_support");
      expect(card.primaryCta.href).not.toContain("engagement_type=product_demo");

      const ctas = providerPageCtas(base);
      expect(ctas.primary.label).toBe("Schedule product trial case");
      expect(ctas.primary.href).toContain("case_type=product_support");
      expect(ctas.primary.href).not.toContain("engagement_type=product_demo");
    });

    it("completed product support case → evaluation complete, commitment confirmed → outcomes", () => {
      const trialDone: Step = {
        ...base,
        cases: [
          ...fiveCompletedObservations,
          { id: "trial-1", case_type: "product_support", status: "completed" },
        ],
      };
      expect(gateStage(trialDone)).toBe("commitment");

      const committed: Step = {
        ...trialDone,
        contact: {
          ...trialDone.contact,
          provider_commitment_confirmed: "yes",
          provider_commitment_type: "structured_use",
          provider_outcomes_tracking_active: "yes",
        },
      };
      expect(gateStage(committed)).toBe("outcomes");
    });
  });

  describe("Pathway C — More Validation Needed", () => {
    it("debrief complete without product fit stays in debrief and offers Add Observation", () => {
      const step: Step = {
        contact: { ...observationApprovedContact },
        cases: fiveCompletedObservations,
        engagements: [completedDebrief],
      };
      expect(gateStage(step)).toBe("debrief");

      const row = missionBoardRow(step);
      const secondary = deriveMissionBoardSecondaryActions(row, "debrief");
      const addObservation = secondary.find((a) => a.id === "add_observation");
      expect(addObservation).toBeTruthy();
      expect(addObservation?.label).toBe("Add Observation");
    });

    it("after the additional observation validates fit, provider advances to evaluation", () => {
      const step: Step = {
        contact: {
          ...observationApprovedContact,
          provider_product_fit_validated: "yes",
        },
        cases: [
          ...fiveCompletedObservations,
          { id: "obs-6", case_type: "observation", status: "completed" },
        ],
        engagements: [completedDebrief],
      };
      expect(gateStage(step)).toBe("evaluation");
    });
  });

  describe("Pathway D — Opportunity Not Confirmed", () => {
    it("provider does not advance to evaluation without product fit validation", () => {
      const step: Step = {
        contact: { ...observationApprovedContact },
        cases: fiveCompletedObservations,
        engagements: [completedDebrief],
      };
      expect(gateStage(step)).toBe("debrief");
      expect(gateStage(step)).not.toBe("evaluation");

      const ctas = providerPageCtas(step);
      expect(ctas.phase).not.toBe("evaluation");
    });
  });
});
