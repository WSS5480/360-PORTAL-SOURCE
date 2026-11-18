import { describe, expect, it } from "vitest";

import { buildObservationCaseIntelligenceSections } from "./buildObservationCaseBriefingView";
import { buildObservationLearningTabView } from "./buildObservationLearningTabView";

const BARD_MESH_NOTE =
  "They're still using Bard Mesh. Team seemed comfortable with it. They spent extra time trying to improve visualization before fixation. Staff seemed organized. Need more cases before I understand the pain points.";

const PRIOR_OBSERVATION_CASE = {
  id: "case-prior-1",
  status: "completed",
  observation_completed_at: "2026-06-01T18:00:00Z",
  procedure_type: "Hernia repair",
  live_observation_workflow: "Extra visualization time before fixation",
  live_observation_product_fit: "Visualization and fixation workflow opportunity",
  notes: BARD_MESH_NOTE,
};

const INCOMPLETE_FOLLOW_UP_NOTE =
  "They were using Bard Mesh again. There were a couple points where they spent extra time getting a better view before placing fixation. The team seemed organized.";

const BIOTISSUE_NOTE =
  "They're using BioTissue for the graft. There was a graft preparation delay before placement. Staff seemed efficient.";

const PRIOR_WOUND_CASE = {
  id: "case-w1",
  status: "completed",
  observation_completed_at: "2026-06-01T18:00:00Z",
  procedure_type: "Wound care graft",
  live_observation_workflow: "Graft prep delay",
  notes: BIOTISSUE_NOTE,
};

const SKELETAL_DYNAMICS_NOTE =
  "They're using Skeletal Dynamics. Instrument setup caused some confusion at the start. Staff handled the product but needed guidance.";

const PRIOR_ORTHO_CASE = {
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

describe("Case Intelligence acceptance — generic signal behavior", () => {
  it("Test 1 — incomplete follow-up observation case with repeated product/workflow", () => {
    const view = buildObservationLearningTabView({
      caseRow: { id: "case-2", status: "confirmed" },
      activities: [{ activity_type: "note", body: INCOMPLETE_FOLLOW_UP_NOTE }],
      priorCases: [PRIOR_OBSERVATION_CASE],
    });

    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-2", status: "confirmed" },
      activities: [{ activity_type: "note", body: INCOMPLETE_FOLLOW_UP_NOTE }],
      priorCases: [PRIOR_OBSERVATION_CASE],
    });

    expect(view.programCasesLabel).toBe("1 of 5 observation cases complete");
    expect(view.programInProgressNote).toBe("1 in-progress case note captured");
    expect(view.currentCaseComplete).toBe(false);

    const thisCaseLabels = sections.thisCaseItems.map((item) => item.text);
    expect(thisCaseLabels.some((text) => /Bard Mesh was used during the procedure/i.test(text))).toBe(true);
    expect(thisCaseLabels.some((text) => /Extra time was spent improving visualization before fixation/i.test(text))).toBe(
      true,
    );
    expect(thisCaseLabels.some((text) => /Staff appeared organized/i.test(text))).toBe(true);
    expect(new Set(thisCaseLabels.map((text) => text.trim().toLowerCase())).size).toBe(thisCaseLabels.length);
    expect(thisCaseLabels.some((text) => /usage in use|observed captured|early_signal/i.test(text))).toBe(false);
    expect(thisCaseLabels.join("\n")).not.toMatch(
      /Visualization Delay|Product Used Surgery|Apple Product Used Surgery/i,
    );
    expect(thisCaseLabels.join("\n")).not.toMatch(/product used surgery was used/i);

    const providerLines = sections.providerContextItems.map((item) => item.text).join(" ");
    expect(providerLines).toMatch(/Bard Mesh noted again/i);
    expect(providerLines).toMatch(/Visualization challenge before fixation noted again|workflow.*noted again/i);
    expect(providerLines).not.toMatch(/New product observed/i);
    expect(providerLines).not.toMatch(/New workflow note/i);
  });

  it("Test 2 — completed follow-up observation case increments count and maturity", () => {
    const view = buildObservationLearningTabView({
      caseRow: {
        id: "case-2",
        status: "completed",
        observation_completed_at: "2026-06-08T18:00:00Z",
      },
      activities: [{ activity_type: "note", body: INCOMPLETE_FOLLOW_UP_NOTE }],
      priorCases: [PRIOR_OBSERVATION_CASE],
    });

    const sections = buildObservationCaseIntelligenceSections({
      caseRow: {
        id: "case-2",
        status: "completed",
        observation_completed_at: "2026-06-08T18:00:00Z",
      },
      activities: [{ activity_type: "note", body: INCOMPLETE_FOLLOW_UP_NOTE }],
      priorCases: [PRIOR_OBSERVATION_CASE],
    });

    expect(view.programCasesLabel).toBe("2 of 5 observation cases complete");
    expect(view.currentCaseComplete).toBe(true);

    const providerLines = sections.providerContextItems.map((item) => item.text);
    expect(providerLines.some((text) => /Bard Mesh noted in 2 completed cases/i.test(text))).toBe(true);
    expect(providerLines.some((text) => /visualization|fixation|workflow.*noted again|noted in 2 completed cases/i.test(text))).toBe(
      true,
    );
  });

  it("Test 3 — different product/surgery avoids hernia/mesh language", () => {
    const woundNote =
      "BioTissue used again. Graft prep delay repeated before placement. Staff seemed efficient.";

    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-w2", status: "confirmed", procedure_type: "Wound care graft" },
      activities: [
        {
          activity_type: "note",
          body: woundNote,
          metadata_json: {
            ai_extraction: {
              facts: [
                { type: "current_product", value: "BioTissue", evidence: "using BioTissue" },
                { type: "workflow_delay", value: "graft preparation delay", evidence: "graft prep delay" },
                { type: "staff_efficiency", value: "staff appeared efficient", evidence: "efficient" },
              ],
            },
          },
        },
      ],
      priorCases: [PRIOR_WOUND_CASE],
    });

    const allText = [
      ...sections.thisCaseItems.map((item) => item.text),
      ...sections.providerContextItems.map((item) => item.text),
    ].join(" ");

    const thisCaseText = sections.thisCaseItems.map((item) => item.text).join(" ");
    const providerText = sections.providerContextItems.map((item) => item.text).join(" ");
    expect(thisCaseText + providerText).toMatch(/BioTissue/i);
    expect(thisCaseText + providerText).toMatch(/graft preparation|workflow delay|Graft Preparation/i);
    expectNoHerniaMeshFixationLanguage(allText);
  });

  it("Test 4 — orthopedic product-covered case uses product performance wording", () => {
    const orthoNote =
      "Skeletal Dynamics used again. Staff needed help with instrument setup at the start.";

    const sections = buildObservationCaseIntelligenceSections({
      caseRow: {
        id: "case-o2",
        status: "confirmed",
        case_type: "product_covered_case",
        procedure_type: "Orthopedic fixation",
      },
      activities: [
        {
          activity_type: "note",
          body: orthoNote,
          metadata_json: {
            ai_extraction: {
              facts: [
                { type: "current_product", value: "Skeletal Dynamics", evidence: "using Skeletal Dynamics" },
                {
                  type: "workflow_delay",
                  value: "instrument setup confusion",
                  evidence: "needed help with setup",
                },
              ],
            },
          },
        },
      ],
      priorCases: [PRIOR_ORTHO_CASE],
    });

    const allText = [
      ...sections.thisCaseItems.map((item) => item.text),
      ...sections.providerContextItems.map((item) => item.text),
    ].join(" ");

    expect(allText).toMatch(/Skeletal Dynamics/i);
    expect(allText).not.toMatch(/observation cases complete/i);
    expect(allText).not.toMatch(/debrief readiness/i);
  });

  it("Test 5 — support case focuses on resolution and training", () => {
    const supportNote = "Issue resolved after retraining. Staff handled product confidently afterward.";

    const sections = buildObservationCaseIntelligenceSections({
      caseRow: {
        id: "case-s2",
        status: "confirmed",
        case_type: "product_support",
        support_type: "training",
      },
      activities: [{ activity_type: "note", body: supportNote }],
      priorCases: [SUPPORT_PRIOR_CASE],
    });

    const providerLines = sections.providerContextItems.map((item) => item.text).join(" ");
    expect(providerLines).toMatch(/resolved|training need addressed/i);
    expect(providerLines).not.toMatch(/observation cases complete/i);
    expect(providerLines).not.toMatch(/debrief readiness/i);
  });

  it("Test 6 — truly new workflow signal is labeled new while repeated product strengthens", () => {
    const mixedNote =
      "Bard Mesh used again. Instrument turnover delay appeared for the first time during closure.";

    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-3", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: mixedNote,
          metadata_json: {
            ai_extraction: {
              facts: [
                { type: "current_product", value: "Bard Mesh", evidence: "using Bard Mesh" },
                {
                  type: "workflow_delay",
                  value: "instrument turnover delay",
                  evidence: "turnover delay during closure",
                },
              ],
            },
          },
        },
      ],
      priorCases: [PRIOR_OBSERVATION_CASE],
    });

    const providerLines = sections.providerContextItems.map((item) => item.text);
    expect(providerLines.some((text) => /Bard Mesh noted again/i.test(text))).toBe(true);
    expect(providerLines.some((text) => /New workflow note/i.test(text))).toBe(true);
    expect(providerLines.filter((text) => /^New /i.test(text)).length).toBeGreaterThanOrEqual(1);
  });

  it("Test 7 — conflicting product use is flagged without overwriting prior pattern", () => {
    const conflictNote = "BioTissue used instead today. Team seemed organized.";

    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-4", status: "confirmed", procedure_type: "Hernia repair" },
      activities: [
        {
          activity_type: "note",
          body: conflictNote,
          metadata_json: {
            ai_extraction: {
              facts: [
                { type: "current_product", value: "BioTissue", evidence: "using BioTissue" },
                { type: "staff_efficiency", value: "team appeared organized", evidence: "organized" },
              ],
            },
          },
        },
      ],
      priorCases: [PRIOR_OBSERVATION_CASE],
    });

    const providerLines = sections.providerContextItems.map((item) => item.text).join(" ");
    expect(providerLines).toMatch(/BioTissue differs from prior product use/i);
    expect(providerLines).not.toMatch(/BioTissue observed in 2 completed cases/i);
    expect(providerLines).not.toMatch(/BioTissue is the new normal/i);
  });

  it("suppresses unresolved product-use findings from this case chips", () => {
    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-junk-product", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: "They were using Bard Mesh again but also something else I could not identify.",
          metadata_json: {
            ai_extraction: {
              facts: [
                { type: "current_product", value: "Bard Mesh", evidence: "using Bard Mesh" },
                { type: "current_product", value: "product used surgery", evidence: "using product" },
              ],
            },
          },
        },
      ],
      priorCases: [],
    });

    const labels = sections.thisCaseItems.map((item) => item.text);
    expect(labels.some((text) => /Bard Mesh was used during the procedure/i.test(text))).toBe(true);
    expect(labels.some((text) => /A product was used during the procedure/i.test(text))).toBe(false);
    expect(new Set(labels.map((text) => text.trim().toLowerCase())).size).toBe(labels.length);
    expect(labels.join("\n")).not.toMatch(/Product Used Surgery was used/i);
  });
});
