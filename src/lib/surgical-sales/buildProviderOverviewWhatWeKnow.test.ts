import { describe, expect, it } from "vitest";
import type { OperationalFieldSignal } from "@/lib/surgical-sales/buildProviderOverviewOperationalSignals";
import {
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY,
  buildProviderOverviewWhatWeKnow,
  flattenWhatWeKnowLines,
} from "./buildProviderOverviewWhatWeKnow";

function signal(
  dbKey: string,
  chipStatus: OperationalFieldSignal["chipStatus"],
): OperationalFieldSignal {
  return {
    id: dbKey,
    label: dbKey,
    shortLabel: dbKey,
    chipStatus,
    severity: chipStatus === "confirmed" ? "confirmed" : "attention",
    group: "access",
    meaning: "test",
    dbKey,
  };
}

function approvedContact(extra: Record<string, unknown> = {}) {
  return {
    provider_observation_feasibility: "approved",
    provider_intelligence_field_metadata: {
      provider_observation_feasibility: {
        source_type: "profile",
        source_label: "Manual",
        updated_at: "2026-05-01T00:00:00.000Z",
        validated_at: "2026-05-01T00:00:00.000Z",
      },
    },
    ...extra,
  };
}

describe("buildProviderOverviewWhatWeKnow", () => {
  it("uses operational categories instead of CRM chip labels", () => {
    const model = buildProviderOverviewWhatWeKnow({
      signalGroups: [
        {
          id: "access",
          label: "Access",
          signals: [
            signal("provider_credentialing_status", "needs_validation"),
            signal("provider_observation_access_path", "needs_validation"),
          ],
        },
      ],
      contact: approvedContact({
        provider_relationship_stage: "prospect",
      }),
      discoveryPhase: "access_mapping",
      engagements: [{ id: "e1", engagement_type: "intro_call", status: "completed" }],
    });

    const lines = flattenWhatWeKnowLines(model);
    expect(lines).not.toContain("Observation history");
    expect(lines).not.toContain("Credentialing");
    expect(lines).not.toContain("OR access");
    expect(lines).not.toContain("Vendor clearance");
    expect(model.validating.some((i) => i.label === WHAT_WE_KNOW_OPERATIONAL_CATEGORY.facilityAccessPathway)).toBe(
      true,
    );
  });

  it("adds compact sub-lines under facility access pathway when validating", () => {
    const model = buildProviderOverviewWhatWeKnow({
      signalGroups: [
        {
          id: "access",
          label: "Access",
          signals: [
            signal("provider_credentialing_status", "needs_validation"),
            signal("provider_observation_access_path", "needs_validation"),
          ],
        },
      ],
      contact: approvedContact(),
      discoveryPhase: "access_mapping",
      engagements: [{ id: "e1", engagement_type: "intro_call", status: "completed" }],
    });

    const access = model.validating.find((i) => i.label === WHAT_WE_KNOW_OPERATIONAL_CATEGORY.facilityAccessPathway);
    expect(access?.subLines?.length).toBeGreaterThan(0);
    expect(access?.subLines?.some((l) => /vendor clearance|OR sponsor/i.test(l))).toBe(true);
  });

  it("maps workflow visibility instead of observation history", () => {
    const model = buildProviderOverviewWhatWeKnow({
      signalGroups: [
        {
          id: "workflow",
          label: "Workflow",
          signals: [signal("observation_history", "not_observed")],
        },
      ],
      contact: {},
      engagements: [{ id: "e1", engagement_type: "intro_call", status: "completed" }],
    });

    const lines = flattenWhatWeKnowLines(model);
    expect(lines).not.toContain("Observation history");
    expect(lines.some((l) => l === WHAT_WE_KNOW_OPERATIONAL_CATEGORY.workflowVisibility)).toBe(true);
  });

  it("confirms hospital affiliation and specialty when on file", () => {
    const model = buildProviderOverviewWhatWeKnow({
      signalGroups: [],
      contact: { specialty: "Orthopedic spine" },
      organizationName: "Metro General",
    });

    expect(model.confirmed.map((i) => i.label)).toContain(WHAT_WE_KNOW_OPERATIONAL_CATEGORY.hospitalAffiliation);
    expect(model.confirmed.map((i) => i.label)).toContain(WHAT_WE_KNOW_OPERATIONAL_CATEGORY.specialtyFocus);
  });
});
