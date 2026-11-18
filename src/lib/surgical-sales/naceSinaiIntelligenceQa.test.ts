/**
 * QA — James Nace @ Sinai Hospital log-update scenario.
 */
import { describe, expect, it } from "vitest";
import { buildProviderIntelligenceScopeDisplay } from "@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay";
import {
  buildIntelligenceSaveConfirmationGroups,
  buildLogUpdateIntelligenceSaveConfirmation,
} from "@/lib/surgical-sales/intelligenceSaveConfirmation";
import {
  applyIntelligencePipelineToMapping,
  normalizeExtractedSignals,
} from "@/lib/surgical-sales/intelligenceSignalPipeline";
import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import { fieldScanSummaryLine } from "@/lib/surgical-sales/intelligenceSectionScanView";
import {
  formatInheritedOrganizationPrompt,
  resolveInheritedOrganizationDiscovery,
} from "@/lib/surgical-sales/organizationIntelligenceDiscovery";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import { parseLogUpdateFreeform } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { INTELLIGENCE_SAVE_DESTINATION_CONFIRMATION_HEADINGS } from "@/lib/surgical-sales/intelligenceSaveDestination";

export const NACE_SINAI_NOTE =
  "Talked with Dr. Nace. He seems open to future workflow discussion. Most of his cases are robotic colorectal. Scheduler said vendor credentialing is required before observation, and mornings are easier for case access.";

const NACE_CTX = {
  providerId: "prov-james-nace",
  providerLabel: "James Nace",
  organizationId: "org-sinai",
  organizationLabel: "Sinai Hospital",
  engagementId: "eng-intro-call",
  engagementTypeLabel: "Intro call",
};

const SINAI_FACILITY_BASELINE: OrganizationIntelligenceBaseline = {
  organizationId: "org-sinai",
  organizationName: "Sinai Hospital",
  supportContacts: [],
  fields: {
    provider_observation_credentialing_needed: {
      dbKey: "provider_observation_credentialing_needed",
      label: "Credentialing required",
      value: "yes|Vendor credentialing required",
      displayLine: "Vendor credentialing required",
      contributorCount: 3,
    },
    provider_observation_access_path: {
      dbKey: "provider_observation_access_path",
      label: "OR access path",
      value: "morning|Morning observation access may be easier",
      displayLine: "Morning observation access may be easier",
      contributorCount: 2,
    },
    provider_observation_coordinator_contact: {
      dbKey: "provider_observation_coordinator_contact",
      label: "Observation coordinator",
      value: "scheduler|Scheduler involved in observation coordination",
      displayLine: "Scheduler involved in observation coordination",
      contributorCount: 2,
    },
  },
};

/** Simulated OpenAI operational_signals with proper synthesis (not raw passthrough). */
function naceOpenAiMapping(): LogUpdateOpenAiMapping {
  return applyIntelligencePipelineToMapping({
    summary:
      "Facility access runs through vendor credentialing and scheduler coordination; mornings may be easier. Dr. Nace is open to workflow discussion with a robotic colorectal case mix.",
    operational_signals: [
      {
        domain: "credentialing",
        signal: "Vendor credentialing gate",
        confidence: "high",
        evidence: "Scheduler said vendor credentialing is required before observation.",
        operational_meaning:
          "Vendor credentialing is required before observation cases can be scheduled at this facility.",
        save_target: "organization",
        reasoning: "Facility credentialing rule stated by scheduler.",
      },
      {
        domain: "scheduling",
        signal: "Morning access window",
        confidence: "medium",
        evidence: "Mornings are easier for case access.",
        operational_meaning:
          "Morning observation access may be easier when coordinating case access at this facility.",
        save_target: "organization",
        reasoning: "Scheduling pattern affects facility observation logistics.",
      },
      {
        domain: "scheduling",
        signal: "Scheduler coordination",
        confidence: "high",
        evidence: "Scheduler said vendor credentialing is required before observation.",
        operational_meaning:
          "Scheduler is involved in observation coordination and access decisions at this facility.",
        save_target: "organization",
        reasoning: "Scheduler named as coordination path.",
      },
      {
        domain: "evaluation",
        signal: "Workflow discussion openness",
        confidence: "medium",
        evidence: "He seems open to future workflow discussion.",
        operational_meaning:
          "Dr. Nace appears open to future workflow discussion and evaluation-oriented conversations.",
        save_target: "provider",
        reasoning: "Surgeon-specific evaluation posture.",
      },
      {
        domain: "case_mix",
        signal: "Robotic colorectal focus",
        confidence: "high",
        evidence: "Most of his cases are robotic colorectal.",
        operational_meaning:
          "Case mix is predominantly robotic colorectal procedures for this surgeon.",
        save_target: "provider",
        reasoning: "Procedure mix is surgeon-specific.",
      },
      {
        domain: "next_steps",
        signal: "Intro touch narrative",
        confidence: "high",
        evidence: NACE_SINAI_NOTE,
        operational_meaning:
          "Intro call captured — relationship and access context noted for this engagement.",
        save_target: "engagement",
        reasoning: "Visit narrative for this touch only.",
      },
    ],
    confirmed_updates: [],
    partial_updates: [],
    still_to_validate: [],
    recommended_next_moves: [],
    do_not_update: [],
    confidence: "high",
    reasoning: "NACE Sinai QA fixture.",
    source_scope: "provider_visit",
  });
}

function groupByDestination(updates: { proposedDestination: string; label: string; proposedValue: string }[]) {
  const groups: Record<string, string[]> = {
    facility: [],
    provider: [],
    engagement_note: [],
    case: [],
  };
  for (const u of updates) {
    const key =
      u.proposedDestination === "facility"
        ? "facility"
        : u.proposedDestination === "provider"
          ? "provider"
          : u.proposedDestination === "engagement_note"
            ? "engagement_note"
            : "case";
    groups[key].push(`${u.label}: ${u.proposedValue}`);
  }
  return groups;
}

describe("James Nace @ Sinai — intelligence QA", () => {
  describe("keyword routing (log update fallback)", () => {
    it("routes facility vs provider fields from the rep note", () => {
      const parsed = parseLogUpdateFreeform(NACE_SINAI_NOTE, NACE_CTX, {});
      expect(parsed.usesProviderIntelligence).toBe(true);
      expect(parsed.saveAsNoteAccepted).toBe(true);
      expect(parsed.sourceText).toBe(NACE_SINAI_NOTE);

      const byDest = groupByDestination(parsed.fieldUpdates);
      const facilityKeys = parsed.fieldUpdates
        .filter((u) => u.proposedDestination === "facility")
        .map((u) => u.dbKey);
      const providerKeys = parsed.fieldUpdates
        .filter((u) => u.proposedDestination === "provider")
        .map((u) => u.dbKey);

      expect(facilityKeys).toEqual(
        expect.arrayContaining([
          "provider_observation_credentialing_needed",
          "provider_observation_coordinator_contact",
          "provider_observation_access_path",
        ]),
      );
      expect(providerKeys).toEqual(
        expect.arrayContaining([
          "provider_procedure_focus",
          "provider_technique_preferences",
          "provider_evaluation_openness",
        ]),
      );

      const cred = parsed.fieldUpdates.find(
        (u) => u.dbKey === "provider_observation_credentialing_needed",
      );
      expect(cred?.proposedScope).toBe("organization");
      expect(cred?.proposedDestination).toBe("facility");

      const technique = parsed.fieldUpdates.find((u) => u.dbKey === "provider_technique_preferences");
      expect(technique?.proposedScope).toBe("provider");
      expect(technique?.proposedDestination).toBe("provider");
      expect(technique?.proposedValue).toMatch(/robotic/i);

      const procedure = parsed.fieldUpdates.find((u) => u.dbKey === "provider_procedure_focus");
      expect(procedure?.proposedValue).toMatch(/colorectal|robotic/i);

      const coordinator = parsed.fieldUpdates.find(
        (u) => u.dbKey === "provider_observation_coordinator_contact",
      );
      expect(coordinator?.proposedScope).toBe("organization");
      expect(coordinator?.proposedDestination).toBe("facility");
      expect(coordinator?.proposedValue).toMatch(/scheduler/i);

      expect(byDest.facility.length).toBeGreaterThanOrEqual(2);
      expect(byDest.provider.length).toBeGreaterThanOrEqual(2);
    });

    it("does not frame still-worth-confirming gaps as failures", () => {
      const parsed = parseLogUpdateFreeform(NACE_SINAI_NOTE, NACE_CTX, {});
      const gapText = parsed.intelligenceReview.stillWorthConfirming.join(" ").toLowerCase();
      expect(gapText).not.toMatch(/\bfailure\b|\bmissing\b|\bblocker\b|\bnot ready\b/);
      const scanLine = fieldScanSummaryLine("provider_evaluation_openness");
      expect(scanLine).toMatch(/still learning/i);
      expect(scanLine).not.toMatch(/\bunclear\b|\bfailed\b/i);
    });
  });

  describe("OpenAI pipeline (synthesized operational_signals)", () => {
    it("maps expected facility, provider, and engagement saves", () => {
      const mapping = naceOpenAiMapping();
      const signals = normalizeExtractedSignals(mapping.operational_signals ?? []);

      const facility = signals.filter((s) => s.proposedDestination === "facility");
      const provider = signals.filter((s) => s.proposedScope === "provider");
      const engagement = signals.filter((s) => s.proposedDestination === "engagement_note");

      expect(facility.length).toBeGreaterThanOrEqual(2);
      expect(provider.length).toBeGreaterThanOrEqual(2);
      expect(engagement.length).toBe(1);

      expect(
        facility.some((s) => s.operational_meaning.toLowerCase().includes("credentialing")),
      ).toBe(true);
      expect(facility.some((s) => s.operational_meaning.toLowerCase().includes("morning"))).toBe(
        true,
      );
      expect(facility.some((s) => s.operational_meaning.toLowerCase().includes("scheduler"))).toBe(
        true,
      );
      expect(provider.some((s) => s.operational_meaning.toLowerCase().includes("workflow"))).toBe(
        true,
      );
      expect(provider.some((s) => s.operational_meaning.toLowerCase().includes("colorectal"))).toBe(
        true,
      );

      expect(engagement[0]?.durability).toBe("engagement_specific");
      expect(engagement[0]?.source).toContain("Talked with Dr. Nace");

      for (const s of signals) {
        expect(s.synthesis.displayEligible).toBe(true);
        expect(s.source).not.toBe(s.operational_meaning);
      }
    });

    it("builds post-save confirmation groups matching expected headings", () => {
      const parsed = parseLogUpdateFreeform(NACE_SINAI_NOTE, NACE_CTX, {});
      const logUpdateGroups = buildLogUpdateIntelligenceSaveConfirmation(parsed, {
        saveTouchNoteToEngagement: true,
      });

      expect(logUpdateGroups.map((g) => g.destination)).toEqual(
        expect.arrayContaining(["facility", "provider", "engagement_note"]),
      );

      const facilityLines = logUpdateGroups.find((g) => g.destination === "facility")?.lines ?? [];
      const providerLines = logUpdateGroups.find((g) => g.destination === "provider")?.lines ?? [];
      const engagementLines =
        logUpdateGroups.find((g) => g.destination === "engagement_note")?.lines ?? [];

      expect(facilityLines.join(" ").toLowerCase()).toMatch(
        /credentialing|morning|scheduler/,
      );
      expect(providerLines.join(" ").toLowerCase()).toMatch(/workflow|colorectal|robotic/);
      expect(engagementLines.join(" ").toLowerCase()).toMatch(/intro call|talked with dr\. nace/i);

      const baseline = {};
      const current = {
        provider_observation_credentialing_needed: "yes|Vendor credentialing required",
        provider_observation_access_path: "morning|Morning observation access may be easier",
        provider_observation_coordinator_contact:
          "scheduler|Scheduler involved in observation coordination",
        provider_evaluation_openness: "open|Open to workflow discussion",
        provider_procedure_focus: "colorectal|Robotic colorectal focus",
        provider_technique_preferences: "robotic|Robotic",
      };
      const sessionGroups = buildIntelligenceSaveConfirmationGroups({
        baseline,
        current,
        answeredDbKeys: Object.keys(current),
      });
      expect(sessionGroups.map((g) => g.heading)).toEqual(
        expect.arrayContaining([
          INTELLIGENCE_SAVE_DESTINATION_CONFIRMATION_HEADINGS.facility,
          INTELLIGENCE_SAVE_DESTINATION_CONFIRMATION_HEADINGS.provider,
        ]),
      );
    });
  });

  describe("Provider page UI — Sinai inheritance", () => {
    it("shows facility intelligence inherited from Sinai; provider facts stay on James Nace", () => {
      const display = buildProviderIntelligenceScopeDisplay({
        organizationName: "Sinai Hospital",
        providerName: "James Nace",
        organizationBaseline: SINAI_FACILITY_BASELINE,
        contact: {
          provider_evaluation_openness: "open|Open to workflow discussion",
          provider_procedure_focus: "colorectal|Robotic colorectal focus",
          provider_technique_preferences: "robotic|Robotic",
          first_name: "James",
          last_name: "Nace",
        },
      });

      expect(display.facility.subtitle).toBe("Sinai Hospital");
      expect(display.facility.inheritanceLine).toMatch(/inherited/i);
      expect(display.provider.subtitle).toBe("James Nace");

      const facilityCred = display.facility.bullets.find(
        (b) => b.dbKey === "provider_observation_credentialing_needed",
      );
      expect(facilityCred?.line).toMatch(/Vendor credentialing required/i);

      const facilityMorning = display.facility.bullets.find(
        (b) => b.dbKey === "provider_observation_access_path",
      );
      expect(facilityMorning?.line).toMatch(/Morning observation access/i);

      const facilityScheduler = display.facility.bullets.find(
        (b) => b.dbKey === "provider_observation_coordinator_contact",
      );
      expect(facilityScheduler?.line).toMatch(/Scheduler involved/i);

      expect(
        display.provider.bullets.some((b) => b.dbKey === "provider_procedure_focus"),
      ).toBe(true);
      expect(
        display.provider.bullets.some((b) => b.dbKey === "provider_technique_preferences"),
      ).toBe(true);
      expect(
        display.facility.bullets.every((b) => b.scope === "organization"),
      ).toBe(true);
      expect(
        display.provider.bullets.every((b) => b.scope === "provider"),
      ).toBe(true);
      expect(
        display.provider.bullets.some((b) => b.dbKey === "provider_observation_credentialing_needed"),
      ).toBe(false);
    });

    it("offers inherited scheduler prompt for other providers at Sinai", () => {
      const inherited = resolveInheritedOrganizationDiscovery(
        "provider_observation_coordinator_contact",
        {},
        SINAI_FACILITY_BASELINE,
      );
      expect(inherited.mode).toBe("inherited");
      expect(formatInheritedOrganizationPrompt("Sinai Hospital", inherited.baselineField!.displayLine)).toBe(
        "Already known from Sinai Hospital: Scheduler involved in observation coordination",
      );
    });
  });
});
