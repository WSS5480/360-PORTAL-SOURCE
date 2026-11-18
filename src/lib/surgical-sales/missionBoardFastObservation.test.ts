import { describe, expect, it } from "vitest";

import { deriveMissionBoardStagePrimaryAction } from "./deriveMissionBoardCardActions";
import {
  buildMissionBoardCasePayload,
  buildMissionBoardObservationCasePayload,
} from "./missionBoardFastObservation";
import { resolveMissionBoardObservationProcedureSuggestions } from "./resolveMissionBoardObservationProcedureSuggestions";
import type { ProviderDirectoryRow } from "./providerDirectory";
import { PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY, emptyProviderCommercialIntelligence } from "./providerCommercialIntelligenceModel";

function baseProvider(overrides: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return {
    id: "p1",
    first_name: "Tony",
    last_name: "Lettuce",
    specialty: "General Surgery",
    primary_organization_name: "Pilot Hospital",
    primary_organization_id: "org-1",
    organization_count: 1,
    additional_organizations_count: 0,
    territory: "TX",
    planning_status: "not_started",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: null,
    relationship_pathway_stage_id: "observe",
    ...overrides,
  };
}

describe("missionBoardFastObservation", () => {
  it("creates a lightweight observation case payload", () => {
    const payload = buildMissionBoardObservationCasePayload({
      providerId: "p1",
      accountId: "org-1",
      caseDate: "2026-06-11",
      procedureType: "Robotic ventral hernia",
      note: "From mission board",
      markComplete: true,
    });

    expect(payload.case_type).toBe("observation");
    expect(payload.account_id).toBe("org-1");
    expect(payload.surgeon_contact_id).toBe("p1");
    expect(payload.case_date).toBe("2026-06-11");
    expect(payload.procedure_type).toBe("Robotic ventral hernia");
    expect(payload.notes).toBe("From mission board");
    expect(payload.status).toBe("completed");
  });

  it("defaults scheduled status when not marked complete", () => {
    const payload = buildMissionBoardObservationCasePayload({
      providerId: "p1",
      accountId: "org-1",
      caseDate: "2026-06-11",
    });

    expect(payload.status).toBe("scheduled");
  });

  it("creates a lightweight product support case payload", () => {
    const payload = buildMissionBoardCasePayload({
      caseType: "product_support",
      providerId: "p1",
      accountId: "org-1",
      caseDate: "2026-06-11",
      procedureType: "Lap chole",
      note: "Coverage case",
      markComplete: true,
    });

    expect(payload.case_type).toBe("product_support");
    expect(payload.status).toBe("draft");
    expect(payload.procedure_type).toBe("Lap chole");
  });

  it("uses fast_observation primary action on observe stage", () => {
    const primary = deriveMissionBoardStagePrimaryAction(baseProvider(), "observe");
    expect(primary.label).toBe("Add Observation");
    expect(primary.kind).toBe("fast_observation");
    expect(primary.href).toContain("case_type=observation");
  });

  it("suggests procedures from provider intelligence", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.clinical.procedure_focus = ["Lap chole"];

    const suggestions = resolveMissionBoardObservationProcedureSuggestions({
      provider_procedure_focus: "Robotic ventral hernia repair",
      provider_ideal_observation_cases: "Complex abdominal wall",
      [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: commercial,
    });

    const labels = suggestions.map((suggestion) => suggestion.label);
    expect(labels).toContain("Robotic ventral hernia repair");
    expect(labels).toContain("Complex abdominal wall reconstruction");
    expect(labels).toContain("Lap chole");
  });

  it("strips commercial interpretation from stored clinical intelligence", () => {
    const suggestions = resolveMissionBoardObservationProcedureSuggestions({
      provider_procedure_focus:
        "Robotic ventral hernia repair · Increasing procedure volume|Abdominal wall reconstruction · Increasing case volume",
    });

    const labels = suggestions.map((suggestion) => suggestion.label);
    expect(labels).toEqual(["Robotic ventral hernia repair", "Abdominal wall reconstruction"]);
    expect(labels.some((label) => /increasing/i.test(label))).toBe(false);
    expect(labels.some((label) => label.includes(" · "))).toBe(false);
  });

  it("rejects commercial meaning labels without procedure entities", () => {
    const suggestions = resolveMissionBoardObservationProcedureSuggestions({
      provider_procedure_focus:
        "Increasing procedure volume|Growing robotic program|Commercial opportunity|Evaluation pathway|Procedure volume supports prioritization",
      provider_ideal_observation_cases: "Inguinal hernia repair",
    });

    const labels = suggestions.map((suggestion) => suggestion.label);
    expect(labels).toEqual(["Inguinal Hernia Repair"]);
  });
});
