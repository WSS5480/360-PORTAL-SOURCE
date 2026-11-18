import { describe, expect, it } from "vitest";

import { buildProviderDiscoveryState } from "./buildProviderDiscoveryState";
import { buildProviderIntelligenceKnowledgeDashboardView } from "./buildProviderIntelligenceKnowledgeDashboardView";
import { buildProviderMissionBoardCardModel } from "./buildProviderMissionBoardCardModel";
import { buildProviderOverviewAccessIntelligence } from "./buildProviderOverviewAccessIntelligence";
import { buildProviderOverviewMissionCardView } from "./buildProviderOverviewMissionCardView";
import { deriveSalesPathwayState } from "./deriveSalesPathwayState";
import type { ProviderDirectoryRow } from "./providerDirectory";
import { discoveryAccessReadyContact, PATHWAY_VALIDATED_FIELD_META } from "./salesPathwayTestFixtures";

const APPROVAL_ONLY_CONTACT: Record<string, unknown> = {
  provider_observation_feasibility: "approved",
  provider_intelligence_field_metadata: {
    provider_observation_feasibility: PATHWAY_VALIDATED_FIELD_META,
  },
};

const DR_APPLE_SAVED_CONTACT = {
  id: "provider-apple",
  first_name: "Michael",
  last_name: "Apple",
  provider_observation_feasibility: "approved",
  provider_observation_access_path:
    "Observation interest: Yes. Observation approval: No. Access path identified: Partial. Blocker: Approval pathway",
  provider_observation_credentialing_needed: "required",
  provider_credentialing_status: "Vendor credentialing required before OR access",
  provider_observation_coordinator_contact: "Karen — contact info missing",
  provider_scheduling_contact: "And Follow appears involved in scheduler on the provider side.",
  provider_intelligence_field_metadata: {
    provider_observation_feasibility: {
      source_type: "intro_call",
      source_label: "Intro call debrief",
      source_engagement_id: "eng-apple-intro",
      lifecycle_state: "validated",
      validated_at: "2026-06-01T12:00:00Z",
      evidence_text: "He gave me approval to come observe cases",
    },
  },
};

const DR_APPLE_ENGAGEMENTS = [
  {
    id: "eng-apple-intro",
    engagement_type: "intro_call",
    status: "completed",
    debrief_completed: true,
    debrief_completed_at: "2026-06-01T14:00:00Z",
    engagement_type_label: "Intro Call",
  },
] as never[];

function baseProvider(overrides: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return {
    id: "p1",
    specialty: "Orthopedics",
    primary_organization_name: "Test Hospital",
    primary_organization_id: "org-1",
    organization_count: 1,
    additional_organizations_count: 0,
    territory: "TX",
    planning_status: "not_started",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: null,
    relationship_pathway_stage_id: "discovery",
    ...overrides,
  };
}

type ParityFixture = {
  name: string;
  contact: Record<string, unknown>;
  providerId: string;
  provider?: ProviderDirectoryRow;
  engagements?: never[];
  cases?: Array<Record<string, unknown>>;
};

const PARITY_FIXTURES: ParityFixture[] = [
  {
    name: "empty contact",
    contact: {},
    providerId: "p-empty",
    provider: baseProvider({ id: "p-empty" }),
  },
  {
    name: "approval only",
    contact: APPROVAL_ONLY_CONTACT,
    providerId: "p-approval",
    provider: baseProvider({
      id: "p-approval",
      relationship_pathway_stage_id: "observe",
      ...APPROVAL_ONLY_CONTACT,
    }),
  },
  {
    name: "dr apple intro intelligence",
    contact: DR_APPLE_SAVED_CONTACT,
    providerId: "provider-apple",
    provider: baseProvider({
      id: "provider-apple",
      first_name: "Michael",
      last_name: "Apple",
      ...DR_APPLE_SAVED_CONTACT,
    }),
    engagements: DR_APPLE_ENGAGEMENTS,
  },
  {
    name: "discovery access ready",
    contact: discoveryAccessReadyContact(),
    providerId: "p-ready",
    provider: baseProvider({
      id: "p-ready",
      relationship_pathway_stage_id: "observe",
      ...discoveryAccessReadyContact(),
    }),
  },
];

describe("buildProviderDiscoveryState", () => {
  it("returns the unified discovery state shape", () => {
    const state = buildProviderDiscoveryState({ contact: APPROVAL_ONLY_CONTACT, providerId: "p1" });

    expect(state).toMatchObject({
      observationInterest: expect.objectContaining({
        known: expect.any(Boolean),
        hasInterestSignal: expect.any(Boolean),
        label: expect.any(String),
      }),
      permissionStage: expect.objectContaining({
        stageId: expect.any(String),
        label: expect.any(String),
      }),
      accessPathway: expect.objectContaining({
        steps: expect.any(Array),
        completionLabel: expect.any(String),
        knownCount: expect.any(Number),
        missingCount: expect.any(Number),
      }),
      accessProgressPercent: expect.any(Number),
      discoveryStage: expect.objectContaining({
        stageId: expect.any(String),
        label: expect.any(String),
      }),
      discoveryReadiness: expect.objectContaining({
        approved: expect.any(Boolean),
        statusLabel: expect.any(String),
      }),
      nextAction: expect.objectContaining({
        label: expect.any(String),
      }),
    });
  });

  describe("cross-surface parity — permission stage and discovery stage", () => {
    it.each(PARITY_FIXTURES)("$name", (fixture) => {
      const provider = fixture.provider ?? baseProvider({ id: fixture.providerId });

      const missionBoardState = buildProviderDiscoveryState({
        contact: fixture.contact,
        providerId: fixture.providerId,
        relationship_pathway_stage_id: provider.relationship_pathway_stage_id,
      });
      const fullContextState = buildProviderDiscoveryState({
        contact: fixture.contact,
        providerId: fixture.providerId,
        engagements: fixture.engagements,
        cases: fixture.cases,
        relationship_pathway_stage_id: provider.relationship_pathway_stage_id,
      });

      const overview = buildProviderOverviewMissionCardView({
        contact: fixture.contact,
        providerId: fixture.providerId,
        stageId: fullContextState.discoveryStage.stageId,
        newEngagementHref: "/engagements/new",
        noteHref: "/note",
        intelligenceHref: `/providers/${fixture.providerId}?tab=intelligence`,
        engagements: fixture.engagements,
        cases: fixture.cases,
      });

      const intelligence = buildProviderIntelligenceKnowledgeDashboardView({
        contact: fixture.contact,
        providerId: fixture.providerId,
        engagements: fixture.engagements,
        cases: fixture.cases,
      });

      const missionBoard = buildProviderMissionBoardCardModel(provider);

      const pathway = deriveSalesPathwayState({
        providerId: fixture.providerId,
        contact: fixture.contact,
        engagements: fixture.engagements,
        cases: fixture.cases,
      });

      const accessIntelligence = buildProviderOverviewAccessIntelligence({
        contact: fixture.contact,
      });
      const permissionRow = accessIntelligence.rows.find((row) => row.id === "observation_status");

      expect(overview.observationPermission).toBe(fullContextState.permissionStage.overviewLabel);
      expect(intelligence.pulse.accessPathwayStatus).toBe(fullContextState.permissionStage.label);
      expect(intelligence.progress.completionPercent).toBe(fullContextState.accessProgressPercent);
      expect(missionBoard.pathwayStageId).toBe(missionBoardState.discoveryStage.stageId);
      expect(pathway.currentStage).toBe(fullContextState.discoveryStage.stageId);

      if (permissionRow?.captured) {
        expect(permissionRow.value).toBe(fullContextState.permissionStage.label);
      }

      if (missionBoard.pathwayStageId === "discovery") {
        expect(missionBoard.stageStatus).toBe(missionBoardState.discoveryReadiness.missionBoardProgressLabel);
      }
    });
  });
});
