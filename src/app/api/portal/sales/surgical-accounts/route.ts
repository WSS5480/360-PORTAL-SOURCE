import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { isInternalPortalAdmin } from "@/lib/sales/isInternalPortalAdmin";
import { SURGICAL_CRM_ACCOUNT_COLUMNS } from "@/lib/surgical-sales/accountSelectColumns";
import { insertSurgicalOrganizationAccount } from "@/lib/surgical-sales/insertSurgicalOrganizationAccount";
import { SURGICAL_ACCOUNT_STATUSES, SURGICAL_ACCOUNT_TYPES } from "@/lib/surgical-sales/labels";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import {
  accountHasSurgicalCrmDirectoryMetadata,
  SURGICAL_CRM_DIRECTORY_OR_FILTER,
} from "@/lib/surgical-sales/repAccountVisibility";
import {
  buildOrganizationDirectoryContactMemberships,
  rollupOrganizationDirectoryMetrics,
  resolveLastActivityAt,
  unwrapLinkedContact,
  type OrgDirectoryCaseRow,
  type OrgDirectoryContactRecord,
  type OrgDirectoryContactRow,
  type OrgDirectoryOrgLinkRow,
} from "@/lib/surgical-sales/organizationDirectoryRollups";
import { buildOrganizationAttentionItems } from "@/lib/surgical-sales/organizationDirectoryAttention";
import { surgicalCaseRequiresBillingWorkflow } from "@/lib/surgical-sales/billingReadiness";

export const dynamic = "force-dynamic";

const PortalCreateOrganizationSchema = z
  .object({
    name: z.string().max(400),
    surgical_crm_type: z.enum(SURGICAL_ACCOUNT_TYPES),
    surgical_crm_status: z.enum(SURGICAL_ACCOUNT_STATUSES).optional(),
    surgical_crm_website: z.string().max(500).optional().nullable(),
    surgical_crm_phone: z.string().max(80).optional().nullable(),
    surgical_crm_billing_address: z.string().max(8000).optional().nullable(),
    surgical_crm_billing_city: z.string().max(120).optional().nullable(),
    surgical_crm_billing_state: z.string().max(80).optional().nullable(),
    surgical_crm_billing_postal_code: z.string().max(32).optional().nullable(),
    surgical_crm_notes: z.string().max(16000).optional().nullable(),
  })
  .strict();

function trimOrNull(s: string | null | undefined): string | null {
  const t = (s ?? "").trim();
  return t.length ? t : null;
}

const IN_CHUNK = 120;

function todayUtcYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysUtcYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseYmd(s: string | null | undefined): string | null {
  if (!s || typeof s !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  return s.slice(0, 10);
}

function isCancelledCase(status: unknown): boolean {
  return String(status || "").toLowerCase() === "cancelled";
}

function isTerminalCaseStatus(status: unknown): boolean {
  const x = String(status || "").toLowerCase();
  return x === "closed" || x === "cancelled" || x === "complete" || x === "completed" || x === "invoiced";
}

function isScheduleActiveCaseStatus(status: unknown): boolean {
  const x = String(status || "").toLowerCase();
  return x === "scheduled" || x === "rescheduled" || x === "confirmed";
}

/** Cases in a settled state — skip PO/invoice follow-up. */
function isSettledBillingCase(status: unknown): boolean {
  const x = String(status || "").toLowerCase();
  return x === "cancelled" || x === "complete" || x === "completed" || x === "closed" || x === "invoiced";
}

const CONTACT_DIRECTORY_COLUMNS = "id, account_id, organization_id, archived_at, role_type, created_at";

function asContactRecord(row: unknown): OrgDirectoryContactRecord | null {
  return unwrapLinkedContact(row);
}

async function aggregateForAccounts(accountIds: string[]) {
  const contactById = new Map<string, OrgDirectoryContactRecord>();
  const linkRows: OrgDirectoryOrgLinkRow[] = [];
  const caseRows: OrgDirectoryCaseRow[] = [];

  const rememberContact = (row: OrgDirectoryContactRecord | null) => {
    if (!row?.id || contactById.has(row.id)) return;
    contactById.set(row.id, row);
  };

  for (let i = 0; i < accountIds.length; i += IN_CHUNK) {
    const slice = accountIds.slice(i, i + IN_CHUNK);
    const [byAccount, byOrg, linksRes, sRes] = await Promise.all([
      supabaseAdmin.from("surgical_sales_contacts").select(CONTACT_DIRECTORY_COLUMNS).in("account_id", slice),
      supabaseAdmin.from("surgical_sales_contacts").select(CONTACT_DIRECTORY_COLUMNS).in("organization_id", slice),
      supabaseAdmin
        .from("surgical_sales_contact_organizations")
        .select(`contact_id, account_id, is_active, role_type, created_at, surgical_sales_contacts(${CONTACT_DIRECTORY_COLUMNS})`)
        .in("account_id", slice),
      supabaseAdmin
        .from("surgical_sales_cases")
        .select("id, account_id, case_date, status, case_type, expected_revenue, created_at, procedure_type, product_id, archived_at")
        .in("account_id", slice)
        .is("archived_at", null),
    ]);
    for (const row of byAccount.data || []) rememberContact(asContactRecord(row));
    for (const row of byOrg.data || []) rememberContact(asContactRecord(row));
    for (const row of (linksRes.data || []) as Array<OrgDirectoryOrgLinkRow & { surgical_sales_contacts?: unknown }>) {
      linkRows.push({
        contact_id: String(row.contact_id || ""),
        account_id: String(row.account_id || ""),
        is_active: row.is_active,
        role_type: row.role_type,
        created_at: row.created_at,
      });
      rememberContact(unwrapLinkedContact(row.surgical_sales_contacts));
    }
    caseRows.push(...((sRes.data || []) as OrgDirectoryCaseRow[]));
  }

  const missingContactIds = [...new Set(linkRows.map((l) => String(l.contact_id || "").trim()).filter(Boolean))].filter(
    (id) => !contactById.has(id),
  );
  for (let i = 0; i < missingContactIds.length; i += IN_CHUNK) {
    const slice = missingContactIds.slice(i, i + IN_CHUNK);
    const { data } = await supabaseAdmin.from("surgical_sales_contacts").select(CONTACT_DIRECTORY_COLUMNS).in("id", slice);
    for (const row of data || []) rememberContact(asContactRecord(row));
  }

  return {
    contactRows: buildOrganizationDirectoryContactMemberships([...contactById.values()], linkRows),
    caseRows,
  };
}

async function fetchDocumentTypesByCaseId(caseIds: string[]): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  const ids = caseIds.filter(Boolean);
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const slice = ids.slice(i, i + IN_CHUNK);
    const { data } = await supabaseAdmin
      .from("surgical_sales_case_documents")
      .select("case_id, document_type")
      .in("case_id", slice);
    for (const row of data || []) {
      const cid = String((row as { case_id: string }).case_id);
      const t = String((row as { document_type: string }).document_type).toLowerCase();
      if (!map.has(cid)) map.set(cid, new Set());
      map.get(cid)!.add(t);
    }
  }
  return map;
}

function countMap(): Map<string, number> {
  return new Map<string, number>();
}

function bump(m: Map<string, number>, accountId: string, delta = 1) {
  m.set(accountId, (m.get(accountId) || 0) + delta);
}

type NextUpcomingSnapshot = {
  case_date: string;
  procedure_type: string | null;
  product_id: string | null;
};

function maxIso(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (!Number.isFinite(ta)) return b ?? null;
  if (!Number.isFinite(tb)) return a;
  return ta >= tb ? a : b;
}

function computeActivityRollup(caseRows: OrgDirectoryCaseRow[], contactRows: OrgDirectoryContactRow[], todayYmd: string) {
  const lastContactCreatedByAccount = new Map<string, string>();
  const lastCaseCreatedByAccount = new Map<string, string>();
  const nextUpcomingByAccount = new Map<string, NextUpcomingSnapshot>();

  for (const c of contactRows) {
    if (c.archived_at) continue;
    const ts = c.created_at ? String(c.created_at).trim() : "";
    if (!ts) continue;
    const aid = String(c.account_id);
    const cur = lastContactCreatedByAccount.get(aid);
    if (!cur || ts > cur) lastContactCreatedByAccount.set(aid, ts);
  }

  for (const row of caseRows) {
    const aid = String(row.account_id);
    const created = row.created_at ? String(row.created_at).trim() : "";
    if (created) {
      const cur = lastCaseCreatedByAccount.get(aid);
      if (!cur || created > cur) lastCaseCreatedByAccount.set(aid, created);
    }

    if (isCancelledCase(row.status)) continue;
    if (isTerminalCaseStatus(row.status)) continue;
    if (!isScheduleActiveCaseStatus(row.status)) continue;
    const cd = parseYmd(row.case_date);
    if (!cd || cd < todayYmd) continue;
    const prev = nextUpcomingByAccount.get(aid);
    if (!prev || cd < prev.case_date) {
      nextUpcomingByAccount.set(aid, {
        case_date: cd,
        procedure_type: row.procedure_type != null ? String(row.procedure_type) : null,
        product_id: row.product_id != null ? String(row.product_id) : null,
      });
    }
  }

  return { lastContactCreatedByAccount, lastCaseCreatedByAccount, nextUpcomingByAccount };
}

async function fetchProductNamesById(productIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = [...new Set(productIds.filter(Boolean))];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const slice = ids.slice(i, i + IN_CHUNK);
    const { data } = await supabaseAdmin.from("surgical_sales_products").select("id, name").in("id", slice);
    for (const row of data || []) {
      map.set(String((row as { id: string }).id), String((row as { name?: string | null }).name ?? "").trim());
    }
  }
  return map;
}

const SORT_KEYS = new Set(["name", "activity", "contacts", "upcoming", "pipeline"]);

function sortOrganizationsList(
  list: Record<string, unknown>[],
  sort: string,
  dir: "asc" | "desc",
): Record<string, unknown>[] {
  const mult = dir === "desc" ? -1 : 1;
  const nameOf = (a: Record<string, unknown>) => String(a.name || "").toLowerCase();
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const activityTs = (a: Record<string, unknown>) => {
    const raw = a.last_activity_at;
    if (!raw || typeof raw !== "string") return 0;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const out = [...list];
  switch (sort) {
    case "activity":
      out.sort((a, b) => mult * (activityTs(a) - activityTs(b)) || mult * nameOf(a).localeCompare(nameOf(b)));
      break;
    case "contacts":
      out.sort((a, b) => mult * (num(a.contact_count) - num(b.contact_count)) || mult * nameOf(a).localeCompare(nameOf(b)));
      break;
    case "upcoming":
      out.sort(
        (a, b) => mult * (num(a.upcoming_case_count) - num(b.upcoming_case_count)) || mult * nameOf(a).localeCompare(nameOf(b)),
      );
      break;
    case "pipeline":
      out.sort(
        (a, b) =>
          mult * (num(a.upcoming_pipeline_revenue) - num(b.upcoming_pipeline_revenue)) || mult * nameOf(a).localeCompare(nameOf(b)),
      );
      break;
    default:
      out.sort((a, b) => mult * nameOf(a).localeCompare(nameOf(b)));
  }
  return out;
}

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const rep = await userIsInternalSalesRep(auth.user.id);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const type = (url.searchParams.get("type") || "").trim().toLowerCase();
  const status = (url.searchParams.get("status") || "").trim().toLowerCase();
  const sortRaw = (url.searchParams.get("sort") || "name").trim().toLowerCase();
  const sort = SORT_KEYS.has(sortRaw) ? sortRaw : "name";
  const dirRaw = (url.searchParams.get("dir") || "asc").trim().toLowerCase();
  const dir: "asc" | "desc" = dirRaw === "desc" ? "desc" : "asc";

  const typeOk =
    type && (SURGICAL_ACCOUNT_TYPES as readonly string[]).includes(type)
      ? (type as (typeof SURGICAL_ACCOUNT_TYPES)[number])
      : undefined;
  const statusOk = status && ["active", "inactive", "prospect"].includes(status) ? status : undefined;

  const directoryScope = (url.searchParams.get("directory_scope") || "active").trim().toLowerCase();
  const opportunitiesMode = url.searchParams.get("for_opportunities") === "1";
  const scopeArchived = directoryScope === "archived";
  const scopeAll = directoryScope === "all";

  let query = supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select(SURGICAL_CRM_ACCOUNT_COLUMNS).order("name", { ascending: true }).limit(opportunitiesMode ? 5000 : 400);
  if (!opportunitiesMode) {
    query = query.or(SURGICAL_CRM_DIRECTORY_OR_FILTER);
  }
  if (scopeArchived) {
    query = query.not("surgical_crm_archived_at", "is", null);
  } else if (!scopeAll) {
    query = query.is("surgical_crm_archived_at", null);
  }
  if (typeOk) {
    query = query.eq("surgical_crm_type", typeOk);
  }
  if (statusOk) {
    query = query.eq("surgical_crm_status", statusOk);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let accounts = (data || []) as unknown as Record<string, unknown>[];
  if (opportunitiesMode) {
    // Opportunities org selector: include only surgical CRM organizations, not generic accounts.
    accounts = accounts.filter((a) =>
      accountHasSurgicalCrmDirectoryMetadata({
        surgical_crm_created_by: a.surgical_crm_created_by as string | null | undefined,
        surgical_crm_type: a.surgical_crm_type as string | null | undefined,
        surgical_crm_status: a.surgical_crm_status as string | null | undefined,
      }),
    );
  } else {
    accounts = accounts.filter((a) =>
      accountHasSurgicalCrmDirectoryMetadata({
        surgical_crm_created_by: a.surgical_crm_created_by as string | null | undefined,
        surgical_crm_type: a.surgical_crm_type as string | null | undefined,
        surgical_crm_status: a.surgical_crm_status as string | null | undefined,
      }),
    );
  }

  if (!scopeArchived && !scopeAll) {
    accounts = accounts.filter((a) => String(a.surgical_crm_status ?? "").toLowerCase() !== "inactive");
  } else if (scopeArchived) {
    accounts = accounts.filter((a) => String(a.surgical_crm_status ?? "").toLowerCase() !== "inactive");
  }

  const viewerIsAdmin = await isInternalPortalAdmin(auth.user.id);

  if (q) {
    accounts = accounts.filter((a) => String(a.name || "").toLowerCase().includes(q));
  }

  const ids = accounts.map((a) => String(a.id));
  const { contactRows, caseRows } = await aggregateForAccounts(ids);
  const roll = rollupOrganizationDirectoryMetrics(contactRows, caseRows);
  const today = todayUtcYmd();
  const { lastContactCreatedByAccount, lastCaseCreatedByAccount, nextUpcomingByAccount } = computeActivityRollup(
    caseRows,
    contactRows,
    today,
  );
  const productIdsForUpcoming = [...nextUpcomingByAccount.values()].map((v) => v.product_id).filter(Boolean) as string[];
  const productNameBy =
    productIdsForUpcoming.length > 0 ? await fetchProductNamesById(productIdsForUpcoming) : new Map<string, string>();

  const caseIds = caseRows.map((r) => String(r.id || "")).filter(Boolean);
  const docByCase = caseIds.length > 0 ? await fetchDocumentTypesByCaseId(caseIds) : new Map<string, Set<string>>();
  const productLineCountByCase = new Map<string, number>();
  for (let i = 0; i < caseIds.length; i += IN_CHUNK) {
    const slice = caseIds.slice(i, i + IN_CHUNK);
    if (slice.length === 0) break;
    const { data: lineRows } = await supabaseAdmin
      .from("surgical_sales_case_products")
      .select("case_id")
      .in("case_id", slice);
    for (const row of lineRows || []) {
      const cid = String((row as { case_id: string }).case_id);
      productLineCountByCase.set(cid, (productLineCountByCase.get(cid) ?? 0) + 1);
    }
  }

  const missingPoByAccount = countMap();
  const missingInvByAccount = countMap();
  const upcoming7dByAccount = countMap();
  const weekEnd = addDaysUtcYmd(today, 7);

  for (const row of caseRows) {
    const aid = String(row.account_id);
    const st = row.status;
    if (isCancelledCase(st)) continue;
    const cid = String(row.id || "");
    if (cid && !isSettledBillingCase(st)) {
      const types = docByCase.get(cid) ?? new Set();
      const hasPo = types.has("purchase_order");
      const hasInv = types.has("invoice");
      const requiresBilling = surgicalCaseRequiresBillingWorkflow({
        caseType: (row as { case_type?: string | null }).case_type,
        productId: row.product_id,
        productLineCount: productLineCountByCase.get(cid) ?? 0,
      });
      if (requiresBilling && !hasPo) bump(missingPoByAccount, aid);
      if (requiresBilling && !hasInv) bump(missingInvByAccount, aid);
    }
    const cd = parseYmd(row.case_date);
    if (cd && cd >= today && cd <= weekEnd && !isTerminalCaseStatus(st) && isScheduleActiveCaseStatus(st)) {
      bump(upcoming7dByAccount, aid);
    }
  }

  const list = accounts.map((a) => {
    const id = String(a.id);
    const r = roll.get(id);
    const last_case_date = r?.last_case_date ?? null;
    const surgical_crm_updated_at = a.surgical_crm_updated_at as string | null | undefined;
    const last_activity_at = resolveLastActivityAt(last_case_date, surgical_crm_updated_at ?? null);
    const last_contact_created_at = lastContactCreatedByAccount.get(id) ?? null;
    const last_case_created_at = lastCaseCreatedByAccount.get(id) ?? null;
    const recent_pulse_at = maxIso(maxIso(last_activity_at, last_contact_created_at), last_case_created_at);
    const nu = nextUpcomingByAccount.get(id);
    const next_upcoming_case = nu
      ? {
          case_date: nu.case_date,
          procedure_type: nu.procedure_type,
          product_name: nu.product_id ? productNameBy.get(nu.product_id) ?? null : null,
        }
      : null;
    const contact_count = r?.contact_count ?? 0;
    const surgeon_count = r?.surgeon_count ?? 0;
    const attention_items = buildOrganizationAttentionItems({
      accountId: id,
      doctorCount: surgeon_count,
      contactCount: contact_count,
      lastActivityAt: last_activity_at,
      casesMissingPo: missingPoByAccount.get(id) ?? 0,
      casesMissingInvoice: missingInvByAccount.get(id) ?? 0,
      upcomingWithin7d: upcoming7dByAccount.get(id) ?? 0,
    });
    return {
      ...a,
      contact_count,
      surgeon_count,
      doctor_contact_count: surgeon_count,
      last_case_date,
      upcoming_case_count: r?.upcoming_case_count ?? 0,
      upcoming_pipeline_revenue: r?.upcoming_pipeline_revenue ?? 0,
      last_activity_at,
      last_contact_created_at,
      last_case_created_at,
      recent_pulse_at,
      next_upcoming_case,
      attention_items,
    };
  });

  const sorted = sortOrganizationsList(list as Record<string, unknown>[], sort, dir);

  return NextResponse.json({
    ok: true,
    organizations: sorted,
    viewer_id: auth.user.id,
    viewer_is_admin: viewerIsAdmin,
  });
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rep = await userIsInternalSalesRep(auth.user.id);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }

  const parsed = PortalCreateOrganizationSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;
  const name = p.name.trim();
  if (!name) {
    return NextResponse.json(
      {
        ok: false,
        error: "Organization name is required.",
        fieldErrors: { name: ["Enter an organization name."] },
      },
      { status: 400 },
    );
  }

  const status = p.surgical_crm_status ?? "prospect";

  const result = await insertSurgicalOrganizationAccount({
    name,
    discount_percent: 40,
    surgical_crm_type: p.surgical_crm_type,
    surgical_crm_billing_address: trimOrNull(p.surgical_crm_billing_address),
    surgical_crm_shipping_address: null,
    surgical_crm_phone: trimOrNull(p.surgical_crm_phone),
    surgical_crm_website: trimOrNull(p.surgical_crm_website),
    surgical_crm_status: status,
    surgical_crm_notes: trimOrNull(p.surgical_crm_notes),
    surgical_crm_billing_city: trimOrNull(p.surgical_crm_billing_city),
    surgical_crm_billing_state: trimOrNull(p.surgical_crm_billing_state),
    surgical_crm_billing_postal_code: trimOrNull(p.surgical_crm_billing_postal_code),
    surgical_crm_created_by: auth.user.id,
  });

  if (!result.ok) {
    console.error("[portal surgical-accounts POST]", result.error);
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, organization: result.organization });
}
