import { describe, expect, it } from "vitest";

import { CASE_BRIEF_BASELINE_MISSING } from "./caseIntelligenceSignals";

import {

  buildObservationCaseBriefingView,

  buildObservationCaseIntelligenceSections,

  buildObservationCaseMission,

  formatSignalMaturityLabel,

} from "./buildObservationCaseBriefingView";

const BARD_MESH_NOTE =

  "They're still using Bard Mesh. Team seemed comfortable with it. They spent extra time trying to improve visualization before fixation. Staff seemed organized. Need more cases before I understand the pain points.";

const PRIOR_CASE_HERNIa = {

  id: "case-1",

  status: "completed",

  procedure_type: "Hernia repair",

  live_observation_workflow: "Extra visualization time before fixation",

  live_observation_product_fit: "Visualization and fixation workflow opportunity",

  notes: BARD_MESH_NOTE,

};

const BIOTISSUE_NOTE =
  "They're using BioTissue for the graft. There was a graft preparation delay before placement. Staff seemed efficient.";

const PRIOR_CASE_WOUND = {

  id: "case-w1",

  status: "completed",

  procedure_type: "Wound care graft",

  live_observation_workflow: "Graft prep delay",

  notes: BIOTISSUE_NOTE,

};

const SKELETAL_DYNAMICS_NOTE =
  "They're using Skeletal Dynamics. Instrument setup caused some confusion at the start. Staff handled the product but needed guidance.";

const PRIOR_CASE_ORTHO = {

  id: "case-o1",

  status: "completed",

  procedure_type: "Orthopedic fixation",

  live_observation_workflow: "Instrument setup confusion",

  notes: SKELETAL_DYNAMICS_NOTE,

};

const SUPPORT_PRIOR_CASE = {

  id: "case-s1",

  status: "completed",

  procedure_type: "General surgery",

  live_observation_staff_process: "Product handling concern noted",

  notes: "Provider raised a product handling concern. Possible training need — staff unsure about deployment steps.",

};

function expectNoHerniaMeshFixationLanguage(text: string) {
  expect(text.toLowerCase()).not.toMatch(/bard mesh|hernia repair|visualization.*fixation/);
}

describe("buildObservationCaseBriefingView — generalized case focus", () => {

  it("Test 4 — baseline case focus for first case with no prior intelligence", () => {

    const view = buildObservationCaseBriefingView({

      caseRow: { id: "case-1", status: "scheduled", procedure_type: "Robotic ventral hernia repair" },

      activities: [],

      priorCases: [],

    });

    expect(view.kind).toBe("baseline");

    expect(view.caseFocus.knownSoFar).toEqual(["No prior case evidence captured yet"]);

    expect(view.caseFocus.stillMissing).toEqual([...CASE_BRIEF_BASELINE_MISSING]);

    expect(view.caseFocus.focusToday).toBe("Capture baseline workflow, product usage, and provider/staff pain points.");

  });

  it("Test 1 — hernia observation follow-up uses prior signals without hardcoded defaults", () => {
    const view = buildObservationCaseBriefingView({
      caseRow: { id: "case-2", status: "scheduled", procedure_type: "Robotic ventral hernia repair" },
      activities: [],
      priorCases: [PRIOR_CASE_HERNIa],
    });

    expect(view.kind).toBe("follow_up");
    expect(view.caseFocus.knownSoFar).toEqual([
      "Bard Mesh observed in 1 completed case",
      "Visualization before fixation observed in 1 completed case",
      "Staff appeared organized",
    ]);
    expect(view.caseFocus.stillMissing).toEqual(
      expect.arrayContaining([
        "Provider pain points",
        "Staff pain points",
        "Repeat evidence for visualization/fixation workflow",
        "Confirm whether Bard Mesh repeats",
      ]),
    );
    expect(view.caseFocus.focusToday).toBe(
      "Pay attention to product use, provider/staff friction, and whether the visualization/fixation workflow issue repeats.",
    );
    expect(view.caseFocus.focusToday).not.toMatch(/product-fit opening/i);
    expect(view.caseFocus.focusToday).not.toMatch(/team appeared organized/i);
  });

  it("Test 2 — wound care follow-up avoids hernia/mesh/fixation language", () => {

    const view = buildObservationCaseBriefingView({

      caseRow: { id: "case-w2", status: "scheduled", procedure_type: "Wound care graft" },

      activities: [],

      priorCases: [PRIOR_CASE_WOUND],

    });

    expect(view.kind).toBe("follow_up");

    expect(view.caseFocus.focusToday).toMatch(/graft prep/i);

    expect(view.caseFocus.knownSoFar).toEqual(
      expect.arrayContaining([expect.stringMatching(/biotissue observed in 1 completed case/i)]),
    );

    const allText = [
      view.caseFocus.focusToday,
      ...view.caseFocus.knownSoFar,
      ...view.caseFocus.stillMissing,
    ].join(" ");

    expectNoHerniaMeshFixationLanguage(allText);

  });

  it("Test 3 — orthopedic product-covered case focuses on product performance and staff handling", () => {

    const view = buildObservationCaseBriefingView({

      caseRow: {

        id: "case-o2",

        status: "scheduled",

        case_type: "product_support",

        procedure_type: "Orthopedic fixation",

      },

      activities: [],

      priorCases: [PRIOR_CASE_ORTHO],

    });

    expect(view.kind).toBe("product_covered");

    expect(view.caseFocus.focusToday).toMatch(/instrument setup|skeletal dynamics/i);

    expect(view.caseFocus.knownSoFar).toEqual(
      expect.arrayContaining([expect.stringMatching(/skeletal dynamics observed in 1 completed case/i)]),
    );

    const allText = [
      view.caseFocus.focusToday,
      ...view.caseFocus.knownSoFar,
      ...view.caseFocus.stillMissing,
    ].join(" ");

    expectNoHerniaMeshFixationLanguage(allText);

  });

  it("Test 5 — support case prioritizes issue classification and resolution cues", () => {

    const view = buildObservationCaseBriefingView({

      caseRow: {

        id: "case-s2",

        status: "scheduled",

        case_type: "product_support",

        support_type: "product handling concern",

        procedure_type: "General surgery",

      },

      activities: [],

      priorCases: [SUPPORT_PRIOR_CASE],

    });

    expect(view.kind).toBe("support");

    expect(view.caseFocus.stillMissing.length).toBeGreaterThan(0);

    expect(view.caseFocus.focusToday).toBe(
      "Capture whether the issue is resolved, what caused it, and whether training or escalation is needed.",
    );

  });

});

describe("buildObservationCaseIntelligenceSections", () => {

  it("separates empty this case from provider context before notes", () => {

    const sections = buildObservationCaseIntelligenceSections({

      caseRow: { id: "case-2", status: "scheduled" },

      activities: [],

      priorCases: [PRIOR_CASE_HERNIa],

    });

    expect(sections.thisCaseItems).toEqual([]);

    expect(sections.thisCaseEmptyMessage).toMatch(/nothing noted/i);

    expect(sections.providerContextTitle).toBe("Prior Context to Confirm");

    expect(sections.providerContextItems.map((item) => item.text)).toEqual(
      expect.arrayContaining([
        "Bard Mesh observed in 1 completed case",
        "Visualization before fixation observed in 1 completed case",
        "Product-fit opportunity around visualization/fixation observed in 1 completed case",
        "Staff appeared organized",
        "Provider frustrations not yet understood",
        "Staff frustrations not yet understood",
        "Repeat product/workflow evidence across completed cases",
      ]),
    );

  });

  it("explains how current findings relate to prior provider context using signal labels", () => {

    const followUpNote =

      "They were using Bard Mesh again. There were a couple points where they spent extra time getting a better view before placing fixation. The team seemed organized.";

    const sections = buildObservationCaseIntelligenceSections({

      caseRow: { id: "case-2", status: "confirmed" },

      activities: [{ activity_type: "note", body: followUpNote }],

      priorCases: [PRIOR_CASE_HERNIa],

    });

    expect(sections.thisCaseItems.length).toBeGreaterThan(0);

    expect(sections.providerContextTitle).toBe("Provider Context");

    expect(sections.providerContextItems.map((item) => item.text)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/noted again — also seen in this in-progress case/i),
        expect.stringMatching(/Visualization challenge before fixation noted again/i),
        expect.stringMatching(/Staff appeared organized again/i),
        "Provider frustrations not yet noted",
        "Staff frustrations not yet noted",
      ]),
    );

  });

  it("detects repeat when prior note on same in-progress case mentioned the same product", () => {
    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [
        { activity_type: "note", body: "They're still using Product Alpha during setup." },
        { activity_type: "note", body: "They were using Product Alpha again with different wording." },
      ],
      priorCases: [],
    });

    const providerLines = sections.providerContextItems.map((item) => item.text).join(" ");
    expect(providerLines).toMatch(/noted again — also seen in this in-progress case/i);
    expect(providerLines).not.toMatch(/New product observed/i);
  });

  it("detects repeat from prior provider intelligence with placeholder product and workflow", () => {
    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: "They were using Product Alpha again. Setup delay observed again during the case.",
        },
      ],
      priorCases: [
        {
          id: "case-prior",
          status: "completed",
          observation_completed_at: "2026-06-01T18:00:00Z",
          notes: "They're still using Product Alpha. Setup delay observed during the case.",
        },
      ],
    });

    const providerLines = sections.providerContextItems.map((item) => item.text).join(" ");
    expect(providerLines).toMatch(/noted again — also seen in this in-progress case/i);
    expect(providerLines).not.toMatch(/New product observed/i);
    expect(providerLines).toMatch(/Setup noted again|Workflow delay noted again|noted again — also seen/i);
    expect(providerLines).not.toMatch(/New workflow note/i);
  });

});

describe("evidence maturity labels", () => {

  it("formats signal maturity by prior case count", () => {

    expect(

      formatSignalMaturityLabel({

        normalizedFindingId: "product_in_use:bard_mesh",

        label: "Bard Mesh in use",

        observationCount: 1,

        completedObservationCount: 1,

        capturedFromCurrentNote: false,

        evidenceLabel: "Observed in 1 completed case",

        isPositiveStaffSignal: false,

        isEarlySignal: false,

        confidence: "Low",

        sourceCaseIds: ["case-1"],

        matchKey: "bard_mesh",

      }),

    ).toBe("Observed once · Low confidence");

    expect(

      formatSignalMaturityLabel({

        normalizedFindingId: "workflow_delay",

        label: "Workflow Concept A delay observed",

        observationCount: 3,

        completedObservationCount: 3,

        capturedFromCurrentNote: false,

        evidenceLabel: "Validated pattern across 3 completed cases",

        isPositiveStaffSignal: false,

        isEarlySignal: false,

        confidence: "High",

        sourceCaseIds: ["case-1", "case-2", "case-3"],

        matchKey: "workflow_delay",

        maturityStatus: "validated_pattern",

        maturityDisplayLabel: "Validated pattern",

        evidenceConfidenceLabel: "High confidence",

        extractionConfidenceScore: 0.78,

        evidenceConfidenceScore: 0.88,

        extractionConfidenceLabel: "High confidence",

        isDebriefReadyFinding: false,

        hasConflictingEvidence: false,

      }),

    ).toBe("Validated pattern · High confidence");

  });

  it("builds debrief mission when approaching readiness", () => {

    const mission = buildObservationCaseMission({

      caseRow: { procedure_type: "Hernia repair" },

      priorFindings: [],

      observationsRemaining: 1,

      completedObservations: 4,

      debriefUnlocked: false,

    });

    expect(mission).toBe("Confirm open questions before the provider debrief.");

  });

});

