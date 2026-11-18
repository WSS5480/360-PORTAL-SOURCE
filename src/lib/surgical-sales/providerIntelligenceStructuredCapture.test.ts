import { describe, expect, it } from "vitest";
import {
  dedupeIntelligenceCaptureOptions,
  formatIntelligenceCaptureDisplay,
  intelligenceCaptureHasSignal,
  intelligenceCaptureSpecForKey,
  OR_ACCESS_CONSTRAINT_NONE_TOKEN,
  parseIntelligenceCaptureValue,
  serializeIntelligenceCaptureValue,
  toggleProviderObservationAccessPathChips,
} from "./providerIntelligenceStructuredCapture";

describe("providerIntelligenceStructuredCapture", () => {
  it("round-trips modality chips and technique notes", () => {
    const modality = serializeIntelligenceCaptureValue("provider_technique_preferences", {
      token: null,
      tokens: ["laparoscopic", "robotic"],
      notes: "",
    });
    expect(modality).toBe("laparoscopic,robotic");
    const technique = serializeIntelligenceCaptureValue("provider_technique_detail", {
      token: null,
      tokens: ["standard_lap"],
      notes: "Prefers Xi dock",
    });
    expect(technique).toBe("standard_lap|Prefers Xi dock");
  });

  it("round-trips observation feasibility", () => {
    const raw = serializeIntelligenceCaptureValue("provider_observation_feasibility", {
      token: "restricted",
      tokens: [],
      notes: "",
    });
    expect(raw).toBe("restricted");
    expect(intelligenceCaptureHasSignal("provider_observation_feasibility", raw)).toBe(true);
    expect(formatIntelligenceCaptureDisplay("provider_observation_feasibility", raw)).toBe("Restricted");
  });

  it("treats unknown-only segmented as empty for completion", () => {
    expect(intelligenceCaptureHasSignal("provider_evaluation_openness", "unknown")).toBe(false);
    expect(intelligenceCaptureHasSignal("provider_evaluation_openness", "open")).toBe(true);
  });

  it("observation access path chips have unique values for React keys", () => {
    const spec = intelligenceCaptureSpecForKey("provider_observation_access_path");
    const values = (spec?.suggestedChips ?? []).map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toContain("scheduler");
    expect(values).toContain(OR_ACCESS_CONSTRAINT_NONE_TOKEN);
    expect(values.filter((v) => v === "scheduler")).toHaveLength(1);
  });

  it("round-trips OR access none and clears blockers when selected", () => {
    expect(
      toggleProviderObservationAccessPathChips(["committee", "coordinator"], OR_ACCESS_CONSTRAINT_NONE_TOKEN),
    ).toEqual(["coordinator", OR_ACCESS_CONSTRAINT_NONE_TOKEN]);
    const raw = serializeIntelligenceCaptureValue("provider_observation_access_path", {
      token: null,
      tokens: [OR_ACCESS_CONSTRAINT_NONE_TOKEN],
      notes: "",
    });
    expect(raw).toBe(OR_ACCESS_CONSTRAINT_NONE_TOKEN);
    expect(intelligenceCaptureHasSignal("provider_observation_access_path", raw)).toBe(true);
    expect(formatIntelligenceCaptureDisplay("provider_observation_access_path", raw)).toBe(
      "No major gates mentioned",
    );
    expect(
      toggleProviderObservationAccessPathChips([OR_ACCESS_CONSTRAINT_NONE_TOKEN], "committee"),
    ).toEqual(["committee"]);
  });

  it("dedupeIntelligenceCaptureOptions keeps first label per value", () => {
    const out = dedupeIntelligenceCaptureOptions([
      { value: "scheduler", label: "Scheduler gate" },
      { value: "scheduler", label: "Scheduler" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.label).toBe("Scheduler");
  });

  it("preserves legacy freeform as display text", () => {
    const legacy = "Direct and operational — wants concise updates";
    expect(formatIntelligenceCaptureDisplay("provider_communication_style", legacy)).toBe(legacy);
    expect(intelligenceCaptureHasSignal("provider_communication_style", legacy)).toBe(true);
  });
});
