/** Aggregates for surgical CRM organization directory (list) views. */

import { isProviderRole } from "@/lib/surgical-sales/providerRoles";

export type OrgDirectoryContactRow = {
  id?: string;
  account_id: string;
  archived_at: string | null;
  role_type?: string | null;
  created_at?: string | null;
};

/** Contact profile fields used to resolve org memberships for directory rollups. */
export type OrgDirectoryContactRecord = {
  id: string;
  account_id?: string | null;
  organization_id?: string | null;
  archived_at: string | null;
  role_type?: string | null;
  created_at?: string | null;
};

/** Junction row from surgical_sales_contact_organizations. */
export type OrgDirectoryOrgLinkRow = {
  contact_id: string;
  account_id: string;
  is_active?: boolean | null;
  role_type?: string | null;
  created_at?: string | null;
};

export type OrgDirectoryCaseRow = {
  id?: string;
  account_id: string;
  case_date: string | null;
  status: string | null;
  expected_revenue?: number | null;
  created_at?: string | null;
  procedure_type?: string | null;
  product_id?: string | null;
};

export type OrgRollupMetrics = {
  contact_count: number;
  /** Clinicians on file (surgeon + physician assistant), including junction-linked providers. */
  surgeon_count: number;
  last_case_date: string | null;
  upcoming_case_count: number;
  upcoming_pipeline_revenue: number;
};

function maxCreatedAt(a?: string | null, b?: string | null): string | null {
  const aa = String(a || "").trim();
  const bb = String(b || "").trim();
  if (!aa) return bb || null;
  if (!bb) return aa;
  return aa >= bb ? aa : bb;
}

function membershipRole(contactRole?: string | null, linkRole?: string | null): string {
  const contact = String(contactRole || "").trim();
  const link = String(linkRole || "").trim();
  if (isProviderRole(contact)) return contact.toLowerCase();
  if (isProviderRole(link)) return link.toLowerCase();
  return (contact || link || "other").toLowerCase();
}

/** Flatten PostgREST nested `surgical_sales_contacts` (object or one-row array). */
export function unwrapLinkedContact(raw: unknown): OrgDirectoryContactRecord | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const rec = row as Record<string, unknown>;
  const id = String(rec.id || "").trim();
  if (!id) return null;
  return {
    id,
    account_id: rec.account_id != null && String(rec.account_id).trim() ? String(rec.account_id) : null,
    organization_id: rec.organization_id != null && String(rec.organization_id).trim() ? String(rec.organization_id) : null,
    archived_at: rec.archived_at != null && String(rec.archived_at).trim() ? String(rec.archived_at) : null,
    role_type: rec.role_type != null ? String(rec.role_type) : null,
    created_at: rec.created_at != null ? String(rec.created_at) : null,
  };
}

/**
 * Resolves who belongs on each org for directory counts.
 * Canonical source is surgical_sales_contact_organizations; legacy contact.account_id /
 * organization_id still count so pre-junction rows are not dropped.
 */
export function buildOrganizationDirectoryContactMemberships(
  contacts: OrgDirectoryContactRecord[],
  links: OrgDirectoryOrgLinkRow[],
): OrgDirectoryContactRow[] {
  const byId = new Map<string, OrgDirectoryContactRecord>();
  for (const contact of contacts) {
    const id = String(contact.id || "").trim();
    if (!id) continue;
    byId.set(id, contact);
  }

  const seen = new Set<string>();
  const out: OrgDirectoryContactRow[] = [];

  const push = (contact: OrgDirectoryContactRecord, accountId: string, link?: OrgDirectoryOrgLinkRow) => {
    if (contact.archived_at) return;
    const aid = String(accountId || "").trim();
    if (!aid) return;
    const key = `${contact.id}::${aid}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      id: contact.id,
      account_id: aid,
      archived_at: contact.archived_at,
      role_type: membershipRole(contact.role_type, link?.role_type),
      created_at: maxCreatedAt(contact.created_at, link?.created_at),
    });
  };

  for (const link of links) {
    if (link.is_active === false) continue;
    const contact = byId.get(String(link.contact_id || "").trim());
    if (!contact) continue;
    push(contact, link.account_id, link);
  }

  for (const contact of byId.values()) {
    push(contact, String(contact.account_id || ""));
    const orgId = String(contact.organization_id || "");
    if (orgId && orgId !== String(contact.account_id || "")) {
      push(contact, orgId);
    }
  }

  return out;
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseYmd(s: string | null | undefined): string | null {
  if (!s || typeof s !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  return s.slice(0, 10);
}

function isTerminalCaseStatus(status: unknown): boolean {
  const x = String(status || "").toLowerCase();
  return x === "closed" || x === "cancelled" || x === "complete" || x === "completed" || x === "invoiced";
}

function isScheduleActiveCaseStatus(status: unknown): boolean {
  const x = String(status || "").toLowerCase();
  return x === "scheduled" || x === "rescheduled" || x === "confirmed";
}

export function rollupOrganizationDirectoryMetrics(
  contacts: OrgDirectoryContactRow[],
  cases: OrgDirectoryCaseRow[],
): Map<string, OrgRollupMetrics> {
  const today = todayYmd();
  const map = new Map<string, OrgRollupMetrics>();

  const ensure = (id: string): OrgRollupMetrics => {
    let m = map.get(id);
    if (!m) {
      m = {
        contact_count: 0,
        surgeon_count: 0,
        last_case_date: null,
        upcoming_case_count: 0,
        upcoming_pipeline_revenue: 0,
      };
      map.set(id, m);
    }
    return m;
  };

  const counted = new Set<string>();
  for (const c of contacts) {
    if (c.archived_at) continue;
    const aid = String(c.account_id || "").trim();
    if (!aid) continue;
    const key = `${String(c.id || "")}::${aid}`;
    if (c.id && counted.has(key)) continue;
    if (c.id) counted.add(key);
    const m = ensure(aid);
    m.contact_count += 1;
    if (isProviderRole(c.role_type)) {
      m.surgeon_count += 1;
    }
  }

  for (const row of cases) {
    const m = ensure(row.account_id);
    const cd = parseYmd(row.case_date);
    if (cd) {
      if (!m.last_case_date || cd > m.last_case_date) m.last_case_date = cd;
    }
    const st = row.status;
    if (String(st || "").toLowerCase() === "cancelled") continue;
    if (cd && cd >= today && !isTerminalCaseStatus(st) && isScheduleActiveCaseStatus(st)) {
      m.upcoming_case_count += 1;
      const er = Number(row.expected_revenue ?? 0);
      if (Number.isFinite(er) && er > 0) m.upcoming_pipeline_revenue += er;
    }
  }

  return map;
}

function tsForLastCaseYmd(ymd: string | null | undefined): number {
  if (!ymd) return NaN;
  return new Date(`${ymd}T12:00:00`).getTime();
}

/** Latest meaningful activity timestamp for directory sorting and display. */
export function resolveLastActivityAt(
  last_case_date: string | null | undefined,
  surgical_crm_updated_at: string | null | undefined,
): string | null {
  const cTs = tsForLastCaseYmd(last_case_date ?? null);
  const uRaw = surgical_crm_updated_at ? String(surgical_crm_updated_at).trim() : "";
  const uTs = uRaw ? new Date(uRaw).getTime() : NaN;
  const candidates: { ts: number; iso: string }[] = [];
  if (Number.isFinite(cTs)) candidates.push({ ts: cTs, iso: last_case_date! });
  if (Number.isFinite(uTs)) candidates.push({ ts: uTs, iso: uRaw });
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.ts - a.ts);
  return candidates[0]!.iso;
}
