import { describe, expect, it } from "vitest";

import {
  adaptUniversalFactsToFollowUpNextVisitLines,
  adaptUniversalFactsToBriefingKnownSoFarLines,
  adaptUniversalFactsToCapturedSignals,
  adaptUniversalFactsToThisObservationItems,
  adaptUniversalFactsToWhatWeKnowLines,
  filterCaseRunsForThisObservation,
  priorCompletedObservationCaseIds,
  resolveReadModelSection,
  resolveDebriefPrepareProgramRuns,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

function factRow(input: {
  concept: string;
  assertion_level: string;
  case_id: string;
  normalized_label?: string;
  evidence_text?: string;
  product_mentioned?: string;
  person_mentioned?: string;
}) {
  return {
    id: `fact-${input.concept}-${input.case_id}`,
    capture_id: "capture-1",
    provider_id: "provider-1",
    organization_id: null,
    case_id: input.case_id,
    encounter_id: null,
    concept: input.concept,
    normalized_label: input.normalized_label ?? "",
    assertion_level: input.assertion_level,
    source_type: "observation_case",
    evidence_text: input.evidence_text ?? input.normalized_label ?? "",
    confidence: "high" as const,
    negated: false,
    uncertain: false,
    suppressed: false,
    product_mentioned: input.product_mentioned,
    person_mentioned: input.person_mentioned,
    created_at: "2026-06-01T12:00:00Z",
  };
}

function runForCase(caseId: string, facts: ReturnType<typeof factRow>[]): UniversalFactExtractionRun[] {
  return [
    {
      capture_id: "capture-1",
      declared_source_type: "observation_case",
      extraction_model: "test",
      created_at: "2026-06-01T12:00:00Z",
      operational_note_id: null,
      facts,
    },
  ];
}

describe("universalFactsReadModelAdapters", () => {
  it("maps current-case facts to This Observation items", () => {
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: runForCase("case-2", [
        factRow({
          concept: "workflow_or_timing_issue",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Extra time getting visualization before fixation",
        }),
      ]),
      caseId: "case-2",
      hasCurrentNotes: true,
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.text).toBe("Extra time getting visualization before fixation");
  });

  it("builds What We Know lines from validated concepts across completed cases", () => {
    const programRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "capture-a",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-06-01T12:00:00Z",
        operational_note_id: null,
        facts: [
          factRow({
            concept: "current_product",
            assertion_level: "validated",
            case_id: "case-1",
            product_mentioned: "Bard Mesh",
            normalized_label: "Bard Mesh was used during the case",
          }),
        ],
      },
    ];

    const lines = adaptUniversalFactsToWhatWeKnowLines({
      programRuns,
      completedCaseIds: ["case-1"],
      programCompletedCount: 1,
      countStyle: "program_fraction",
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/Bard Mesh was used during the case in 1 completed case/);
  });

  it("renders product interest as interest, never product usage, in What We Know", () => {
    const programRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "capture-a",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-06-01T12:00:00Z",
        operational_note_id: null,
        facts: [
          factRow({
            concept: "product_interest",
            assertion_level: "validated",
            case_id: "case-1",
            product_mentioned: "ACSIS",
            normalized_label: "ACSIS was used during the case",
            evidence_text: "Dr. Lettuce asked whether ACSIS works with their existing equipment.",
          }),
        ],
      },
    ];

    const lines = adaptUniversalFactsToWhatWeKnowLines({
      programRuns,
      completedCaseIds: ["case-1"],
      programCompletedCount: 1,
    });

    expect(lines.join("\n")).toMatch(/ACSIS interest: Dr\. Lettuce asked whether ACSIS works/i);
    expect(lines.join("\n")).not.toMatch(/ACSIS was used/i);
  });

  it("rejects misclassified current product facts when evidence is only product interest", () => {
    const programRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "capture-a",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-06-01T12:00:00Z",
        operational_note_id: null,
        facts: [
          factRow({
            concept: "current_product",
            assertion_level: "validated",
            case_id: "case-1",
            product_mentioned: "ACSIS",
            normalized_label: "ACSIS was used during the case",
            evidence_text: "Dr. Lettuce asked whether ACSIS works with their existing equipment.",
          }),
        ],
      },
    ];

    expect(
      adaptUniversalFactsToWhatWeKnowLines({
        programRuns,
        completedCaseIds: ["case-1"],
        programCompletedCount: 1,
      }),
    ).toEqual([]);
  });

  it("promotes one-off completed-case operational observations into What We Know", () => {
    const programRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "capture-a",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-06-01T12:00:00Z",
        operational_note_id: null,
        facts: [
          factRow({
            concept: "visualization_or_access_issue",
            assertion_level: "validated",
            case_id: "case-1",
            normalized_label: "Extra time was spent improving visualization before fixation",
          }),
          factRow({
            concept: "inventory_availability_issue",
            assertion_level: "validated",
            case_id: "case-1",
            normalized_label: "Staff had to verify products were stocked before the case could proceed",
          }),
        ],
      },
    ];

    const lines = adaptUniversalFactsToWhatWeKnowLines({
      programRuns,
      completedCaseIds: ["case-1"],
      programCompletedCount: 1,
    });

    expect(lines.join("\n")).toMatch(/Extra time was spent improving visualization before fixation/i);
    expect(lines.join("\n")).toMatch(/Staff had to verify products were stocked before the case could proceed/i);
  });

  it("keeps count context when operational facts repeat across completed cases", () => {
    const programRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "capture-a",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-06-01T12:00:00Z",
        operational_note_id: null,
        facts: [
          factRow({
            concept: "inventory_availability_issue",
            assertion_level: "validated",
            case_id: "case-1",
            normalized_label: "Inventory issues getting ArthroFlex",
          }),
          factRow({
            concept: "inventory_availability_issue",
            assertion_level: "validated",
            case_id: "case-2",
            normalized_label: "Inventory issues getting ArthroFlex",
          }),
        ],
      },
    ];

    expect(
      adaptUniversalFactsToWhatWeKnowLines({
        programRuns,
        completedCaseIds: ["case-1", "case-2"],
        programCompletedCount: 2,
      }).join("\n"),
    ).toMatch(/Inventory issues getting ArthroFlex/i);
  });

  it("keeps What We Know aligned with briefing Known So Far for prior UF observations", () => {
    const programRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "capture-prior",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-06-01T12:00:00Z",
        operational_note_id: null,
        facts: [
          factRow({
            concept: "current_product",
            assertion_level: "validated",
            case_id: "case-prior",
            product_mentioned: "Bard Mesh",
            normalized_label: "Bard Mesh was used during the case",
          }),
          factRow({
            concept: "visualization_or_access_issue",
            assertion_level: "validated",
            case_id: "case-prior",
            normalized_label: "Extra visualization time before fixation",
          }),
          factRow({
            concept: "staff_workflow",
            assertion_level: "validated",
            case_id: "case-prior",
            normalized_label: "Positive staff workflow observed",
            evidence_text: "Everyone seemed to know what they were doing",
          }),
        ],
      },
    ];

    const whatWeKnow = adaptUniversalFactsToWhatWeKnowLines({
      programRuns,
      completedCaseIds: ["case-prior"],
      programCompletedCount: 1,
    }).join("\n");
    const knownSoFar = adaptUniversalFactsToBriefingKnownSoFarLines({
      programRuns,
      priorCompletedCaseIds: ["case-prior"],
      briefingKind: "follow_up",
      programCompletedCount: 1,
    }).join("\n");

    expect(whatWeKnow).toMatch(/Bard Mesh/i);
    expect(whatWeKnow).toMatch(/Extra visualization time before fixation/i);
    expect(whatWeKnow).toMatch(/Staff workflow appeared coordinated/i);
    expect(knownSoFar).toMatch(/Bard Mesh/i);
    expect(knownSoFar).toMatch(/visualization/i);
    expect(knownSoFar).toMatch(/Staff workflow/i);
  });

  it("merges paraphrased operational facts across many cases into one count", () => {
    const caseIds = Array.from({ length: 8 }, (_, index) => `case-${index + 1}`);
    const programRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "capture-scale",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-07-16T12:00:00Z",
        operational_note_id: null,
        facts: [
          ...caseIds.map((caseId) =>
            factRow({
              concept: "competitor_product",
              assertion_level: "validated",
              case_id: caseId,
              product_mentioned: "Bard Soft Mesh",
              normalized_label: "Competitor product: Bard Soft Mesh",
              evidence_text: "Still using Bard Soft Mesh.",
            }),
          ),
          ...caseIds.slice(0, 5).map((caseId, index) =>
            factRow({
              concept: "sizing_or_fit_issue",
              assertion_level: "validated",
              case_id: caseId,
              normalized_label:
                index % 2 === 0
                  ? "Product fit concern: Conformability on larger defects"
                  : "Handling slows down on bigger defects",
              evidence_text:
                index % 2 === 0
                  ? "wishes it conformed a little better on larger defects."
                  : "Handling on bigger defects is what slows us down.",
            }),
          ),
          ...caseIds.slice(0, 3).map((caseId) =>
            factRow({
              concept: "contact_role",
              assertion_level: "validated",
              case_id: caseId,
              person_mentioned: "Sarah",
              normalized_label: "Sarah · Scheduling Contact",
              evidence_text: "Sarah coordinates observations.",
            }),
          ),
        ],
      },
    ];

    const lines = adaptUniversalFactsToWhatWeKnowLines({
      programRuns,
      completedCaseIds: caseIds,
      programCompletedCount: caseIds.length,
      countStyle: "program_fraction",
    }).join("\n");

    expect(lines).toMatch(/Bard Soft Mesh.*seen in 8 of 8 observations/i);
    expect(lines).toMatch(/(?:Conformability|larger defects|bigger defects).*seen in 5 of 8 observations/i);
    expect(lines).toMatch(/Sarah.*seen in 3 of 8 observations/i);
    // One rolled-up fit chip — not one paraphrased line per case.
    expect(lines.match(/seen in 5 of 8 observations/gi)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(
      (lines.match(/Conformability|larger defects|bigger defects/gi) ?? []).length,
    ).toBeLessThanOrEqual(2);
  });

  it("rolls up each relevant observation fact with its own observation count", () => {
    const programRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "capture-observations",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-06-25T15:12:00Z",
        operational_note_id: null,
        facts: [
          factRow({
            concept: "competitor_product",
            assertion_level: "validated",
            case_id: "case-1",
            product_mentioned: "Bard Soft Mesh",
            normalized_label: "Competitor product: Bard Soft Mesh",
            evidence_text: "They were using Bard Soft Mesh during the case.",
          }),
          factRow({
            concept: "competitor_product",
            assertion_level: "validated",
            case_id: "case-2",
            product_mentioned: "Bard Soft Mesh",
            normalized_label: "Competitor product: Bard Soft Mesh",
            evidence_text: "They were still using Bard Soft Mesh.",
          }),
          factRow({
            concept: "sizing_or_fit_issue",
            assertion_level: "validated",
            case_id: "case-2",
            normalized_label: "Product fit concern: Conformability on larger defects",
            evidence_text: "wishes it conformed a little better on larger defects.",
          }),
          factRow({
            concept: "product_interest",
            assertion_level: "validated",
            case_id: "case-2",
            normalized_label: "Commercial disposition: Evaluation scheduling interest",
            evidence_text: "Sarah said they're interested in scheduling an evaluation with us next month.",
          }),
          factRow({
            concept: "contact_role",
            assertion_level: "validated",
            case_id: "case-1",
            normalized_label: "Sarah · Key Contact",
            evidence_text: "Sarah was the key contact.",
            person_mentioned: "Sarah",
          }),
          factRow({
            concept: "contact_role",
            assertion_level: "validated",
            case_id: "case-2",
            normalized_label: "Sarah · Evaluation Contact",
            evidence_text: "I spoke with Sarah afterward about the evaluation.",
            person_mentioned: "Sarah",
          }),
        ],
      },
    ];

    const lines = adaptUniversalFactsToWhatWeKnowLines({
      programRuns,
      completedCaseIds: ["case-1", "case-2"],
      programCompletedCount: 2,
      countStyle: "program_fraction",
    }).join("\n");

    expect(lines).toMatch(/Bard Soft Mesh.*seen in 2 of 2 observations/i);
    expect(lines).toMatch(/Conformability on larger defects.*seen in 1 of 2 observations/i);
    expect(lines).toMatch(/(?:scheduling an evaluation|Evaluation scheduling interest).*seen in 1 of 2 observations/i);
    expect(lines).toMatch(/Sarah.*seen in 2 of 2 observations/i);
  });

  it("counts procedure focus across all completed observation dictations", () => {
    const programRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "capture-procedure-counts",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-06-25T15:12:00Z",
        operational_note_id: null,
        facts: ["case-1", "case-2", "case-3"].map((caseId) =>
          factRow({
            concept: "procedure_focus",
            assertion_level: "observed",
            case_id: caseId,
            normalized_label: "Ventral hernia repair",
            evidence_text: "Observed Dr. Lettuce during a ventral hernia repair.",
          }),
        ),
      },
    ];

    const lines = adaptUniversalFactsToWhatWeKnowLines({
      programRuns,
      completedCaseIds: ["case-1", "case-2", "case-3"],
      programCompletedCount: 3,
      countStyle: "program_fraction",
    }).join("\n");

    expect(lines).toMatch(/Ventral hernia repair.*seen in 3 of 3 observations/i);
  });

  it("filters surgeon-as-scheduler contact_role from what-we-know rollup lines", () => {
    const programRuns = [
      {
        capture_id: "capture-1",
        declared_source_type: "observation_case" as const,
        extraction_model: "test",
        created_at: "2026-06-16T12:00:00Z",
        operational_note_id: null,
        facts: [
          factRow({
            concept: "contact_role",
            case_id: "case-1",
            normalized_label: "Mark Onion · Scheduling Coordinator",
            evidence_text: "Observed a case with Dr. Onion today.",
          }),
          factRow({
            concept: "current_product",
            case_id: "case-1",
            assertion_level: "validated",
            product_mentioned: "Bard Mesh",
            normalized_label: "Bard Mesh",
            evidence_text: "Bard Mesh was used during the case.",
          }),
        ],
      },
    ];

    const lines = adaptUniversalFactsToWhatWeKnowLines({
      programRuns,
      completedCaseIds: ["case-1"],
      programCompletedCount: 1,
      providerName: "Mark Onion",
    });

    expect(lines.join("\n")).toMatch(/Bard Mesh/);
    expect(lines.join("\n")).not.toMatch(/Scheduling Coordinator/);
  });

  it("filters Dr. Onion scheduler chip without providerName when evidence is observation phrasing", () => {
    const programRuns = [
      {
        capture_id: "capture-1",
        declared_source_type: "observation_case" as const,
        extraction_model: "test",
        created_at: "2026-06-16T12:00:00Z",
        operational_note_id: null,
        facts: [
          factRow({
            concept: "contact_role",
            case_id: "case-1",
            assertion_level: "observed",
            normalized_label: "Dr. Onion · Scheduling Coordinator",
            evidence_text: "Observed my first case with Dr. Onion today.",
          }),
          factRow({
            concept: "contact_role",
            case_id: "case-2",
            assertion_level: "observed",
            normalized_label: "Dr. Onion · Scheduling Coordinator",
            evidence_text: "Observed my second case with Dr. Onion today.",
          }),
          factRow({
            concept: "current_product",
            case_id: "case-1",
            assertion_level: "validated",
            product_mentioned: "Bard Mesh",
            normalized_label: "Bard Mesh",
          }),
        ],
      },
    ];

    const lines = adaptUniversalFactsToWhatWeKnowLines({
      programRuns,
      completedCaseIds: ["case-1", "case-2", "case-3"],
      programCompletedCount: 3,
      countStyle: "program_fraction",
    });

    expect(lines.join("\n")).not.toMatch(/Scheduling Coordinator/);
    expect(lines.join("\n")).not.toMatch(/Dr\. Onion/);
  });

  it("mirrors captured-signals rollup shape for in-progress primary case", () => {
    const providerRuns = runForCase("case-2", [
      factRow({
        concept: "visualization_or_access_issue",
        assertion_level: "observed",
        case_id: "case-2",
        normalized_label: "Extra visualization time before fixation",
      }),
    ]);

    const signals = adaptUniversalFactsToCapturedSignals({
      providerRuns,
      completedCaseIds: [],
      programCompletedCount: 0,
      currentCaseHasCapturedNotes: true,
      primaryCaseComplete: false,
      thisObservationLines: ["Extra visualization time before fixation"],
    });

    expect(signals).toEqual(["Extra visualization time before fixation"]);
  });

  it("falls back to OIE when adapted output is empty", () => {
    expect(resolveReadModelSection([], () => ["OIE line"])).toEqual(["OIE line"]);
    expect(resolveReadModelSection(["UF line"], () => ["OIE line"])).toEqual(["UF line"]);
  });

  it("builds briefing Known So Far from prior completed cases only with curated pillars", () => {
    const programRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "capture-prior",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-06-01T12:00:00Z",
        operational_note_id: null,
        facts: [
          factRow({
            concept: "current_product",
            assertion_level: "validated",
            case_id: "case-prior",
            product_mentioned: "Bard Mesh",
            normalized_label: "Bard Mesh was used during the case",
          }),
          factRow({
            concept: "visualization_or_access_issue",
            assertion_level: "validated",
            case_id: "case-prior",
            normalized_label: "Extra visualization time before fixation",
          }),
          factRow({
            concept: "staff_workflow",
            assertion_level: "validated",
            case_id: "case-prior",
            normalized_label: "Positive staff workflow observed",
            evidence_text: "Everyone seemed to know what they were doing",
          }),
          factRow({
            concept: "current_product",
            assertion_level: "observed",
            case_id: "case-current",
            product_mentioned: "Other Mesh",
            normalized_label: "Other Mesh was used during the case",
          }),
        ],
      },
    ];

    const lines = adaptUniversalFactsToBriefingKnownSoFarLines({
      programRuns,
      priorCompletedCaseIds: ["case-prior"],
      briefingKind: "follow_up",
      programCompletedCount: 1,
    });

    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(4);
    expect(lines.join("\n")).toMatch(/Bard Mesh has been seen in use/i);
    expect(lines.join("\n")).toMatch(/extra visualization or evaluation time was noted/i);
    expect(lines.join("\n")).toMatch(/Staff workflow appeared coordinated/i);
    expect(lines.join("\n")).not.toMatch(/Other Mesh/i);
    expect(lines.join("\n")).not.toMatch(/product opening|opportunity/i);
  });

  it("dedupes identical facts from repeated dictations on the same case", () => {
    const sharedEvidence =
      "Communication between the circulator, scrub tech, and surgeon was strong.";
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: [
        {
          capture_id: "capture-1",
          declared_source_type: "observation_case",
          extraction_model: "test",
          created_at: "2026-06-15T18:00:00Z",
          operational_note_id: "note-1",
          facts: [
            factRow({
              concept: "contact_role",
              assertion_level: "observed",
              case_id: "case-2",
              normalized_label: "Lisa · Scheduling Coordinator",
              person_mentioned: "Lisa",
              evidence_text: "I also met Lisa, who appears to be involved in coordinating schedules",
            }),
            factRow({
              concept: "staff_workflow",
              assertion_level: "observed",
              case_id: "case-2",
              normalized_label: "Strong team communication",
              evidence_text: sharedEvidence,
            }),
          ],
        },
        {
          capture_id: "capture-2",
          declared_source_type: "observation_case",
          extraction_model: "test",
          created_at: "2026-06-15T18:20:00Z",
          operational_note_id: "note-2",
          facts: [
            factRow({
              concept: "contact_role",
              assertion_level: "observed",
              case_id: "case-2",
              normalized_label: "Lisa · Scheduling Coordinator",
              person_mentioned: "Lisa",
              evidence_text: "I also met Lisa, who appears to be involved in coordinating schedules",
            }),
            factRow({
              concept: "staff_workflow",
              assertion_level: "observed",
              case_id: "case-2",
              normalized_label: "Staff appeared strong communication among staff",
              evidence_text: sharedEvidence,
            }),
          ],
        },
      ],
      caseId: "case-2",
      hasCurrentNotes: true,
    });

    expect(items.filter((item) => /Lisa —/i.test(item.text))).toHaveLength(1);
    expect(items.filter((item) => /team communication/i.test(item.text))).toHaveLength(1);
  });

  it("collapses duplicate staff_workflow facts to a single rep-facing line", () => {
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: runForCase("case-2", [
        factRow({
          concept: "staff_workflow",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Staff influence: consistent team members improve",
          evidence_text:
            "several people commented that having consistent team members in the room tends to make cases run more smoothly",
        }),
        factRow({
          concept: "staff_workflow",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Staff appeared strong communication among staff",
          evidence_text:
            "Communication between the circulator, scrub tech, and surgeon was strong",
        }),
        factRow({
          concept: "staff_workflow",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Strong team communication",
          evidence_text:
            "Communication between the circulator, scrub tech, and surgeon was strong",
        }),
      ]),
      caseId: "case-2",
      hasCurrentNotes: true,
    });

    const staffItems = items.filter((item) => /staff|team communication|consistent team/i.test(item.text));
    expect(staffItems).toHaveLength(1);
    expect(staffItems[0]?.text).toMatch(
      /Strong team communication during the case|Consistent team members help cases run smoother/,
    );
    expect(staffItems[0]?.text).not.toMatch(/importance|improve\b/i);
  });

  it("formats contact_role and staff_workflow with rep-facing labels", () => {
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: runForCase("case-2", [
        factRow({
          concept: "contact_role",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Lisa · Scheduling Coordinator",
          person_mentioned: "Lisa",
          evidence_text: "I also met Lisa, who appears to be involved in coordinating schedules",
        }),
        factRow({
          concept: "staff_workflow",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Strong team communication",
          evidence_text: "Communication between the circulator, scrub tech, and surgeon was strong",
        }),
      ]),
      caseId: "case-2",
      hasCurrentNotes: true,
    });

    expect(items.map((item) => item.text)).toEqual([
      "Lisa — Scheduling Coordinator",
      "Strong team communication during the case",
    ]);
  });

  it("excludes the current case from prior completed case ids", () => {
    expect(
      priorCompletedObservationCaseIds({
        caseRow: { id: "case-current", status: "completed", observation_completed_at: "2026-06-01" },
        priorCases: [{ id: "case-prior", status: "completed", observation_completed_at: "2026-05-01" }],
      }),
    ).toEqual(["case-prior"]);
  });

  it("merges instrument availability facts into one This Observation line", () => {
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: runForCase("case-salt", [
        factRow({
          concept: "inventory_availability_issue",
          assertion_level: "observed",
          case_id: "case-salt",
          normalized_label: "Instrumentation availability frustration",
          evidence_text: "frustration with instrumentation availability and OR efficiency",
        }),
        factRow({
          concept: "workflow_or_timing_issue",
          assertion_level: "observed",
          case_id: "case-salt",
          normalized_label: "OR efficiency delays",
          evidence_text: "instrumentation availability slowed case flow",
        }),
      ]),
      caseId: "case-salt",
      hasCurrentNotes: true,
    });

    const instrumentLines = items.filter((item) => /instrument|inventory|availability|or efficiency/i.test(item.text));
    expect(instrumentLines).toHaveLength(1);
  });

  it("scopes This Observation to active note captures and excludes stale runs", () => {
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: [
        {
          capture_id: "capture-stale",
          declared_source_type: "observation_case",
          extraction_model: "test",
          created_at: "2026-06-15T18:00:00Z",
          operational_note_id: "deleted-note",
          facts: [
            factRow({
              concept: "contact_role",
              assertion_level: "observed",
              case_id: "case-onion",
              normalized_label: "Lisa · Scheduling Coordinator",
              person_mentioned: "Lisa",
              evidence_text: "I also met Lisa, who appears to be involved in coordinating schedules",
            }),
            factRow({
              concept: "competitor_product",
              assertion_level: "observed",
              case_id: "case-onion",
              normalized_label: "Acumed",
              product_mentioned: "Acumed",
              evidence_text: "they currently use Acumed",
            }),
          ],
        },
        {
          capture_id: "capture-current",
          declared_source_type: "observation_case",
          extraction_model: "test",
          created_at: "2026-06-16T09:06:00Z",
          operational_note_id: "active-note",
          facts: [
            factRow({
              concept: "current_product",
              assertion_level: "observed",
              case_id: "case-onion",
              normalized_label: "Bard Mesh",
              product_mentioned: "Bard Mesh",
              evidence_text: "The team is currently using Bard mesh for most of these procedures",
            }),
            factRow({
              concept: "staff_workflow",
              assertion_level: "observed",
              case_id: "case-onion",
              normalized_label: "Strong team communication",
              evidence_text: "communication between the circulator, scrub tech, and surgeon was strong",
            }),
          ],
        },
      ],
      caseId: "case-onion",
      hasCurrentNotes: true,
      activeOperationalNoteIds: ["active-note"],
      providerName: "Mark Onion",
    });

    expect(items.map((item) => item.text).join("\n")).toMatch(/Bard Mesh/i);
    expect(items.map((item) => item.text).join("\n")).not.toMatch(/Lisa|Acumed/i);
  });

  it("falls back to the newest capture when no active note ids are provided", () => {
    const runs = filterCaseRunsForThisObservation({
      caseRuns: [
        {
          capture_id: "capture-old",
          declared_source_type: "observation_case",
          extraction_model: "test",
          created_at: "2026-06-15T18:00:00Z",
          operational_note_id: "note-old",
          facts: [],
        },
        {
          capture_id: "capture-new",
          declared_source_type: "observation_case",
          extraction_model: "test",
          created_at: "2026-06-16T09:06:00Z",
          operational_note_id: "note-new",
          facts: [],
        },
      ],
    });

    expect(runs).toHaveLength(1);
    expect(runs[0]?.capture_id).toBe("capture-new");
  });

  it("never surfaces no_issue_or_routine bookkeeping facts as chips", () => {
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: runForCase("case-2", [
        factRow({
          concept: "no_issue_or_routine",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "No meaningful intelligence issue identified",
          evidence_text: "Observation with Dr. Lettuce at Memorial.",
        }),
        factRow({
          concept: "current_product",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Arthrex SpeedBridge",
          product_mentioned: "Arthrex SpeedBridge",
          evidence_text: "He used Arthrex SpeedBridge and ArthroFlex graft today.",
        }),
      ]),
      caseId: "case-2",
      hasCurrentNotes: true,
    });

    expect(items.map((item) => item.text).join("\n")).not.toMatch(/meaningful intelligence/i);
    expect(items.map((item) => item.text).join("\n")).toMatch(/Arthrex SpeedBridge/);
  });

  it("strips the internal Relationship: prefix instead of doubling Provider", () => {
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: runForCase("case-2", [
        factRow({
          concept: "provider_sentiment",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Relationship: provider openness to alternatives",
          evidence_text: "Doesn't seem locked into Arthrex.",
        }),
      ]),
      caseId: "case-2",
      hasCurrentNotes: true,
    });

    expect(items[0]?.text).toBe("Provider openness to alternatives");
    expect(items[0]?.text).not.toMatch(/Provider provider/i);
  });

  it("strips the internal Workflow priority: prefix from chip labels", () => {
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: runForCase("case-2", [
        factRow({
          concept: "workflow_or_timing_issue",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Workflow priority: efficiency priority",
          evidence_text: "Efficiency is a big deal for him. Turnover times are getting tighter.",
        }),
      ]),
      caseId: "case-2",
      hasCurrentNotes: true,
    });

    expect(items[0]?.text).toBe("Efficiency priority");
    expect(items[0]?.text).not.toMatch(/Workflow priority:/i);
  });

  it("drops unsupported routine workflow labels without inventing absence or priority facts", () => {
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: runForCase("case-2", [
        factRow({
          concept: "workflow_or_timing_issue",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Workflow priority: Efficiency Priority",
          evidence_text: "The overall workflow was smooth.",
        }),
        factRow({
          concept: "staff_workflow",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Staff workflow: Staff Satisfaction",
          evidence_text: "The staff didn't seem frustrated, and the overall workflow was smooth.",
        }),
        factRow({
          concept: "case_outcome",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "No workflow delays observed today",
          evidence_text: "The overall workflow was smooth.",
        }),
      ]),
      caseId: "case-2",
      hasCurrentNotes: true,
    });

    const text = items.map((item) => item.text).join("\n");
    expect(text).not.toMatch(/Staff did not appear frustrated/i);
    expect(text).not.toMatch(/Workflow appeared smooth/i);
    expect(text).not.toMatch(/Efficiency Priority/i);
    expect(text).not.toMatch(/Staff Satisfaction/i);
    expect(text).not.toMatch(/No workflow delays observed today/i);
    expect(items).toHaveLength(0);
  });

  it("keeps explicit priority and no-delay facts when evidence directly supports them", () => {
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: runForCase("case-2", [
        factRow({
          concept: "workflow_or_timing_issue",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Workflow priority: Efficiency Priority",
          evidence_text: "Efficiency is a big deal for him.",
        }),
        factRow({
          concept: "staff_workflow",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Staff workflow: Staff Satisfaction",
          evidence_text: "Staff satisfaction is an important priority.",
        }),
        factRow({
          concept: "case_outcome",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "No workflow delays observed today",
          evidence_text: "No other workflow delays today.",
        }),
      ]),
      caseId: "case-2",
      hasCurrentNotes: true,
    });

    const text = items.map((item) => item.text).join("\n");
    expect(text).toMatch(/Efficiency Priority/i);
    expect(text).toMatch(/Staff satisfaction and retention are priorities/i);
    expect(text).toMatch(/No workflow delays observed today/i);
  });

  it("surfaces product_interest comparison questions as a high-priority chip", () => {
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: runForCase("case-2", [
        factRow({
          concept: "staff_workflow",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Strong team communication",
          evidence_text: "Communication between the circulator and scrub tech was strong.",
        }),
        factRow({
          concept: "product_interest",
          assertion_level: "provider_reported",
          case_id: "case-2",
          normalized_label: "Asked how our graft compares on incorporation time",
          evidence_text: "Asked how our graft compares on incorporation time.",
        }),
      ]),
      caseId: "case-2",
      hasCurrentNotes: true,
    });

    const texts = items.map((item) => item.text);
    expect(texts).toContain("Asked how our graft compares on incorporation time");
    // product_interest (priority 2) ranks ahead of staff_workflow (priority 5)
    expect(texts[0]).toBe("Asked how our graft compares on incorporation time");
  });

  it("keeps Lettuce-style product, staff, priority, and commercial signals visible", () => {
    const items = adaptUniversalFactsToThisObservationItems({
      caseRuns: runForCase("case-2", [
        factRow({
          concept: "current_product",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Current product: Arthrex SpeedBridge",
          product_mentioned: "Arthrex SpeedBridge",
          evidence_text: "He used Arthrex SpeedBridge and ArthroFlex graft today.",
        }),
        factRow({
          concept: "current_product",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Current product: ArthroFlex",
          product_mentioned: "ArthroFlex",
          evidence_text: "He used Arthrex SpeedBridge and ArthroFlex graft today.",
        }),
        factRow({
          concept: "current_product",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Current product: ArthroFlex graft",
          product_mentioned: "ArthroFlex graft",
          evidence_text: "He used Arthrex SpeedBridge and ArthroFlex graft today.",
        }),
        factRow({
          concept: "product_interest",
          assertion_level: "provider_reported",
          case_id: "case-2",
          normalized_label: "Product comparison or clinical-data interest",
          evidence_text: "Asked how our graft compares on incorporation time.",
        }),
        factRow({
          concept: "contact_role",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Sarah · Scrub Tech",
          person_mentioned: "Sarah",
          evidence_text: "Sarah, the scrub tech, said they've had a couple cases delayed waiting on grafts.",
        }),
        factRow({
          concept: "provider_sentiment",
          assertion_level: "provider_reported",
          case_id: "case-2",
          normalized_label: "Relationship: provider openness to alternatives",
          evidence_text: "Doesn't seem locked into Arthrex.",
        }),
        factRow({
          concept: "staff_workflow",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Staff workflow: Team influence on case flow",
          evidence_text: "Sarah, the scrub tech, said they've had a couple cases delayed waiting on grafts.",
        }),
        factRow({
          concept: "inventory_availability_issue",
          assertion_level: "provider_reported",
          case_id: "case-2",
          normalized_label: "Product availability issue",
          evidence_text: "Mentioned they've had a few inventory issues getting ArthroFlex lately.",
        }),
        factRow({
          concept: "workflow_or_timing_issue",
          assertion_level: "provider_reported",
          case_id: "case-2",
          normalized_label: "Workflow priority: Turnover time importance",
          evidence_text: "Efficiency is a big deal for him. Said turnover times are getting tighter.",
        }),
        factRow({
          concept: "visualization_or_access_issue",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Extra visualization time before fixation",
          evidence_text: "Extra visualization time before fixation.",
        }),
      ]),
      caseId: "case-2",
      hasCurrentNotes: true,
    });

    const text = items.map((item) => item.text).join("\n");
    const productLines = items.filter((item) => /was used during the case/i.test(item.text));
    expect(text).toMatch(/Arthrex SpeedBridge/i);
    expect(text).toMatch(/ArthroFlex graft/i);
    expect(productLines.filter((item) => /ArthroFlex/i.test(item.text))).toHaveLength(1);
    expect(text).not.toMatch(/Current product:/i);
    expect(text).not.toMatch(/Arthrex SpeedBridge And ArthroFlex/i);
    expect(text).toMatch(/graft compares on incorporation time|Product comparison or clinical-data interest/i);
    expect(text).toMatch(/Sarah.*Scrub Tech/i);
    expect(text).toMatch(/Provider openness to alternatives/i);
    expect(text).toMatch(/Staff.*delay/i);
    expect(text).toMatch(/Product availability issue|inventory issues getting ArthroFlex/i);
    expect(text).toMatch(/Turnover time importance/i);
    expect(text).not.toMatch(/visualization/i);
    expect(productLines.filter((item) => item.quote)).toHaveLength(0);
  });

  it("keeps next actions out of This Observation and exposes them as follow-up lines", () => {
    const caseRuns = runForCase("case-2", [
      factRow({
        concept: "current_product",
        assertion_level: "observed",
        case_id: "case-2",
        product_mentioned: "Arthrex SpeedBridge",
        normalized_label: "Current product: Arthrex SpeedBridge",
      }),
      factRow({
        concept: "next_action",
        assertion_level: "provider_reported",
        case_id: "case-2",
        normalized_label: "Next step recommended",
        evidence_text: "Send him the clinical data we talked about.",
      }),
      factRow({
        concept: "next_action",
        assertion_level: "provider_reported",
        case_id: "case-2",
        normalized_label: "Next step recommended",
        evidence_text: "Follow up in a couple weeks.",
      }),
    ]);

    expect(
      adaptUniversalFactsToThisObservationItems({
        caseRuns,
        caseId: "case-2",
        hasCurrentNotes: true,
      })
        .map((item) => item.text)
        .join("\n"),
    ).not.toMatch(/Send him|Follow up/i);

    expect(
      adaptUniversalFactsToFollowUpNextVisitLines({
        universalFactsReadModel: { caseRuns },
        caseId: "case-2",
      }),
    ).toEqual(["Send him the clinical data we talked about", "Follow up in a couple weeks"]);
  });

  it("resolveDebriefPrepareProgramRuns prefers programRuns then providerRuns", () => {
    const programRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "program",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-06-01T12:00:00Z",
        operational_note_id: null,
        facts: [],
      },
    ];
    const providerRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "provider",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-06-02T12:00:00Z",
        operational_note_id: null,
        facts: [],
      },
    ];

    expect(resolveDebriefPrepareProgramRuns({ programRuns })[0]?.capture_id).toBe("program");
    expect(resolveDebriefPrepareProgramRuns({ providerRuns })[0]?.capture_id).toBe("provider");
    expect(resolveDebriefPrepareProgramRuns({ programRuns, providerRuns })[0]?.capture_id).toBe(
      "program",
    );
    expect(resolveDebriefPrepareProgramRuns(null)).toEqual([]);
  });
});
