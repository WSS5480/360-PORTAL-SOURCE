import { describe, expect, it } from "vitest";

import { deriveOperationalIntelligenceAreaStatus } from "@/lib/surgical-sales/operationalIntelligenceReadiness";
import { learningGapForField } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  formatOpenItemsCount,
  hasOperationalRiskSummary,
  isOperationalExecutionRiskDbKey,
  sanitizeDiscoveryOpenItemsCopy,
} from "@/lib/surgical-sales/discoveryOpenItemsVocabulary";

describe("discoveryOpenItemsVocabulary", () => {
  it("formats open items count", () => {
    expect(formatOpenItemsCount(2)).toBe("2 open items");
    expect(formatOpenItemsCount(1)).toBe("1 open item");
  });

  it("detects clear-state vs risk summaries", () => {
    expect(hasOperationalRiskSummary("No major operational risk on file")).toBe(false);
    expect(hasOperationalRiskSummary("Credentialing path unclear before observation")).toBe(
      true,
    );
  });

  it("sanitizes legacy negative terms", () => {
    expect(sanitizeDiscoveryOpenItemsCopy("2 unresolved gaps and 1 blocker")).toBe(
      "2 open items and 1 open items",
    );
  });

  it("treats credentialing gaps as execution risk, not technique preferences", () => {
    expect(isOperationalExecutionRiskDbKey("provider_observation_credentialing_needed")).toBe(
      true,
    );
    expect(isOperationalExecutionRiskDbKey("provider_technique_preferences")).toBe(false);

    const credentialingGap = learningGapForField(
      "provider_observation_credentialing_needed",
      "observation_readiness",
      { provider_observation_feasibility: "Credentialing required before vendor can observe" },
      undefined,
      { stageId: "discovery" },
    );
    const techniqueGap = learningGapForField(
      "provider_technique_preferences",
      "clinical_workflow",
      {},
      undefined,
      { stageId: "discovery" },
    );

    const credStatus = deriveOperationalIntelligenceAreaStatus({
      sectionId: "observation_readiness",
      contact: {},
      gap: credentialingGap,
    });
    const techStatus = deriveOperationalIntelligenceAreaStatus({
      sectionId: "clinical_workflow",
      contact: {},
      gap: techniqueGap,
    });

    expect(credStatus.status).toBe("high_risk");
    expect(techStatus.status).toBe("not_explored");
  });
});
