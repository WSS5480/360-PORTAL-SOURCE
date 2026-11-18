/**
 * Discovery Mapping UX regression (component layer).
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React, { type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { providerStageMappingCss } from "./providerStageMappingCss";
import {
  StageMappingQuestionCard,
  createStageMappingContactDraft,
} from "./StageMappingQuestionCard";
import {
  resolvedStageMappingQuestion,
  stageMappingQuestionFixture,
} from "./stageMappingQuestionCardTestFixtures";
import { emptySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";

afterEach(() => {
  cleanup();
});

function renderCard(
  overrides: Partial<ComponentProps<typeof StageMappingQuestionCard>> & {
    question: ComponentProps<typeof StageMappingQuestionCard>["question"];
  },
) {
  const {
    question,
    contact = { provider_relationship_stage: "prospect" },
    selectedChoice = null,
    metadata = {},
    notes = "",
    contactDraft = null,
    contactOptIn = null,
    ...rest
  } = overrides;

  return render(
    <>
      <style dangerouslySetInnerHTML={{ __html: providerStageMappingCss }} />
      <StageMappingQuestionCard
        question={question}
        contact={contact}
        active={false}
        busy={false}
        selectedChoice={selectedChoice}
        metadata={metadata}
        notes={notes}
        contactDraft={contactDraft}
        facilityContactDraft={null}
        contactPool={[]}
        organizationId="org-1"
        providerId="provider-1"
        lastImpactLine={null}
        onChoiceSelect={vi.fn()}
        onChoiceDeselect={vi.fn()}
        onMetadataChange={vi.fn()}
        onNotesChange={vi.fn()}
        onContactDraftChange={vi.fn()}
        onSubmitContact={vi.fn()}
        onSubmitChoice={vi.fn()}
        onContactIntent={vi.fn()}
        evidenceConfidence={null}
        onEvidenceConfidenceChange={vi.fn()}
        evidenceText=""
        onEvidenceTextChange={vi.fn()}
        contactOptIn={contactOptIn}
        {...rest}
      />
    </>,
  );
}

function ContactFlowHarness({
  question,
  contact = { provider_relationship_stage: "prospect" },
  onContactIntentSpy,
}: {
  question: ComponentProps<typeof StageMappingQuestionCard>["question"];
  contact?: Record<string, unknown>;
  onContactIntentSpy?: (intent: "select" | "create" | "skip") => void;
}) {
  const [selectedChoice, setSelectedChoice] = React.useState<string | null>(null);
  const [contactOptIn, setContactOptIn] = React.useState<boolean | null>(null);
  const [contactDraft, setContactDraft] = React.useState(
    null as ComponentProps<typeof StageMappingQuestionCard>["contactDraft"],
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: providerStageMappingCss }} />
      <StageMappingQuestionCard
        question={question}
        contact={contact}
        active
        busy={false}
        selectedChoice={selectedChoice}
        metadata={{}}
        notes=""
        contactDraft={contactDraft}
        facilityContactDraft={null}
        contactPool={[]}
        organizationId="org-1"
        providerId="provider-1"
        lastImpactLine={null}
        onChoiceSelect={setSelectedChoice}
        onChoiceDeselect={() => {
          setSelectedChoice(null);
          setContactOptIn(null);
          setContactDraft(null);
        }}
        onMetadataChange={vi.fn()}
        onNotesChange={vi.fn()}
        onContactDraftChange={setContactDraft}
        onSubmitContact={vi.fn()}
        onSubmitChoice={vi.fn()}
        onContactIntent={(intent) => {
          onContactIntentSpy?.(intent);
          if (intent === "skip") {
            setContactOptIn(false);
            setContactDraft(null);
            return;
          }
          setContactOptIn(true);
          setContactDraft(
            createStageMappingContactDraft({
              signalId: question.signalId as "clinical_champion",
              organizationId: "org-1",
              mode: intent,
            }),
          );
        }}
        evidenceConfidence={null}
        onEvidenceConfidenceChange={vi.fn()}
        evidenceText=""
        onEvidenceTextChange={vi.fn()}
        contactOptIn={contactOptIn}
        forceExpandTick={1}
      />
    </>
  );
}

async function openEditor() {
  const addBtn = screen.queryByRole("button", { name: /Capture finding/i });
  if (addBtn) {
    fireEvent.click(addBtn);
    return;
  }
  const editBtn = screen.queryByRole("button", { name: /Edit finding/i });
  if (editBtn) fireEvent.click(editBtn);
}

describe("StageMappingQuestionCard UX regression", () => {
  it("shows question, answer, status, and actions for captured intelligence", () => {
    const contact = {
      provider_relationship_stage: "prospect",
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          source_label: "Manual mapping",
          updated_at: new Date().toISOString(),
          validated_at: new Date().toISOString(),
          lifecycle_state: "validated",
        },
      },
    };
    const question = resolvedStageMappingQuestion("observation_approval");

    renderCard({ question, contact });

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(question.question);
    expect(screen.getByText(/Observation access approved/i)).toBeInTheDocument();
    expect(screen.queryByText(/Status:/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit finding" })).toBeInTheDocument();
    expect(screen.queryByText("Confidence")).not.toBeInTheDocument();
    expect(screen.queryByText("Still Need")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approved" })).not.toBeInTheDocument();
  });

  it("shows empty state with Capture finding when nothing is captured", () => {
    const question = stageMappingQuestionFixture("observation_approval");
    renderCard({ question });

    expect(screen.getByText("No answer captured yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Capture finding" })).toBeInTheDocument();
  });

  it("shows contact intent gate before the contact selector", async () => {
    const question = stageMappingQuestionFixture("clinical_champion");
    render(<ContactFlowHarness question={question} />);
    await openEditor();

    fireEvent.click(screen.getByRole("button", { name: "Confirmed" }));

    expect(screen.getByText("Who handles this?")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search contacts…")).not.toBeInTheDocument();
  });

  it("shows contact selector only after Select existing contact", async () => {
    const question = stageMappingQuestionFixture("clinical_champion");
    render(<ContactFlowHarness question={question} />);
    await openEditor();

    fireEvent.click(screen.getByRole("button", { name: "Confirmed" }));
    fireEvent.click(screen.getByRole("button", { name: "Select existing contact" }));

    expect(screen.getByPlaceholderText("Search contacts…")).toBeInTheDocument();
    expect(screen.queryByText("First name")).not.toBeInTheDocument();
  });

  it("shows create contact form only after Add new contact", async () => {
    const question = stageMappingQuestionFixture("clinical_champion");
    render(<ContactFlowHarness question={question} />);
    await openEditor();

    fireEvent.click(screen.getByRole("button", { name: "Confirmed" }));
    fireEvent.click(screen.getByRole("button", { name: "Add new contact" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("First name")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search contacts…")).not.toBeInTheDocument();
  });

  it("Not known yet saves Unknown and submits unknown choice", async () => {
    const question = stageMappingQuestionFixture("facility_vendor_pathway");
    const onSubmitChoice = vi.fn();
    const onChoiceSelect = vi.fn();
    const onEvidenceConfidenceChange = vi.fn();

    renderCard({
      question,
      selectedChoice: "path_clear",
      contactOptIn: null,
      active: true,
      forceExpandTick: 1,
      onSubmitChoice,
      onChoiceSelect,
      onEvidenceConfidenceChange,
    });

    fireEvent.click(screen.getByRole("button", { name: "Not known yet" }));

    expect(onEvidenceConfidenceChange).toHaveBeenCalledWith("mentioned_once");
    expect(onChoiceSelect).toHaveBeenCalledWith("unknown");
    expect(onSubmitChoice).toHaveBeenCalledWith("unknown");
  });

  it("routes contact intent through onContactIntent", async () => {
    const question = stageMappingQuestionFixture("clinical_champion");
    const onContactIntent = vi.fn();

    const { unmount: unmountSelect } = render(
      <ContactFlowHarness question={question} onContactIntentSpy={onContactIntent} />,
    );
    await openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Confirmed" }));
    fireEvent.click(screen.getByRole("button", { name: "Select existing contact" }));
    expect(onContactIntent).toHaveBeenCalledWith("select");
    unmountSelect();

    render(<ContactFlowHarness question={question} onContactIntentSpy={onContactIntent} />);
    await openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Confirmed" }));
    fireEvent.click(screen.getByRole("button", { name: "Add new contact" }));
    expect(onContactIntent).toHaveBeenCalledWith("create");
  });

  it("shows scheduling answer and partial status without extra panels", () => {
    const contact = {
      provider_relationship_stage: "prospect",
      provider_observation_scheduling_control: "shared_workflow",
      provider_scheduling_contact: "[Partial lead] Karen\nMentioned coordinating timing with OR scheduling.",
      provider_intelligence_field_metadata: {
        provider_observation_scheduling_control: {
          source_type: "engagement",
          source_label: "Intro Call debrief",
          updated_at: new Date().toISOString(),
          discovery_stance: "needs_validation",
        },
        provider_scheduling_contact: {
          source_type: "engagement",
          source_label: "Intro Call debrief",
          updated_at: new Date().toISOString(),
          discovery_stance: "needs_validation",
        },
      },
    };
    const question = stageMappingQuestionFixture("scheduling_owner", contact);

    renderCard({
      question,
      contact,
      active: true,
    });

    expect(screen.getByText(/Karen may be involved in scheduling/i)).toBeInTheDocument();
    expect(screen.queryByText(/Status:/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Partial")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit finding" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.queryByText("Confidence")).not.toBeInTheDocument();
    expect(screen.queryByText("Still Need")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence")).not.toBeInTheDocument();
  });

  it("shows Karen as a suggested contact lead when editing", async () => {
    const contact = {
      provider_relationship_stage: "prospect",
      provider_observation_scheduling_control: "shared_workflow",
      provider_scheduling_contact: "[Partial lead] Karen",
      provider_intelligence_field_metadata: {
        provider_scheduling_contact: {
          source_type: "engagement",
          source_label: "Intro Call debrief",
          updated_at: new Date().toISOString(),
          discovery_stance: "needs_validation",
        },
      },
    };
    const question = stageMappingQuestionFixture("scheduling_owner", contact);
    const onSuggestedContactLead = vi.fn();

    renderCard({
      question,
      contact,
      active: true,
      forceExpandTick: 1,
      onSuggestedContactLead,
    });

    expect(screen.getByRole("button", { name: "Select Karen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select Karen" }));
    expect(onSuggestedContactLead).toHaveBeenCalledWith(
      "select",
      expect.objectContaining({ name: "Karen" }),
    );
  });

  it("shows partial status without treating partial intelligence as fully confirmed", () => {
    const contact = {
      provider_relationship_stage: "prospect",
      provider_observation_scheduling_control: "shared_workflow",
      provider_scheduling_contact: "[Partial lead] Karen",
      provider_intelligence_field_metadata: {
        provider_observation_scheduling_control: {
          source_type: "engagement",
          source_label: "Intro Call debrief",
          updated_at: new Date().toISOString(),
          discovery_stance: "needs_validation",
        },
      },
    };
    const question = {
      ...stageMappingQuestionFixture("scheduling_owner", contact),
      resolved: false,
      visibilityBucket: "required_now" as const,
    };

    renderCard({
      question,
      contact,
    });

    expect(screen.queryByText("Partial")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Karen was mentioned as a potential scheduling contact/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });
});

describe("RapidDiscoverySupportContactPanel workflow UX", () => {
  it("uses compact role chips instead of a large checkbox list", async () => {
    const { RapidDiscoverySupportContactPanel } = await import("./RapidDiscoverySupportContactPanel");
    const draft = emptySupportContactDraft({
      dbKey: "provider_champion_potential",
      organizationId: "org-1",
      initialMode: "create",
      discoverySignalId: "clinical_champion",
    });

    const { container } = render(
      <RapidDiscoverySupportContactPanel
        dbKey="provider_champion_potential"
        providerId="provider-1"
        organizationId="org-1"
        existingContacts={[]}
        draft={{ ...draft, createStep: 3 }}
        onDraftChange={vi.fn()}
        defaultExpanded
        discoverySignalId="clinical_champion"
      />,
    );

    const workflow = container.querySelector(".rd-support-workflow");
    expect(workflow).not.toBeNull();
    expect(within(workflow as HTMLElement).getByText(/Selected responsibilities/i)).toBeInTheDocument();
    expect(within(workflow as HTMLElement).getByText(/Available responsibilities/i)).toBeInTheDocument();
    expect(within(workflow as HTMLElement).queryByRole("checkbox")).toBeNull();
    expect(container.querySelectorAll(".rd-support-role-chip").length).toBeGreaterThan(0);
  });
});

