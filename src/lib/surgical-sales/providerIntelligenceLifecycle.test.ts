import { describe, expect, it } from "vitest";
import {
  buildRevalidationPriorities,
  buildStaleIntelligenceReminders,
  LIFECYCLE_OUTDATED_MS,
  LIFECYCLE_REFRESH_REMINDER_MS,
  resolveIntelligenceFieldLifecycle,
} from "./providerIntelligenceLifecycle";
import { deriveIntelligenceSectionConfidence } from "./providerIntelligenceSectionConfidence";

import { FRESHNESS_THRESHOLDS_PRIORITY } from "./providerIntelligenceFreshness";

const sixMonthsAgo = new Date(
  Date.now() - FRESHNESS_THRESHOLDS_PRIORITY.refreshMs - 86400000,
).toISOString();
const nineMonthsAgo = new Date(
  Date.now() - FRESHNESS_THRESHOLDS_PRIORITY.outdatedMs - 86400000,
).toISOString();
const tenMonthsAgo = new Date(Date.now() - LIFECYCLE_OUTDATED_MS - 86400000).toISOString();

describe("providerIntelligenceLifecycle", () => {
  it("resolves captured vs assumed from signal quality", () => {
    const assumed = resolveIntelligenceFieldLifecycle(
      "provider_communication_style",
      "brief",
    );
    expect(assumed?.state).toBe("assumed");

    const captured = resolveIntelligenceFieldLifecycle(
      "provider_procedure_focus",
      "hernia repair",
      {
        source_type: "profile",
        source_label: "Provider profile",
        updated_at: new Date().toISOString(),
        lifecycle_state: "captured",
      },
    );
    expect(captured?.state).toBe("captured");
  });

  it("marks priority validated signals past six months as needing refresh", () => {
    const lifecycle = resolveIntelligenceFieldLifecycle(
      "provider_observation_credentialing_needed",
      "cleared",
      {
        source_type: "observation",
        source_label: "Observation CASE-12",
        updated_at: sixMonthsAgo,
        validated_at: sixMonthsAgo,
        lifecycle_state: "validated",
      },
    );
    expect(lifecycle?.state).toBe("validated");
    expect(lifecycle?.needsRefresh).toBe(true);
    expect(lifecycle?.refreshLine).toMatch(/may require refresh/i);
    expect(lifecycle?.refreshLine).toMatch(/Vendor approval|Credentialing/i);
  });

  it("decays priority validated signals past nine months to outdated", () => {
    const lifecycle = resolveIntelligenceFieldLifecycle(
      "provider_observation_credentialing_needed",
      "cleared",
      {
        source_type: "observation",
        source_label: "Observation CASE-12",
        updated_at: nineMonthsAgo,
        validated_at: nineMonthsAgo,
        lifecycle_state: "validated",
      },
    );
    expect(lifecycle?.state).toBe("outdated");
    expect(lifecycle?.confidenceMultiplier).toBeLessThan(0.6);
  });

  it("surfaces stale reminders and revalidation priorities", () => {
    const contact = {
      provider_observation_credentialing_needed: "cleared",
      provider_intelligence_field_metadata: {
        provider_observation_credentialing_needed: {
          source_type: "observation",
          source_label: "Observation",
          updated_at: tenMonthsAgo,
          validated_at: tenMonthsAgo,
          lifecycle_state: "validated",
        },
      },
    };
    const reminders = buildStaleIntelligenceReminders(contact, contact.provider_intelligence_field_metadata);
    expect(reminders.length).toBeGreaterThan(0);
    const priorities = buildRevalidationPriorities(contact, contact.provider_intelligence_field_metadata);
    expect(priorities[0]?.dbKey).toBe("provider_observation_credentialing_needed");
  });

  it("lowers section confidence when anchors are outdated", () => {
    const contact = {
      provider_observation_feasibility: "easy",
      provider_observation_credentialing_needed: "cleared",
      provider_ideal_observation_cases: "lap chole",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "intro_call",
          source_label: "Intro Call",
          updated_at: new Date().toISOString(),
          validated_at: new Date().toISOString(),
        },
        provider_observation_credentialing_needed: {
          source_type: "observation",
          source_label: "Observation",
          updated_at: tenMonthsAgo,
          validated_at: tenMonthsAgo,
        },
      },
    };
    const result = deriveIntelligenceSectionConfidence("observation_readiness", contact, {
      fieldMetadata: contact.provider_intelligence_field_metadata,
    });
    expect(result.outdated_signal_count).toBeGreaterThan(0);
    expect(result.confidence).not.toBe("validated");
  });
});
