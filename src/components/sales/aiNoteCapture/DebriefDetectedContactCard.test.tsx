import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { buildProposedContactFromExtraction } from "@/lib/surgical-sales/debriefDetectedContact";
import {
  DEBRIEF_REVIEW_CONTACT_ACTION,
  DEBRIEF_WORKFLOW_PARTICIPANT_CREATE,
  DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE,
  DEBRIEF_WORKFLOW_PARTICIPANT_LINK,
} from "@/lib/surgical-sales/debriefApprovalUx";
import {
  INTELLIGENCE_BRIEF_HIDE_DETAILS,
  INTELLIGENCE_BRIEF_SHOW_DETAILS,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import { PATHWAY_IMPACT_LABEL } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligencePathwayImpact";
import { DebriefDetectedContactCard } from "./DebriefDetectedContactCard";

function karenWorkflowContact() {
  return buildProposedContactFromExtraction({
    name: "Karen",
    quote:
      "He mentioned that Karen in his office usually helps coordinate his OR schedule.",
    sourceReference: "test",
    debriefText:
      "He mentioned that Karen in his office usually helps coordinate his OR schedule.",
    index: 0,
    mentionLevel: "workflow_participant",
  });
}

describe("DebriefDetectedContactCard decision disclosure", () => {
  it("collapses embedded decision cards by default with Show details", () => {
    render(
      <DebriefDetectedContactCard
        contact={karenWorkflowContact()}
        organizationId={null}
        embedded
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Karen — Scheduling Coordinator")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: INTELLIGENCE_BRIEF_SHOW_DETAILS })).toBeInTheDocument();
    expect(screen.getByTestId("ai-debrief-contact-review-action")).toHaveTextContent(
      DEBRIEF_REVIEW_CONTACT_ACTION,
    );
    expect(screen.getByText(new RegExp(PATHWAY_IMPACT_LABEL, "i"))).toBeInTheDocument();
    expect(screen.queryByText(/Possible Role:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Evidence:/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: DEBRIEF_WORKFLOW_PARTICIPANT_CREATE })).not.toBeInTheDocument();
  });

  it("expands embedded decision cards to show evidence and actions", () => {
    render(
      <DebriefDetectedContactCard
        contact={karenWorkflowContact()}
        organizationId={null}
        embedded
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: INTELLIGENCE_BRIEF_SHOW_DETAILS }));

    expect(screen.getByRole("button", { name: INTELLIGENCE_BRIEF_HIDE_DETAILS })).toBeInTheDocument();
    expect(screen.getByText(/Possible Role:/i)).toBeInTheDocument();
    expect(screen.getByText(/Evidence:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/He mentioned that Karen in his office usually helps coordinate his OR schedule/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: DEBRIEF_WORKFLOW_PARTICIPANT_CREATE })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: DEBRIEF_WORKFLOW_PARTICIPANT_LINK })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE })).toBeInTheDocument();
  });

  it("keeps non-embedded cards fully expanded without a details toggle", () => {
    render(
      <DebriefDetectedContactCard
        contact={karenWorkflowContact()}
        organizationId={null}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: INTELLIGENCE_BRIEF_SHOW_DETAILS })).not.toBeInTheDocument();
    expect(screen.getByText(/Possible Role:/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: DEBRIEF_WORKFLOW_PARTICIPANT_CREATE })).toBeInTheDocument();
  });
});
