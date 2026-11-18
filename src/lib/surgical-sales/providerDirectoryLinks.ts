import { contactDisplayName } from "@/lib/surgical-sales/labels";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

export type ProviderDirectoryLinks = {
  detailHref: string;
  /** Field operations workspace — readiness, blockers, pathway execution. */
  operationsHref: string;
  newCaseHref: string;
  observationCaseHref: string;
  newEngagementHref: string;
  intelHref: string;
  noteHref: string;
};

export function providerOperationsHref(providerId: string): string {
  return `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=operations`;
}

function buildProviderCaseNewHref(input: {
  providerId: string;
  accountId?: string | null;
  caseType: "observation" | "product_support";
}): string {
  const providerId = String(input.providerId ?? "").trim();
  const accountId = String(input.accountId ?? "").trim();
  const base = accountId
    ? `/portal/sales/cases/new?account_id=${encodeURIComponent(accountId)}&surgeon_contact_id=${encodeURIComponent(providerId)}`
    : `/portal/sales/cases/new?surgeon_contact_id=${encodeURIComponent(providerId)}`;
  return `${base}${base.includes("?") ? "&" : "?"}case_type=${encodeURIComponent(input.caseType)}`;
}

export function buildProviderObservationCaseHref(input: {
  providerId: string;
  accountId?: string | null;
}): string {
  return buildProviderCaseNewHref({ ...input, caseType: "observation" });
}

/** Product Trial evaluation path — schedule a supported OR case, not an engagement. */
export function buildProviderProductTrialCaseHref(input: {
  providerId: string;
  accountId?: string | null;
}): string {
  return buildProviderCaseNewHref({ ...input, caseType: "product_support" });
}

export function buildProviderObservationCaseWorkflowHref(caseId: string): string {
  return `/portal/sales/cases/${encodeURIComponent(String(caseId).trim())}?tab=workflow`;
}

export function providerDirectoryLinks(p: ProviderDirectoryRow): ProviderDirectoryLinks {
  const detailHref = `/portal/sales/providers/${encodeURIComponent(p.id)}`;
  const operationsHref = providerOperationsHref(p.id);
  const accountId = p.primary_organization_id || p.organization_id || p.account_id || "";
  const newCaseHref = accountId
    ? `/portal/sales/cases/new?account_id=${encodeURIComponent(accountId)}&surgeon_contact_id=${encodeURIComponent(p.id)}`
    : `/portal/sales/cases/new?surgeon_contact_id=${encodeURIComponent(p.id)}`;
  const observationCaseHref = buildProviderObservationCaseHref({ providerId: p.id, accountId });
  const noteHref = `${detailHref}?tab=activity&note=1`;
  const newEngagementHref = `/portal/sales/engagements/new?provider_id=${encodeURIComponent(p.id)}`;
  const intelHref = `${detailHref}?tab=intelligence`;
  return { detailHref, operationsHref, newCaseHref, observationCaseHref, newEngagementHref, intelHref, noteHref };
}

export function providerDisplayName(p: ProviderDirectoryRow): string {
  return contactDisplayName(p as Parameters<typeof contactDisplayName>[0]);
}

export function providerCredentialLine(p: ProviderDirectoryRow): string {
  const specialty = String(p.specialty || "").trim();
  const credential = String(p.title || "").trim();
  if (specialty && credential) return `${specialty} · ${credential}`;
  return specialty || credential || "Specialty not set";
}
