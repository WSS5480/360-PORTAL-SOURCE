import { describe, expect, it } from "vitest";
import {
  buildCaptureContextFromSearchParams,
  buildIntelligenceCaptureSourceLabel,
  formatIntelligenceFieldAttributionDisplay,
  isHelpfulFieldAttribution,
  mergeIntelligenceFieldMetadata,
  parseProviderIntelligenceFieldMetadata,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

describe("providerIntelligenceFieldMetadata", () => {
  it("formats capture, author, and validation lines when helpful", () => {
    const meta = {
      source_type: "intro_call" as const,
      source_label: "Intro Call",
      updated_at: "2026-05-15T12:00:00.000Z",
      updated_by_name: "Brandon",
      validated_at: "2026-05-20T12:00:00.000Z",
    };
    expect(isHelpfulFieldAttribution(meta)).toBe(true);
    const display = formatIntelligenceFieldAttributionDisplay(meta);
    expect(display.sourceLine).toBe("Captured from Intro Call");
    expect(display.authorLine).toBe("Added by Brandon");
    expect(display.validatedLine).toBe("Last validated May 2026");
    expect(display.briefLine).toBe("Last validated May 2026");
  });

  it("hides generic profile-only attribution without author or validation", () => {
    const meta = {
      source_type: "profile" as const,
      source_label: "Provider profile",
      updated_at: "2026-05-15T12:00:00.000Z",
    };
    expect(isHelpfulFieldAttribution(meta)).toBe(false);
    const display = formatIntelligenceFieldAttributionDisplay(meta);
    expect(display.sourceLine).toBeNull();
    expect(display.authorLine).toBeNull();
  });

  it("builds observation source label with case number", () => {
    expect(
      buildIntelligenceCaptureSourceLabel({
        source_type: "observation",
        source_case_number: "SC-1042",
      }),
    ).toBe("Observation SC-1042");
  });

  it("builds capture context from case search params", () => {
    const params = new URLSearchParams({
      from_case: "c1",
      case_number: "SC-1042",
    });
    const ctx = buildCaptureContextFromSearchParams(params);
    expect(ctx.source_type).toBe("observation");
    expect(ctx.source_label).toBe("Observation SC-1042");
  });

  it("merges metadata for changed intelligence keys", () => {
    const meta = mergeIntelligenceFieldMetadata({
      existing: {},
      changedKeys: ["provider_observation_feasibility"],
      fieldValues: { provider_observation_feasibility: "easy" },
      captureContext: { source_type: "intro_call", source_label: "Intro Call" },
      actor: { userId: "u1", userName: "Brandon" },
      now: new Date("2026-05-01T12:00:00.000Z"),
    });
    expect(meta.provider_observation_feasibility?.source_label).toBe("Intro Call");
    expect(meta.provider_observation_feasibility?.updated_by_name).toBe("Brandon");
  });

  it("parses stored metadata map", () => {
    const parsed = parseProviderIntelligenceFieldMetadata({
      provider_communication_style: {
        source_type: "profile",
        source_label: "Provider profile",
        updated_at: "2026-01-01T00:00:00.000Z",
        updated_by_name: "Rep",
      },
    });
    expect(parsed.provider_communication_style?.updated_by_name).toBe("Rep");
  });
});
