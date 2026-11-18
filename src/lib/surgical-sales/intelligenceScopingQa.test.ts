/**
 * QA scenarios for intelligence scoping — representative rep notes and expected layers.
 */
import { describe, expect, it } from "vitest";

import { normalizeExtractedSignals } from "@/lib/surgical-sales/intelligenceSignalPipeline";
import type { ExtractedIntelligenceSignal } from "@/lib/surgical-sales/intelligenceSignalPipeline";
import { noteClearlyProviderSpecific } from "@/lib/surgical-sales/intelligenceMappingGuardrails";
import { resolveIntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeInference";
import {
  formatInheritedOrganizationPrompt,
  resolveInheritedOrganizationDiscovery,
} from "@/lib/surgical-sales/organizationIntelligenceDiscovery";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import { mergeOrganizationInheritanceResolutions } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  resolveDiscoveryScopeForField,
} from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";

const SINAI_SCHEDULER_BASELINE: OrganizationIntelligenceBaseline = {
  organizationId: "org-sinai",
  organizationName: "Sinai Hospital",
  supportContacts: [],
  fields: {
    provider_observation_coordinator_contact: {
      dbKey: "provider_observation_coordinator_contact",
      label: "Observation coordinator",
      value: "sinai|Scheduler at Sinai coordinates observation requests",
      displayLine: "Scheduler at Sinai coordinates observation requests",
      contributorCount: 2,
    },
  },
};

function scopeForNote(
  text: string,
  options?: {
    domain?: ExtractedIntelligenceSignal["domain"];
    logUpdateTarget?: ExtractedIntelligenceSignal["target"];
  },
) {
  return resolveIntelligenceScope({
    text,
    domain: options?.domain ?? null,
    logUpdateTarget: options?.logUpdateTarget ?? null,
  });
}

function pipelineScopeForNote(
  text: string,
  domain: ExtractedIntelligenceSignal["domain"],
  target: ExtractedIntelligenceSignal["target"] = "multiple",
  operationalMeaning?: string,
) {
  const meaning =
    operationalMeaning ??
    `Operational intelligence from the note: ${text.charAt(0).toUpperCase()}${text.slice(1).replace(/\.$/, "")}.`;
  const [signal] = normalizeExtractedSignals([
    {
      domain,
      signal: text.slice(0, 80),
      confidence: "high",
      evidence: text,
      operational_meaning: meaning,
      target,
      reason: "QA scenario",
    },
  ]);
  return signal;
}

describe("Intelligence scoping QA", () => {
  describe('Test 1 — "Sinai uses Vendormate for vendor credentialing."', () => {
    const input = "Sinai uses Vendormate for vendor credentialing.";

    it("maps to organization intelligence", () => {
      expect(scopeForNote(input, { domain: "credentialing" }).scope).toBe("organization");
    });

    it("routes through the signal pipeline as organization scope with a facility credentialing field", () => {
      const signal = pipelineScopeForNote(
        input,
        "credentialing",
        "organization",
        "Vendor credentialing is required for vendor access at this facility.",
      );
      expect(signal?.proposedScope).toBe("organization");
      expect(signal?.proposedDestination).toBe("facility");
      expect(signal?.dbKey).toBe("provider_credentialing_status");
      expect(signal?.persistEligible).toBe(true);
    });
  });

  describe('Test 2 — "Dr. Nace prefers robotic cases and is worried about turnover time."', () => {
    const input = "Dr. Nace prefers robotic cases and is worried about turnover time.";

    it("maps to provider intelligence", () => {
      expect(scopeForNote(input, { domain: "workflow" }).scope).toBe("provider");
    });

    it("does not promote surgeon preferences to organization scope", () => {
      const result = scopeForNote(input, {
        domain: "workflow",
        logUpdateTarget: "organization",
      });
      expect(result.scope).toBe("provider");
    });

    it("routes through the signal pipeline as provider scope", () => {
      const signal = pipelineScopeForNote(
        input,
        "workflow",
        "provider",
        "Dr. Nace prefers robotic cases and is concerned about turnover time during cases.",
      );
      expect(signal?.proposedScope).toBe("provider");
      expect(signal?.dbKey).toMatch(/provider_(technique|workflow|procedure)/);
    });
  });

  describe('Test 3 — "Intro call went well, follow up next week."', () => {
    const input = "Intro call went well, follow up next week.";

    it("maps to case intelligence", () => {
      expect(scopeForNote(input, { domain: "next_steps" }).scope).toBe("case");
    });

    it("does not persist to durable profile fields from the pipeline", () => {
      const signal = pipelineScopeForNote(
        input,
        "next_steps",
        "engagement_note",
        "Intro call went well — follow up is planned for next week on this engagement.",
      );
      expect(signal?.proposedScope).toBe("case");
      expect(signal?.proposedDestination).toBe("engagement_note");
      expect(signal?.dbKey).toBeNull();
      expect(signal?.persistEligible).toBe(false);
    });
  });

  describe('Test 4 — "Scheduler at Sinai coordinates observation requests."', () => {
    const input = "Scheduler at Sinai coordinates observation requests.";

    it("maps to organization intelligence from note wording", () => {
      expect(scopeForNote(input, { domain: "scheduling" }).scope).toBe("organization");
    });

    it("defaults Office / Scheduler discovery lane to organization scope for coordinator fields", () => {
      const discovery = resolveDiscoveryScopeForField(
        "provider_observation_coordinator_contact",
        "scheduler_office",
        input,
      );
      expect(discovery.scope).toBe("organization");
    });

    it("inherits facility scheduler intelligence for other providers at Sinai", () => {
      const inherited = resolveInheritedOrganizationDiscovery(
        "provider_observation_coordinator_contact",
        {},
        SINAI_SCHEDULER_BASELINE,
      );
      expect(inherited.mode).toBe("inherited");
      expect(inherited.baselineField?.displayLine).toBe(
        "Scheduler at Sinai coordinates observation requests",
      );
      expect(formatInheritedOrganizationPrompt("Sinai Hospital", inherited.baselineField!.displayLine)).toBe(
        "Already known from Sinai Hospital: Scheduler at Sinai coordinates observation requests",
      );
    });
  });

  describe('Test 5 — "Dr. Nace\'s scheduler handles his observation requests differently."', () => {
    const input = "Dr. Nace's scheduler handles his observation requests differently.";

    it("detects surgeon-specific scheduling wording", () => {
      expect(noteClearlyProviderSpecific(input)).toBe(true);
    });

    it("maps to provider intelligence (exception), not organization overwrite", () => {
      const result = scopeForNote(input, { domain: "scheduling", logUpdateTarget: "organization" });
      expect(result.scope).toBe("provider");
      expect(result.guardrailApplied).toMatch(/provider|exception|overwrite/i);
    });

    it("stores a provider exception without replacing the Sinai facility baseline", () => {
      const providerValue = "Dr. Nace's scheduler handles his observation requests differently";
      const { metadata, fieldValues } = mergeOrganizationInheritanceResolutions({
        existing: {},
        resolutions: {
          provider_observation_coordinator_contact: {
            stance: "exception",
            provider_value: providerValue,
          },
        },
        captureContext: { source_type: "profile", source_label: "Rapid Discovery" },
        actor: { userId: "u1", userName: "Rep" },
        baseline: SINAI_SCHEDULER_BASELINE,
      });

      expect(fieldValues.provider_observation_coordinator_contact).toBe(providerValue);
      const inheritance = metadata.provider_observation_coordinator_contact?.organization_inheritance;
      expect(inheritance?.stance).toBe("exception");
      expect(inheritance?.facility_display_line).toBe(
        "Scheduler at Sinai coordinates observation requests",
      );
      expect(inheritance?.facility_value).toBe(
        "sinai|Scheduler at Sinai coordinates observation requests",
      );
      expect(SINAI_SCHEDULER_BASELINE.fields.provider_observation_coordinator_contact?.displayLine).toBe(
        "Scheduler at Sinai coordinates observation requests",
      );
    });

    it("skips inherited facility prompt after the provider exception is recorded", () => {
      const contact = {
        provider_observation_coordinator_contact: "Dr. Nace's scheduler handles his observation requests differently",
        provider_intelligence_field_metadata: {
          provider_observation_coordinator_contact: {
            source_type: "profile" as const,
            source_label: "Rapid Discovery",
            updated_at: "2026-05-21T00:00:00.000Z",
            organization_inheritance: {
              stance: "exception" as const,
              facility_display_line: "Scheduler at Sinai coordinates observation requests",
              facility_value: "sinai|Scheduler at Sinai coordinates observation requests",
              resolved_at: "2026-05-21T00:00:00.000Z",
            },
          },
        },
      };
      expect(
        resolveInheritedOrganizationDiscovery(
          "provider_observation_coordinator_contact",
          contact,
          SINAI_SCHEDULER_BASELINE,
        ).mode,
      ).not.toBe("inherited");
    });
  });
});
