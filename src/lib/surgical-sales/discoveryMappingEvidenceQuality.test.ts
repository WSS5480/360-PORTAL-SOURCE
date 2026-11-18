import { describe, expect, it } from "vitest";
import {
  assessDiscoveryMappingEvidence,
  DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY,
  isDiscoveryMappingValidatedOnFile,
  isPlaceholderDiscoveryMappingAnswer,
  resolveDiscoveryMappingScanStatus,
} from "./discoveryMappingEvidenceQuality";

describe("discoveryMappingEvidenceQuality", () => {
  it("rejects placeholder and question-echo answers", () => {
    expect(isPlaceholderDiscoveryMappingAnswer("Captured intelligence")).toBe(true);
    expect(isPlaceholderDiscoveryMappingAnswer("on file")).toBe(true);
    expect(
      isPlaceholderDiscoveryMappingAnswer(
        "Where is observation scheduling controlled?",
        "Where is observation scheduling controlled?",
      ),
    ).toBe(true);
    expect(isPlaceholderDiscoveryMappingAnswer("Karen coordinates scheduling with OR.")).toBe(false);
  });

  it("returns none when no readable evidence exists", () => {
    expect(
      assessDiscoveryMappingEvidence({
        summary: "Captured intelligence",
        questionText: "Has observation access been approved?",
      }),
    ).toBe("none");
  });

  it("returns weak for partial lead or inferred evidence", () => {
    expect(
      assessDiscoveryMappingEvidence({
        summary: "Karen might be involved in scheduling.",
      }),
    ).toBe("weak");
    expect(
      assessDiscoveryMappingEvidence({
        fieldValues: ["[Partial lead] Karen"],
        hasPartialLead: true,
      }),
    ).toBe("weak");
  });

  it("returns partial for a direct single mention", () => {
    expect(
      assessDiscoveryMappingEvidence({
        summary: "Karen schedules observations.",
      }),
    ).toBe("partial");
  });

  it("marks open when no evidence exists", () => {
    expect(
      resolveDiscoveryMappingScanStatus({
        validationStatus: "confirmed",
        evidenceStrength: "none",
      }),
    ).toEqual({ label: "Open", slug: "open" });
  });

  it("marks potential lead for weak evidence", () => {
    expect(
      resolveDiscoveryMappingScanStatus({
        validationStatus: "likely",
        evidenceStrength: "weak",
        confidenceLevel: "low",
      }),
    ).toEqual({ label: "Potential Lead", slug: "potential_lead" });
  });

  it("only marks confirmed with validated on-file substantive evidence", () => {
    expect(
      resolveDiscoveryMappingScanStatus({
        validationStatus: "confirmed",
        evidenceStrength: "substantive",
        validatedOnFile: true,
        manualMappingConfirmed: true,
      }),
    ).toEqual({ label: "Confirmed", slug: "confirmed" });

    expect(
      resolveDiscoveryMappingScanStatus({
        validationStatus: "confirmed",
        evidenceStrength: "none",
        validatedOnFile: true,
      }),
    ).toEqual({ label: "Open", slug: "open" });
  });

  it("does not treat capture tokens validated on file as confirmed mapping answers", () => {
    expect(
      isDiscoveryMappingValidatedOnFile({
        dbKeys: ["provider_observation_scheduling_control"],
        contact: {
          provider_observation_scheduling_control: "shared_workflow",
          provider_intelligence_field_metadata: {
            provider_observation_scheduling_control: {
              source_type: "engagement",
              source_label: "Intro Call debrief",
              updated_at: new Date().toISOString(),
              validated_at: new Date().toISOString(),
              lifecycle_state: "validated",
            },
          },
        },
      }),
    ).toBe(false);
  });
});
