import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildProposedContactFromExtraction } from "@/lib/surgical-sales/debriefDetectedContact";
import type { IntelligenceBriefOutcome } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import {
  INTELLIGENCE_BRIEF_HIDE_DETAILS,
  INTELLIGENCE_BRIEF_PRODUCT_NEXT_STEP,
  INTELLIGENCE_BRIEF_PRODUCT_STATUS,
  INTELLIGENCE_BRIEF_SHOW_DETAILS,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import { PATHWAY_IMPACT_LABEL } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligencePathwayImpact";
import { DebriefOutcomeRow } from "./DebriefOutcomeRow";

function productIntelligenceOutcome(
  overrides: Partial<IntelligenceBriefOutcome> = {},
): IntelligenceBriefOutcome {
  return {
    id: "review-product-1",
    kind: "product_intelligence",
    cardIds: ["review-product-1"],
    summaryLine: "Current product identified: Bard Mesh",
    primaryLine: "Bard Mesh",
    statusLine: "Needs confirmation",
    bullets: [],
    evidenceQuotes: ["He is currently using Bard Mesh in a lot of his hernia cases."],
    linkedFieldUpdateIds: [],
    productName: "Bard Mesh",
    productEvidenceStatus: "Needs confirmation",
    productNextValidationStep: "Confirm product usage during observation",
    productImpactLine:
      "Current product usage helps prepare observation strategy and future provider debrief.",
    ...overrides,
  };
}

function clinicalInsightOutcome(
  id: string,
  primaryLine: string,
  overrides: Partial<IntelligenceBriefOutcome> = {},
): IntelligenceBriefOutcome {
  return {
    id,
    kind: "clinical_insight",
    cardIds: [id],
    summaryLine: primaryLine,
    primaryLine,
    subtitle: "Clinical Trend",
    bullets: [],
    evidenceQuotes: [],
    linkedFieldUpdateIds: [],
    pathwayImpactLine: "Volume trend informs prioritization for future engagement.",
    ...overrides,
  };
}

describe("DebriefOutcomeRow clinical insights", () => {
  it("renders Show details on every clinical insight row and expands rows independently", () => {
    render(
      <ul>
        <DebriefOutcomeRow
          outcome={clinicalInsightOutcome(
            "clinical-trend-robotic",
            "Robotic ventral hernia repair · Increasing Procedure Volume",
            {
              evidenceQuotes: [
                "Clinically, he said they have been doing more robotic ventral hernia repairs lately.",
              ],
            },
          )}
          selected
          readOnly={false}
          contact={null}
          organizationId={null}
          proposedContacts={[]}
          onSelectedChange={vi.fn()}
        />
        <DebriefOutcomeRow
          outcome={clinicalInsightOutcome(
            "clinical-trend-abdominal",
            "Abdominal wall reconstruction · Increasing Procedure Volume",
          )}
          selected
          readOnly={false}
          contact={null}
          organizationId={null}
          proposedContacts={[]}
          onSelectedChange={vi.fn()}
        />
      </ul>,
    );

    expect(
      screen.getByText("Robotic ventral hernia repair · Increasing Procedure Volume"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Abdominal wall reconstruction · Increasing Procedure Volume"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getAllByText(new RegExp(PATHWAY_IMPACT_LABEL, "i"))).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: INTELLIGENCE_BRIEF_SHOW_DETAILS })).toHaveLength(2);

    const secondRow = screen.getByTestId("ai-intelligence-brief-outcome-clinical-trend-abdominal");
    fireEvent.click(within(secondRow).getByRole("button", { name: INTELLIGENCE_BRIEF_SHOW_DETAILS }));

    expect(within(secondRow).getByRole("button", { name: INTELLIGENCE_BRIEF_HIDE_DETAILS })).toBeInTheDocument();
    expect(
      screen.getByTestId("ai-intelligence-brief-details-clinical-trend-abdominal"),
    ).toBeInTheDocument();

    const firstRow = screen.getByTestId("ai-intelligence-brief-outcome-clinical-trend-robotic");
    expect(within(firstRow).getByRole("button", { name: INTELLIGENCE_BRIEF_SHOW_DETAILS })).toBeInTheDocument();
    expect(
      screen.queryByTestId("ai-intelligence-brief-details-clinical-trend-robotic"),
    ).not.toBeInTheDocument();
  });
});

describe("DebriefOutcomeRow contact decision merge", () => {
  it("shows the contact disposition actions inline on the contact row without expanding", () => {
    const dictation = "I spoke with Lisa. Lisa is the office manager and handles the scheduling.";
    const contact = buildProposedContactFromExtraction({
      name: "Lisa",
      quote: "Lisa is the office manager and handles the scheduling",
      sourceReference: "debrief",
      debriefText: dictation,
      index: 0,
    });
    const outcome: IntelligenceBriefOutcome = {
      id: "review-contact-lisa",
      kind: "contact",
      cardIds: ["review-contact-lisa"],
      summaryLine: "Lisa — Office Manager, Scheduling Coordinator",
      primaryLine: "Lisa",
      subtitle: "Office Manager, Scheduling Coordinator",
      bullets: [],
      evidenceQuotes: ['"Lisa is the office manager and handles the scheduling"'],
      linkedFieldUpdateIds: [],
      contactId: contact.id,
    };

    render(
      <ul>
        <DebriefOutcomeRow
          outcome={outcome}
          selected
          readOnly={false}
          contact={contact}
          organizationId={null}
          proposedContacts={[contact]}
          onContactsChange={vi.fn()}
          onSelectedChange={vi.fn()}
        />
      </ul>,
    );

    expect(
      screen.getByText("Lisa — Office Manager, Scheduling Coordinator"),
    ).toBeInTheDocument();
    // Disposition actions are part of the contact row itself — no separate
    // decision card and no Show-details click required.
    expect(
      screen.getByRole("button", { name: /review contact|add details|create contact/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /link existing/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip|dismiss/i })).toBeInTheDocument();
  });
});

describe("DebriefOutcomeRow product intelligence", () => {
  it("renders one status pill and one next-step pill without duplicate confirmation badges", () => {
    render(
      <DebriefOutcomeRow
        outcome={productIntelligenceOutcome()}
        selected
        readOnly={false}
        contact={null}
        organizationId={null}
        proposedContacts={[]}
        onSelectedChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Current product identified: Bard Mesh")).toBeInTheDocument();
    expect(screen.getByTestId("ai-brief-chip-status")).toHaveTextContent(
      INTELLIGENCE_BRIEF_PRODUCT_STATUS.needsConfirmation,
    );
    expect(screen.getByTestId("ai-brief-chip-next step")).toHaveTextContent(
      INTELLIGENCE_BRIEF_PRODUCT_NEXT_STEP,
    );
    expect(screen.getAllByText(INTELLIGENCE_BRIEF_PRODUCT_STATUS.needsConfirmation)).toHaveLength(1);
  });
});
