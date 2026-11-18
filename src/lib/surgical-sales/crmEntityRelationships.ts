/**
 * Surgical CRM entity relationships (canonical model + legacy compatibility).
 *
 * Model:
 * - Provider = surgical_sales_contacts row with clinician role (see providerRoles).
 * - Organization = accounts.
 * - Provider ↔ Organization = many-to-many via surgical_sales_contact_organizations (+ legacy account_id on contact).
 * - Case → Organization (account_id) + Provider (surgeon_contact_id).
 * - Opportunity → Organization (account_id) + optional Provider (surgeon_contact_id) + physician_name (denormalized).
 * - Case → Opportunity via related_opportunity_id (case-owned FK).
 * - Engagement → Provider (required), Organization (optional), Opportunity (optional), Case (optional, linked later).
 * - Engagement owns Pre-Call Plan (pre_observation_* columns on surgical_sales_engagements).
 * - Provider planning & intelligence live on the contact row (provider_* fields).
 * - Case notes live on surgical_sales_cases.notes (and case activities).
 *
 * --- Opportunity flow audit (2026-06) — see docs/SURGICAL_CRM_OPPORTUNITY_FLOW.md ---
 *
 * Current creation: only POST /api/portal/sales/opportunities (SalesOpportunitiesClient modal).
 * Providers, cases, and engagements do NOT auto-insert sales_opportunities rows.
 *
 * Provider ↔ opportunity today: opportunity.surgeon_contact_id when set; otherwise list UIs match
 * physician_name and/or shared account_id (provider profile GET, provider directory GET).
 *
 * UI copy: Product Opportunity (see src/lib/sales/opportunityUiLabels.ts). Routes/DB stay "opportunity".
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { contactMatchesPhysicianName } from "@/lib/surgical-sales/providerDirectory";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import { mapLegacyProviderErrorMessage } from "@/lib/surgical-sales/crmEntityLabels";

export {
  CASE_PROVIDER_FIELD,
  OPPORTUNITY_PROVIDER_FIELD,
  CRM_ENTITY_CONTACT,
  CRM_ENTITY_PROVIDER,
  CRM_ENTITY_ORGANIZATION,
} from "@/lib/surgical-sales/crmEntityLabels";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ContactOrgRow = {
  id: string;
  account_id?: string | null;
  organization_id?: string | null;
  archived_at?: string | null;
  role_type?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  email?: string | null;
};

/** provider_id and contact_id are the same UUID when the contact is a provider. */
export function asProviderId(contactId: string | null | undefined): string | null {
  const id = String(contactId || "").trim();
  return UUID_RE.test(id) ? id : null;
}

export function isSameProviderAndContactId(a: string | null | undefined, b: string | null | undefined): boolean {
  const aa = asProviderId(a);
  const bb = asProviderId(b);
  return !!aa && !!bb && aa === bb;
}

/** Legacy column names on cases/opportunities that store provider contact ids. */
export function readCaseProviderId(caseRow: { surgeon_contact_id?: string | null }): string | null {
  return asProviderId(caseRow.surgeon_contact_id);
}

export function readOpportunityProviderId(opp: { surgeon_contact_id?: string | null }): string | null {
  return asProviderId(opp.surgeon_contact_id);
}

export function isMissingOpportunitySurgeonContactColumnError(message: string | null | undefined): boolean {
  const text = String(message || "").toLowerCase();
  return text.includes("sales_opportunities") && text.includes("surgeon_contact_id") && text.includes("schema cache");
}

export async function loadContactOrganizationIds(contactId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!UUID_RE.test(contactId)) return ids;

  const { data: links } = await supabaseAdmin
    .from("surgical_sales_contact_organizations")
    .select("account_id, is_active")
    .eq("contact_id", contactId)
    .limit(200);

  for (const row of (links || []) as Array<{ account_id?: string | null; is_active?: boolean | null }>) {
    if (row.is_active === false) continue;
    const aid = String(row.account_id || "").trim();
    if (aid) ids.add(aid);
  }

  return ids;
}

export function mergeLegacyContactOrganizationIds(
  contact: Pick<ContactOrgRow, "account_id" | "organization_id">,
  junctionIds: Set<string>,
): Set<string> {
  const ids = new Set(junctionIds);
  const legacy = String(contact.organization_id || contact.account_id || "").trim();
  if (legacy) ids.add(legacy);
  return ids;
}

export async function contactBelongsToOrganization(contactId: string, accountId: string): Promise<boolean> {
  const pid = asProviderId(contactId);
  const aid = String(accountId || "").trim();
  if (!pid || !UUID_RE.test(aid)) return false;

  const { data: contact } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("id, account_id, organization_id, archived_at")
    .eq("id", pid)
    .maybeSingle();

  if (!contact || (contact as ContactOrgRow).archived_at) return false;

  const junctionIds = await loadContactOrganizationIds(pid);
  const orgIds = mergeLegacyContactOrganizationIds(contact as ContactOrgRow, junctionIds);
  return orgIds.has(aid);
}

/**
 * Validates provider/contact is linked to the organization (junction + legacy columns).
 * Returns a user-facing error message or null if valid.
 */
export async function assertProviderLinkedToOrganization(
  providerContactId: string | null | undefined,
  accountId: string,
): Promise<string | null> {
  const pid = asProviderId(providerContactId);
  if (!pid) return null;

  const aid = String(accountId || "").trim();
  if (!UUID_RE.test(aid)) return "Organization is required";

  const { data: contact, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("id, account_id, organization_id, archived_at, role_type, first_name, last_name, email")
    .eq("id", pid)
    .maybeSingle();

  if (error || !contact) {
    return mapLegacyProviderErrorMessage("Provider not found");
  }
  if ((contact as ContactOrgRow).archived_at) {
    return mapLegacyProviderErrorMessage("Provider is archived");
  }

  const junctionIds = await loadContactOrganizationIds(pid);
  const orgIds = mergeLegacyContactOrganizationIds(contact as ContactOrgRow, junctionIds);
  if (!orgIds.has(aid)) {
    return mapLegacyProviderErrorMessage("Provider must be linked to the selected organization");
  }

  return null;
}

/** @deprecated Use assertProviderLinkedToOrganization — kept for case APIs using legacy naming. */
export const assertSurgeonOnAccount = assertProviderLinkedToOrganization;

export async function loadContactForProviderDisplay(contactId: string): Promise<ContactOrgRow | null> {
  if (!UUID_RE.test(contactId)) return null;
  const { data } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("id, account_id, organization_id, archived_at, role_type, first_name, last_name, title, email")
    .eq("id", contactId)
    .maybeSingle();
  return (data as ContactOrgRow | null) ?? null;
}

export async function physicianNameForContact(contactId: string): Promise<string | null> {
  const c = await loadContactForProviderDisplay(contactId);
  if (!c) return null;
  const name = contactDisplayName(c);
  return name === "—" ? null : name;
}

export async function inferProviderContactIdForOpportunity(
  accountId: string,
  physicianName: string | null | undefined,
): Promise<string | null> {
  const aid = String(accountId || "").trim();
  const name = String(physicianName || "").trim();
  if (!UUID_RE.test(aid) || !name) return null;

  const candidates = new Map<string, ContactOrgRow>();

  const { data: legacyContacts } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("id, first_name, last_name, title, email, role_type, account_id, organization_id, archived_at")
    .or(`account_id.eq.${aid},organization_id.eq.${aid}`)
    .is("archived_at", null)
    .limit(300);

  for (const row of (legacyContacts || []) as ContactOrgRow[]) {
    candidates.set(String(row.id), row);
  }

  const { data: linkRows } = await supabaseAdmin
    .from("surgical_sales_contact_organizations")
    .select("contact_id, is_active, surgical_sales_contacts(id, first_name, last_name, title, email, role_type, archived_at)")
    .eq("account_id", aid)
    .limit(300);

  for (const row of (linkRows || []) as unknown as Array<{
    contact_id?: string;
    is_active?: boolean | null;
    surgical_sales_contacts?: ContactOrgRow | ContactOrgRow[] | null;
  }>) {
    if (row.is_active === false) continue;
    const rawContact = row.surgical_sales_contacts;
    const c = Array.isArray(rawContact) ? rawContact[0] ?? null : rawContact ?? null;
    if (!c || c.archived_at) continue;
    const id = String(c.id || row.contact_id || "").trim();
    if (id) candidates.set(id, { ...c, id });
  }

  const matches = [...candidates.values()].filter((c) => contactMatchesPhysicianName(c, name));
  if (matches.length !== 1) return null;
  return String(matches[0]!.id);
}

export type ResolvedOpportunityProvider = {
  surgeon_contact_id: string | null;
  physician_name: string | null;
};

/**
 * Resolves opportunity provider FK + denormalized name (migration-safe).
 */
export async function resolveOpportunityProviderFields(args: {
  accountId: string | null;
  physicianName?: string | null;
  surgeonContactId?: string | null;
}): Promise<{ ok: true; value: ResolvedOpportunityProvider } | { ok: false; error: string }> {
  const accountId = String(args.accountId || "").trim();
  let surgeonContactId = asProviderId(args.surgeonContactId);
  let physicianName = args.physicianName?.trim() || null;

  if (surgeonContactId) {
    if (!accountId) {
      return { ok: false, error: "Organization is required when linking a provider to an opportunity" };
    }
    const linkErr = await assertProviderLinkedToOrganization(surgeonContactId, accountId);
    if (linkErr) return { ok: false, error: linkErr };
    const synced = await physicianNameForContact(surgeonContactId);
    if (synced) physicianName = synced;
    return { ok: true, value: { surgeon_contact_id: surgeonContactId, physician_name: physicianName } };
  }

  if (physicianName && accountId) {
    const inferred = await inferProviderContactIdForOpportunity(accountId, physicianName);
    if (inferred) surgeonContactId = inferred;
  }

  return {
    ok: true,
    value: {
      surgeon_contact_id: surgeonContactId,
      physician_name: physicianName,
    },
  };
}

export async function listCaseIdsForOpportunity(opportunityId: string): Promise<string[]> {
  if (!UUID_RE.test(opportunityId)) return [];
  const { data } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select("id")
    .eq("related_opportunity_id", opportunityId)
    .is("archived_at", null)
    .order("case_date", { ascending: false })
    .limit(500);
  return ((data || []) as Array<{ id: string }>).map((r) => String(r.id));
}

export function describeContactAsProvider(contact: { role_type?: string | null }): boolean {
  return isProviderRole(contact.role_type);
}
