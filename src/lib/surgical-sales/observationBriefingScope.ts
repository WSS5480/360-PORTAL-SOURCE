import { discoveryReadinessNarrativeLine } from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import { formatRepIntelligenceFieldValue } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import {
  isDiscoverySignalStatusResolved,
  resolveDiscoveryStructuredSignalStatus,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { splitDelimitedObjectiveLines } from "@/lib/surgical-sales/observationObjectives";

/** Discovery signals that belong to Observation Request / access planning — not OR mission. */
export const OBSERVATION_ACCESS_DISCOVERY_SIGNALS: DiscoveryStructuredSignalId[] = [
  "observation_approval",
  "scheduling_owner",
  "facility_vendor_pathway",
  "observation_logistics",
];

const ACCESS_PLANNING_LINE_PATTERNS = [
  /scheduling owner/i,
  /scheduler unconfirmed/i,
  /vendor pathway/i,
  /observation timing/i,
  /timing unconfirmed/i,
  /observation approval/i,
  /observation access/i,
  /credentialing/i,
  /vendor credentialing/i,
  /vendor access requirements/i,
  /facility approval/i,
  /facility access/i,
  /access pathway/i,
  /access path/i,
  /scheduling contact/i,
  /observation logistics/i,
  /who owns observation scheduling/i,
  /how far ahead do observation cases post/i,
  /facility or vendor approval/i,
  /approval status/i,
  /approval owner/i,
  /vendor note/i,
  /scheduling note/i,
  /access note/i,
  /timing note/i,
];

/** Provider profile fields that inform what to watch during the observation itself. */
export const OBSERVATION_BRIEFING_WATCH_PROVIDER_FIELDS = [
  "provider_current_vendors",
  "provider_competitive_products",
  "provider_workflow_pain_points",
  "provider_clinical_frustrations",
  "provider_staff_frustrations",
  "provider_preference_card_signals",
  "provider_product_gaps",
  "provider_future_opportunity_signals",
  "provider_product_interests",
  "provider_outcome_priorities",
] as const;

export function isAccessPlanningBriefingLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return ACCESS_PLANNING_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function filterObservationMissionLines(lines: string[]): string[] {
  return lines.filter((line) => !isAccessPlanningBriefingLine(line));
}

function providerFieldText(
  contact: Record<string, unknown> | null | undefined,
  dbKey: string,
): string | null {
  if (!contact) return null;
  return formatRepIntelligenceFieldValue(dbKey, contact[dbKey] as string | null | undefined);
}

function providerFieldLines(
  contact: Record<string, unknown> | null | undefined,
  dbKey: string,
): string[] {
  if (!contact) return [];
  const raw = contact[dbKey];
  if (raw == null || raw === "") return [];
  return splitDelimitedObjectiveLines(String(raw));
}

function pushUnique(items: string[], seen: Set<string>, value: string): void {
  const trimmed = value.trim();
  if (!trimmed || isAccessPlanningBriefingLine(trimmed)) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  items.push(trimmed);
}

/** Build OR-mission watch signals from provider intelligence — excludes access-planning gaps. */
export function buildObservationMissionWatchSignalsFromProvider(
  contact: Record<string, unknown> | null | undefined,
  productFocus?: string | null,
): string[] {
  const items: string[] = [];
  const seen = new Set<string>();

  if (contact) {
    const vendors = providerFieldText(contact, "provider_current_vendors");
    if (vendors) pushUnique(items, seen, `Current products used: ${vendors}`);

    const competitive = providerFieldText(contact, "provider_competitive_products");
    if (competitive) pushUnique(items, seen, `Competitor products present: ${competitive}`);

    for (const line of providerFieldLines(contact, "provider_workflow_pain_points")) {
      pushUnique(items, seen, `Workflow bottleneck: ${line}`);
    }

    for (const line of providerFieldLines(contact, "provider_clinical_frustrations")) {
      pushUnique(items, seen, `Clinical frustration: ${line}`);
    }

    for (const line of providerFieldLines(contact, "provider_staff_frustrations")) {
      pushUnique(items, seen, `Staff frustration: ${line}`);
    }

    for (const line of providerFieldLines(contact, "provider_preference_card_signals")) {
      pushUnique(items, seen, `Workaround: ${line}`);
    }

    const gaps = providerFieldText(contact, "provider_product_gaps");
    if (gaps) pushUnique(items, seen, `Product fit signal: ${gaps}`);

    const outcomes = providerFieldText(contact, "provider_outcome_priorities");
    if (outcomes) pushUnique(items, seen, `Outcome priority: ${outcomes}`);

    const interests = providerFieldText(contact, "provider_product_interests");
    if (interests) pushUnique(items, seen, `Product interest: ${interests}`);
  }

  if (productFocus?.trim()) {
    pushUnique(items, seen, `${productFocus.trim()} fit signals`);
  }

  return items;
}

export type ObservationAccessSummaryItem = {
  label: string;
  value: string;
};

function formatCredentialingLabel(value: string): string {
  const key = value.trim().toLowerCase();
  const labels: Record<string, string> = {
    unknown: "Unknown",
    not_required: "Not required",
    required_not_started: "Required — not started",
    in_progress: "In progress",
    verified: "Verified",
  };
  return labels[key] ?? value;
}

function formatCaseDateLabel(caseRow: Record<string, unknown>): string | null {
  const date = String(caseRow.case_date ?? "").trim();
  if (!date) return null;
  const time = String(caseRow.case_time ?? "").trim();
  return time ? `${date} · ${time}` : date;
}

function accessDiscoveryStatusLine(
  signalId: DiscoveryStructuredSignalId,
  contact: Record<string, unknown> | null | undefined,
): string | null {
  if (!contact) return null;
  const status = resolveDiscoveryStructuredSignalStatus(signalId, contact);
  return discoveryReadinessNarrativeLine(signalId, status);
}

/** Access-planning reference for Observation Request workflow — not OR mission briefing. */
export function buildObservationAccessSummary(input: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  dateLabel?: string | null;
}): ObservationAccessSummaryItem[] {
  const items: ObservationAccessSummaryItem[] = [];

  const observationDate = input.dateLabel?.trim() || formatCaseDateLabel(input.caseRow);
  if (observationDate) {
    items.push({ label: "Observation date", value: observationDate });
  }

  const scheduler =
    String(input.caseRow.observation_access_scheduling_owner ?? "").trim() ||
    providerFieldText(input.providerContact, "provider_observation_coordinator_contact") ||
    accessDiscoveryStatusLine("scheduling_owner", input.providerContact) ||
    "Unknown";
  items.push({ label: "Scheduler", value: scheduler });

  const approval =
    String(input.caseRow.observation_access_pathway ?? "").trim() ||
    accessDiscoveryStatusLine("observation_approval", input.providerContact) ||
    "Unknown";
  items.push({ label: "Approval status", value: approval });

  const credentialingRaw = String(input.caseRow.observation_access_credentialing ?? "").trim();
  const vendorPathway =
    providerFieldText(input.providerContact, "provider_observation_access_path") ||
    accessDiscoveryStatusLine("facility_vendor_pathway", input.providerContact);
  const credentialingParts = [
    credentialingRaw ? formatCredentialingLabel(credentialingRaw) : null,
    vendorPathway,
  ].filter(Boolean);
  items.push({
    label: "Vendor credentialing pathway",
    value: credentialingParts.length > 0 ? credentialingParts.join(" · ") : "Unknown",
  });

  const timing =
    accessDiscoveryStatusLine("observation_logistics", input.providerContact) ||
    providerFieldText(input.providerContact, "provider_observation_best_days_case_types");
  if (timing) {
    items.push({ label: "Observation timing", value: timing });
  }

  if (input.providerContact) {
    for (const signalId of OBSERVATION_ACCESS_DISCOVERY_SIGNALS) {
      const status = resolveDiscoveryStructuredSignalStatus(signalId, input.providerContact);
      if (isDiscoverySignalStatusResolved(signalId, status)) continue;
      const line = discoveryReadinessNarrativeLine(signalId, status);
      if (!line) continue;
      const label =
        signalId === "observation_approval"
          ? "Access note"
          : signalId === "scheduling_owner"
            ? "Scheduling note"
            : signalId === "facility_vendor_pathway"
              ? "Vendor note"
              : "Timing note";
      if (!items.some((item) => item.value.toLowerCase() === line.toLowerCase())) {
        items.push({ label, value: line });
      }
    }
  }

  return items;
}
