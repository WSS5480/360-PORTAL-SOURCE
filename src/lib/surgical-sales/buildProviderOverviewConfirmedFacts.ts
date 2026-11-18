/**
 * Provider overview — rep-facing confirmed facts only (no buckets, scores, or categories).
 */

import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import {
  formatIntelligenceCaptureDisplay,
  formatIntelligenceCaptureSummaryChip,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";

export const PROVIDER_OVERVIEW_CONFIRMED_FACTS_EMPTY =
  "No confirmed field intelligence captured yet.";

const NEGATIVE_FACT_RE =
  /\b(not |unknown|unconfirmed|unclear|blocked|restricted|denied|partial|missing|none)\b/i;

function hasText(value: unknown): boolean {
  return Boolean(String(value ?? "").trim());
}

function polishFact(line: string): string {
  const trimmed = line.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function pushFact(out: string[], line: string): void {
  const fact = polishFact(line);
  if (!fact || NEGATIVE_FACT_RE.test(fact)) return;
  if (out.some((existing) => existing.toLowerCase() === fact.toLowerCase())) return;
  out.push(fact);
}

function humanizeValue(value: string): string {
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function validatedDisplay(contact: Record<string, unknown>, dbKey: string): string | null {
  if (!isIntelligenceFieldValidatedOnFile(dbKey, contact)) return null;
  const raw = String(contact[dbKey] ?? "").trim();
  if (!raw) return null;
  const display =
    formatIntelligenceCaptureDisplay(dbKey, raw) ??
    formatIntelligenceCaptureSummaryChip(dbKey, raw) ??
    raw;
  return humanizeValue(display);
}

function schedulerFact(contact: Record<string, unknown>): string | null {
  for (const dbKey of [
    "provider_scheduling_contact",
    "provider_facility_scheduling_contact",
    "provider_observation_coordinator_contact",
  ] as const) {
    const value = validatedDisplay(contact, dbKey);
    if (!value) continue;
    return `Scheduler identified: ${value}`;
  }
  return null;
}

function orCoordinatorFact(contact: Record<string, unknown>, schedulerLine: string | null): string | null {
  const value = validatedDisplay(contact, "provider_observation_coordinator_contact");
  if (!value) return null;
  const schedulerValue = schedulerLine?.replace(/^Scheduler identified:\s*/i, "").trim();
  if (schedulerValue && schedulerValue.toLowerCase() === value.toLowerCase()) return null;
  return `OR coordinator identified: ${value}`;
}

function procedureFact(contact: Record<string, unknown>, dbKey: string, prefix: string): string | null {
  const value = validatedDisplay(contact, dbKey);
  if (!value) return null;
  return `${prefix} ${value}`;
}

function competitorFact(contact: Record<string, unknown>): string | null {
  const value = validatedDisplay(contact, "provider_competitive_products");
  if (!value) return null;
  if (/^uses\b/i.test(value)) return polishFact(value);
  if (/competitor/i.test(value)) return `Uses ${value}`;
  return `Uses competitor ${value}`;
}

export function buildProviderOverviewConfirmedFacts(input: {
  contact: Record<string, unknown>;
  organizationName?: string | null;
}): string[] {
  const contact = input.contact;
  const facts: string[] = [];

  if (hasProviderObservationApprovalValidated(contact)) {
    pushFact(facts, "Observation approved");
  }

  const schedulerLine = schedulerFact(contact);
  if (schedulerLine) pushFact(facts, schedulerLine);

  const orgLinked =
    hasText(input.organizationName) ||
    hasText(contact.organization_id) ||
    hasText(contact.account_id);
  if (orgLinked) {
    const orgName = String(input.organizationName ?? "").trim();
    pushFact(
      facts,
      orgName ? `Hospital affiliation confirmed: ${orgName}` : "Hospital affiliation confirmed",
    );
  }

  const procedureFocus = procedureFact(contact, "provider_procedure_focus", "Performs");
  if (procedureFocus) pushFact(facts, procedureFocus);

  const observationInterest = procedureFact(
    contact,
    "provider_ideal_observation_cases",
    "Interested in",
  );
  if (observationInterest) pushFact(facts, observationInterest);

  const technique = validatedDisplay(contact, "provider_technique_preferences");
  if (technique) {
    if (/\binterested\b/i.test(technique)) {
      pushFact(facts, technique);
    } else if (/\brobotic\b/i.test(technique)) {
      pushFact(facts, `Interested in ${technique}`);
    } else {
      pushFact(facts, `Technique preference: ${technique}`);
    }
  }

  const competitor = competitorFact(contact);
  if (competitor) pushFact(facts, competitor);

  const coordinatorLine = orCoordinatorFact(contact, schedulerLine);
  if (coordinatorLine) pushFact(facts, coordinatorLine);

  const credentialingContact = validatedDisplay(contact, "provider_credentialing_contact");
  if (credentialingContact) {
    pushFact(facts, `Credentialing contact identified: ${credentialingContact}`);
  }

  const accessPath = validatedDisplay(contact, "provider_observation_access_path");
  if (accessPath) {
    pushFact(facts, `OR access path confirmed: ${accessPath}`);
  }

  return facts;
}
