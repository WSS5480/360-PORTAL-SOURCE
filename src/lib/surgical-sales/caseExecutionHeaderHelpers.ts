import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import {
  DISCOVERY_FIELD_STATUS,
  resolveDiscoveryStructuredSignalStatus,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { MISSION_ACCESS_STATUS_LABELS } from "@/lib/surgical-sales/providerMissionExecutionLanguage";
import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";

function firstReadableSegment(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const pipe = trimmed.split("|").pop()?.trim();
  return pipe || trimmed;
}

export type CaseHeaderStatusTone = "ok" | "warn" | "neutral" | "blocked";

export type CaseHeaderStatusIndicator = {
  id: string;
  label: string;
  tone: CaseHeaderStatusTone;
};

export function providerSpecialtyLabel(
  surgeon: Record<string, unknown> | null | undefined,
  intelligence: ProviderIntelligenceSnapshot | null | undefined,
): string | null {
  const fromIntel = String(intelligence?.procedures ?? "").trim();
  if (fromIntel) {
    const label = firstReadableSegment(fromIntel);
    if (label) return label;
  }
  const focus = String(surgeon?.provider_procedure_focus ?? "").trim();
  if (focus) {
    const label = firstReadableSegment(focus);
    if (label) return label;
  }
  const title = String(surgeon?.title ?? "").trim();
  return title || null;
}

function formatCredentialingShort(value: string): string {
  const key = value.trim().toLowerCase();
  const labels: Record<string, string> = {
    unknown: "Credentialing unknown",
    not_required: "No credentialing needed",
    required_not_started: "Credentialing not started",
    in_progress: "Credentialing in progress",
    verified: "Credentialing verified",
  };
  return labels[key] ?? value;
}

export function buildCaseSchedulingStatusSummary(caseRow: Record<string, unknown>): string {
  const schedulingOwner = String(caseRow.observation_access_scheduling_owner ?? "").trim();
  const accessPathway = String(caseRow.observation_access_pathway ?? "").trim();
  const credentialing = String(caseRow.observation_access_credentialing ?? "").trim();

  if (schedulingOwner && accessPathway) {
    return `${schedulingOwner} · ${accessPathway}`;
  }
  if (schedulingOwner) return `Owner: ${schedulingOwner}`;
  if (accessPathway) return `Pathway: ${accessPathway}`;
  if (credentialing) return formatCredentialingShort(credentialing);
  return "Scheduling not confirmed";
}

export function caseExecutionTypeTitle(caseType: string | null | undefined): string {
  const normalized = String(caseType ?? "").trim().toLowerCase();
  if (normalized === "observation") return "Observation Case";
  if (normalized === "product_support") return "Coverage Case";
  return "Surgical Case";
}

function observationAccessIndicator(
  caseRow: Record<string, unknown>,
  providerContact?: Record<string, unknown> | null,
): CaseHeaderStatusIndicator {
  const pathway = String(caseRow.observation_access_pathway ?? "").trim();
  if (pathway) {
    return { id: "access", label: "Observation approved", tone: "ok" };
  }

  if (providerContact) {
    const status = resolveDiscoveryStructuredSignalStatus("observation_approval", providerContact);
    if (status === DISCOVERY_FIELD_STATUS.validated) {
      return { id: "access", label: "Observation approved", tone: "ok" };
    }
    if (status === DISCOVERY_FIELD_STATUS.captured || status === DISCOVERY_FIELD_STATUS.conditional) {
      return { id: "access", label: "Access partial", tone: "warn" };
    }
    if (status === DISCOVERY_FIELD_STATUS.blocked) {
      return { id: "access", label: MISSION_ACCESS_STATUS_LABELS.blocked, tone: "blocked" };
    }
  }

  return { id: "access", label: "Access unknown", tone: "warn" };
}

function observationSchedulerIndicator(caseRow: Record<string, unknown>): CaseHeaderStatusIndicator {
  const owner = String(caseRow.observation_access_scheduling_owner ?? "").trim();
  if (owner) {
    return { id: "scheduler", label: "Scheduler known", tone: "ok" };
  }
  return { id: "scheduler", label: "Scheduler unknown", tone: "warn" };
}

function observationCredentialingIndicator(caseRow: Record<string, unknown>): CaseHeaderStatusIndicator {
  const cred = String(caseRow.observation_access_credentialing ?? "unknown").trim().toLowerCase();
  if (cred === "verified") {
    return { id: "credentialing", label: "Credentialing verified", tone: "ok" };
  }
  if (cred === "not_required") {
    return { id: "credentialing", label: "Credentialing not required", tone: "ok" };
  }
  if (cred === "in_progress") {
    return { id: "credentialing", label: "Credentialing in progress", tone: "warn" };
  }
  if (cred === "required_not_started") {
    return { id: "credentialing", label: "Credentialing needed", tone: "warn" };
  }
  return { id: "credentialing", label: "Credentialing unknown", tone: "warn" };
}

function coverageSupportIndicators(input: {
  hasProducts: boolean;
  billingScore?: number;
  requiresBilling: boolean;
}): CaseHeaderStatusIndicator[] {
  const items: CaseHeaderStatusIndicator[] = [];
  items.push({
    id: "products",
    label: input.hasProducts ? "Products attached" : "No products",
    tone: input.hasProducts ? "ok" : "warn",
  });
  if (input.requiresBilling) {
    const score = Math.max(0, Math.min(3, Number(input.billingScore) || 0));
    items.push({
      id: "billing",
      label: score >= 3 ? "Billing ready" : `Billing ${score}/3`,
      tone: score >= 3 ? "ok" : "warn",
    });
  }
  return items;
}

export function buildCaseHeaderStatusIndicators(input: {
  caseRow: Record<string, unknown>;
  caseType: string | null | undefined;
  statusLabel: string;
  providerContact?: Record<string, unknown> | null;
  hasProducts?: boolean;
  billingScore?: number;
  requiresBilling?: boolean;
}): CaseHeaderStatusIndicator[] {
  const indicators: CaseHeaderStatusIndicator[] = [
    { id: "status", label: input.statusLabel, tone: "neutral" },
  ];

  if (isSurgicalObservationCase(input.caseType)) {
    indicators.push(
      observationAccessIndicator(input.caseRow, input.providerContact),
      observationSchedulerIndicator(input.caseRow),
      observationCredentialingIndicator(input.caseRow),
    );
    return indicators;
  }

  indicators.push(
    ...coverageSupportIndicators({
      hasProducts: Boolean(input.hasProducts),
      billingScore: input.billingScore,
      requiresBilling: Boolean(input.requiresBilling),
    }),
  );
  return indicators;
}
