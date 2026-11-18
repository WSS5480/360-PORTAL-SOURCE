import { describe, expect, it } from "vitest";
import {
  buildEngagementPrepModeView,
  dominantSpecialtyKeyForProduct,
  engagementPrepModeRequiresProduct,
  resolveEffectiveSpecialtyKeyForPrep,
  resolveSuggestedEngagementPrepMode,
} from "@/lib/surgical-sales/engagements/engagementPrepMode";
import { buildPrepareSuggestedGoal } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedGoal";
import { buildPrepareSuggestedTalkingPoints } from "@/lib/surgical-sales/engagements/prepareForMeetingTalkingPoints";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";

const emptyIntel: PrepareKnownIntelligence = { bullets: [], last_key_insight: null };

describe("engagementPrepMode", () => {
  it("defaults to general discovery without explicit mode or product", () => {
    const view = buildEngagementPrepModeView({
      engagementType: "intro_call",
      productLine: null,
    });
    expect(view.mode).toBe("general_discovery");
    expect(view.generation.use_product_bundle).toBe(false);
    expect(view.generation.include_generic_talking_core).toBe(true);
    expect(view.ui.show_discovery_focus_panel).toBe(true);
    expect(view.ui.show_workflow_signals).toBe(false);
  });

  it("uses product exploration when mode and product are set", () => {
    const view = buildEngagementPrepModeView({
      engagementType: "intro_call",
      prepMode: "product_exploration",
      productLine: "Skeletal Dynamics",
      providerSpecialty: "General Surgery",
    });
    expect(view.mode).toBe("product_exploration");
    expect(view.generation.use_product_bundle).toBe(true);
    expect(view.generation.include_generic_talking_core).toBe(false);
    expect(view.ui.show_discovery_focus_panel).toBe(false);
    expect(view.generation.effective_specialty_key).toBe("orthopedics");
    expect(engagementPrepModeRequiresProduct("product_exploration")).toBe(true);
  });

  it("maps product to dominant specialty not provider specialty", () => {
    expect(dominantSpecialtyKeyForProduct("Skeletal Dynamics")).toBe("orthopedics");
    expect(
      resolveEffectiveSpecialtyKeyForPrep({
        productLine: "Skeletal Dynamics",
        providerSpecialty: "General Surgery",
        intentionalProductFocus: true,
      }),
    ).toBe("orthopedics");
  });

  it("talking points for Skeletal Dynamics avoid hernia language", () => {
    const view = buildEngagementPrepModeView({
      engagementType: "intro_call",
      prepMode: "product_exploration",
      productLine: "Skeletal Dynamics",
      providerSpecialty: "General Surgery",
    });
    const g = view.generation;
    const points = buildPrepareSuggestedTalkingPoints({
      specialty: "General Surgery",
      engagementType: "intro_call",
      productLine: "Skeletal Dynamics",
      opportunityStage: null,
      knownIntelligence: emptyIntel,
      prepContextState: g.prep_context_state,
      prepSpecializationTier: g.product_prep_tier,
      intentionalProductFocus: g.intentional_product_focus,
      dominantPrep: g,
    });
    const joined = points.points.join(" ");
    expect(joined).toMatch(/extremity|fixation|tray/i);
    expect(joined).not.toMatch(/hernia|ventral|mesh/i);
  });

  it("talking points in general discovery stay generic", () => {
    const view = buildEngagementPrepModeView({
      engagementType: "intro_call",
      prepMode: "general_discovery",
    });
    const g = view.generation;
    const points = buildPrepareSuggestedTalkingPoints({
      specialty: "General Surgery",
      engagementType: "intro_call",
      productLine: null,
      opportunityStage: null,
      knownIntelligence: emptyIntel,
      prepContextState: g.prep_context_state,
      prepSpecializationTier: g.product_prep_tier,
      dominantPrep: g,
    });
    expect(points.points.join(" ")).not.toMatch(/percutaneous tack|distal extremity fixation workflow/i);
  });

  it("suggests live case support when case is linked with product", () => {
    expect(
      resolveSuggestedEngagementPrepMode({
        engagementType: "intro_call",
        productLine: "ACSIS",
        caseId: "case-1",
      }),
    ).toBe("live_case_support");
  });

  it("general discovery uses default specialty key not provider CRM specialty", () => {
    const view = buildEngagementPrepModeView({
      engagementType: "intro_call",
      prepMode: "general_discovery",
      providerSpecialty: "General Surgery",
      productLine: null,
    });
    expect(view.generation.effective_specialty_key).toBe("default");
    expect(view.generation.include_specialty_generic_pool).toBe(false);
  });

  it("evaluation mode without product coerces to general discovery", () => {
    const view = buildEngagementPrepModeView({
      engagementType: "intro_call",
      prepMode: "evaluation_preparation",
      productLine: null,
    });
    expect(view.mode).toBe("general_discovery");
    expect(view.generation.use_product_bundle).toBe(false);
  });

  it("general discovery goal avoids hernia-specific language", () => {
    const view = buildEngagementPrepModeView({
      engagementType: "intro_call",
      prepMode: "general_discovery",
      providerSpecialty: "General Surgery",
    });
    const g = view.generation;
    const result = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      opportunityStage: "discovery",
      productLine: null,
      knownIntelligence: emptyIntel,
      dominantPrep: g,
    });
    const joined = `${result.goal} ${result.why}`;
    expect(joined).not.toMatch(/hernia|ventral|incisional|mesh|fixation/i);
    expect(joined).toMatch(/workflow|observation|procedural/i);
  });

  it("observation qualification shows observation goals only in UI flags", () => {
    const view = buildEngagementPrepModeView({
      engagementType: "intro_call",
      prepMode: "observation_qualification",
    });
    expect(view.ui.show_observation_goals).toBe(true);
    expect(view.ui.show_workflow_signals).toBe(false);
    expect(view.generation.include_observation_goals).toBe(true);
  });
});
