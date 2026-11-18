import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DebriefPrepareKnownFactsList,
  DebriefPrepareSummaryStrip,
} from "./DebriefPrepareSummaryStrip";
import type { DebriefPrepareWorkspaceView } from "@/lib/surgical-sales/engagements/debriefPrepareWorkspace";

function buildWorkspace(overrides: Partial<DebriefPrepareWorkspaceView> = {}): DebriefPrepareWorkspaceView {
  return {
    draft: {
      meetingObjective: "Confirm visualization friction",
      knownFacts: ["Extra visualization time before fixation (4 of 5 observations)"],
      whyItMatters: "This may slow fixation decisions.",
      suggestedHypothesis: "",
      suggestedLearnItems: [],
      suggestedQuestions: [],
      procedureLabel: "Hernia repair",
      incumbentProduct: "Bard Mesh",
    },
    rep: {
      meetingObjective: "",
      hypothesis: "ACSIS could help",
      learnItems: [],
      questionCards: [],
      desiredOutcome: "evaluation_case",
      desiredOutcomeOther: "",
      meetingNotes: "",
      updatedAt: null,
    },
    meetingObjective: "Confirm visualization friction",
    knownFacts: ["Extra visualization time before fixation (4 of 5 observations)"],
    whyItMatters: "This may slow fixation decisions.",
    hypothesis: "ACSIS could help",
    learnItems: [{ id: "learn-1", text: "Is frustration routine?", checked: true }],
    questionCards: [],
    desiredOutcome: "evaluation_case",
    desiredOutcomeOther: "",
    meetingNotes: "",
    guidanceIntelligence: {
      conversationStarters: [],
      recommendedOutcome: null,
      outcomeRationale: null,
    },
    ...overrides,
  };
}

describe("DebriefPrepareSummaryStrip", () => {
  it("shows observation count, procedure context, and readiness chips", () => {
    render(
      <DebriefPrepareSummaryStrip
        workspace={buildWorkspace()}
        completedObservationCount={5}
        saveState="idle"
      />,
    );

    expect(screen.getByText(/5 completed observations/i)).toBeInTheDocument();
    expect(screen.getByText("Hernia repair")).toBeInTheDocument();
    expect(screen.getByText(/Incumbent: Bard Mesh/i)).toBeInTheDocument();
    expect(screen.getByText("Objective")).toBeInTheDocument();
    expect(screen.getByText("Desired outcome")).toBeInTheDocument();
  });
});

describe("DebriefPrepareKnownFactsList", () => {
  it("splits fact label and frequency badge", () => {
    render(
      <DebriefPrepareKnownFactsList
        facts={["Extra visualization time before fixation — seen in 4 of 5 observations"]}
      />,
    );

    expect(screen.getByText("Extra visualization time before fixation")).toBeInTheDocument();
    expect(screen.getByText("4 of 5 observations")).toBeInTheDocument();
  });
});
