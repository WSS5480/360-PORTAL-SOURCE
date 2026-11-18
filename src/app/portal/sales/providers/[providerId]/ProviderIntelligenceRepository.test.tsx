import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";

import {
  buildProviderDossierGroups,
  ProviderIntelligenceRepository,
} from "@/app/portal/sales/providers/[providerId]/ProviderIntelligenceRepository";
import { emptyProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import { DR_JOHN_HAM_INTRO } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";

const DR_APPLE_CONTACT = {
  provider_observation_feasibility: "approved",
  provider_observation_credentialing_needed: "required",
  provider_credentialing_status: "Vendor credentialing required before OR access",
  provider_observation_coordinator_contact: "Karen — contact info missing",
  provider_intelligence_field_metadata: {
    provider_observation_feasibility: {
      lifecycle_state: "validated",
      validated_at: "2026-06-01T12:00:00Z",
    },
  },
};

describe("ProviderIntelligenceRepository pathway actions", () => {
  it("invokes credentialing drawer when credentialing pathway step is clicked", () => {
    const onExecutePathwayAction = vi.fn();
    render(
      <ProviderIntelligenceRepository
        contact={DR_APPLE_CONTACT}
        providerId="provider-apple"
        onExecutePathwayAction={onExecutePathwayAction}
      />,
    );

    const credentialingButton = screen.getByRole("button", {
      name: /Credentialing path\. Update credentialing/i,
    });
    fireEvent.click(credentialingButton);

    expect(onExecutePathwayAction).toHaveBeenCalledWith({
      kind: "focusedModal",
      modal: "credentialing",
      label: "Update credentialing",
    });
  });

  it("routes first observation gap to Add Observation Case href", () => {
    const onExecutePathwayAction = vi.fn();
    render(
      <ProviderIntelligenceRepository
        contact={DR_APPLE_CONTACT}
        providerId="provider-apple"
        accountId="acct-1"
        onExecutePathwayAction={onExecutePathwayAction}
      />,
    );

    const observationButton = screen.getByRole("button", {
      name: /Observation scheduled\. Add Observation Case/i,
    });
    fireEvent.click(observationButton);

    expect(onExecutePathwayAction).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "href",
        label: "Add Observation Case",
      }),
    );
  });

  it("does not render generic scheduling checklist gaps", () => {
    render(
      <ProviderIntelligenceRepository contact={DR_APPLE_CONTACT} providerId="provider-apple" />,
    );

    expect(screen.queryByText(/Which case should be observed/i)).toBeNull();
    expect(screen.queryByText(/Which date should observation happen/i)).toBeNull();
  });

  it("orders intelligence sections as dossier, gaps, access, relationship map, cases, and timeline", () => {
    const completedCase = {
      id: "case-apple-obs-1",
      case_type: "observation",
      status: "completed",
      live_observation_competitors: "They were using Bard Mesh again",
      live_observation_workflow:
        "There were a couple points where they spent extra time getting a better view before placing fixation",
      live_observation_product_fit:
        "The early opportunity may be around visualization and fixation workflow",
    };

    render(
      <ProviderIntelligenceRepository
        contact={DR_APPLE_CONTACT}
        providerId="provider-apple"
        cases={[completedCase]}
      />,
    );

    const dossier = screen.getByTestId("provider-what-we-know-dossier");
    const timeline = screen.getByTestId("provider-timeline");
    const access = screen.getByTestId("provider-access-pathway");
    const relationship = screen.getByTestId("provider-key-people");
    const caseIntel = screen.getByTestId("provider-case-intelligence-rollup");
    expect(within(caseIntel).getByText(/Observation History/i)).toBeTruthy();
    expect(within(caseIntel).getByText(/Observed Trends/i)).toBeTruthy();
    expect(within(caseIntel).queryByText(/Signals captured/i)).toBeNull();
    expect(within(caseIntel).queryByText(/Still missing/i)).toBeNull();
    expect(within(caseIntel).queryByText(/Bard Mesh was used during the case/i)).toBeNull();
    expect(within(caseIntel).queryByText(/Debrief implication/i)).toBeNull();

    expect(
      dossier.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(timeline).not.toHaveAttribute("open");
    expect(dossier.compareDocumentPosition(access) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(access.compareDocumentPosition(relationship) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(relationship.compareDocumentPosition(caseIntel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(caseIntel.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId("provider-ai-field-brief")).toBeNull();
    expect(screen.queryByTestId("provider-intelligence-reference")).toBeNull();
    expect(screen.queryByTestId("provider-intelligence-evidence")).toBeNull();
  });

  it("places the What We Know dossier above relationship map with no commercial column", () => {
    render(
      <ProviderIntelligenceRepository contact={DR_APPLE_CONTACT} providerId="provider-apple" />,
    );

    const keyPeople = screen.getByTestId("provider-key-people");
    const dossier = screen.getByTestId("provider-what-we-know-dossier");
    expect(
      dossier.compareDocumentPosition(keyPeople) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      dossier.compareDocumentPosition(screen.getByTestId("provider-timeline")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText(/Commercial Meaning/i)).toBeNull();
    expect(screen.queryByTestId("provider-captured-signals")).toBeNull();
  });

  it("renders a concise AI Summary above the dossier", () => {
    render(
      <ProviderIntelligenceRepository
        contact={{
          ...DR_APPLE_CONTACT,
          display_name: "Dr. Apple",
          provider_product_interests: "ACSIS curved design and suction setup compatibility",
        }}
        providerId="provider-apple"
        providerAiSummary={{
          text:
            "Dr. Apple has captured product interest around ACSIS curved design and suction setup compatibility, with observation notes showing Bard Mesh used during a completed observation case. The next sales move is to validate where ACSIS may fit against the workflow and competitor pattern already documented.",
          engagementCount: 0,
          evidenceCount: 2,
          generatedAt: "2026-06-26T00:00:00.000Z",
        }}
        cases={[
          {
            id: "case-apple-obs-1",
            case_type: "observation",
            status: "completed",
            live_observation_competitors: "Bard Mesh was used during the case",
          },
        ]}
      />,
    );

    const summary = screen.getByTestId("provider-ai-summary");
    const summaryDetails = within(summary).getByTestId("provider-ai-summary-details");
    const dossier = screen.getByTestId("provider-what-we-know-dossier");
    expect(summary.compareDocumentPosition(dossier) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(summaryDetails).not.toHaveAttribute("open");
    expect(within(summary).getByText("AI Summary")).toBeTruthy();
    expect(within(summary).getByText(/Dr\. Apple/i)).toBeTruthy();
    expect(within(summary).queryByText(/Engagement history:/i)).toBeNull();
    expect(within(summary).queryByText(/Extracted evidence reviewed:/i)).toBeNull();
    expect(within(summary).queryByText(/Unsupported conclusions/i)).toBeNull();
  });

  it("groups durable provider intelligence into dossier categories without generic takeaways or tasks", () => {
    render(
      <ProviderIntelligenceRepository
        contact={{
          ...DR_APPLE_CONTACT,
          provider_product_interests: "ACSIS curved design and suction setup compatibility",
          provider_workflow_pain_points: "Challenge reaching pooled fluid in tight anatomy",
        }}
        providerId="provider-apple"
        cases={[
          {
            id: "case-apple-obs-1",
            case_type: "observation",
            status: "completed",
            live_observation_competitors: "Bard Mesh was used during the case",
            live_observation_workflow: "Extra visualization time before fixation",
          },
        ]}
      />,
    );

    const dossier = screen.getByTestId("provider-what-we-know-dossier");
    expect(within(dossier).getByText("Products & Preferences")).toBeTruthy();
    expect(within(dossier).getByText("People & Access")).toBeTruthy();
    expect(within(dossier).queryByText("Current Workflow")).toBeNull();
    expect(within(dossier).getByText("Challenges & Friction")).toBeTruthy();
    expect(within(dossier).getByText(/Reaching pooled fluid in tight anatomy/i)).toBeTruthy();
    expect(within(dossier).queryByText("Still Missing")).toBeNull();
    expect(within(dossier).queryByText(/^Potential evaluation pathway$/i)).toBeNull();
    expect(within(dossier).queryByText(/^Observation access opportunity$/i)).toBeNull();
    expect(within(dossier).queryByText(/Identify which products are used/i)).toBeNull();
    expect(within(dossier).getByText(/Provider interest in ACSIS centers on curved design and suction setup compatibility/i)).toBeTruthy();
    expect(within(dossier).queryByText(/Preference and interest:/i)).toBeNull();
    expect(within(dossier).queryByText(/undefined/i)).toBeNull();
    expect(within(dossier).queryByText(/Product interest:/i)).toBeNull();
    expect(within(dossier).queryByText(/Source:/i)).toBeNull();
    expect(within(dossier).queryByRole("button", { name: /View quote/i })).toBeNull();
    expect(
      within(dossier)
        .queryAllByText(/was used during the case/i)
        .filter((node) => !node.closest("details:not([open])")),
    ).toHaveLength(0);
    expect(within(dossier).queryByText(/observation cases complete/i)).toBeNull();
    const peopleCard = within(dossier).getByText("People & Access").closest("article") as HTMLElement;
    expect(within(peopleCard).getAllByText(/Karen/i).filter((node) => !node.closest("details:not([open])"))).toHaveLength(1);
    expect(within(peopleCard).queryByText(/^Contact details incomplete$/i)).toBeNull();
    expect(within(peopleCard).queryByText(/^Contact decision required$/i)).toBeNull();
  });

  it("aggregates repeated workflow observations with observation counts", () => {
    const groups = buildProviderDossierGroups({
      emergingSignals: [
        {
          id: "wf-1",
          text: "Increasing procedure volume.",
          tone: "known",
          evidenceQuote: "They are doing more robotic ventral hernia repair lately.",
        },
        {
          id: "wf-2",
          text: "Robotic ventral hernia repair — volume increasing.",
          tone: "known",
          evidenceQuote: "Seeing larger ventral defects than they were a year ago.",
        },
        {
          id: "wf-3",
          text: "Robotic Ventral and Incisional Hernia repair.",
          tone: "known",
          evidenceQuote: "Mentioned robotic ventral and incisional hernia work.",
        },
      ],
      commercialMeaning: [],
      keyPeople: [],
      caseIntelligence: null,
      evidenceCards: [],
    });

    const workflow = groups.find((group) => group.id === "workflow");
    expect(workflow?.items).toHaveLength(1);
    expect(workflow?.items[0]?.observationCount).toBe(3);
    expect(workflow?.items[0]?.text.toLowerCase()).toMatch(/robotic ventral hernia/);
  });

  it("backfills Ham intro debrief narrative into dossier and follow-ups when CRM fields are sparse", () => {
    const groups = buildProviderDossierGroups({
      emergingSignals: [],
      commercialMeaning: [],
      keyPeople: [{ id: "sarah", name: "Sarah", role: "Scheduling Coordinator", whyTheyMatter: null, missingInfo: null }],
      caseIntelligence: null,
      evidenceCards: [],
      contact: {
        provider_procedure_focus: "General",
        provider_commercial_intelligence: { clinical: { procedures: [], products: [] } },
      },
      engagements: [
        {
          id: "eng-ham",
          engagement_type: "intro_call",
          engagement_type_label: "Intro Call",
          status: "completed",
          status_label: "Completed",
          engagement_date: "2026-07-06",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          briefing_status: "not_started",
          briefing_status_label: "Not Started",
          planning_status: "not_started",
          planning_status_label: "Not Started",
          outcome_label: "Completed",
          debrief_completed: true,
          debrief_completed_at: "2026-07-06T12:00:00.000Z",
          debrief_intelligence_snapshot: {
            start_mission: { live_notes: DR_JOHN_HAM_INTRO },
          },
        },
      ],
    });

    const workflowItems = groups.find((group) => group.id === "workflow")?.items.map((item) => item.text) ?? [];
    const productItems = groups.find((group) => group.id === "products")?.items.map((item) => item.text) ?? [];
    expect(workflowItems.some((text) => /robotic ventral and inguinal hernia/i.test(text))).toBe(true);
    expect(workflowItems.some((text) => /General/i.test(text))).toBe(false);
    expect(productItems.some((text) => /bard/i.test(text))).toBe(true);
    expect(productItems.some((text) => /published outcomes/i.test(text))).toBe(true);
    expect(productItems.some((text) => /bard soft mesh/i.test(text))).toBe(true);
    expect(productItems.some((text) => /him for long|tuesdays and thursdays/i.test(text))).toBe(false);
  });

  it("routes observation case signals into dossier categories instead of dropping them", () => {
    const groups = buildProviderDossierGroups({
      emergingSignals: [
        {
          id: "case-signal-current-product-bard-soft-mesh",
          text: "Current product: Bard Soft Mesh",
          tone: "known",
        },
        {
          id: "case-signal-workflow-friction-regarding-product-flexibility",
          text: "Workflow friction regarding product flexibility",
          tone: "known",
        },
      ],
      commercialMeaning: [],
      keyPeople: [],
      caseIntelligence: null,
      evidenceCards: [],
    });

    expect(groups.find((group) => group.id === "products")?.items.map((item) => item.text)).toEqual([
      "Current product: Bard Soft Mesh.",
    ]);
    expect(groups.find((group) => group.id === "friction")?.items.map((item) => item.text)).toEqual([
      "Workflow friction regarding product flexibility.",
    ]);
  });

  it("aggregates repeated product evidence into one normalized dossier fact", () => {
    const evidenceCards = Array.from({ length: 150 }, (_, index) => ({
      id: `case-product-${index}`,
      icon: "observation" as const,
      title: "Current product",
      dateLabel: `Case ${index + 1}`,
      excerpt: `Case ${index + 1} used Bard Soft Mesh.`,
      whyItMatters: "Current product evidence.",
      intelligenceImpacts: [{ label: "Current product: Bard Soft Mesh", impact: "validated" as const }],
      href: null,
      sourceTypeLabel: "Observation case",
      sourceDateLabel: `Case ${index + 1}`,
      sourceQuote: `Case ${index + 1} used Bard Soft Mesh.`,
    }));
    const groups = buildProviderDossierGroups({
      emergingSignals: [
        {
          id: "generic-pain",
          text: "Pain Point Captured",
          tone: "known",
          evidenceQuote: "The setup caused a delay.",
        },
        {
          id: "generic-clinical-interest",
          text: "Clinical Interest Identified",
          tone: "known",
          evidenceQuote: "Asked about ACSIS.",
        },
      ],
      commercialMeaning: [],
      keyPeople: [],
      caseIntelligence: null,
      evidenceCards,
    });

    const productItems = groups.find((group) => group.id === "products")?.items ?? [];
    expect(productItems).toHaveLength(1);
    expect(productItems[0]?.text).toBe("Current product: Bard Soft Mesh.");
    expect(productItems[0]?.evidenceItems).toHaveLength(150);
    expect(groups.flatMap((group) => group.items.map((item) => item.text))).not.toContain("Pain Point Captured.");
    expect(groups.flatMap((group) => group.items.map((item) => item.text))).not.toContain(
      "Product preference centers on Clinical Interest Identified.",
    );
  });

  it("dedupes repeated product variants and evidence in the provider dossier", () => {
    render(
      <ProviderIntelligenceRepository
        contact={{
          ...DR_APPLE_CONTACT,
          id: "provider-lettuce",
          display_name: "Tom Lettuce",
        }}
        providerId="provider-lettuce"
        cases={[
          {
            id: "case-lettuce-current",
            case_type: "observation",
            status: "completed",
            updated_at: "2026-06-25T12:00:00Z",
            live_observation_competitors: "Current product: Bard Soft Mesh",
            activities: [
              {
                id: "activity-1",
                activity_type: "note",
                body: "Today's ventral hernia repair used Bard Soft Mesh.",
                created_at: "2026-06-25T12:00:00Z",
              },
            ],
          },
        ]}
        universalFactsReadModel={{
          providerRuns: [
            {
              capture_id: "capture-1",
              declared_source_type: "observation_case",
              extraction_model: "test",
              created_at: "2026-06-25T12:00:00Z",
              operational_note_id: "note-1",
              facts: [
                {
                  id: "fact-current",
                  capture_id: "capture-1",
                  concept: "current_product",
                  normalized_label: "Current product: Bard Soft Mesh",
                  assertion_level: "validated",
                  source_type: "observation_case",
                  evidence_text: "Today's ventral hernia repair used Bard Soft Mesh.",
                  confidence: "high",
                  negated: false,
                  uncertain: false,
                  suppressed: false,
                  product_mentioned: "Bard Soft Mesh",
                  case_id: "case-lettuce-current",
                  provider_id: "provider-lettuce",
                  organization_id: null,
                  encounter_id: null,
                  created_at: "2026-06-25T12:00:00Z",
                },
                {
                  id: "fact-competitor",
                  capture_id: "capture-1",
                  concept: "competitor_product",
                  normalized_label: "Competitor product: Bard Soft Mesh",
                  assertion_level: "validated",
                  source_type: "observation_case",
                  evidence_text: "Today's ventral hernia repair used Bard Soft Mesh.",
                  confidence: "high",
                  negated: false,
                  uncertain: false,
                  suppressed: false,
                  product_mentioned: "Bard Soft Mesh",
                  case_id: "case-lettuce-current",
                  provider_id: "provider-lettuce",
                  organization_id: null,
                  encounter_id: null,
                  created_at: "2026-06-25T12:00:00Z",
                },
                {
                  id: "fact-competitor-short",
                  capture_id: "capture-1",
                  concept: "competitor_product",
                  normalized_label: "Competitor product: Bard",
                  assertion_level: "validated",
                  source_type: "observation_case",
                  evidence_text: "Today's ventral hernia repair used Bard Soft Mesh.",
                  confidence: "high",
                  negated: false,
                  uncertain: false,
                  suppressed: false,
                  product_mentioned: "Bard",
                  case_id: "case-lettuce-current",
                  provider_id: "provider-lettuce",
                  organization_id: null,
                  encounter_id: null,
                  created_at: "2026-06-25T12:00:00Z",
                },
                {
                  id: "fact-product-flexibility",
                  capture_id: "capture-1",
                  concept: "competitor_product",
                  normalized_label: "Competitor product: Bard",
                  assertion_level: "validated",
                  source_type: "observation_case",
                  evidence_text:
                    "the surgeon commented he sometimes wishes the mesh had a little more flexibility when positioning it around larger defects.",
                  confidence: "high",
                  negated: false,
                  uncertain: false,
                  suppressed: false,
                  product_mentioned: "Bard",
                  case_id: "case-lettuce-current",
                  provider_id: "provider-lettuce",
                  organization_id: null,
                  encounter_id: null,
                  created_at: "2026-06-25T12:00:00Z",
                },
              ],
            },
          ],
        }}
      />,
    );

    const dossier = screen.getByTestId("provider-what-we-know-dossier");
    const productCard = within(dossier).getByText("Products & Preferences").closest("article") as HTMLElement;
    expect(within(productCard).getByText("Current product: Bard Soft Mesh.")).toBeTruthy();
    expect(within(productCard).queryByText(/Current product picture:/i)).toBeNull();
    expect(within(productCard).queryByText(/Bard is part of the current product mix/i)).toBeNull();
    expect(within(productCard).queryByText(/competitor product on file/i)).toBeNull();
    fireEvent.click(within(productCard).getAllByText(/Evidence/i)[0]);
    expect(within(productCard).getAllByText(/Today's ventral hernia repair used Bard Soft Mesh/i)).toHaveLength(1);
    expect(within(productCard).queryByText(/^Current product: Bard Soft Mesh$/i)).toBeNull();
    expect(within(productCard).queryByText(/surgeon commented.*flexibility.*larger defects/i)).toBeNull();
  });

  it("surfaces saved intro-call current product and product interest under Products", () => {
    render(
      <ProviderIntelligenceRepository
        contact={{
          ...DR_APPLE_CONTACT,
          id: "provider-lettuce-intro",
          display_name: "Tom Lettuce",
          provider_competitive_products: "Bard Soft Mesh — ventral hernia repairs",
          provider_product_interests: "open to new technology if it solves a problem",
          provider_intelligence_field_metadata: {
            provider_competitive_products: {
              evidence_text:
                "Sarah mentioned that Dr. Lettuce currently uses Bard Soft Mesh for most ventral hernia repairs.",
              source_type: "intro_call",
              source_label: "Intro Call",
              updated_at: "2026-06-26T13:30:00Z",
            },
            provider_product_interests: {
              evidence_text:
                "He's usually open to looking at new technology if it solves a problem for him.",
              source_type: "intro_call",
              source_label: "Intro Call",
              updated_at: "2026-06-26T13:30:00Z",
            },
          },
        }}
        providerId="provider-lettuce-intro"
        engagements={[
          {
            id: "intro-lettuce",
            engagement_type: "intro_call",
            engagement_type_label: "Intro Call",
            status: "completed",
            status_label: "Completed",
            pre_call_filled: 0,
            pre_call_total: 0,
            pre_call_complete: false,
            briefing_status: "not_planned",
            briefing_status_label: "Not Started",
            planning_status: "not_planned",
            planning_status_label: "Not Started",
            outcome_label: "Completed",
          },
        ]}
      />,
    );

    const dossier = screen.getByTestId("provider-what-we-know-dossier");
    const productCard = within(dossier).getByText("Products & Preferences").closest("article") as HTMLElement;

    expect(within(productCard).getByText(/Current product: Bard Soft Mesh/i)).toBeTruthy();
    expect(within(productCard).getByText(/open to new technology if it solves a problem/i)).toBeTruthy();
  });

  it("routes facts exactly once across dossier, cases, and timeline", () => {
    render(
      <ProviderIntelligenceRepository
        contact={{
          ...DR_APPLE_CONTACT,
          provider_product_interests: "ACSIS curved design and suction setup compatibility",
          provider_workflow_pain_points: "Challenge reaching pooled fluid in tight anatomy",
          access_notes: "Send clinical data next week. Follow up with Karen.",
        }}
        providerId="provider-apple"
        activityTimeline={[
          {
            id: "activity-1",
            activity_type: "note",
            body: "Field note added with ACSIS interest.",
            created_at: "2026-06-20T12:00:00Z",
          },
        ]}
        cases={[
          {
            id: "case-apple-obs-1",
            case_type: "observation",
            status: "completed",
            live_observation_competitors: "Bard Mesh was used during the case",
            live_observation_workflow: "Extra visualization time before fixation",
          },
        ]}
      />,
    );

    const dossier = screen.getByTestId("provider-what-we-know-dossier");
    const casesSection = screen.getByTestId("provider-case-intelligence-rollup");
    const timeline = screen.getByTestId("provider-timeline");

    expect(within(dossier).getAllByText(/Provider interest in ACSIS/i)).toHaveLength(1);
    expect(within(dossier).getAllByText(/Karen/i).filter((node) => !node.closest("details:not([open])"))).toHaveLength(1);
    expect(within(dossier).queryByText(/send clinical data|follow up/i)).toBeNull();
    expect(within(dossier).queryByText(/observation cases complete|case note captured/i)).toBeNull();
    expect(within(casesSection).getByText(/observation cases complete/i)).toBeTruthy();
    expect(within(dossier).queryByText(/Products used in cases are not confirmed/i)).toBeNull();
    expect(within(timeline).getAllByText(/Field note/i).length).toBeGreaterThan(0);
  });

  it("omits unsupported Top Opportunity and does not summarize access from derived state", () => {
    render(
      <ProviderIntelligenceRepository
        contact={{
          provider_observation_feasibility: "completed",
          provider_observation_credentialing_needed: "cleared",
          provider_credentialing_status: "cleared",
          provider_observation_coordinator_contact: "Karen — 555-0100",
        }}
        providerId="provider-apple"
        providerAiSummary={{
          text:
            "A completed observation case is on file for this provider. Keep the next briefing focused on validating the captured access and scheduling details before making a stronger sales recommendation.",
          engagementCount: 0,
          evidenceCount: 1,
          generatedAt: "2026-06-26T00:00:00.000Z",
        }}
        cases={[{ id: "case-1", case_type: "observation", status: "completed" }]}
      />,
    );

    expect(screen.queryByText(/Top opportunity/i)).toBeNull();
    expect(screen.queryByTestId("provider-access-pathway")).toBeNull();
    const summary = screen.getByTestId("provider-ai-summary");
    expect(within(summary).getByTestId("provider-ai-summary-details")).not.toHaveAttribute("open");
    expect(within(summary).getByTestId("provider-ai-summary-cache-badge")).toHaveTextContent(/0 engagements/i);
    expect(within(summary).queryByText(/Access appears established/i)).toBeNull();
    expect(within(summary).queryByText(/Engagement history/i)).toBeNull();
    expect(within(summary).queryByText(/unknown/i)).toBeNull();
    expect(screen.queryByText("Observation interest")).toBeNull();
    expect(screen.queryByText("Approval confirmed")).toBeNull();
  });

  it("lets known scheduler contact be updated from access pathway", () => {
    const onExecutePathwayAction = vi.fn();
    render(
      <ProviderIntelligenceRepository
        contact={DR_APPLE_CONTACT}
        providerId="provider-apple"
        onExecutePathwayAction={onExecutePathwayAction}
      />,
    );

    const schedulerButton = screen.getByRole("button", {
      name: /Scheduler contact\. Update scheduler/i,
    });
    fireEvent.click(schedulerButton);

    expect(onExecutePathwayAction).toHaveBeenCalledWith({
      kind: "focusedModal",
      modal: "scheduler",
      label: "Update scheduler",
    });
  });

  it("routes observation interest and approval pathway pills to observation status modal", () => {
    const onExecutePathwayAction = vi.fn();
    render(
      <ProviderIntelligenceRepository
        contact={{
          access_notes: "Intro call captured. Discussed ACSIS interest and observation access still needs confirmation.",
        }}
        providerId="provider-apple"
        onExecutePathwayAction={onExecutePathwayAction}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Observation interest\. Update observation status/i,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Approval confirmed\. Update observation status/i,
      }),
    );

    expect(onExecutePathwayAction).toHaveBeenNthCalledWith(1, {
      kind: "focusedModal",
      modal: "observationApproval",
      label: "Update observation status",
    });
    expect(onExecutePathwayAction).toHaveBeenNthCalledWith(2, {
      kind: "focusedModal",
      modal: "observationApproval",
      label: "Update observation status",
    });
  });

  it("reviews candidate support contacts from Key People instead of a top alert", () => {
    const contact = {
      ...DR_APPLE_CONTACT,
      display_name: "Dr. Apple",
      provider_observation_coordinator_contact: "Jennifer — contact info missing",
      provider_commercial_intelligence: {
        ...emptyProviderCommercialIntelligence(),
        candidate_contacts: [
          {
            id: "candidate-jennifer",
            contact_name: "Jennifer",
            contact_role: "Scheduling Coordinator",
            lifecycle: "suggested",
            status: "active",
            source_quote: "Jennifer appears to be involved in scheduling.",
            source_reference: "field-note",
            source_engagement_id: null,
            captured_at: "2026-06-18T12:00:00Z",
            linked_contact_id: null,
            mention_level: "potential_support_contact",
            workflow_role: "scheduler",
          },
        ],
      },
    };

    render(<ProviderIntelligenceRepository contact={contact} providerId="provider-apple" />);

    expect(screen.queryByTestId("pib-candidate-contacts")).toBeNull();
    const keyPeople = screen.getByRole("list", { name: /Key people at this account/i });
    expect(within(keyPeople).getByText("Jennifer")).toBeTruthy();
    expect(within(keyPeople).getByRole("button", { name: /^Accept$/i })).toBeTruthy();
    expect(within(keyPeople).getByRole("button", { name: /Edit & accept/i })).toBeTruthy();
    expect(within(keyPeople).getByRole("button", { name: /Remove/i })).toBeTruthy();
  });

  it("opens compact edit and accept modal instead of support contact drawer", () => {
    server.use(
      http.get("/api/portal/sales/surgical-contacts", () =>
        HttpResponse.json({ ok: true, contacts: [] }),
      ),
    );
    const contact = {
      ...DR_APPLE_CONTACT,
      display_name: "Dr. Apple",
      provider_commercial_intelligence: {
        ...emptyProviderCommercialIntelligence(),
        candidate_contacts: [
          {
            id: "candidate-jennifer",
            contact_name: "Jennifer",
            contact_role: "Scheduling Coordinator",
            lifecycle: "suggested",
            status: "active",
            source_quote: "Jennifer handles all rep scheduling and observation requests.",
            source_reference: "field-note",
            source_engagement_id: null,
            captured_at: "2026-06-18T12:00:00Z",
            linked_contact_id: null,
            mention_level: "potential_support_contact",
            workflow_role: "scheduler",
          },
        ],
      },
    };

    render(
      <ProviderIntelligenceRepository
        contact={contact}
        providerId="provider-apple"
        accountId="org-apple"
        organizationName="Apple Hospital"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Edit & accept/i }));

    const dialog = screen.getByRole("dialog", { name: /Add details for Jennifer/i });
    expect(within(dialog).getByLabelText(/^Name$/i)).toBeTruthy();
    expect(within(dialog).getByLabelText(/Title \/ role/i)).toBeTruthy();
    expect(within(dialog).getByLabelText(/^Email$/i)).toBeTruthy();
    expect(within(dialog).getByLabelText(/^Phone$/i)).toBeTruthy();
    expect(within(dialog).getByLabelText(/^Notes$/i)).toBeTruthy();
    expect(within(dialog).queryByText(/Support contact/i)).toBeNull();
  });

  it("asks only relationship scope before accepting a candidate contact", () => {
    server.use(
      http.get("/api/portal/sales/surgical-contacts", () =>
        HttpResponse.json({ ok: true, contacts: [] }),
      ),
    );
    const contact = {
      ...DR_APPLE_CONTACT,
      display_name: "Dr. Apple",
      provider_commercial_intelligence: {
        ...emptyProviderCommercialIntelligence(),
        candidate_contacts: [
          {
            id: "candidate-jennifer",
            contact_name: "Jennifer",
            contact_role: "Scheduling Coordinator",
            lifecycle: "suggested",
            status: "active",
            source_quote: "Jennifer handles all rep scheduling and observation requests.",
            source_reference: "field-note",
            source_engagement_id: null,
            captured_at: "2026-06-18T12:00:00Z",
            linked_contact_id: null,
            mention_level: "potential_support_contact",
            workflow_role: "scheduler",
          },
        ],
      },
    };

    render(
      <ProviderIntelligenceRepository
        contact={contact}
        providerId="provider-apple"
        accountId="org-apple"
        organizationName="Apple Hospital"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Accept$/i }));

    const dialog = screen.getByRole("dialog", { name: /Save Jennifer where/i });
    expect(dialog).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: /Contact save scope/i })).toBeTruthy();
    expect(screen.getByLabelText(/Provider only/i)).toBeTruthy();
    expect(screen.getByLabelText(/Provider \+ organization/i)).toBeTruthy();
    expect(screen.getByLabelText(/Organization only/i)).toBeTruthy();
    expect(within(dialog).getByText(/Jennifer handles all rep scheduling/i)).toBeTruthy();
    expect(within(dialog).queryByText(/Support contact/i)).toBeNull();
  });

  it("saves accepted candidate using selected relationship scope", async () => {
    const relationshipBodies: Record<string, unknown>[] = [];
    const onProviderUpdated = vi.fn();
    server.use(
      http.get("/api/portal/sales/surgical-contacts", () =>
        HttpResponse.json({ ok: true, contacts: [] }),
      ),
      http.post("/api/portal/sales/surgical-contacts", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body.link_organization_id).toBe("org-apple");
        return HttpResponse.json({
          ok: true,
          contact: {
            id: "support-jennifer",
            first_name: body.first_name,
            last_name: body.last_name,
            title: body.title,
          },
        });
      }),
      http.post("/api/portal/sales/surgical-contact-relationships", async ({ request }) => {
        relationshipBodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, relationship: { id: "rel-1" } });
      }),
      http.patch("/api/portal/sales/providers/:providerId", () =>
        HttpResponse.json({ ok: true, provider: { id: "provider-apple", updated: true } }),
      ),
      http.patch("/api/portal/sales/providers/:providerId/candidate-contacts", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body).toEqual(
          expect.objectContaining({
            candidate_id: "candidate-jennifer",
            action: "confirm",
            linked_contact_id: "support-jennifer",
          }),
        );
        return HttpResponse.json({ ok: true });
      }),
    );
    const contact = {
      ...DR_APPLE_CONTACT,
      display_name: "Dr. Apple",
      provider_commercial_intelligence: {
        ...emptyProviderCommercialIntelligence(),
        candidate_contacts: [
          {
            id: "candidate-jennifer",
            contact_name: "Jennifer",
            contact_role: "Scheduling Coordinator",
            lifecycle: "suggested",
            status: "active",
            source_quote: "Jennifer handles all rep scheduling and observation requests.",
            source_reference: "field-note",
            source_engagement_id: null,
            captured_at: "2026-06-18T12:00:00Z",
            linked_contact_id: null,
            mention_level: "potential_support_contact",
            workflow_role: "scheduler",
          },
        ],
      },
    };

    render(
      <ProviderIntelligenceRepository
        contact={contact}
        providerId="provider-apple"
        accountId="org-apple"
        organizationName="Apple Hospital"
        onProviderUpdated={onProviderUpdated}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Accept$/i }));
    fireEvent.click(screen.getByLabelText(/Provider \+ organization/i));
    fireEvent.click(screen.getByRole("button", { name: /Accept contact/i }));

    await waitFor(() => expect(onProviderUpdated).toHaveBeenCalledWith({ id: "provider-apple", updated: true }));
    expect(relationshipBodies[0]).toEqual(
      expect.objectContaining({
        primary_contact_id: "provider-apple",
        related_contact_id: "support-jennifer",
        ownership_type: "shared",
      }),
    );
  });

  it("shows candidate-only contact mentions in Key People", () => {
    const contact = {
      ...DR_APPLE_CONTACT,
      provider_commercial_intelligence: {
        ...emptyProviderCommercialIntelligence(),
        candidate_contacts: [
          {
            id: "candidate-lisa",
            contact_name: "Lisa",
            contact_role: "Credentialing Contact",
            lifecycle: "mentioned",
            status: "active",
            source_quote: "Lisa handles credentialing for the OR.",
            source_reference: "field-note",
            source_engagement_id: null,
            captured_at: "2026-06-18T12:00:00Z",
            linked_contact_id: null,
            mention_level: "workflow_participant",
            workflow_role: "credentialing",
          },
        ],
      },
    };

    render(<ProviderIntelligenceRepository contact={contact} providerId="provider-apple" />);

    const keyPeople = screen.getByRole("list", { name: /Key people at this account/i });
    expect(within(keyPeople).getByText("Lisa")).toBeTruthy();
    expect(within(keyPeople).queryByText(/Lisa handles credentialing/i)).not.toBeVisible();
    fireEvent.click(within(keyPeople).getAllByText("Evidence")[0]!);
    expect(within(keyPeople).getByText(/Lisa handles credentialing/i)).toBeVisible();
    expect(within(keyPeople).getByRole("button", { name: /^Accept$/i })).toBeTruthy();
  });

  it("renders follow-up items from completed engagements with completion toggles", () => {
    render(
      <ProviderIntelligenceRepository
        contact={DR_APPLE_CONTACT}
        providerId="provider-apple"
        engagements={[
          {
            id: "eng-intro-1",
            engagement_type: "intro_call",
            engagement_type_label: "Intro Call",
            status: "completed",
            status_label: "Completed",
            engagement_date: "2026-07-06",
            pre_call_filled: 0,
            pre_call_total: 0,
            pre_call_complete: false,
            briefing_status: "not_started",
            briefing_status_label: "Not Started",
            planning_status: "not_started",
            planning_status_label: "Not Started",
            outcome_label: "Completed",
            debrief_completed: true,
            debrief_completed_at: "2026-07-06T12:00:00.000Z",
            follow_up_tasks:
              "Share comparative clinical data and schedule observation case\nEmail proposed observation dates",
          },
        ]}
      />,
    );

    const section = screen.getByTestId("provider-follow-up-items");
    expect(within(section).getByText("Follow-up Items")).toBeTruthy();
    expect(within(section).getByText("Share comparative clinical data and schedule observation case")).toBeTruthy();
    expect(within(section).getByText("Email proposed observation dates")).toBeTruthy();
    expect(within(section).getAllByRole("checkbox")).toHaveLength(2);
  });

});
