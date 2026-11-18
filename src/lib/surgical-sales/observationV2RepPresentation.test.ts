import { describe, expect, it } from "vitest";

import { buildObservationRepPresentationView } from "./buildObservationRepPresentationView";

/** Canonical Dr. Lettuce note. */
const ROUTINE_CASE_NOTE =
  "Pretty routine case overall. They're still using Bard Mesh. One thing I noticed was the surgeon asked for a different angle a couple times because he wasn't getting the view he wanted before fixation. Didn't seem angry about it, but it definitely slowed things down. Staff was good. Everyone seemed to know what they were doing. There was a little waiting around at one point because they were looking for something that wasn't ready. Nothing major. Still too early for me to know if there's a real opportunity here.";

const V2_EXTRACTION = {
  facts: [
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
      type: "visualization_challenge",
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
  ],
  extractedAt: "2026-06-09T00:00:00.000Z",
  model: "facts-v2-ai",
  validation_version: 1,
};

const NOTE_ACTIVITY = {
  activity_type: "note",
  body: ROUTINE_CASE_NOTE,
  metadata_json: { ai_extraction: V2_EXTRACTION },
};

describe("v2 rep presentation — Dr. Lettuce acceptance (§7 / §8)", () => {
  it("renders accepted v2 intelligence and never the suppressed readiness delay", () => {
    const view = buildObservationRepPresentationView({
      caseRow: { id: "case-1", status: "confirmed", case_type: "observation" },
      activities: [NOTE_ACTIVITY],
    });

    const thisCaseText = view.thisObservation.items.map((item) => item.text).join("\n");

    // Product rendered with real name (forensic gap #1).
    expect(thisCaseText).toContain("Bard Mesh");
    // Visualization theme rendered.
    expect(thisCaseText).toMatch(/visualization/i);
    // §7.1 positive staff line renders real copy, no ontology leak.
    expect(thisCaseText).toMatch(/staff/i);
    expect(thisCaseText).not.toMatch(/staff workflow:\s*[A-Z]/);
    // The suppressed false positive never renders (forensic false-positive fix).
    expect(thisCaseText).not.toMatch(/room or supply readiness|readiness issue/i);
  });

  it("renders a quote under a finding backed by a reported v2 fact (§7.2)", () => {
    const reportedExtraction = {
      ...V2_EXTRACTION,
      facts: [
        ...V2_EXTRACTION.facts,
        {
          type: "provider_frustration",
          value: "provider clinical frustration observed",
          evidence: 'The surgeon said "the fixation angle is always a fight in these cases".',
          polarity: "negative",
          confirmation_state: "reported",
          validation: { status: "accepted" },
        },
      ],
    };

    const view = buildObservationRepPresentationView({
      caseRow: { id: "case-1", status: "confirmed", case_type: "observation" },
      activities: [
        {
          activity_type: "note",
          body: `${ROUTINE_CASE_NOTE} The surgeon said "the fixation angle is always a fight in these cases".`,
          metadata_json: { ai_extraction: reportedExtraction },
        },
      ],
    });

    const quoted = view.thisObservation.items.find((item) => item.quote);
    expect(quoted?.quote).toContain("fixation angle is always a fight");
  });
});
