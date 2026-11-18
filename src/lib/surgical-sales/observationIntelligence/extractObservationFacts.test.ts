import { describe, expect, it } from "vitest";
import {
  extractObservationFacts,
  extractFactsFromFragment,
  splitFragmentOnHedgingConnectors,
  splitObservationFragments,
} from "./extractObservationFacts";
import { runObservationIntelligencePipeline } from "./observationIntelligencePipeline";

const HEDGING_VISUALIZATION_SENTENCE =
  "There were a couple points where they spent extra time getting a better view before fixation but I don't know yet if that's normal.";

const FULL_FIELD_NOTE =
  "First time seeing one of their cases. They're still using Bard Mesh from what I could tell. Case went pretty smoothly overall. There were a couple points where they spent extra time getting a better view before fixation but I don't know yet if that's normal for them or specific to this case. Team seemed organized and communication was good. Didn't hear anybody complain about products or workflow. Need a few more observations before I can tell where the real opportunities are.";

const BARD_MESH_NOTE =
  "They're still using Bard Mesh. Team seemed comfortable with it. They spent extra time trying to improve visualization before fixation. Staff seemed organized. Need more cases before I understand the pain points.";

const ROUTINE_CASE_NOTE =
  "Pretty routine case overall. They're still using Bard Mesh. One thing I noticed was the surgeon asked for a different angle a couple times because he wasn't getting the view he wanted before fixation. Didn't seem angry about it, but it definitely slowed things down. Staff was good. Everyone seemed to know what they were doing. There was a little waiting around at one point because they were looking for something that wasn't ready. Nothing major. Still too early for me to know if there's a real opportunity here.";

describe("extractObservationFacts", () => {
  it("extracts normalized facts from surgical observation language", () => {
    const { facts } = extractObservationFacts(BARD_MESH_NOTE);

    expect(facts).toEqual(
      expect.arrayContaining([
        { type: "current_product", value: "Bard Mesh", evidence: expect.any(String) },
        { type: "competitor_product", value: "Bard Mesh", evidence: expect.any(String) },
        { type: "workflow_issue", value: "extra visualization time before fixation", evidence: expect.any(String) },
        { type: "visualization_challenge", value: "extra visualization time before fixation", evidence: expect.any(String) },
        { type: "staff_efficiency", value: "team comfortable with current products", evidence: expect.any(String) },
        { type: "staff_efficiency", value: "staff appeared organized", evidence: expect.any(String) },
      ]),
    );

    expect(facts.some((fact) => fact.type === "provider_frustration")).toBe(false);
    expect(facts.some((fact) => fact.type === "staff_issue")).toBe(false);
  });

  it("extracts operational observations from conversational field notes", () => {
    const { facts } = extractObservationFacts(ROUTINE_CASE_NOTE);

    expect(facts).toEqual(
      expect.arrayContaining([
        { type: "current_product", value: "Bard Mesh", evidence: expect.any(String) },
        { type: "competitor_product", value: "Bard Mesh", evidence: expect.any(String) },
        {
          type: "workflow_issue",
          value: "visualization challenge before fixation",
          evidence: expect.any(String),
        },
        {
          type: "visualization_challenge",
          value: "visualization challenge before fixation",
          evidence: expect.any(String),
        },
        {
          type: "workflow_issue",
          value: "delay caused by readiness issue",
          evidence: expect.any(String),
        },
        { type: "staff_efficiency", value: "coordinated team", evidence: expect.any(String) },
      ]),
    );

    expect(facts.some((fact) => fact.type === "provider_frustration")).toBe(false);
    expect(facts.some((fact) => fact.type === "staff_issue")).toBe(false);
    expect(facts.some((fact) => fact.type === "product_fit_signal")).toBe(false);
  });

  it("extracts visualization facts from operational clause before hedging language", () => {
    const { facts } = extractObservationFacts(HEDGING_VISUALIZATION_SENTENCE);

    expect(facts).toEqual(
      expect.arrayContaining([
        {
          type: "workflow_issue",
          value: "extra visualization time before fixation",
          evidence: expect.stringContaining("spent extra time getting a better view before fixation"),
        },
        {
          type: "visualization_challenge",
          value: "extra visualization time before fixation",
          evidence: expect.stringContaining("spent extra time getting a better view before fixation"),
        },
        {
          type: "fixation_challenge",
          value: "visualization delay before fixation",
          evidence: expect.stringContaining("spent extra time getting a better view before fixation"),
        },
      ]),
    );

    expect(facts.some((fact) => fact.type === "provider_frustration")).toBe(false);
    expect(facts.some((fact) => fact.type === "staff_issue")).toBe(false);
    expect(facts.some((fact) => fact.type === "product_interest")).toBe(false);
    expect(facts.some((fact) => fact.type === "product_fit_signal")).toBe(false);
  });

  it("splits hedging connectors without dropping observable surgical signals", () => {
    const clauses = splitFragmentOnHedgingConnectors(HEDGING_VISUALIZATION_SENTENCE);

    expect(clauses).toEqual([
      "There were a couple points where they spent extra time getting a better view before fixation",
      "if that's normal.",
    ]);

    const operationalFacts = extractFactsFromFragment(clauses[0]!);
    expect(operationalFacts.map((fact) => fact.type)).toEqual(
      expect.arrayContaining(["workflow_issue", "visualization_challenge", "fixation_challenge"]),
    );
    expect(extractFactsFromFragment(clauses[1]!)).toEqual([]);
  });

  it("extracts mixed field note with product, workflow, and staff findings", () => {
    const fragments = splitObservationFragments(FULL_FIELD_NOTE);
    expect(
      fragments.some((fragment) =>
        /spent extra time getting a better view before fixation/i.test(fragment),
      ),
    ).toBe(true);

    const { facts } = extractObservationFacts(FULL_FIELD_NOTE);

    expect(facts).toEqual(
      expect.arrayContaining([
        { type: "current_product", value: "Bard Mesh", evidence: expect.any(String) },
        { type: "competitor_product", value: "Bard Mesh", evidence: expect.any(String) },
        { type: "workflow_issue", value: "extra visualization time before fixation", evidence: expect.any(String) },
        { type: "visualization_challenge", value: "extra visualization time before fixation", evidence: expect.any(String) },
        { type: "fixation_challenge", value: "visualization delay before fixation", evidence: expect.any(String) },
        { type: "staff_efficiency", value: "staff appeared organized", evidence: expect.any(String) },
      ]),
    );

    expect(facts.some((fact) => fact.type === "provider_frustration")).toBe(false);
    expect(facts.some((fact) => fact.type === "staff_issue")).toBe(false);
    expect(facts.some((fact) => fact.type === "product_fit_signal")).toBe(false);
  });
});

describe("observation intelligence pipeline", () => {
  it("scores evidence progress from inferred facts, not literal keywords", () => {
    const result = runObservationIntelligencePipeline({
      caseRow: { id: "case-1" },
      activities: [{ activity_type: "note", body: BARD_MESH_NOTE }],
      providerContact: { observation_count: 0 },
    });

    const statuses = Object.fromEntries(
      result.evidencePillars.map((pillar) => [pillar.id, pillar.status]),
    );

    expect(result.evidenceProgressSignalCount).toBe(3);
    expect(result.evidenceProgressValidatedCount).toBe(0);
    expect(statuses.current_products).toBe("captured_signal");
    expect(statuses.workflow_findings).toBe("early_signal");
    expect(statuses.product_fit_signals).toBe("early_signal");
    expect(statuses.provider_pain_points).toBe("missing");
    expect(statuses.staff_pain_points).toBe("missing");

    expect(result.learnedCategories.map((category) => category.title)).toEqual(
      expect.arrayContaining([
        "Competitor Products",
        "Workflow Findings",
        "Staff Workflow",
      ]),
    );

    expect(
      result.learnedCategories.find((category) => category.id === "workflow_findings")?.findings[0]
        ?.label,
    ).toBe("Visualization challenge before fixation");
  });

  it("builds intelligence from operational observation language", () => {
    const result = runObservationIntelligencePipeline({
      caseRow: { id: "case-1" },
      activities: [{ activity_type: "note", body: ROUTINE_CASE_NOTE }],
    });

    const workflowLabels =
      result.learnedCategories.find((category) => category.id === "workflow_findings")?.findings.map(
        (finding) => finding.label,
      ) ?? [];
    const staffLabels =
      result.learnedCategories.find((category) => category.id === "staff_workflow")?.findings.map(
        (finding) => finding.label,
      ) ?? [];

    expect(workflowLabels).toEqual(
      expect.arrayContaining([
        "Visualization challenge before fixation",
        "Staff supply delays",
      ]),
    );
    expect(staffLabels).toContain("Team appeared coordinated");
    expect(result.evidenceProgressSignalCount).toBeGreaterThanOrEqual(2);
  });

  it("shows visualization, product, and staff findings for hedging mixed field note", () => {
    const result = runObservationIntelligencePipeline({
      caseRow: { id: "case-1" },
      activities: [{ activity_type: "note", body: FULL_FIELD_NOTE }],
    });

    const workflowLabels =
      result.learnedCategories.find((category) => category.id === "workflow_findings")?.findings.map(
        (finding) => finding.label,
      ) ?? [];
    const productLabels =
      result.learnedCategories.find((category) => category.id === "current_products")?.findings.map(
        (finding) => finding.label,
      ) ?? [];
    const staffLabels =
      result.learnedCategories.find((category) => category.id === "staff_workflow")?.findings.map(
        (finding) => finding.label,
      ) ?? [];

    expect(productLabels).toContain("Bard Mesh in use");
    expect(staffLabels).toContain("Team appeared organized");
    expect(workflowLabels).toContain("Visualization challenge before fixation");

    const workflowFinding = result.aggregatedByCategory.workflow_findings.find(
      (finding) => finding.normalizedFindingId === "workflow_visualization_before_fixation",
    );
    expect(workflowFinding?.label).toBe("Visualization challenge before fixation");
    expect(workflowFinding?.confidence).toBe("Low");
    expect(workflowFinding?.observationCount).toBe(1);

    expect(result.evidencePillars.find((pillar) => pillar.id === "workflow_findings")?.status).toBe("early_signal");
    expect(result.evidencePillars.find((pillar) => pillar.id === "provider_pain_points")?.status).toBe("missing");
    expect(result.evidencePillars.find((pillar) => pillar.id === "staff_pain_points")?.status).toBe("missing");
    expect(result.evidencePillars.find((pillar) => pillar.id === "product_fit_signals")?.status).toBe("early_signal");
  });
});
