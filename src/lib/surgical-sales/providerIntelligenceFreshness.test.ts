import { describe, expect, it } from "vitest";
import {
  FRESHNESS_THRESHOLDS_PRIORITY,
  buildIntelligenceFreshnessReconfirmationQueue,
  resolveIntelligenceFieldFreshness,
  graduatedFreshnessDecay,
} from "./providerIntelligenceFreshness";
import {
  FRESHNESS_THRESHOLDS_PROCEDURE_MIX,
  FRESHNESS_THRESHOLDS_SCHEDULING,
} from "./providerIntelligenceFreshnessDecay";
import { resolveIntelligenceOperationalTrust } from "./providerIntelligenceOperationalTrust";
import { deriveIntelligenceSectionConfidence } from "./providerIntelligenceSectionConfidence";

const sixMonthsAgo = new Date(
  Date.now() - FRESHNESS_THRESHOLDS_PRIORITY.refreshMs - 86400000,
).toISOString();
const nineMonthsAgo = new Date(
  Date.now() - FRESHNESS_THRESHOLDS_PRIORITY.outdatedMs - 86400000,
).toISOString();
const recent = new Date().toISOString();

describe("providerIntelligenceFreshness", () => {
  it("shows Recently validated for fresh priority fields", () => {
    const f = resolveIntelligenceFieldFreshness(
      "provider_observation_coordinator_contact",
      "Jane OR — ext 12",
      {
        source_type: "observation",
        source_label: "Observation",
        updated_at: recent,
        validated_at: recent,
        lifecycle_state: "validated",
      },
    );
    expect(f?.freshnessBadge).toBe("Recently validated");
    expect(f?.confidenceDecay).toBeGreaterThan(0.95);
  });

  it("flags priority credentialing at six months as needs refresh", () => {
    const f = resolveIntelligenceFieldFreshness(
      "provider_observation_credentialing_needed",
      "cleared",
      {
        source_type: "observation",
        source_label: "Observation",
        updated_at: sixMonthsAgo,
        validated_at: sixMonthsAgo,
        lifecycle_state: "validated",
      },
    );
    expect(f?.freshnessTier).toBe("needs_refresh");
    expect(f?.freshnessBadge).toMatch(/Needs refresh/i);
    expect(f?.staleWarning).toBeTruthy();
  });

  it("marks nine-month priority signals as outdated operational", () => {
    const f = resolveIntelligenceFieldFreshness(
      "provider_observation_access_path",
      "via robotics coordinator",
      {
        source_type: "case",
        source_label: "Case 12",
        updated_at: nineMonthsAgo,
        validated_at: nineMonthsAgo,
        lifecycle_state: "validated",
      },
    );
    expect(f?.freshnessTier).toBe("outdated");
    expect(f?.freshnessBadge).toBe("Outdated operational signal");
    expect(f?.confidenceDecay).toBeLessThan(0.6);
  });

  it("decays unvalidated old captures more than recent validated", () => {
    const oldUnvalidated = graduatedFreshnessDecay(
      FRESHNESS_THRESHOLDS_PRIORITY.refreshMs,
      "captured",
      FRESHNESS_THRESHOLDS_PRIORITY,
      false,
    );
    const recentValidated = graduatedFreshnessDecay(0, "validated", FRESHNESS_THRESHOLDS_PRIORITY, true);
    expect(oldUnvalidated).toBeLessThan(recentValidated);
  });

  it("uses field-specific copy for procedure mix past six months", () => {
    const f = resolveIntelligenceFieldFreshness("provider_procedure_focus", "hernia,bariatric", {
      source_type: "observation",
      source_label: "Observation",
      updated_at: sixMonthsAgo,
      validated_at: sixMonthsAgo,
      lifecycle_state: "validated",
    });
    expect(f?.freshnessTier).toBe("needs_refresh");
    expect(f?.staleWarning).toMatch(/procedure mix/i);
    expect(f?.reconfirmationPrompt).toMatch(/procedure/i);
    expect(f?.needsReconfirmation).toBe(true);
  });

  it("flags scheduling cadence before default nine-month refresh", () => {
    const fiveMonthsAgo = new Date(
      Date.now() - FRESHNESS_THRESHOLDS_SCHEDULING.refreshMs - 86400000,
    ).toISOString();
    const f = resolveIntelligenceFieldFreshness(
      "provider_observation_cadence_preference",
      "weekly",
      {
        source_type: "observation",
        source_label: "Observation",
        updated_at: fiveMonthsAgo,
        validated_at: fiveMonthsAgo,
        lifecycle_state: "validated",
      },
    );
    expect(f?.freshnessTier).toBe("needs_refresh");
    expect(f?.staleWarning).toMatch(/cadence/i);
  });

  it("detects OR coordinator updated without revalidation", () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const f = resolveIntelligenceFieldFreshness(
      "provider_observation_coordinator_contact",
      "New coordinator — ext 9",
      {
        source_type: "case",
        source_label: "Case 4",
        validated_at: twoMonthsAgo,
        updated_at: recent,
        lifecycle_state: "validated",
      },
    );
    expect(f?.freshnessTier).toBe("needs_refresh");
    expect(f?.staleWarning).toMatch(/coordinator/i);
    expect(f?.reconfirmationPrompt).toMatch(/coordinator/i);
  });

  it("downgrades operational trust when freshness tier is aging", () => {
    const agingAge = FRESHNESS_THRESHOLDS_PROCEDURE_MIX.agingMs + 10 * 24 * 60 * 60 * 1000;
    const iso = new Date(Date.now() - agingAge).toISOString();
    const freshness = resolveIntelligenceFieldFreshness(
      "provider_procedure_focus",
      "hernia",
      {
        validated_at: iso,
        updated_at: iso,
        source_type: "observation",
        lifecycle_state: "validated",
      },
    );
    expect(freshness?.freshnessTier).toBe("aging");
    const trust = resolveIntelligenceOperationalTrust({
      dbKey: "provider_procedure_focus",
      raw: "hernia",
      lifecycle: freshness,
      freshnessTier: freshness?.freshnessTier,
    });
    expect(trust.tier).toBe("emerging");
  });

  it("builds reconfirmation queue sorted by severity", () => {
    const contact = {
      provider_procedure_focus: "hernia",
      provider_observation_coordinator_contact: "Jane",
      provider_intelligence_field_metadata: {
        provider_procedure_focus: {
          validated_at: nineMonthsAgo,
          updated_at: nineMonthsAgo,
          source_type: "observation",
        },
        provider_observation_coordinator_contact: {
          validated_at: nineMonthsAgo,
          updated_at: nineMonthsAgo,
          source_type: "case",
        },
      },
    };
    const queue = buildIntelligenceFreshnessReconfirmationQueue(
      contact,
      contact.provider_intelligence_field_metadata,
    );
    expect(queue.length).toBeGreaterThan(0);
    expect(queue[0].freshnessTier).toBe("outdated");
    expect(queue[0].revalidateCta).toMatch(/refresh|re-confirm/i);
  });

  it("reduces section confidence when priority workflow signal is outdated", () => {
    const contact = {
      provider_procedure_focus: "hernia,bariatric",
      provider_technique_preferences: "laparoscopic",
      provider_intelligence_field_metadata: {
        provider_procedure_focus: {
          source_type: "observation",
          source_label: "Observation",
          updated_at: nineMonthsAgo,
          validated_at: nineMonthsAgo,
        },
        provider_technique_preferences: {
          source_type: "observation",
          source_label: "Observation",
          updated_at: recent,
          validated_at: recent,
        },
      },
    };
    const result = deriveIntelligenceSectionConfidence("clinical_workflow", contact, {
      fieldMetadata: contact.provider_intelligence_field_metadata,
    });
    expect(result.outdated_signal_count).toBeGreaterThan(0);
    expect(result.confidence).not.toBe("validated");
  });
});
