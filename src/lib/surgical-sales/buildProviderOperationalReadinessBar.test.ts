import { describe, expect, it } from "vitest";
import { buildOperationalReadinessSummaryBar } from "./buildProviderOperationalReadinessBar";

describe("buildOperationalReadinessSummaryBar", () => {
  it("builds a scannable one-line summary from unified readiness verdict", () => {
    const result = buildOperationalReadinessSummaryBar({
      contact: {
        provider_observation_feasibility: "easy",
        provider_procedure_focus: "hernia",
      },
    });
    expect(result).not.toBeNull();
    expect(result!.segments[0]).toMatch(
      /Operational picture still developing|Observation possible|Operationally qualified/i,
    );
    expect(result!.line).not.toMatch(/low confidence|partial confidence|CRM|pipeline/i);
    expect(result!.line).toContain("•");
  });

  it("leads with unified verdict label for partially mapped accounts", () => {
    const contact = {
      provider_observation_feasibility: "easy",
      provider_observation_credentialing_needed: "cleared",
      provider_procedure_focus: "hernia repair",
      provider_technique_preferences: "laparoscopic",
    };
    const result = buildOperationalReadinessSummaryBar({ contact });
    expect(result!.segments[0]).toMatch(
      /Observation possible with risk|Operationally qualified|Operational picture still developing/i,
    );
  });

  it("includes pillar scan lines when inputs are thin", () => {
    const result = buildOperationalReadinessSummaryBar({
      contact: {
        provider_observation_feasibility: "easy",
        provider_procedure_focus: "hernia",
      },
    });
    expect(result!.segments.length).toBeGreaterThan(1);
    expect(result!.line.length).toBeGreaterThan(20);
  });

  it("reflects stronger tone when verdict is evaluation-ready", () => {
    const result = buildOperationalReadinessSummaryBar({
      contact: {
        provider_observation_feasibility: "easy|validated_at:2026-01-01",
        provider_observation_access_path: "scheduler|validated_at:2026-01-01",
        provider_observation_coordinator_contact: "Jane OR|validated_at:2026-01-01",
        provider_observation_cadence_preference: "weekly|validated_at:2026-01-01",
        provider_ideal_observation_cases: "lap chole|validated_at:2026-01-01",
        provider_procedure_focus: "hernia|validated_at:2026-01-01",
        provider_technique_preferences: "lap|validated_at:2026-01-01",
        provider_communication_style: "direct|validated_at:2026-01-01",
        influence_level: "high|validated_at:2026-01-01",
        provider_evaluation_openness: "open|validated_at:2026-01-01",
        provider_competitive_products: "incumbent|validated_at:2026-01-01",
        provider_champion_potential: "strong|validated_at:2026-01-01",
        provider_credentialing_status: "cleared|validated_at:2026-01-01",
        provider_current_vendors: "incumbent|validated_at:2026-01-01",
      },
      relationshipStage: "active_relationship",
      opportunities: [{ stage: "evaluation_planned" }],
    });
    expect(["strong", "building"]).toContain(result!.tone);
    expect(result!.segments[0]).toMatch(/Evaluation-ready|Operationally qualified/i);
  });
});
