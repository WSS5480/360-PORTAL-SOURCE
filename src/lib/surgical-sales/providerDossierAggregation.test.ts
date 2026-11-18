import { describe, expect, it } from "vitest";

import {
  aggregateProviderDossierItems,
  dossierConceptKey,
  formatDossierObservationCount,
} from "@/lib/surgical-sales/providerDossierAggregation";

describe("providerDossierAggregation", () => {
  it("merges robotic hernia workflow variants into one observation count", () => {
    const merged = aggregateProviderDossierItems(
      [
        { id: "a", text: "Increasing procedure volume." },
        { id: "b", text: "Robotic ventral hernia repair — volume increasing." },
        { id: "c", text: "Robotic Ventral and Incisional Hernia repair." },
      ],
      "workflow",
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.observationCount).toBe(3);
    expect(merged[0]?.text.toLowerCase()).toMatch(/robotic ventral hernia/);
  });

  it("keeps distinct friction facts separate", () => {
    const merged = aggregateProviderDossierItems(
      [
        { id: "a", text: "Positioning in larger defects can be challenging with current mesh." },
        { id: "b", text: "Visualization before fixation remains a workflow bottleneck." },
      ],
      "friction",
    );

    expect(merged).toHaveLength(2);
  });

  it("formats observation count labels", () => {
    expect(formatDossierObservationCount(1)).toBeNull();
    expect(formatDossierObservationCount(3)).toBe("3 observations");
  });

  it("builds stable concept keys for workflow volume trends", () => {
    const left = dossierConceptKey("Robotic ventral hernia repair — volume increasing.", "workflow");
    const right = dossierConceptKey("Robotic Ventral and Incisional Hernia repair.", "workflow");
    expect(left).toBeTruthy();
    expect(right).toBeTruthy();
  });
});
