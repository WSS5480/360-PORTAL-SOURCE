import { describe, expect, it } from "vitest";

import {
  buildFocusObjectiveLines,
  buildProviderFieldBriefing,
  buildStillNeedToLearnLines,
  buildWhatWeKnowLines,
  focusCueToObjective,
  REP_STORY_BANNED_PATTERNS,
  repEvidenceAreaStatusLabel,
  repEvidenceGuidanceTier,
  repEvidencePillarLearningGuidance,
  repProgramMaturityNote,
  sanitizeRepFacingCopy,
  translateEvidenceGapToLearningQuestion,
} from "./observationRepPresentationCopy";
import { buildObservationRepPresentationView } from "./buildObservationRepPresentationView";
import { buildObservationCaseBriefingRepView } from "./observationCaseBriefingPresentation";
import { OBSERVATION_INTELLIGENCE_STILL_NEED_MAX } from "./observationLearningObjectiveLimits";
import type { AggregatedFindingEvidence } from "./observationFindingEvidenceConfidence";

const ENGINE_TERMS =
  /\b(confidence|supported pattern|repeated signal|captured signal|validated|evidence maturity|signal captured|strengthens|pain points?|gather evidence|validate whether|hypothesis|adoption signal)\b/i;

function mockFinding(
  overrides: Partial<AggregatedFindingEvidence> = {},
): AggregatedFindingEvidence {
  return {
    label: "Product Alpha observed",
    matchKey: "product_in_use:product alpha",
    normalizedFindingId: "product_in_use:product alpha",
    observationCount: 2,
    completedObservationCount: 2,
    capturedFromCurrentNote: false,
    isPositiveStaffSignal: false,
    isEarlySignal: false,
    confidence: "Medium",
    evidenceLabel: "Observed in 2 completed cases",
    sourceCaseIds: ["case-1", "case-2"],
    maturityStatus: "supported_pattern",
    ...overrides,
  };
}

describe("observationRepPresentationCopy", () => {
  it("maps evidence area statuses to rep labels", () => {
    expect(repEvidenceAreaStatusLabel("validated")).toBe("Known");
    expect(repEvidenceAreaStatusLabel("supported")).toBe("Known");
    expect(repEvidenceAreaStatusLabel("captured_signal")).toBe("Early Observations");
    expect(repEvidenceAreaStatusLabel("missing")).toBe("Not Yet Covered");
  });

  it("translates engine gaps into learning questions", () => {
    expect(translateEvidenceGapToLearningQuestion("Complete current case to confirm pending signals")).toBe(
      "Finish this case to confirm what you noted today",
    );
    expect(translateEvidenceGapToLearningQuestion("Provider pain points")).toBe(
      "Listen for provider frustrations.",
    );
    expect(translateEvidenceGapToLearningQuestion("Repeat product/workflow evidence across completed cases")).toBe(
      "Confirm whether product use and workflow friction repeat across completed cases.",
    );
  });

  it("sanitizes engine ontology from rep-facing strings", () => {
    expect(sanitizeRepFacingCopy("Validate whether workflow patterns repeat")).toBe(
      "Watch whether workflow patterns repeat",
    );
    expect(sanitizeRepFacingCopy("New signal captured: delay")).toBe("New observation noted: delay");
    expect(sanitizeRepFacingCopy("Provider pain points still unknown")).toBe(
      "Provider frustrations still unknown",
    );
  });

  it("maps evidence guidance tiers from pillar status", () => {
    expect(repEvidenceGuidanceTier("missing")).toBe("unknown");
    expect(repEvidenceGuidanceTier("early_signal")).toBe("emerging");
    expect(repEvidenceGuidanceTier("captured_signal")).toBe("emerging");
    expect(repEvidenceGuidanceTier("supported")).toBe("known");
    expect(repEvidenceGuidanceTier("validated")).toBe("known");
  });

  it("generates state-driven pillar learning guidance without product-specific branches", () => {
    expect(repEvidencePillarLearningGuidance("provider_pain_points", "missing")).toBe(
      "Listen for provider frustrations.",
    );
    expect(repEvidencePillarLearningGuidance("provider_pain_points", "early_signal")).toBe(
      "Watch whether provider frustrations show up again.",
    );
    expect(repEvidencePillarLearningGuidance("staff_pain_points", "missing")).toBe(
      "Watch for staff workflow friction.",
    );
    expect(repEvidencePillarLearningGuidance("workflow_findings", "supported")).toBe(
      "Understand how workflow patterns affect efficiency or decision-making.",
    );
    expect(repEvidencePillarLearningGuidance("current_products", "early_signal")).toBe(
      "Confirm whether product use is consistent.",
    );
    expect(repEvidencePillarLearningGuidance("current_products", "supported")).toBe(
      "Watch for product openings based on observed workflow.",
    );

    for (const line of [
      repEvidencePillarLearningGuidance("provider_pain_points", "missing"),
      repEvidencePillarLearningGuidance("workflow_findings", "early_signal"),
      repEvidencePillarLearningGuidance("current_products", "supported"),
    ]) {
      expect(line).not.toMatch(/bard mesh|dr\. apple|hernia|visualization before fixation/i);
    }
  });

  it("builds still need to learn from evidence pillar states", () => {
    const lines = buildStillNeedToLearnLines({
      evidenceGaps: ["Complete current case to confirm pending signals", "Provider pain points"],
      evidenceProgress: [
        { id: "provider_pain_points", label: "Provider Pain Points", status: "missing" },
        { id: "staff_pain_points", label: "Staff Pain Points", status: "missing" },
        { id: "workflow_findings", label: "Workflow Bottlenecks", status: "early_signal" },
        { id: "current_products", label: "Current Products Used", status: "captured_signal" },
        { id: "product_fit_signals", label: "Product Fit Opportunity", status: "missing" },
      ],
    });

    expect(lines[0]).toMatch(/finish this case/i);
    expect(lines.some((line) => /listen for provider frustrations/i.test(line))).toBe(true);
    expect(lines.some((line) => /watch for staff workflow friction/i.test(line))).toBe(true);
    expect(lines.some((line) => /watch whether workflow patterns repeat/i.test(line))).toBe(true);
    expect(lines.some((line) => /confirm whether product use is consistent/i.test(line))).toBe(true);
    expect(lines.filter((line) => /listen for provider frustrations/i.test(line))).toHaveLength(1);
    expect(lines.length).toBeLessThanOrEqual(6);
  });

  it("formats what-we-know lines without engine language", () => {
    const lines = buildWhatWeKnowLines({
      providerName: "Dr. Example",
      findings: [
        mockFinding(),
        mockFinding({
          normalizedFindingId: "workflow_visualization_before_fixation",
          label: "Visualization challenge before fixation",
          matchKey: "workflow_visualization_before_fixation",
          completedObservationCount: 3,
          observationCount: 3,
        }),
      ],
    });

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).not.toMatch(ENGINE_TERMS);
    }
    expect(lines.some((line) => /Product Alpha was used during the case/i.test(line))).toBe(true);
    for (const line of lines) {
      for (const pattern of REP_STORY_BANNED_PATTERNS) {
        expect(line).not.toMatch(pattern);
      }
    }
  });

  it("turns focus cues into observational objectives", () => {
    expect(focusCueToObjective("Does the provider react with hesitation, frustration, or workaround?")).toBe(
      "Listen for provider frustrations",
    );
    expect(focusCueToObjective("Does workflow delay happen again?")).toBe(
      "Observe whether workflow delay repeats",
    );
    expect(
      buildFocusObjectiveLines(["Does staff show burden, delay, confusion, or complaint?"]),
    ).toEqual(["Listen for staff frustrations"]);
  });

  it("builds provider field briefing without reconciliation language", () => {
    const lines = buildProviderFieldBriefing({
      providerName: "Dr. Example",
      findings: [
        mockFinding({
          normalizedFindingId: "workflow_visualization_before_fixation",
          label: "Visualization challenge before fixation",
          matchKey: "workflow_visualization_before_fixation",
          completedObservationCount: 2,
        }),
      ],
      evidenceGaps: ["Provider pain points", "Staff pain points"],
      evidenceProgress: [
        { id: "provider_pain_points", status: "missing" },
        { id: "staff_pain_points", status: "missing" },
        { id: "workflow_findings", status: "supported" },
        { id: "current_products", status: "supported" },
        { id: "product_fit_signals", status: "early_signal" },
      ],
    });

    expect(lines.some((line) => /observed across 2 completed cases/i.test(line))).toBe(true);
    expect(lines.some((line) => /No provider frustrations have been identified yet/i.test(line))).toBe(true);
    for (const line of lines) {
      expect(line).not.toMatch(ENGINE_TERMS);
    }
  });

  it("uses rep-friendly program maturity notes", () => {
    expect(
      repProgramMaturityNote({ currentCaseComplete: false, currentCaseHasCapturedNotes: true }),
    ).toBe("Mark this case complete when your observation note is finished.");
  });
});

describe("buildObservationRepPresentationView", () => {
  it("exposes three operational sections without engine terminology", () => {
    const view = buildObservationRepPresentationView({
      caseRow: { id: "case-1", status: "confirmed", provider_name: "Dr. Example" },
      activities: [
        {
          activity_type: "note",
          body: "Product Alpha used again. Team seemed organized. Extra time getting visualization before fixation.",
        },
      ],
      priorCases: [
        {
          id: "case-prior",
          status: "completed",
          live_observation_competitors: "Product Alpha observed",
          notes: "Product Alpha observed during case.",
        },
      ],
    });

    expect(view.whatWeKnow.length + view.stillNeedToLearn.length).toBeGreaterThan(0);
    expect(view.focusForNextObservation.length).toBeGreaterThan(0);
    expect(view.thisObservation.title).toMatch(/^This Observation/);
    expect(view.debriefReadiness.headline).toMatch(/Not Ready for Debrief|Evidence Nearly Ready|Ready for Debrief/);
    expect(view.debriefReadiness.title).toBe("Debrief Readiness");

    const allCopy = [
      ...view.whatWeKnow.map((item) => item.text),
      ...view.stillNeedToLearn.map((item) => item.text),
      ...view.focusForNextObservation.map((item) => item.text),
      ...view.thisObservation.items.map((item) => item.text),
      ...view.providerBriefing.items.map((item) => item.text),
      view.debriefReadiness.nextStep,
      ...view.debriefReadiness.reasons,
      view.evidenceProgress.lead,
      ...view.evidenceProgress.items.map((item) => item.statusLabel),
    ].join("\n");

    expect(allCopy).not.toMatch(ENGINE_TERMS);
    expect(allCopy).not.toMatch(/\bAI\b/i);
  });

  it("caps still need to learn at three prioritized objectives aligned with briefing", () => {
    const input = {
      caseRow: { id: "case-1", status: "confirmed", provider_name: "Dr. Example" },
      activities: [],
      priorCases: [
        {
          id: "case-prior",
          status: "completed",
          live_observation_competitors: "Product Alpha observed",
          live_observation_workflow: "Extra visualization time before fixation",
          notes: "Product Alpha observed during case.",
        },
      ],
    };

    const view = buildObservationRepPresentationView(input);
    const briefing = buildObservationCaseBriefingRepView(input);

    expect(view.stillNeedToLearn.length).toBeLessThanOrEqual(OBSERVATION_INTELLIGENCE_STILL_NEED_MAX);
    expect(view.stillNeedToLearn.map((item) => item.text)).toEqual(
      briefing.stillNeedToLearn.slice(0, OBSERVATION_INTELLIGENCE_STILL_NEED_MAX),
    );
  });

  it("uses inline universal capture from note activity when persisted read model is unavailable", () => {
    const extractedAt = "2026-06-23T17:36:00.000Z";
    const view = buildObservationRepPresentationView({
      caseRow: { id: "case-1", status: "confirmed", surgeon_contact_id: "provider-1" },
      activities: [
        {
          activity_type: "note",
          body: "Observation with Dr. Lettuce. He used Arthrex SpeedBridge and ArthroFlex graft today. Asked how our graft compares on incorporation time. Sarah, the scrub tech, said cases were delayed waiting on grafts. Doesn't seem locked into Arthrex.",
          metadata_json: {
            note_id: "note-1",
            ai_extraction: {
              universal_capture: {
                capture_id: "inline-capture-1",
                fact_ids: [],
                universal: {
                  raw_note: "Observation with Dr. Lettuce.",
                  declared_source_type: "observation_case",
                  model: "test",
                  extracted_at: extractedAt,
                  extraction_ms: 1,
                  facts: [
                    {
                      concept: "current_product",
                      normalized_label: "Current product: Arthrex SpeedBridge",
                      assertion_level: "observed",
                      source_type: "observation_case",
                      evidence_text: "He used Arthrex SpeedBridge and ArthroFlex graft today.",
                      confidence: "high",
                      negated: false,
                      uncertain: false,
                      product_mentioned: "Arthrex SpeedBridge",
                    },
                    {
                      concept: "current_product",
                      normalized_label: "Current product: ArthroFlex graft",
                      assertion_level: "observed",
                      source_type: "observation_case",
                      evidence_text: "He used Arthrex SpeedBridge and ArthroFlex graft today.",
                      confidence: "high",
                      negated: false,
                      uncertain: false,
                      product_mentioned: "ArthroFlex graft",
                    },
                    {
                      concept: "product_interest",
                      normalized_label: "Product comparison or clinical-data interest",
                      assertion_level: "provider_reported",
                      source_type: "observation_case",
                      evidence_text: "Asked how our graft compares on incorporation time.",
                      confidence: "high",
                      negated: false,
                      uncertain: false,
                    },
                    {
                      concept: "contact_role",
                      normalized_label: "Sarah · Scrub Tech",
                      assertion_level: "observed",
                      source_type: "observation_case",
                      evidence_text: "Sarah, the scrub tech, said cases were delayed waiting on grafts.",
                      confidence: "high",
                      negated: false,
                      uncertain: false,
                      person_mentioned: "Sarah",
                    },
                    {
                      concept: "provider_sentiment",
                      normalized_label: "Relationship: provider openness to alternatives",
                      assertion_level: "provider_reported",
                      source_type: "observation_case",
                      evidence_text: "Doesn't seem locked into Arthrex.",
                      confidence: "medium",
                      negated: false,
                      uncertain: false,
                    },
                    {
                      concept: "staff_workflow",
                      normalized_label: "Staff workflow: Team influence on case flow",
                      assertion_level: "observed",
                      source_type: "observation_case",
                      evidence_text: "Sarah, the scrub tech, said cases were delayed waiting on grafts.",
                      confidence: "medium",
                      negated: false,
                      uncertain: false,
                    },
                    {
                      concept: "next_action",
                      normalized_label: "Next step recommended",
                      assertion_level: "provider_reported",
                      source_type: "observation_case",
                      evidence_text: "Send him the clinical data we talked about.",
                      confidence: "high",
                      negated: false,
                      uncertain: false,
                    },
                    {
                      concept: "next_action",
                      normalized_label: "Next step recommended",
                      assertion_level: "provider_reported",
                      source_type: "observation_case",
                      evidence_text: "Follow up in a couple weeks.",
                      confidence: "high",
                      negated: false,
                      uncertain: false,
                    },
                  ],
                  suppressed_facts: [],
                },
              },
            },
          },
        },
      ],
      priorCases: [],
    });

    const joined = view.thisObservation.items.map((item) => item.text).join("\n");
    expect(joined).toMatch(/Arthrex SpeedBridge/i);
    expect(joined).toMatch(/ArthroFlex graft/i);
    expect(joined).toMatch(/graft compares on incorporation time/i);
    expect(joined).toMatch(/Sarah.*Scrub Tech/i);
    expect(joined).toMatch(/Provider openness to alternatives/i);
    expect(joined).not.toMatch(/Current product:/i);
    expect(joined).not.toMatch(/visualization/i);

    const followUp = view.stillNeedToLearn.map((item) => item.text).join("\n");
    expect(followUp).toMatch(/Send him the clinical data/i);
    expect(followUp).toMatch(/Follow up in a couple weeks/i);
    expect(followUp).not.toMatch(/extra visualization/i);
  });

  it("hides generic post-capture follow-up and focus coaching when no explicit task exists", () => {
    const view = buildObservationRepPresentationView({
      caseRow: { id: "case-1", status: "confirmed", provider_name: "Dr. Example" },
      activities: [
        {
          activity_type: "note",
          body: "Observed the case. The team was organized and the workflow was routine.",
        },
      ],
      priorCases: [],
    });

    expect(view.stillNeedToLearn).toEqual([]);
    expect(view.focusForNextObservation).toEqual([]);
    expect(view.debriefReadiness.nextStep).not.toMatch(
      /observe workflow, product use, and any provider or staff friction/i,
    );
  });

  it("de-duplicates repeated current product facts in observation outputs", () => {
    const view = buildObservationRepPresentationView({
      caseRow: { id: "case-1", status: "confirmed", provider_name: "Dr. Example" },
      activities: [
        {
          activity_type: "note",
          body: "Bard Soft Mesh was used during the case.",
          metadata_json: { note_id: "note-1" },
        },
      ],
      priorCases: [],
      universalFactsReadModel: {
        caseRuns: [
          {
            capture_id: "capture-1",
            declared_source_type: "observation_case",
            extraction_model: "test",
            created_at: "2026-06-25T12:00:00Z",
            operational_note_id: "note-1",
            facts: [
              {
                id: "fact-current",
                capture_id: "capture-1",
                concept: "current_product",
                normalized_label: "Current product: Bard Soft Mesh",
                assertion_level: "validated",
                source_type: "observation_case",
                evidence_text: "Bard Soft Mesh was used during the case.",
                confidence: "high",
                negated: false,
                uncertain: false,
                suppressed: false,
                product_mentioned: "Bard Soft Mesh",
                case_id: "case-1",
                provider_id: null,
                organization_id: null,
                encounter_id: null,
                created_at: "2026-06-25T12:00:00Z",
              },
              {
                id: "fact-competitor",
                capture_id: "capture-1",
                concept: "competitor_product",
                normalized_label: "Competitor product: Bard Soft Mesh",
                assertion_level: "validated",
                source_type: "observation_case",
                evidence_text: "Bard Soft Mesh was used during the case.",
                confidence: "high",
                negated: false,
                uncertain: false,
                suppressed: false,
                product_mentioned: "Bard Soft Mesh",
                case_id: "case-1",
                provider_id: null,
                organization_id: null,
                encounter_id: null,
                created_at: "2026-06-25T12:00:00Z",
              },
            ],
          },
        ],
        programRuns: [],
      },
    });

    const bardItems = view.thisObservation.items.filter((item) => /Bard Soft Mesh/i.test(item.text));
    expect(bardItems).toHaveLength(1);
  });

  it("supplements partial persisted observation facts with local note facts while intelligence is processing", () => {
    const note =
      "Today I observed another laparoscopic ventral hernia repair with Dr. Tom Lettuce. They were still using Bard Soft Mesh for the case. The surgeon again mentioned that positioning the mesh in larger defects can be awkward and said he would like something with a little more flexibility. Sarah coordinated the observation like last time and had everything ready before we arrived. One thing I noticed today was that the surgeon likes to fully visualize the defect before committing to fixation, which added a little extra OR time. The staff didn't seem frustrated, and the overall workflow was smooth. The surgeon wasn't asking to change products today, but he was interested when I mentioned that there may be alternatives designed for easier handling in larger defects.";

    const view = buildObservationRepPresentationView({
      caseRow: { id: "case-1", status: "confirmed", provider_name: "Dr. Tom Lettuce" },
      activities: [
        {
          activity_type: "note",
          body: note,
          metadata_json: { note_id: "note-1", intelligence_processing: true },
        },
      ],
      priorCases: [],
      universalFactsReadModel: {
        caseRuns: [
          {
            capture_id: "capture-1",
            declared_source_type: "observation_case",
            extraction_model: "test",
            created_at: "2026-06-25T12:00:00Z",
            operational_note_id: "note-1",
            facts: [
              {
                id: "fact-current",
                capture_id: "capture-1",
                concept: "current_product",
                normalized_label: "Current product: Bard Soft Mesh",
                assertion_level: "validated",
                source_type: "observation_case",
                evidence_text: "They were still using Bard Soft Mesh for the case.",
                confidence: "high",
                negated: false,
                uncertain: false,
                suppressed: false,
                product_mentioned: "Bard Soft Mesh",
                case_id: "case-1",
                provider_id: null,
                organization_id: null,
                encounter_id: null,
                created_at: "2026-06-25T12:00:00Z",
              },
            ],
          },
        ],
        programRuns: [],
      },
    });

    const text = view.thisObservation.items.map((item) => item.text).join("\n");
    expect(text).toMatch(/Bard Soft Mesh/i);
    expect(text).toMatch(/larger defects|flexibility|awkward/i);
    expect(text).toMatch(/Sarah/i);
    expect(text).toMatch(/visuali[sz]e|fixation|extra OR time/i);
    expect(view.thisObservation.items.filter((item) => /Bard Soft Mesh/i.test(item.text))).toHaveLength(1);
  });

  it("removes What We Know lines already visible in the current observation summary", () => {
    const view = buildObservationRepPresentationView({
      caseRow: { id: "case-1", status: "confirmed", provider_name: "Dr. Example" },
      activities: [
        {
          activity_type: "note",
          body: "Bard Soft Mesh was used during the case.",
          metadata_json: { note_id: "note-1" },
        },
      ],
      priorCases: [],
      universalFactsReadModel: {
        caseRuns: [
          {
            capture_id: "capture-case",
            declared_source_type: "observation_case",
            extraction_model: "test",
            created_at: "2026-06-25T12:00:00Z",
            operational_note_id: "note-1",
            facts: [
              {
                id: "case-product",
                capture_id: "capture-case",
                concept: "current_product",
                normalized_label: "Current product: Bard Soft Mesh",
                assertion_level: "observed",
                source_type: "observation_case",
                evidence_text: "Bard Soft Mesh was used during the case.",
                confidence: "high",
                negated: false,
                uncertain: false,
                suppressed: false,
                product_mentioned: "Bard Soft Mesh",
                case_id: "case-1",
                provider_id: null,
                organization_id: null,
                encounter_id: null,
                created_at: "2026-06-25T12:00:00Z",
              },
            ],
          },
        ],
        programRuns: [
          {
            capture_id: "capture-program",
            declared_source_type: "observation_case",
            extraction_model: "test",
            created_at: "2026-06-25T12:00:00Z",
            operational_note_id: "note-1",
            facts: [
              {
                id: "program-product",
                capture_id: "capture-program",
                concept: "current_product",
                normalized_label: "Current product: Bard Soft Mesh",
                assertion_level: "observed",
                source_type: "observation_case",
                evidence_text: "Bard Soft Mesh was used during the case.",
                confidence: "high",
                negated: false,
                uncertain: false,
                suppressed: false,
                product_mentioned: "Bard Soft Mesh",
                case_id: "case-1",
                provider_id: null,
                organization_id: null,
                encounter_id: null,
                created_at: "2026-06-25T12:00:00Z",
              },
            ],
          },
        ],
      },
    });

    expect(view.thisObservation.items.map((item) => item.text).join("\n")).toMatch(/Bard Soft Mesh/i);
    expect(view.whatWeKnow.map((item) => item.text).join("\n")).not.toMatch(/Bard Soft Mesh/i);
  });

  it("keeps durable What We Know lines that are not already in the current observation summary", () => {
    const view = buildObservationRepPresentationView({
      caseRow: { id: "case-2", status: "confirmed", provider_name: "Dr. Example" },
      activities: [
        {
          activity_type: "note",
          body: "Bard Soft Mesh was used during the case.",
          metadata_json: { note_id: "note-2" },
        },
      ],
      priorCases: [{ id: "case-prior", status: "completed" }],
      universalFactsReadModel: {
        caseRuns: [
          {
            capture_id: "capture-case",
            declared_source_type: "observation_case",
            extraction_model: "test",
            created_at: "2026-06-25T12:00:00Z",
            operational_note_id: "note-2",
            facts: [
              {
                id: "case-product",
                capture_id: "capture-case",
                concept: "current_product",
                normalized_label: "Current product: Bard Soft Mesh",
                assertion_level: "observed",
                source_type: "observation_case",
                evidence_text: "Bard Soft Mesh was used during the case.",
                confidence: "high",
                negated: false,
                uncertain: false,
                suppressed: false,
                product_mentioned: "Bard Soft Mesh",
                case_id: "case-2",
                provider_id: null,
                organization_id: null,
                encounter_id: null,
                created_at: "2026-06-25T12:00:00Z",
              },
            ],
          },
        ],
        programRuns: [
          {
            capture_id: "capture-program",
            declared_source_type: "observation_case",
            extraction_model: "test",
            created_at: "2026-06-24T12:00:00Z",
            operational_note_id: "note-prior",
            facts: [
              {
                id: "program-product",
                capture_id: "capture-program",
                concept: "current_product",
                normalized_label: "Current product: Ethicon Prolene",
                assertion_level: "validated",
                source_type: "observation_case",
                evidence_text: "Ethicon Prolene was used during the prior case.",
                confidence: "high",
                negated: false,
                uncertain: false,
                suppressed: false,
                product_mentioned: "Ethicon Prolene",
                case_id: "case-prior",
                provider_id: null,
                organization_id: null,
                encounter_id: null,
                created_at: "2026-06-24T12:00:00Z",
              },
            ],
          },
        ],
      },
    });

    expect(view.thisObservation.items.map((item) => item.text).join("\n")).toMatch(/Bard Soft Mesh/i);
    expect(view.whatWeKnow.map((item) => item.text).join("\n")).toMatch(/Ethicon Prolene/i);
  });
});
