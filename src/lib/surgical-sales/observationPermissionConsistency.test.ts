import { describe, expect, it } from "vitest";
import { buildProviderOverviewFieldBriefing } from "./buildProviderOverviewFieldBriefing";
import { buildProviderIntelligenceReferenceView } from "./buildProviderIntelligenceReferenceView";
import { buildProviderOverviewMissionCardView } from "./buildProviderOverviewMissionCardView";
import { buildProviderFieldIntelligenceModel } from "./providerFieldIntelligenceModel";
import { buildProviderObservationReadiness } from "./providerObservationReadiness";
import {
  OBSERVATION_PERMISSION_STAGE_LABELS,
  resolveNormalizedObservationPermission,
  resolveObservationPermissionStage,
} from "./observationPermissionModel";
import { resolveObservationStatusFromContact } from "./observationStatus";
import { emptyProviderCommercialIntelligence } from "./providerCommercialIntelligenceModel";

const TOM_SANDY_CONTACT = {
  id: "p1",
  first_name: "Tom",
  last_name: "Sandy",
  provider_observation_feasibility: "interested",
  provider_observation_access_path: "Jennifer coordinates scheduling with the OR team",
  provider_observation_credentialing_needed: "required",
  provider_observation_coordinator_contact: "Jennifer — contact info missing",
  provider_procedure_focus: "Robotic ventral hernia repair",
  provider_intelligence_field_metadata: {
    provider_observation_feasibility: {
      source_type: "intro_call",
      source_engagement_id: "e1",
      updated_at: "2026-06-01T12:00:00Z",
      lifecycle_state: "confirmed",
    },
  },
};

const TOM_SANDY_ENGAGEMENTS = [
  {
    id: "e1",
    engagement_type: "intro_call",
    status: "completed",
    debrief_completed: true,
  },
] as never[];

function collectObservationStatusStrings(input: {
  contact: Record<string, unknown>;
  engagements?: typeof TOM_SANDY_ENGAGEMENTS;
}): string[] {
  const permission = resolveNormalizedObservationPermission({
    contact: input.contact,
    engagements: input.engagements,
  });
  const briefing = buildProviderOverviewFieldBriefing({
    contact: input.contact,
    engagements: input.engagements,
  });
  const reference = buildProviderIntelligenceReferenceView({
    contact: input.contact,
    providerId: "p1",
    engagements: input.engagements,
  });
  const missionCard = buildProviderOverviewMissionCardView({
    contact: input.contact,
    providerId: "p1",
    stageId: "discovery",
    newEngagementHref: "/engagements/new",
    noteHref: "/note",
    intelligenceHref: "/intel",
    engagements: input.engagements,
  });
  const model = buildProviderFieldIntelligenceModel({
    contact: input.contact,
    engagements: input.engagements,
  });
  const readiness = buildProviderObservationReadiness(input.contact);

  return [
    permission.label,
    permission.overviewLabel,
    permission.approvalDetailLabel,
    briefing.accessStatus.observationStatus,
    briefing.accessStatus.approvalStatus,
    reference.accessPermission.find((row) => row.label === "Observation permission")?.value ?? "",
    reference.accessPermission.find((row) => row.label === "Approval detail")?.value ?? "",
    missionCard.observationPermission,
    model.observationApproval.primaryLine,
    readiness.compactObservationAccess,
    resolveObservationStatusFromContact(input.contact, input.engagements),
  ].map((value) => String(value).toLowerCase());
}

describe("observation permission consistency", () => {
  it("resolves stages in priority order", () => {
    expect(resolveObservationPermissionStage({ contact: {} })).toBe("unknown");

    const commercial = emptyProviderCommercialIntelligence();
    commercial.observation.interest = "yes";
    const interested = resolveObservationPermissionStage({
      contact: { provider_commercial_intelligence: JSON.stringify(commercial) },
    });
    expect(interested).toBe("interested");

    const pending = resolveObservationPermissionStage({
      contact: TOM_SANDY_CONTACT,
      engagements: TOM_SANDY_ENGAGEMENTS,
    });
    expect(pending).toBe("permission_not_yet_confirmed");

    const declined = resolveObservationPermissionStage({
      contact: { provider_observation_feasibility: "no" },
    });
    expect(declined).toBe("not_interested");
  });

  it("does not emit contradictory approved vs not-approved strings for Tom Sandy", () => {
    const corpus = collectObservationStatusStrings({
      contact: TOM_SANDY_CONTACT,
      engagements: TOM_SANDY_ENGAGEMENTS,
    }).join(" ");

    expect(corpus).toMatch(/permission requested|pending|interested/i);
    expect(corpus).not.toMatch(/observation approved/i);
    expect(corpus).not.toMatch(/not approved/i);
    expect(corpus).not.toMatch(/interest confirmed — approval pending/i);
    expect(corpus).not.toMatch(/not pursuing observation/i);
  });

  it("uses the same normalized permission label across overview, intelligence, mission, and readiness", () => {
    const permission = resolveNormalizedObservationPermission({
      contact: TOM_SANDY_CONTACT,
      engagements: TOM_SANDY_ENGAGEMENTS,
    });
    const briefing = buildProviderOverviewFieldBriefing({
      contact: TOM_SANDY_CONTACT,
      engagements: TOM_SANDY_ENGAGEMENTS,
    });
    const reference = buildProviderIntelligenceReferenceView({
      contact: TOM_SANDY_CONTACT,
      providerId: "p1",
      engagements: TOM_SANDY_ENGAGEMENTS,
    });
    const missionCard = buildProviderOverviewMissionCardView({
      contact: TOM_SANDY_CONTACT,
      providerId: "p1",
      stageId: "discovery",
      newEngagementHref: "/engagements/new",
      noteHref: "/note",
      intelligenceHref: "/intel",
      engagements: TOM_SANDY_ENGAGEMENTS,
    });

    expect(briefing.accessStatus.observationStatus).toBe(permission.label);
    expect(
      reference.accessPermission.find((row) => row.label === "Observation permission")?.value,
    ).toBe(permission.label);
    expect(missionCard.observationPermission).toBe(permission.overviewLabel);
    expect(briefing.accessStatus.approvalStatus).toBe(permission.approvalDetailLabel);
  });

  it("exposes seven canonical permission states", () => {
    expect(Object.keys(OBSERVATION_PERMISSION_STAGE_LABELS)).toEqual([
      "observation_completed",
      "observation_scheduled",
      "permission_confirmed",
      "permission_not_yet_confirmed",
      "interested",
      "unknown",
      "not_interested",
    ]);
  });
});
