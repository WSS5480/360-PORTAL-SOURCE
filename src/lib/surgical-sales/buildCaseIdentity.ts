import { buildObservationOverviewBrief } from "@/lib/surgical-sales/buildObservationOverviewBrief";
import { resolveProviderCompletedObservationCount, providerObservationProgramDebriefUnlocked } from "@/lib/surgical-sales/observationProgramGate";
import { providerSpecialtyLabel } from "@/lib/surgical-sales/caseExecutionHeaderHelpers";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import {
  contactDisplayName,
  formatSurgicalCaseStatus,
  isSurgicalObservationCase,
} from "@/lib/surgical-sales/labels";
import { resolveProviderDisplayName } from "@/lib/surgical-sales/observationRepPresentationCopy";

export type CaseIdentityOptionalSignalId =
  | "observation_approved"
  | "scheduler_identified"
  | "credentialing_complete";

export type CaseIdentityOptionalSignal = {
  id: CaseIdentityOptionalSignalId;
  label: string;
  active: boolean;
};

/** Unified rep-facing case identity — consistent across board, lists, and detail. */
export type CaseIdentity = {
  caseTypeLabel: string;
  providerName: string;
  specialty: string | null;
  facilityName: string;
  procedureType: string | null;
  dateLine: string;
  dateLineWithTime: string | null;
  statusLabel: string;
  openQuestionsCount: number | null;
  readyForDebrief: boolean;
  optionalSignals: CaseIdentityOptionalSignal[];
  /** Internal reference only — not for primary UI display. */
  internalCaseNumber: string | null;
};

export type CaseIdentityInput = {
  case_type?: string | null;
  surgeon_display?: string | null;
  surgeon_specialty?: string | null;
  account_name?: string | null;
  case_date?: string | null;
  case_time?: string | null;
  status?: string | null;
  observation_access_pathway?: string | null;
  observation_access_scheduling_owner?: string | null;
  observation_access_credentialing?: string | null;
  case_number?: string | null;
  surgeon_contact_id?: string | null;
  account_id?: string | null;
  procedure_type?: string | null;
  noteCount?: number;
  providerName?: string | null;
  providerSpecialty?: string | null;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  priorObservationCases?: Array<Record<string, unknown>>;
};

export function formatCaseIdentityProviderName(display: string | null | undefined): string {
  const trimmed = String(display ?? "").trim();
  if (!trimmed) return "Provider pending";
  return trimmed.replace(/^dr\.?\s+/i, "");
}

export function caseIdentityTypeLabel(caseType: string | null | undefined): string {
  if (isSurgicalObservationCase(caseType)) return "Observation Case";
  if (String(caseType ?? "").trim().toLowerCase() === "product_support") return "Coverage Case";
  return "Surgical Case";
}

export function formatCaseIdentityDate(
  caseDate: string | null | undefined,
  caseTime?: string | null | undefined,
): { dateLine: string; dateLineWithTime: string | null } {
  if (!caseDate) {
    return { dateLine: "Date TBD", dateLineWithTime: null };
  }

  const date = new Date(`${caseDate}T12:00:00Z`);
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  if (date.getUTCFullYear() !== now.getUTCFullYear()) {
    options.year = "numeric";
  }
  const dateLine = date.toLocaleDateString(undefined, options);

  const timeRaw = String(caseTime ?? "").trim();
  if (!timeRaw) {
    return { dateLine, dateLineWithTime: dateLine };
  }

  const [hours, minutes] = timeRaw.slice(0, 5).split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return { dateLine, dateLineWithTime: dateLine };
  }

  const timeDate = new Date();
  timeDate.setHours(hours, minutes, 0, 0);
  const time = timeDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return { dateLine, dateLineWithTime: `${dateLine} · ${time}` };
}

export function buildCaseIdentityOptionalSignals(input: CaseIdentityInput): CaseIdentityOptionalSignal[] {
  const pathway = String(input.observation_access_pathway ?? "").trim();
  const owner = String(input.observation_access_scheduling_owner ?? "").trim();
  const cred = String(input.observation_access_credentialing ?? "unknown").trim().toLowerCase();

  return [
    {
      id: "observation_approved",
      label: "Observation Approved",
      active: Boolean(pathway),
    },
    {
      id: "scheduler_identified",
      label: "Scheduler Identified",
      active: Boolean(owner),
    },
    {
      id: "credentialing_complete",
      label: "Credentialing Complete",
      active: cred === "verified" || cred === "not_required",
    },
  ];
}

function resolveSpecialty(input: CaseIdentityInput): string | null {
  const fromList = String(input.surgeon_specialty ?? input.providerSpecialty ?? "").trim();
  if (fromList) return fromList;
  return providerSpecialtyLabel(input.providerContact ?? null, input.providerIntelligence ?? null);
}

function resolveProviderName(input: CaseIdentityInput): string {
  const explicit = String(input.providerName ?? "").trim();
  if (explicit) return formatCaseIdentityProviderName(explicit);

  const fromRow = String(input.surgeon_display ?? "").trim();
  if (fromRow && fromRow !== "No clinician assigned") {
    return formatCaseIdentityProviderName(fromRow);
  }

  if (input.providerContact) {
    const fromContact = contactDisplayName(
      input.providerContact as Parameters<typeof contactDisplayName>[0],
    );
    if (fromContact && fromContact !== "—") {
      return formatCaseIdentityProviderName(fromContact);
    }
  }

  return formatCaseIdentityProviderName(input.surgeon_display);
}

export function resolveLatestNoteActivityAt(
  activities?: Array<{ activity_type?: string; created_at?: string }>,
): string | null {
  let latest: string | null = null;
  let latestMs = -1;

  for (const activity of activities ?? []) {
    const type = String(activity.activity_type ?? "").trim().toLowerCase();
    if (type !== "note") continue;
    const raw = String(activity.created_at ?? "").trim();
    if (!raw) continue;
    const ms = Date.parse(raw);
    if (!Number.isFinite(ms) || ms <= latestMs) continue;
    latestMs = ms;
    latest = raw;
  }

  return latest;
}

export function formatActivityCapturedDate(iso: string): {
  dateLine: string;
  dateLineWithTime: string;
} {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { dateLine: "Date TBD", dateLineWithTime: "Date TBD" };
  }

  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  if (date.getFullYear() !== now.getFullYear()) {
    options.year = "numeric";
  }
  const dateLine = date.toLocaleDateString(undefined, options);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return { dateLine, dateLineWithTime: `${dateLine} · ${time}` };
}

export function enrichCaseIdentityWithNoteCapture(
  identity: CaseIdentity,
  noteCapturedAt: string | null | undefined,
): CaseIdentity {
  if (!noteCapturedAt) return identity;

  const captured = formatActivityCapturedDate(noteCapturedAt);
  if (identity.dateLine === "Date TBD") {
    return {
      ...identity,
      dateLine: captured.dateLine,
      dateLineWithTime: captured.dateLineWithTime,
    };
  }

  if (!identity.dateLineWithTime || identity.dateLineWithTime === identity.dateLine) {
    const timePart = captured.dateLineWithTime.split(" · ")[1];
    if (timePart) {
      return { ...identity, dateLineWithTime: `${identity.dateLine} · ${timePart}` };
    }
  }

  return identity;
}

/** Observation intelligence sections — provider from contact when case row lacks a name. */
export function buildObservationCaseIdentity(input: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
  activities?: Array<{ activity_type?: string; created_at?: string }>;
}): CaseIdentity {
  const identity = buildCaseIdentity({
    case_type: input.caseRow.case_type as string | null | undefined,
    surgeon_display: resolveProviderDisplayName(input.caseRow) ?? undefined,
    account_name: String(input.caseRow.account_name ?? "").trim() || null,
    case_date: input.caseRow.case_date as string | null | undefined,
    case_time: input.caseRow.case_time as string | null | undefined,
    status: input.caseRow.status as string | null | undefined,
    providerContact: input.providerContact ?? null,
    priorObservationCases: input.priorCases,
  });

  return enrichCaseIdentityWithNoteCapture(
    identity,
    resolveLatestNoteActivityAt(input.activities),
  );
}

function resolveOpenQuestionsCount(input: CaseIdentityInput): number | null {
  if (!isSurgicalObservationCase(input.case_type)) return null;
  const brief = buildObservationOverviewBrief({ caseRow: input as Record<string, unknown> });
  return brief.learningNeeds.length;
}

export function isObservationReadyForDebrief(input: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  priorObservationCases?: Array<Record<string, unknown>>;
}): boolean {
  if (!String(input.caseRow.surgeon_contact_id ?? "").trim()) return false;

  const completedCount = resolveProviderCompletedObservationCount({
    providerContact: input.providerContact,
    caseRow: input.caseRow,
    priorCases: input.priorObservationCases,
  });

  return providerObservationProgramDebriefUnlocked(completedCount);
}

export function formatCaseIdentityPageTitle(identity: CaseIdentity): string {
  return `${identity.caseTypeLabel} — ${identity.providerName}`;
}

export type CaseDetailHeaderPresentation = {
  kicker: string;
  title: string;
  subtitle: string | null;
  metaLine: string;
};

/** Rep-facing case detail header — provider-first with date/time when available. */
export function buildCaseDetailHeaderPresentation(identity: CaseIdentity): CaseDetailHeaderPresentation {
  const dateLabel = identity.dateLineWithTime || identity.dateLine;
  const subtitleParts = [identity.specialty?.trim(), identity.facilityName?.trim()].filter(
    Boolean,
  ) as string[];

  return {
    kicker: identity.caseTypeLabel,
    title: identity.providerName,
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(" · ") : null,
    metaLine: `${dateLabel} · ${identity.statusLabel}`,
  };
}

/** Rep-facing section title with provider + date/time context. */
export function formatCaseIntelligenceContextLine(identity: CaseIdentity): string {
  const parts = [identity.providerName].filter(
    (part) => part && part !== "Provider pending",
  );
  const dateLabel = identity.dateLineWithTime || identity.dateLine;
  if (dateLabel && dateLabel !== "Date TBD") parts.push(dateLabel);
  return parts.join(" · ");
}

export function formatCaseIntelligenceSectionTitle(
  baseTitle: string,
  identity: CaseIdentity,
): string {
  const contextLine = formatCaseIntelligenceContextLine(identity);
  return contextLine ? `${baseTitle} — ${contextLine}` : baseTitle;
}

export function buildCaseIdentity(input: CaseIdentityInput): CaseIdentity {
  const { dateLine, dateLineWithTime } = formatCaseIdentityDate(input.case_date, input.case_time);
  const observation = isSurgicalObservationCase(input.case_type);

  return {
    caseTypeLabel: caseIdentityTypeLabel(input.case_type),
    providerName: resolveProviderName(input),
    specialty: resolveSpecialty(input),
    facilityName: String(input.account_name ?? "").trim() || "Facility pending",
    procedureType: String(input.procedure_type ?? "").trim() || null,
    dateLine,
    dateLineWithTime,
    statusLabel: formatSurgicalCaseStatus(input.status),
    openQuestionsCount: observation ? resolveOpenQuestionsCount(input) : null,
    readyForDebrief: observation
      ? isObservationReadyForDebrief({
          caseRow: input as Record<string, unknown>,
          providerContact: input.providerContact,
          priorObservationCases: input.priorObservationCases,
        })
      : false,
    optionalSignals: observation ? buildCaseIdentityOptionalSignals(input) : [],
    internalCaseNumber: String(input.case_number ?? "").trim() || null,
  };
}

export function buildCaseIdentityFromListItem(
  row: CaseIdentityInput & { id?: string },
): CaseIdentity {
  return buildCaseIdentity(row);
}

export function activeCaseIdentitySignals(identity: CaseIdentity): CaseIdentityOptionalSignal[] {
  return identity.optionalSignals.filter((signal) => signal.active);
}
