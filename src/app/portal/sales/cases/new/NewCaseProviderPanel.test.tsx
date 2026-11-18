import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  NewCaseProviderContextCard,
  NewCaseProviderPanel,
} from "./NewCaseProviderPanel";
import { minimalProviderContext } from "./newCaseTestFixtures";
import { newCaseLayoutCss } from "./newCaseLayoutCss";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { ProviderIntelligencePreviewForRep } from "./ProviderIntelligencePreviewForRep";
import { buildProviderIntelligenceInsightCards } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { containsOpportunityWording } from "@/lib/surgical-sales/newSurgicalCasePageLogic";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function renderWithLayout(ui: React.ReactElement) {
  return render(
    <>
      <style dangerouslySetInnerHTML={{ __html: newCaseLayoutCss }} />
      {ui}
    </>,
  );
}

describe("NewCaseProviderContextCard", () => {
  it("shows compact provider context without provider search", () => {
    renderWithLayout(
      <NewCaseProviderContextCard
        surgeonId="provider-1"
        providerContext={minimalProviderContext()}
        providerContextBusy={false}
        onChangeProvider={vi.fn()}
        onAddDifferentProvider={vi.fn()}
      />,
    );

    expect(screen.getByRole("region", { name: /provider context/i })).toBeInTheDocument();
    expect(screen.getByText(/preselected/i)).toBeInTheDocument();
    expect(screen.getByText("Alex Surgeon")).toBeInTheDocument();
    expect(screen.queryByText(/search providers/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Provider / surgeon")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /create new provider/i })).not.toBeInTheDocument();
  });

  it("can hide organization when selected in the facility section below", () => {
    renderWithLayout(
      <NewCaseProviderContextCard
        surgeonId="provider-1"
        providerContext={minimalProviderContext()}
        providerContextBusy={false}
        suppressOrganizationLine
        onChangeProvider={vi.fn()}
        onAddDifferentProvider={vi.fn()}
      />,
    );
    expect(screen.queryByText("Metro General")).not.toBeInTheDocument();
  });

  it("shows compact actions and switch provider link instead of full picker", async () => {
    const user = userEvent.setup();
    const onSwitch = vi.fn();
    renderWithLayout(
      <NewCaseProviderContextCard
        surgeonId="provider-1"
        providerContext={minimalProviderContext()}
        providerContextBusy={false}
        onChangeProvider={vi.fn()}
        onAddDifferentProvider={onSwitch}
      />,
    );

    expect(screen.getByRole("link", { name: /open profile/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^change$/i })).toBeInTheDocument();
    expect(screen.queryByText("Add different provider")).not.toBeInTheDocument();
    expect(screen.queryByText("Choose a different provider")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /\+ switch provider/i }));
    expect(onSwitch).toHaveBeenCalledOnce();
  });

  it("shows compact skeleton while provider context loads", () => {
    const { container } = renderWithLayout(
      <NewCaseProviderContextCard
        surgeonId="provider-1"
        providerContext={null}
        providerContextBusy
        onChangeProvider={vi.fn()}
        onAddDifferentProvider={vi.fn()}
      />,
    );

    expect(container.querySelector(".new-case-provider-context-skeleton")).toBeTruthy();
    expect(screen.queryByText(/loading provider profile/i)).not.toBeInTheDocument();
  });

  it("shows specialty and organization on one meta line", () => {
    renderWithLayout(
      <NewCaseProviderContextCard
        surgeonId="provider-1"
        providerContext={minimalProviderContext()}
        providerContextBusy={false}
        onChangeProvider={vi.fn()}
        onAddDifferentProvider={vi.fn()}
      />,
    );

    expect(screen.getByText(/hernia repair · metro general/i)).toBeInTheDocument();
  });
});

describe("NewCaseProviderPanel", () => {
  it("shows full provider search and create link when not in compact launch mode", () => {
    renderWithLayout(
      <NewCaseProviderPanel
        surgeonId=""
        providerSearchQuery=""
        onProviderSearchQueryChange={vi.fn()}
        providerPickOptions={[]}
        providerSearchBusy={false}
        onProviderChange={vi.fn()}
        providerContext={null}
        providerContextBusy={false}
        createProviderHref="/portal/sales/providers/new"
      />,
    );

    expect(screen.getByText("Provider / surgeon")).toBeInTheDocument();
    expect(screen.getByLabelText(/search providers/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create new provider/i })).toBeInTheDocument();
    expect(screen.queryByText(/provider context/i)).not.toBeInTheDocument();
  });

  it("uses opportunity wording in linked opportunities collapsible", () => {
    renderWithLayout(
      <NewCaseProviderPanel
        surgeonId="provider-1"
        providerSearchQuery=""
        onProviderSearchQueryChange={vi.fn()}
        providerPickOptions={[{ id: "provider-1", label: "Alex Surgeon" }]}
        providerSearchBusy={false}
        onProviderChange={vi.fn()}
        providerContext={minimalProviderContext({
          opportunities: [
            {
              id: "init-1",
              account_name: "Metro General",
              product_display: "ACSIS",
            },
          ],
        })}
        providerContextBusy={false}
        createProviderHref="/portal/sales/providers/new"
      />,
    );

    const summary = screen.getByText("Related opportunities (1)");
    expect(summary).toBeInTheDocument();
    expect(containsOpportunityWording(summary.textContent || "")).toBe(true);
    expect(screen.queryByText(OPPORTUNITY_UI.providerTabEmpty)).not.toBeInTheDocument();
  });
});

describe("ProviderIntelligencePreviewForRep", () => {
  it("does not render snake_case labels in the preview", () => {
    const contact = {
      provider_evaluation_openness: "interest_in_acsis_discussed",
      provider_workflow_pain_points: "fit_strength_still_needs_confirmation_in_a_live_case",
    };
    const view = buildProviderIntelligenceInsightCards(contact);
    const allText = view.cards.map((c) => `${c.title} ${c.detail}`).join(" ");

    expect(allText).toMatch(/ACSIS Interest/i);
    expect(allText).not.toMatch(/interest_in_acsis_discussed/);
    expect(allText).not.toMatch(/fit_strength_still_needs_confirmation/);

    render(<ProviderIntelligencePreviewForRep contact={contact} planning={null} />);
    expect(screen.queryByText(/interest_in_acsis_discussed/)).not.toBeInTheDocument();
    expect(screen.getByText("ACSIS Interest")).toBeInTheDocument();
  });
});
