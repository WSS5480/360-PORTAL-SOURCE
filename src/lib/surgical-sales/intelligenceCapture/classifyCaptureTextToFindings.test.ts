import { describe, expect, it } from "vitest";
import {
  classifyCaptureFinding,
  classifyCaptureTextToFindings,
} from "@/lib/surgical-sales/intelligenceCapture/classifyCaptureTextToFindings";
import type { IntelligenceCaptureCategoryId } from "@/lib/surgical-sales/intelligenceCaptureCategories";

const DISCOVERY_CATEGORIES: IntelligenceCaptureCategoryId[] = [
  "observation_access",
  "access_pathway",
  "credentialing_facility",
  "key_people_influence",
  "clinical_focus",
  "opportunity_signals",
];

const OBSERVE_CATEGORIES: IntelligenceCaptureCategoryId[] = [
  ...DISCOVERY_CATEGORIES,
  "procedure_workflow",
  "clinical_challenges",
  "product_fit_evaluation",
];

describe("classifyCaptureFinding", () => {
  it("routes explicit observation approval to observation_access with high confidence", () => {
    const proposal = classifyCaptureFinding(
      "Dr. Apple approved the observation for the first week of July.",
      DISCOVERY_CATEGORIES,
    );
    expect(proposal.categoryId).toBe("observation_access");
    expect(proposal.confidence).toBe("high");
    expect(proposal.observationAccess?.approvalExplicit).toBe(true);
  });

  it("routes observation interest (not approval) to observation_access with follow-up signal", () => {
    const proposal = classifyCaptureFinding(
      "He seemed open to observation but wants to talk to his admin first.",
      DISCOVERY_CATEGORIES,
    );
    expect(proposal.categoryId).toBe("observation_access");
    expect(proposal.observationAccess?.approvalExplicit).toBe(false);
    expect(proposal.observationAccess?.interest).toBe(true);
  });

  it("does not claim generic reassurance ('no problem') for observation access", () => {
    const proposal = classifyCaptureFinding(
      "Karen said getting badge renewals done is no problem this quarter.",
      DISCOVERY_CATEGORIES,
    );
    expect(proposal.categoryId).not.toBe("observation_access");
  });

  it("routes scheduler control to access_pathway", () => {
    const proposal = classifyCaptureFinding(
      "Karen the surgery coordinator controls his OR schedule and block time.",
      DISCOVERY_CATEGORIES,
    );
    expect(proposal.categoryId).toBe("access_pathway");
    expect(proposal.confidence).not.toBe("low");
  });

  it("routes credentialing requirements to credentialing_facility", () => {
    const proposal = classifyCaptureFinding(
      "Facility uses Vendormate and requires a background check before vendor badge pickup.",
      DISCOVERY_CATEGORIES,
    );
    expect(proposal.categoryId).toBe("credentialing_facility");
  });

  it("routes procedure mix to clinical_focus", () => {
    const proposal = classifyCaptureFinding(
      "He does mostly rotator cuff repair cases, about 12 cases a week.",
      DISCOVERY_CATEGORIES,
    );
    expect(proposal.categoryId).toBe("clinical_focus");
  });

  it("routes competitor product usage to opportunity_signals", () => {
    const proposal = classifyCaptureFinding(
      "Currently using Arthrex implants under contract through next year.",
      DISCOVERY_CATEGORIES,
    );
    expect(proposal.categoryId).toBe("opportunity_signals");
  });

  it("never proposes a locked category even when keywords match", () => {
    const proposal = classifyCaptureFinding(
      "Room turnover is a bottleneck — tray flow between cases is slow.",
      DISCOVERY_CATEGORIES,
    );
    expect(proposal.categoryId).not.toBe("procedure_workflow");
  });

  it("proposes procedure_workflow once the observe-stage categories unlock", () => {
    const proposal = classifyCaptureFinding(
      "Room turnover is a bottleneck — tray flow between cases is slow.",
      OBSERVE_CATEGORIES,
    );
    expect(proposal.categoryId).toBe("procedure_workflow");
  });

  it("returns null category for text with no routable signal", () => {
    const proposal = classifyCaptureFinding(
      "Grabbed lunch at the cafe across the street afterwards.",
      DISCOVERY_CATEGORIES,
    );
    expect(proposal.categoryId).toBeNull();
    expect(proposal.confidence).toBe("low");
  });
});

describe("classifyCaptureTextToFindings", () => {
  it("splits multi-line capture into separately classified findings", () => {
    const proposals = classifyCaptureTextToFindings({
      text: [
        "- Observation was approved for early July",
        "- Karen the coordinator owns the OR schedule",
        "- They are using Stryker trays under contract",
      ].join("\n"),
      unlockedCategoryIds: DISCOVERY_CATEGORIES,
    });
    expect(proposals).toHaveLength(3);
    expect(proposals[0]?.categoryId).toBe("observation_access");
    expect(proposals[1]?.categoryId).toBe("access_pathway");
    expect(proposals[2]?.categoryId).toBe("opportunity_signals");
  });

  it("returns empty array for empty text", () => {
    expect(
      classifyCaptureTextToFindings({ text: "  ", unlockedCategoryIds: DISCOVERY_CATEGORIES }),
    ).toEqual([]);
  });
});

describe("capture-first stage lifecycle", () => {
  it("approval saved through the structured route unlocks observe-stage capture for the classifier", async () => {
    const { buildObservationApprovalCommercialIntelligencePatch } = await import(
      "@/lib/surgical-sales/observationApprovalSave"
    );
    const { hasProviderObservationApprovalOnFile } = await import(
      "@/lib/surgical-sales/providerObservationApproval"
    );
    const { intelligenceCaptureCategoriesForPathwayStage } = await import(
      "@/lib/surgical-sales/intelligenceCaptureCategories"
    );

    // Same patch the observation-approval route applies for "permission_confirmed".
    const contactAfterApproval: Record<string, unknown> = {
      provider_observation_feasibility: "approved",
      ...buildObservationApprovalCommercialIntelligencePatch({}, "permission_confirmed"),
    };
    expect(hasProviderObservationApprovalOnFile(contactAfterApproval)).toBe(true);

    // Approval-gated category stays locked during discovery…
    const discoveryUnlocked = intelligenceCaptureCategoriesForPathwayStage(
      "discovery",
      contactAfterApproval,
    ).map((def) => def.id);
    expect(discoveryUnlocked).not.toContain("procedure_workflow");

    // …and unlocks at observe stage, where the classifier starts proposing it.
    const observeUnlocked = intelligenceCaptureCategoriesForPathwayStage(
      "observe",
      contactAfterApproval,
    ).map((def) => def.id);
    expect(observeUnlocked).toContain("procedure_workflow");

    const proposal = classifyCaptureFinding(
      "Room turnover is a bottleneck — tray flow between cases is slow.",
      observeUnlocked,
    );
    expect(proposal.categoryId).toBe("procedure_workflow");
  });

  it("without approval on file, observe stage still keeps the approval-gated category locked", async () => {
    const { intelligenceCaptureCategoriesForPathwayStage } = await import(
      "@/lib/surgical-sales/intelligenceCaptureCategories"
    );
    const observeUnlocked = intelligenceCaptureCategoriesForPathwayStage("observe", {}).map(
      (def) => def.id,
    );
    expect(observeUnlocked).not.toContain("procedure_workflow");

    const proposal = classifyCaptureFinding(
      "Room turnover is a bottleneck — tray flow between cases is slow.",
      observeUnlocked,
    );
    expect(proposal.categoryId).not.toBe("procedure_workflow");
  });
});
