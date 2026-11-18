import type { UniversalDeclaredSourceType, UniversalExtractorInput } from "./types";

export type UniversalExtractorFixture = {
  id: string;
  label: string;
  input: UniversalExtractorInput;
  expected_concepts: string[];
  forbidden_concepts?: string[];
  expected_assertion?: string;
  expect_uncertain?: boolean;
};

export const UNIVERSAL_EXTRACTOR_FIXTURES: UniversalExtractorFixture[] = [
  {
    id: "provider-reported-sizing",
    label: "Provider-reported implant sizing issue",
    input: {
      raw_note: "I've had issues getting the right implant size before.",
      declared_source_type: "discovery_note",
    },
    expected_concepts: ["sizing_or_fit_issue"],
    forbidden_concepts: ["opportunity_signal", "visualization_or_access_issue"],
    expected_assertion: "provider_reported",
  },
  {
    id: "observation-sizing",
    label: "Observed implant sizing confirmation time",
    input: {
      raw_note: "Extra time spent confirming implant sizing.",
      declared_source_type: "observation_case",
    },
    expected_concepts: ["sizing_or_fit_issue"],
    forbidden_concepts: ["opportunity_signal"],
    expected_assertion: "observed",
  },
  {
    id: "product-support-inventory",
    label: "Product support inventory and alternative use",
    input: {
      raw_note: "Requested implant size was unavailable and alternative implant was used.",
      declared_source_type: "product_support_case",
    },
    expected_concepts: [
      "inventory_availability_issue",
      "requested_item",
      "unavailable_item",
      "alternative_used",
    ],
    forbidden_concepts: ["opportunity_signal"],
    expected_assertion: "case_supported",
  },
  {
    id: "observation-routine-positive",
    label: "Routine positive observation — no pain mapping",
    input: {
      raw_note: "Visualization was good and the case moved smoothly.",
      declared_source_type: "observation_case",
    },
    expected_concepts: ["case_outcome"],
    forbidden_concepts: [
      "visualization_or_access_issue",
      "workflow_or_timing_issue",
      "opportunity_signal",
    ],
    expected_assertion: "observed",
  },
  {
    id: "observation-visualization-uncertain",
    label: "Uncertain visualization concern before fixation",
    input: {
      raw_note:
        "They spent extra time getting a better view before fixation, but I don't know if this is normal yet.",
      declared_source_type: "observation_case",
    },
    expected_concepts: ["visualization_or_access_issue"],
    forbidden_concepts: ["opportunity_signal"],
    expected_assertion: "observed",
    expect_uncertain: true,
  },
  {
    id: "debrief-validation-visualization",
    label: "Debrief validation of recurring visualization issue",
    input: {
      raw_note: "Provider confirmed visualization is a recurring issue in robotic ventral cases.",
      declared_source_type: "debrief_validation",
    },
    expected_concepts: ["visualization_or_access_issue"],
    forbidden_concepts: ["opportunity_signal"],
    expected_assertion: "validated",
  },
];
