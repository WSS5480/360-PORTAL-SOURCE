import { describe, expect, it } from "vitest";
import {
  ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
  enrichDebriefMappingWithPartialLeads,
} from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";
import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { discoverySignalOperationalNote } from "@/lib/surgical-sales/discoveryIntelligenceSignalBriefing";
import { extractContactNamesFromDebriefText } from "@/lib/surgical-sales/debriefDetectedContact";
import { formatPartialIntelligencePersistValue } from "@/lib/surgical-sales/partialIntelligencePersist";
import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

function emptyMapping(): LogUpdateOpenAiMapping {
  return {
    summary: "",
    confidence: "medium",
    reasoning: "",
    source_scope: "debrief",
    operational_signals: [],
    confirmed_updates: [],
    partial_updates: [],
    still_to_validate: [],
    recommended_next_moves: [],
    do_not_update: [],
  };
}

describe("debrief partial intelligence mapping", () => {
  it("enriches Andy/Karen regression debrief with partial leads per domain", () => {
    const enriched = enrichDebriefMappingWithPartialLeads(
      emptyMapping(),
      ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
    );

    const domains = enriched.partial_updates.map((p) => p.domain);
    expect(domains).toContain("or_access");
    expect(domains).toContain("scheduling");
    expect(domains).toContain("credentialing");
    expect(domains).toContain("case_mix");
    expect(domains).toContain("product_fit");
    expect(domains).toContain("stakeholders");

    const schedulingRows = enriched.partial_updates.filter((p) => p.domain === "scheduling");
    expect(schedulingRows.length).toBeGreaterThanOrEqual(2);
    expect(schedulingRows.some((p) => /scheduling ownership/i.test(p.label))).toBe(true);
    expect(schedulingRows.some((p) => p.value.match(/Karen/i))).toBe(true);
    expect(
      schedulingRows.some((p) => p.still_needs.some((n) => /contact info|scheduling owner/i.test(n))),
    ).toBe(true);
  });

  it("formats scheduling partial with lead, still needed, and source quote", () => {
    const enriched = enrichDebriefMappingWithPartialLeads(
      emptyMapping(),
      ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
    );
    const schedulingPartial = enriched.partial_updates.find((p) => p.domain === "scheduling")!;
    const stored = formatPartialIntelligencePersistValue({
      narrative: schedulingPartial.value,
      stillNeeds: schedulingPartial.still_needs,
      suspectedContact: "Karen",
      contactScopeNote: "provider office — not confirmed facility-wide",
      sourceQuote: "He kept bringing up Karen from his office",
    });
    expect(stored).toMatch(/Karen/i);
    expect(stored).toMatch(/Still needed/i);
    expect(stored).toMatch(/Source:/i);
  });

  it("shows Karen partial note on scheduling_owner intelligence card after save", () => {
    const enriched = enrichDebriefMappingWithPartialLeads(
      emptyMapping(),
      ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
    );
    const schedulingPartial = enriched.partial_updates.find(
      (p) => p.domain === "scheduling" && /scheduling owner/i.test(p.label),
    )!;
    const stored = formatPartialIntelligencePersistValue({
      narrative: schedulingPartial.value,
      stillNeeds: schedulingPartial.still_needs,
      suspectedContact: "Karen",
      contactScopeNote: "provider office — not confirmed facility-wide",
    });

    const contact = {
      provider_observation_scheduling_control: "shared_workflow",
      provider_scheduling_contact: stored,
      provider_intelligence_field_metadata: {
        provider_observation_scheduling_control: {
          source_type: "engagement",
          source_label: "Intro Call debrief",
          updated_at: "2026-05-20T12:00:00.000Z",
          evidence_text:
            "Karen from the office appears involved in scheduling coordination and may work with the OR scheduling team.",
          lifecycle_state: "captured",
        },
      },
    };
    const groups = buildDiscoveryIntelligenceGroupsView({ contact });
    const schedulingSignal = groups.groups
      .flatMap((g) => g.rows)
      .find((r) => r.signalId === "scheduling_owner");
    expect(schedulingSignal?.statusLabel).toBe("Captured");

    const note = discoverySignalOperationalNote(contact, schedulingSignal!);
    expect(note).toMatch(/Karen/i);
  });

  it("extracts single-name Karen and Mike contact leads from debrief", () => {
    const names = extractContactNamesFromDebriefText(ANDY_KAREN_DEBRIEF_REGRESSION_NOTE).map(
      (n) => n.name,
    );
    expect(names).toEqual(["Karen", "Mike"]);
  });
});
