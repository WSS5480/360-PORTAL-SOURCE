import { describe, expect, it } from "vitest";

import {
  buildProviderCommandHeaderChips,
  buildProviderCommandHeaderView,
  PROVIDER_COMMAND_HEADER_CHIP_MAX_LABEL_LENGTH,
  PROVIDER_COMMAND_HEADER_MAX_CHIPS,
  resolveProviderCommandHeaderPrimaryAction,
} from "./buildProviderCommandHeaderView";
import { buildProviderObservationCaseHref } from "./providerDirectoryLinks";

const DR_APPLE_CONTACT = {
  id: "provider-apple",
  first_name: "John",
  last_name: "Apple",
  provider_observation_feasibility: "approved",
  provider_procedure_focus:
    "Robotic ventral hernia repair · Increasing procedure volume|Abdominal wall reconstruction · Increasing procedure volume",
  provider_competitive_products: "Bard Mesh — needs confirmation during observation",
  provider_intelligence_field_metadata: {
    provider_observation_feasibility: {
      source_type: "intro_call",
      lifecycle_state: "validated",
      validated_at: "2026-06-01T12:00:00Z",
      evidence_text: "He gave me approval to come observe cases",
    },
    provider_procedure_focus: {
      source_type: "intro_call",
      lifecycle_state: "confirmed",
      evidence_text:
        "Clinically, he said they have been doing more robotic ventral hernia repairs lately and are seeing more abdominal wall reconstruction cases than they used to.",
    },
    provider_competitive_products: {
      source_type: "intro_call",
      lifecycle_state: "captured",
      evidence_text: "He is currently using Bard Mesh in a lot of his hernia cases",
    },
  },
};

const DR_APPLE_ENGAGEMENTS = [
  {
    id: "eng-apple-intro",
    engagement_type: "intro_call",
    status: "completed",
    debrief_completed: true,
  },
] as never[];

const DR_APPLE_COMPLETED_CASE = {
  id: "case-apple-obs-1",
  case_type: "observation",
  status: "completed",
  surgeon_contact_id: "provider-apple",
  live_observation_competitors: "They were using Bard Mesh again",
  live_observation_workflow:
    "There were a couple points where they spent extra time getting a better view before placing fixation",
  live_observation_product_fit:
    "The early opportunity may be around visualization and fixation workflow",
};

describe("buildProviderCommandHeaderView", () => {
  it("surfaces Dr. Apple field execution header chips and Add Observation Case CTA", () => {
    const view = buildProviderCommandHeaderView({
      contact: DR_APPLE_CONTACT,
      providerId: "provider-apple",
      accountId: "account-test-hospital",
      organizationName: "Test Hospital",
      specialty: "General Surgery",
      relationshipStage: "early_discovery",
      engagements: DR_APPLE_ENGAGEMENTS,
      cases: [DR_APPLE_COMPLETED_CASE],
      newEngagementHref: "/portal/sales/engagements/new?provider_id=provider-apple",
    });

    expect(view.metaSubtitle).toBe("Test Hospital · General");
    expect(view.chips.map((chip) => chip.label)).toEqual([
      "Observation Ready",
      "1 of 5 observations",
      "Bard Mesh observed",
    ]);
    expect(view.chips.length).toBeLessThanOrEqual(PROVIDER_COMMAND_HEADER_MAX_CHIPS);
    expect(view.chips.every((chip) => chip.label.length <= PROVIDER_COMMAND_HEADER_CHIP_MAX_LABEL_LENGTH)).toBe(
      true,
    );
    expect(view.overflowChipCount).toBe(0);
    expect(view.primaryAction).toEqual({
      label: "Add Observation Case",
      kind: "href",
      href: buildProviderObservationCaseHref({
        providerId: "provider-apple",
        accountId: "account-test-hospital",
      }),
    });
  });

  it("routes permission-pending providers to Update Permission", () => {
    const action = resolveProviderCommandHeaderPrimaryAction({
      contact: { provider_observation_feasibility: "pending" },
      providerId: "provider-apple",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=provider-apple",
    });

    expect(action).toEqual({
      label: "Update Permission",
      kind: "openObservationApproval",
    });
  });

  it("routes in-progress observation cases with notes to Continue Observation Case", () => {
    const action = resolveProviderCommandHeaderPrimaryAction({
      contact: DR_APPLE_CONTACT,
      providerId: "provider-apple",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=provider-apple",
      cases: [
        {
          id: "case-active",
          case_type: "observation",
          status: "confirmed",
          live_observation_competitors: "Bard Mesh in use",
        },
      ],
    });

    expect(action.label).toBe("Continue Observation Case");
    expect(action.kind).toBe("href");
    expect(action.href).toMatch(/\/portal\/sales\/cases\/case-active/);
  });

  it("keeps only compact status chips and excludes long intelligence sentences", () => {
    const { chips, overflowChipCount } = buildProviderCommandHeaderChips({
      momentum: {
        state: "observation_ready",
        label: "Observation Ready",
        tone: "brand",
        summary: "",
        drivers: [],
      },
      completedObservations: 4,
      caseRollup: {
        visible: true,
        completedCount: 4,
        productEvidence: { emergingSignalLabel: "Bard Mesh observed" },
        emergingCaseSignals: [
          "Extra time was spent improving visualization before fixation across 4 completed cases",
        ],
      } as never,
      biggestUnknown: "Watch whether staff still need to verify product availability before cases start",
      topOpportunity: "Visualization/fixation workflow opportunity across completed cases",
      observationPathwayActive: true,
    });

    expect(chips.map((chip) => chip.label)).toEqual([
      "Observation Ready",
      "4 of 5 observations",
      "Bard Mesh observed",
    ]);
    expect(chips.length).toBeLessThanOrEqual(PROVIDER_COMMAND_HEADER_MAX_CHIPS);
    expect(chips.every((chip) => chip.label.length <= PROVIDER_COMMAND_HEADER_CHIP_MAX_LABEL_LENGTH)).toBe(
      true,
    );
    expect(chips.some((chip) => chip.tone === "warn")).toBe(false);
    expect(chips.some((chip) => /visualization|Watch whether|unknown/i.test(chip.label))).toBe(false);
    expect(overflowChipCount).toBe(0);
  });

  it("omits early discovery momentum chip when relationship stage already labels the account", () => {
    const { chips } = buildProviderCommandHeaderChips({
      momentum: {
        state: "early_discovery",
        label: "Early Discovery",
        tone: "neutral",
        summary: "",
        drivers: [],
      },
      completedObservations: 0,
      caseRollup: { visible: false, completedCount: 0 } as never,
      biggestUnknown: null,
      topOpportunity: null,
      observationPathwayActive: false,
    });

    expect(chips.map((chip) => chip.label)).not.toContain("Early Discovery");
  });

  it("caps header chips when many compact status signals are available", () => {
    const { chips } = buildProviderCommandHeaderChips({
      momentum: {
        state: "adoption_building",
        label: "Adoption Building",
        tone: "success",
        summary: "",
        drivers: [],
      },
      completedObservations: 5,
      caseRollup: {
        visible: true,
        completedCount: 5,
        productEvidence: { emergingSignalLabel: "Bard Mesh observed" },
        emergingCaseSignals: ["Signal A", "Signal B", "Signal C"],
      } as never,
      biggestUnknown: "Gap one",
      topOpportunity: "Gap two",
      observationPathwayActive: true,
    });

    expect(chips.length).toBe(PROVIDER_COMMAND_HEADER_MAX_CHIPS);
  });
});
