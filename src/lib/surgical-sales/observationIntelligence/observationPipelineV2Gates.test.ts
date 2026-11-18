import { describe, expect, it } from "vitest";

import { rebuildCaseIntelligenceFromNoteBodies } from "@/lib/surgical-sales/rebuildCaseIntelligenceFromNotes";
import { rebuildProviderIntelligenceAfterNoteDelete } from "@/lib/surgical-sales/rebuildProviderIntelligenceAfterNoteDelete";
import { buildProviderPriorEvidencePool } from "@/lib/surgical-sales/providerPriorEvidencePool";
import type { ObservationFact } from "./observationFactTypes";
import { runObservationIntelligencePipeline } from "./observationIntelligencePipeline";

/** Canonical Dr. Lettuce note — contains the minimized readiness-delay false positive. */
const ROUTINE_CASE_NOTE =
  "Pretty routine case overall. They're still using Bard Mesh. One thing I noticed was the surgeon asked for a different angle a couple times because he wasn't getting the view he wanted before fixation. Didn't seem angry about it, but it definitely slowed things down. Staff was good. Everyone seemed to know what they were doing. There was a little waiting around at one point because they were looking for something that wasn't ready. Nothing major. Still too early for me to know if there's a real opportunity here.";

function v2Facts(): ObservationFact[] {
  return [
    {
      type: "current_product",
      value: "Bard Mesh",
      evidence: "They're still using Bard Mesh.",
      polarity: "neutral",
      confirmation_state: "witnessed",
      validation: { status: "accepted" },
    },
    {
      type: "workflow_issue",
      value: "extra visualization time before fixation",
      evidence:
        "the surgeon asked for a different angle a couple times because he wasn't getting the view he wanted before fixation",
      polarity: "negative",
      confirmation_state: "witnessed",
      validation: { status: "accepted" },
    },
    {
      type: "staff_efficiency",
      value: "coordinated team",
      evidence: "Everyone seemed to know what they were doing.",
      polarity: "positive",
      confirmation_state: "witnessed",
      validation: { status: "accepted" },
    },
    {
      type: "workflow_delay",
      value: "delay caused by readiness issue",
      evidence:
        "There was a little waiting around at one point because they were looking for something that wasn't ready. Nothing major.",
      polarity: "negative",
      confirmation_state: "witnessed",
      validation: { status: "suppressed", reason: "minimized" },
    },
  ];
}

function v2Extraction(): Record<string, unknown> {
  return {
    facts: v2Facts(),
    extractedAt: "2026-06-09T00:00:00.000Z",
    model: "facts-v2-ai",
    validation_version: 1,
  };
}

describe("§6 display gate — observationIntelligencePipeline", () => {
  it("v2 note: stored validated facts only — suppressed delay never resurrects via body re-parse", () => {
    const result = runObservationIntelligencePipeline({
      caseRow: { id: "case-1", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: ROUTINE_CASE_NOTE,
          metadata_json: { ai_extraction: v2Extraction() },
        },
      ],
    });

    const values = result.allFacts.map((fact) => fact.value);
    expect(values).toContain("Bard Mesh");
    expect(values).toContain("coordinated team");
    expect(values).toContain("extra visualization time before fixation");
    // The regex would re-derive this from the body; the gate must prevent it.
    expect(values).not.toContain("delay caused by readiness issue");
  });

  it("legacy note: behavior unchanged — body re-parse still surfaces the readiness delay", () => {
    const result = runObservationIntelligencePipeline({
      caseRow: { id: "case-1", status: "confirmed" },
      activities: [{ activity_type: "note", body: ROUTINE_CASE_NOTE }],
    });

    const values = result.allFacts.map((fact) => fact.value);
    expect(values).toContain("delay caused by readiness issue");
    expect(values).toContain("Bard Mesh");
  });

  it("mixed-vintage case: legacy and v2 facts merge on pinned dedupe keys", () => {
    const result = runObservationIntelligencePipeline({
      caseRow: { id: "case-1", status: "confirmed" },
      activities: [
        { activity_type: "note", body: "They're still using Bard Mesh today." },
        {
          activity_type: "note",
          body: ROUTINE_CASE_NOTE,
          metadata_json: { ai_extraction: v2Extraction() },
        },
      ],
    });

    const currentCase = result.factsByCase.find((entry) => entry.caseId === "case-1");
    const bardFacts = (currentCase?.facts ?? []).filter(
      (fact) => fact.type === "current_product" && fact.value === "Bard Mesh",
    );
    // One merged fact, not two — dedupe key `${type}:${value.toLowerCase()}` aligns.
    expect(bardFacts.length).toBe(1);
  });
});

describe("§6b note-delete rebuild gate", () => {
  it("v2 note rebuilds from stored accepted facts — suppressed fact stays out of live fields", () => {
    const patch = rebuildCaseIntelligenceFromNoteBodies({
      caseType: "observation",
      noteBodies: [ROUTINE_CASE_NOTE],
      notes: [{ body: ROUTINE_CASE_NOTE, aiExtraction: v2Extraction() }],
    });

    const patchText = JSON.stringify(patch);
    expect(patchText).toContain("Bard Mesh");
    expect(patchText).not.toContain("readiness");
    expect(patchText).not.toContain("Staff supply delays");
  });

  it("legacy note rebuilds exactly as today — readiness delay re-derived from body", () => {
    const patch = rebuildCaseIntelligenceFromNoteBodies({
      caseType: "observation",
      noteBodies: [ROUTINE_CASE_NOTE],
    });

    expect(JSON.stringify(patch)).toContain("Staff supply delays");
  });

  it("provider rebuild replays v2 remaining notes from stored facts, not body re-parse", () => {
    const providerPatch = rebuildProviderIntelligenceAfterNoteDelete({
      providerRow: {
        provider_current_vendors: null,
        provider_workflow_pain_points: null,
        provider_staff_frustrations: null,
      },
      deletedNoteBody: "Quick note about scheduling, nothing clinical.",
      remainingNoteBodies: [ROUTINE_CASE_NOTE],
      remainingNotes: [{ body: ROUTINE_CASE_NOTE, aiExtraction: v2Extraction() }],
    });

    const patchText = JSON.stringify(providerPatch);
    // Accepted product fact promotes; suppressed readiness delay does not.
    expect(patchText).toContain("Bard Mesh");
    expect(patchText).not.toContain("readiness");
    // §5: positive staff fact must not land in provider_staff_frustrations.
    expect(providerPatch.provider_staff_frustrations ?? null).toBeNull();
  });
});

describe("§6c evidence-pool gate — providerPriorEvidencePool", () => {
  const providerContact = {
    provider_workflow_pain_points:
      "Manual capture text: staff waiting around for supplies, room not ready.",
    provider_intelligence_field_metadata: {},
  };

  it("v2 case: provider field text is not regex-fact-ized into observation evidence", () => {
    const pool = buildProviderPriorEvidencePool({
      currentCaseId: "case-1",
      caseRow: { id: "case-1", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: ROUTINE_CASE_NOTE,
          metadata_json: { ai_extraction: v2Extraction() },
        },
      ],
      providerContact,
    });

    const fieldEvidence = pool.filter((evidence) =>
      evidence.finding.matchKey.startsWith("provider_field:provider_workflow_pain_points"),
    );
    expect(fieldEvidence.length).toBe(0);
  });

  it("all-legacy case: provider field text re-parse behaves exactly as today", () => {
    const pool = buildProviderPriorEvidencePool({
      currentCaseId: "case-1",
      caseRow: { id: "case-1", status: "confirmed" },
      activities: [{ activity_type: "note", body: ROUTINE_CASE_NOTE }],
      providerContact,
    });

    const fieldEvidence = pool.filter((evidence) =>
      evidence.finding.matchKey.startsWith("provider_field:provider_workflow_pain_points"),
    );
    expect(fieldEvidence.length).toBeGreaterThan(0);
  });
});
