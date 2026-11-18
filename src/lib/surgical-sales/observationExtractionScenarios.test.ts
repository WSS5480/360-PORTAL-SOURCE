import { describe, expect, it } from "vitest";

import { buildSharedUnresolvedEvidenceQuestions } from "@/lib/surgical-sales/observationCaseBriefingPresentation";
import { extractUniversalCategorySignals } from "@/lib/surgical-sales/sharedIntelligence/extractUniversalCategorySignals";
import {
  adaptUniversalFactsToThisObservationItems,
  summarizeCurrentCaseCapturesFromUfFacts,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

const DR_FIG_OBSERVATION_NOTE = `I observed one of Dr. Karen Fig's cases today at Memorial Hospital. Overall the case went smoothly and the team seemed experienced, but there were a few things that stood out.

The procedure started on time, although there was some discussion early on about instrument availability. One of the trays they expected wasn't immediately available and the staff spent a few minutes locating the correct equipment before they could move forward.

From a workflow perspective, the team seemed very focused on keeping turnover times down. The charge nurse mentioned they're doing more cases per day than they were a year ago and room utilization has become a bigger priority for leadership.

Clinically, Dr. Fig mentioned they're seeing a higher volume of complex cases lately compared to previous years. She said referral patterns have changed and they're getting more challenging patients than they used to. She also noted that some of those cases require additional planning and occasionally create workflow bottlenecks during procedures.

During the case there were a couple of moments where the surgeon spent extra time evaluating options before moving forward. Nobody appeared frustrated, but it was clear that visualization and procedural efficiency are important considerations for the team.

The staff worked well together overall. Communication between the circulator, scrub tech, and surgeon was strong, and several people commented that having consistent team members in the room tends to make cases run more smoothly. Staff satisfaction and retention sounded like ongoing priorities for the department.

After the procedure I spoke briefly with Dr. Fig. She seemed open to continuing conversations and said she would like to compare approaches after we observe a few more cases.

I also met Lisa, who appears to be involved in coordinating schedules and helping manage physician access. She may be a useful contact for future observations and case coordination.`;

const CASE_ID = "case-fig-1";

function factRow(input: {
  concept: string;
  assertion_level?: string;
  case_id?: string;
  normalized_label?: string;
  evidence_text?: string;
  product_mentioned?: string;
  person_mentioned?: string;
}) {
  return {
    id: `fact-${input.concept}-${input.normalized_label ?? "x"}`,
    capture_id: "capture-1",
    provider_id: "provider-fig",
    organization_id: null,
    case_id: input.case_id ?? CASE_ID,
    encounter_id: null,
    concept: input.concept,
    normalized_label: input.normalized_label ?? "",
    assertion_level: input.assertion_level ?? "observed",
    source_type: "observation_case",
    evidence_text: input.evidence_text ?? input.normalized_label ?? "",
    confidence: "high" as const,
    negated: false,
    uncertain: false,
    suppressed: false,
    product_mentioned: input.product_mentioned,
    person_mentioned: input.person_mentioned,
    created_at: "2026-06-15T12:00:00Z",
  };
}

function runForCase(facts: ReturnType<typeof factRow>[]): UniversalFactExtractionRun[] {
  return [
    {
      capture_id: "capture-1",
      declared_source_type: "observation_case",
      extraction_model: "test",
      created_at: "2026-06-15T12:00:00Z",
      operational_note_id: null,
      facts,
    },
  ];
}

function buildDrFigFactsFromRules(): ReturnType<typeof factRow>[] {
  const signals = extractUniversalCategorySignals(DR_FIG_OBSERVATION_NOTE);
  const facts: ReturnType<typeof factRow>[] = [];

  for (const signal of signals) {
    facts.push(
      factRow({
        concept: signal.concept,
        normalized_label: signal.normalized_label,
        evidence_text: signal.evidence_text,
        person_mentioned: signal.person_mentioned,
      }),
    );
  }

  facts.push(
    factRow({
      concept: "inventory_availability_issue",
      normalized_label: "Instrument availability issue",
      evidence_text:
        "One of the trays they expected wasn't immediately available and the staff spent a few minutes locating the correct equipment",
    }),
    factRow({
      concept: "workflow_or_timing_issue",
      normalized_label: "Workflow priority: Turnover time importance",
      evidence_text: "the team seemed very focused on keeping turnover times down",
    }),
    factRow({
      concept: "workflow_or_timing_issue",
      normalized_label: "Room utilization priority",
      evidence_text: "room utilization has become a bigger priority for leadership",
    }),
    factRow({
      concept: "procedure_volume_trend",
      normalized_label: "Increasing volume of complex cases",
      evidence_text: "they're seeing a higher volume of complex cases lately",
    }),
    factRow({
      concept: "workflow_or_timing_issue",
      normalized_label: "Operational concern: Workflow bottlenecks",
      evidence_text: "occasionally create workflow bottlenecks during procedures",
    }),
    factRow({
      concept: "visualization_or_access_issue",
      normalized_label: "Extra evaluation time before proceeding",
      evidence_text:
        "the surgeon spent extra time evaluating options before moving forward",
    }),
  );

  return facts;
}

describe("observation extraction scenarios", () => {
  it("rules path captures Lisa, provider openness, and strong staff communication", () => {
    const signals = extractUniversalCategorySignals(DR_FIG_OBSERVATION_NOTE);
    const concepts = signals.map((signal) => signal.concept);

    expect(concepts).toContain("contact_role");
    expect(concepts).toContain("provider_sentiment");
    expect(concepts).toContain("staff_workflow");

    const lisa = signals.find((signal) => signal.concept === "contact_role");
    expect(lisa?.person_mentioned).toBe("Lisa");

    const provider = signals.find((signal) => signal.concept === "provider_sentiment");
    expect(provider?.normalized_label).toMatch(/open to continued discussion/i);
  });

  it("prioritizes contact, provider sentiment, and staff ahead of operational noise in This Observation", () => {
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: runForCase(buildDrFigFactsFromRules()),
      caseId: CASE_ID,
      hasCurrentNotes: true,
    });

    const joined = items.map((item) => item.text).join("\n");
    expect(joined).toMatch(/Lisa —/i);
    expect(joined).toMatch(/Provider open to continued discussion/i);
    expect(joined).toMatch(/Staff workflow appeared coordinated|Strong team communication during the case|Consistent team members help/i);
    expect(joined).toMatch(/Instrument availability/i);
    expect(items.length).toBeLessThanOrEqual(8);
    const lisaIndex = items.findIndex((item) => /Lisa —/i.test(item.text));
    const opsIndex = items.findIndex((item) =>
      /instrument availability|bottleneck|turnover|utilization|complex cases/i.test(item.text),
    );
    expect(lisaIndex).toBeGreaterThanOrEqual(0);
    if (opsIndex >= 0) {
      expect(lisaIndex).toBeLessThan(opsIndex);
    }
  });

  it("UF capture summary closes staff-friction baseline when positive staff is captured", () => {
    const summary = summarizeCurrentCaseCapturesFromUfFacts(buildDrFigFactsFromRules());
    expect(summary.hasPositiveStaff).toBe(true);
    expect(summary.hasStaffFriction).toBe(false);

    const lines = buildSharedUnresolvedEvidenceQuestions({
      caseRow: { id: CASE_ID, status: "confirmed", case_type: "observation" },
      universalFactsReadModel: { caseRuns: runForCase(buildDrFigFactsFromRules()) },
      activities: [{ activity_type: "note", body: DR_FIG_OBSERVATION_NOTE }],
    });

    const joined = lines.join("\n");
    expect(joined).not.toMatch(/staff frustration|workarounds, or complaints/i);
    expect(joined).not.toMatch(/visualization before fixation repeats/i);
    expect(joined).toMatch(/extra visualization or evaluation time shows up again/i);
  });

  it("stress case keeps product, contact, and staff in the top 8 when many workflow facts exist", () => {
    const facts = [
      ...buildDrFigFactsFromRules(),
      factRow({
        concept: "current_product",
        normalized_label: "Bard Mesh was used during the case",
        product_mentioned: "Bard Mesh",
      }),
      factRow({
        concept: "workflow_or_timing_issue",
        normalized_label: "Workflow priority: Efficiency watched closely",
        evidence_text: "efficiency is being watched much more closely",
      }),
      factRow({
        concept: "procedure_volume_trend",
        normalized_label: "Referral patterns changing",
        evidence_text: "referral patterns have changed",
      }),
    ];

    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: runForCase(facts),
      caseId: CASE_ID,
      hasCurrentNotes: true,
    });

    const joined = items.map((item) => item.text).join("\n");
    expect(joined).toMatch(/Bard Mesh was used/i);
    expect(joined).toMatch(/Lisa —/i);
    expect(joined).toMatch(/Staff workflow appeared coordinated|Strong team communication during the case|Consistent team members help/i);
    expect(items).toHaveLength(8);
  });

  it("routine mesh + visualization note still reframes still-need without fixation-specific language", () => {
    const routineNote =
      "They're still using Bard Mesh. The surgeon asked for a different angle because he wasn't getting the view he wanted. Staff was good — everyone knew what they were doing.";

    const facts = [
      factRow({
        concept: "current_product",
        normalized_label: "Bard Mesh was used during the case",
        product_mentioned: "Bard Mesh",
        evidence_text: "They're still using Bard Mesh.",
      }),
      factRow({
        concept: "visualization_or_access_issue",
        normalized_label: "Extra visualization time",
        evidence_text: "wasn't getting the view he wanted",
      }),
      factRow({
        concept: "staff_workflow",
        normalized_label: "Positive staff workflow observed",
        evidence_text: "everyone knew what they were doing",
      }),
    ];

    const lines = buildSharedUnresolvedEvidenceQuestions({
      caseRow: { id: "case-routine", status: "confirmed", case_type: "observation" },
      universalFactsReadModel: { caseRuns: runForCase(facts.map((f) => ({ ...f, case_id: "case-routine" }))) },
      activities: [{ activity_type: "note", body: routineNote }],
      maxItems: 5,
    });

    const joined = lines.join("\n");
    expect(joined).not.toMatch(/identify which products/i);
    expect(joined).not.toMatch(/fixation decision-making varies/i);
    expect(joined).toMatch(/procedural decision-making patterns repeat/i);
  });
});
