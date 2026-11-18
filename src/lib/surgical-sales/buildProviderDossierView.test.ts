import { describe, expect, it } from "vitest";
import {
  buildProviderDossierView,
  dossierFieldKeysForSection,
  providerDossierSectionForDbKey,
  PROVIDER_DOSSIER_SECTION_ORDER,
} from "./buildProviderDossierView";
import type { ProviderEngagementSummary } from "./engagements/providerEngagementSummary";

function engagement(partial: Partial<ProviderEngagementSummary>): ProviderEngagementSummary {
  return {
    id: "eng-1",
    engagement_type: "intro_call",
    engagement_type_label: "Intro Call",
    status: "planned",
    status_label: "Planned",
    pre_call_filled: 0,
    pre_call_total: 5,
    pre_call_complete: false,
    outcome_label: "Planned",
    ...partial,
  };
}

describe("buildProviderDossierView", () => {
  it("returns five dossier sections in fixed order", () => {
    const view = buildProviderDossierView({ contact: {}, providerId: "prov-1" });
    expect(view.pageTitle).toBe("Provider Intelligence");
    expect(view.knowledgeCoverage.totalAreas).toBe(8);
    expect(view.knowledgeCoverage.coverageLabel).toMatch(/\/ 8 Areas Captured/);
    expect(view.sections.map((s) => s.id)).toEqual(PROVIDER_DOSSIER_SECTION_ORDER);
    expect(view.sections.every((s) => s.title.endsWith("Intelligence"))).toBe(true);
    expect(view.sections.every((s) => Array.isArray(s.known) && Array.isArray(s.unknown))).toBe(true);
  });

  it("places procedure fields in procedure intelligence with known cards", () => {
    const view = buildProviderDossierView({
      contact: {
        provider_procedure_focus: "Revision TKAs — 8–10 per month",
        provider_intelligence_field_metadata: {
          provider_procedure_focus: {
            source_type: "engagement",
            source_label: "Intro call debrief",
            updated_at: "2026-06-01T12:00:00Z",
            evidence_text: "Heavy revision mix",
          },
        },
      },
      providerId: "prov-1",
      engagements: [engagement({})],
    });

    const procedure = view.sections.find((s) => s.id === "procedure");
    expect(procedure?.known.some((c) => c.label === "Procedures")).toBe(true);
    expect(procedure?.known[0]?.sourceLabel).toMatch(/Intro call/i);
    expect(view.hasAnyKnowledge).toBe(true);
  });

  it("lists unknown signals in the matching dossier section", () => {
    const view = buildProviderDossierView({
      contact: {},
      providerId: "prov-1",
      engagements: [engagement({})],
    });

    const access = view.sections.find((s) => s.id === "access");
    expect(access?.unknown.length).toBeGreaterThan(0);
    expect(access?.confidenceLabel).toBeTruthy();
  });

  it("maps db keys to dossier sections", () => {
    expect(providerDossierSectionForDbKey("provider_procedure_focus")).toBe("procedure");
    expect(providerDossierSectionForDbKey("provider_observation_feasibility")).toBe("access");
    expect(providerDossierSectionForDbKey("provider_or_team_dynamics")).toBe("relationship");
    expect(dossierFieldKeysForSection("facility").length).toBeGreaterThan(5);
  });
});
