import { supabaseAdmin } from "@/lib/supabase/admin";
import { isInternalPortalAdmin } from "@/lib/sales/isInternalPortalAdmin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { contactDisplayName, formatSurgicalCaseNumber, formatSurgicalCaseStatus, formatSurgicalContactRole } from "@/lib/surgical-sales/labels";
import { loadActiveSurgicalOrganizationIds } from "@/lib/surgical-sales/repAccountVisibility";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";

const MIN_LEN = 2;
const LIM = 8;
const CASE_MERGE_CAP = 12;
const CHUNK = 200;

export function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** PostgREST filter value with wildcards (must be double-quoted in `or` clauses). */
function quoteIlikePattern(p: string): string {
  return `"${p.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function searchContactsByNameEmail(p: string, extra?: { accountIds?: string[] }) {
  const base = () =>
    supabaseAdmin
      .from("surgical_sales_contacts")
      .select("id, account_id, organization_id, first_name, last_name, email, role_type")
      .is("archived_at", null);

  const qFn = extra?.accountIds?.length
    ? base().in("account_id", extra.accountIds).ilike("first_name", p).limit(6)
    : base().ilike("first_name", p).limit(6);
  const qLn = extra?.accountIds?.length
    ? base().in("account_id", extra.accountIds).ilike("last_name", p).limit(6)
    : base().ilike("last_name", p).limit(6);
  const qEm = extra?.accountIds?.length
    ? base().in("account_id", extra.accountIds).ilike("email", p).limit(6)
    : base().ilike("email", p).limit(6);

  const [fn, ln, em] = await Promise.all([qFn, qLn, qEm]);
  const byId = new Map<
    string,
    {
      id: string;
      account_id: string;
      organization_id?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      role_type?: string | null;
    }
  >();
  for (const row of [...(fn.data || []), ...(ln.data || []), ...(em.data || [])]) {
    const r = row as {
      id: string;
      account_id: string;
      organization_id?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      role_type?: string | null;
    };
    byId.set(r.id, r);
  }
  return [...byId.values()];
}

export type GlobalSearchHit = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  actions?: Array<{ label: string; href: string }>;
  /** CRM dropdown: human role (e.g. Surgeon, Office manager) or "Case" / "Organization". */
  roleLabel?: string | null;
  organizationName?: string | null;
  organizationId?: string | null;
  relationshipLabel?: string | null;
};

export type GlobalSearchGroups = {
  accounts: GlobalSearchHit[];
  cases: GlobalSearchHit[];
  contacts: GlobalSearchHit[];
  products: GlobalSearchHit[];
  skus: GlobalSearchHit[];
  organizations: GlobalSearchHit[];
  doctors: GlobalSearchHit[];
  supporting_contacts: GlobalSearchHit[];
};

function emptyGroups(): GlobalSearchGroups {
  return {
    accounts: [],
    cases: [],
    contacts: [],
    products: [],
    skus: [],
    organizations: [],
    doctors: [],
    supporting_contacts: [],
  };
}

type CaseRow = {
  id: string;
  case_number: string;
  account_id: string;
  surgeon_contact_id: string | null;
  case_date: string | null;
  status: string;
};

async function batchSalesOrganizationNames(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    if (slice.length === 0) break;
    const { data } = await supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").in("id", slice);
    for (const a of data || []) {
      out.set(String((a as { id: string }).id), String((a as { name?: string | null }).name ?? "—"));
    }
  }
  return out;
}

async function batchSurgeonNames(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    if (slice.length === 0) break;
    const { data } = await supabaseAdmin.from("surgical_sales_contacts").select("id, first_name, last_name, email").in("id", slice);
    for (const c of data || []) {
      out.set(
        String((c as { id: string }).id),
        contactDisplayName(c as { first_name?: string | null; last_name?: string | null; email?: string | null })
      );
    }
  }
  return out;
}

async function batchProductNames(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    if (slice.length === 0) break;
    const { data } = await supabaseAdmin.from("surgical_sales_products").select("id, name").in("id", slice);
    for (const p of data || []) {
      out.set(String((p as { id: string }).id), String((p as { name?: string | null }).name ?? "—"));
    }
  }
  return out;
}

async function mergeAndEnrichCases(rows: CaseRow[], caseLink: "portal" | "admin"): Promise<GlobalSearchHit[]> {
  const byId = new Map<string, CaseRow>();
  for (const r of rows) {
    if (!byId.has(r.id)) byId.set(r.id, r);
  }
  const merged = [...byId.values()].sort((a, b) => {
    const ad = a.case_date || "";
    const bd = b.case_date || "";
    return bd.localeCompare(ad);
  });
  const slice = merged.slice(0, CASE_MERGE_CAP);
  const aids = [...new Set(slice.map((r) => r.account_id))];
  const sids = [...new Set(slice.map((r) => r.surgeon_contact_id).filter(Boolean))] as string[];
  const [accountBy, surgeonBy] = await Promise.all([batchSalesOrganizationNames(aids), batchSurgeonNames(sids)]);
  return slice.map((r) => {
    const orgName = accountBy.get(r.account_id) ?? "Organization";
    const surgeonNm = r.surgeon_contact_id ? surgeonBy.get(r.surgeon_contact_id) ?? null : null;
    const statusLabel = formatSurgicalCaseStatus(r.status);
    const base: GlobalSearchHit = {
      id: r.id,
      title: formatSurgicalCaseNumber(r.case_number),
      subtitle: `${orgName} · ${surgeonNm ?? "—"} · ${statusLabel}`,
      href:
        caseLink === "admin"
          ? `/portal/sales/cases/${encodeURIComponent(r.id)}`
          : `/portal/sales/cases/${encodeURIComponent(r.id)}`,
      roleLabel: "Case",
      organizationName: orgName,
      organizationId: r.account_id,
      relationshipLabel: surgeonNm ? `Surgeon: ${surgeonNm}` : null,
    };
    if (caseLink === "portal") {
      const newCaseHref = `/portal/sales/cases/new?account_id=${encodeURIComponent(r.account_id)}${
        r.surgeon_contact_id ? `&surgeon_contact_id=${encodeURIComponent(r.surgeon_contact_id)}` : ""
      }`;
      const linkContactHref = `/portal/sales/accounts/${encodeURIComponent(r.account_id)}?tab=contacts`;
      return {
        ...base,
        actions: [
          { label: "Open", href: base.href },
          { label: "Create case", href: newCaseHref },
          { label: "Link contact", href: linkContactHref },
        ],
      };
    }
    return base;
  });
}

/** Full organization search (admin). Case links open Sales Command case detail. */
export async function runAdminGlobalSearch(raw: string): Promise<GlobalSearchGroups> {
  const t = raw.trim();
  if (t.length < MIN_LEN) return emptyGroups();
  const p = `%${escapeIlike(t)}%`;

  const [accRes, salesOrgRes, contactRowsRaw, caseNumRes, caseProcRes, prodRes, skuRes] = await Promise.all([
    supabaseAdmin.from("accounts").select("id, name").ilike("name", p).order("name", { ascending: true }).limit(LIM),
    supabaseAdmin
      .from(SALES_ORGANIZATIONS_TABLE)
      .select("id, name, surgical_crm_archived_at, surgical_crm_status")
      .is("surgical_crm_archived_at", null)
      .ilike("name", p)
      .order("name", { ascending: true })
      .limit(LIM),
    searchContactsByNameEmail(p),
    supabaseAdmin
      .from("surgical_sales_cases")
      .select("id, case_number, account_id, surgeon_contact_id, case_date, status")
      .ilike("case_number", p)
      .order("case_date", { ascending: false })
      .limit(LIM),
    supabaseAdmin
      .from("surgical_sales_cases")
      .select("id, case_number, account_id, surgeon_contact_id, case_date, status")
      .ilike("procedure_type", p)
      .order("case_date", { ascending: false })
      .limit(LIM),
    supabaseAdmin.from("surgical_sales_products").select("id, name").ilike("name", p).order("name", { ascending: true }).limit(LIM),
    supabaseAdmin
      .from("surgical_sales_product_skus")
      .select("id, sku, description, product_id")
      .or(`sku.ilike.${quoteIlikePattern(p)},description.ilike.${quoteIlikePattern(p)}`)
      .limit(LIM),
  ]);

  const accountRows = (accRes.data || []) as { id: string; name?: string | null }[];
  const salesOrgRows = ((salesOrgRes.data || []) as { id: string; name?: string | null; surgical_crm_status?: string | null }[])
    .filter((a) => String(a.surgical_crm_status ?? "").toLowerCase() !== "inactive");
  const accountIdsFromName = [...new Set([...accountRows.map((a) => a.id), ...salesOrgRows.map((a) => a.id)])];

  const contactRows = contactRowsRaw.slice(0, LIM) as {
    id: string;
    account_id: string;
    organization_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    role_type?: string | null;
  }[];
  const surgeonIdsFromContacts = contactRows.map((c) => c.id);

  const [caseByAccountRes, caseBySurgeonRes] = await Promise.all([
    accountIdsFromName.length
      ? supabaseAdmin
          .from("surgical_sales_cases")
          .select("id, case_number, account_id, surgeon_contact_id, case_date, status")
          .in("account_id", accountIdsFromName)
          .order("case_date", { ascending: false })
          .limit(LIM)
      : Promise.resolve({ data: [] as CaseRow[] }),
    surgeonIdsFromContacts.length
      ? supabaseAdmin
          .from("surgical_sales_cases")
          .select("id, case_number, account_id, surgeon_contact_id, case_date, status")
          .in("surgeon_contact_id", surgeonIdsFromContacts)
          .order("case_date", { ascending: false })
          .limit(LIM)
      : Promise.resolve({ data: [] as CaseRow[] }),
  ]);

  const caseBuckets: CaseRow[] = [
    ...((caseNumRes.data || []) as CaseRow[]),
    ...((caseProcRes.data || []) as CaseRow[]),
    ...((caseByAccountRes.data || []) as CaseRow[]),
    ...((caseBySurgeonRes.data || []) as CaseRow[]),
  ];

  const accountHits: GlobalSearchHit[] = accountRows.map((a) => ({
    id: a.id,
    title: String(a.name ?? "Account"),
    subtitle: "Account",
    href: `/admin/accounts/${encodeURIComponent(a.id)}`,
  }));

  const contactOrgKeys = [...new Set(contactRows.map((c) => String(c.organization_id ?? c.account_id)))];
  const accountNameBy = await batchSalesOrganizationNames(contactOrgKeys);
  const contactHits: GlobalSearchHit[] = contactRows.map((c) => {
    const oid = String(c.organization_id ?? c.account_id);
    return {
      id: c.id,
      title: contactDisplayName(c),
      subtitle: `Contact · ${accountNameBy.get(oid) ?? "Organization"}`,
      href: `/portal/sales/accounts/${encodeURIComponent(c.account_id)}?tab=contacts&focus_contact=${encodeURIComponent(c.id)}`,
    };
  });

  const caseHits = await mergeAndEnrichCases(caseBuckets, "admin");

  const productHits: GlobalSearchHit[] = ((prodRes.data || []) as { id: string; name?: string | null }[]).map((pr) => ({
    id: pr.id,
    title: String(pr.name ?? "Product"),
    subtitle: "Surgical product",
    href: `/portal/sales/cases?product_id=${encodeURIComponent(pr.id)}`,
  }));

  const skuRows = (skuRes.data || []) as { id: string; sku?: string | null; description?: string | null; product_id: string }[];
  const prodIds = [...new Set(skuRows.map((s) => s.product_id))];
  const pnameBy = await batchProductNames(prodIds);
  const skuHits: GlobalSearchHit[] = skuRows.map((s) => ({
    id: s.id,
    title: String(s.sku ?? "SKU"),
    subtitle: `${pnameBy.get(s.product_id) ?? "Product"}${s.description ? ` · ${String(s.description).slice(0, 80)}` : ""}`,
    href: `/portal/sales/cases?product_id=${encodeURIComponent(s.product_id)}`,
  }));

  return {
    accounts: accountHits,
    cases: caseHits,
    contacts: contactHits,
    products: productHits,
    skus: skuHits,
    organizations: [],
    doctors: [],
    supporting_contacts: [],
  };
}

/** Portal internal sales rep: shared team CRM search (orgs/contacts/cases). */
export async function runPortalSalesGlobalSearch(userId: string, raw: string): Promise<GlobalSearchGroups> {
  const t = raw.trim();
  if (t.length < MIN_LEN) return emptyGroups();
  const p = `%${escapeIlike(t)}%`;

  const orgIds = await loadActiveSurgicalOrganizationIds(userId);
  const orgArr = [...orgIds];
  const viewerIsAdmin = await isInternalPortalAdmin(userId);

  const contactRowsRaw =
    orgArr.length === 0
      ? []
      : orgArr.length > 400
        ? (await searchContactsByNameEmail(p)).filter((c) => orgIds.has(c.account_id)).slice(0, LIM)
        : await searchContactsByNameEmail(p, { accountIds: orgArr }).then((rows) => rows.filter((c) => orgIds.has(c.account_id)).slice(0, LIM));

  const scopedContactRowsRaw = viewerIsAdmin
    ? contactRowsRaw
    : (
        await Promise.all(
          contactRowsRaw.map(async (row) => ((await repCanAccessContact(userId, row as never)) ? row : null)),
        )
      ).filter(Boolean) as typeof contactRowsRaw;

  const [accCandRes, caseNumRes, caseProcRes, prodRes, skuRes, contactRichRes] = await Promise.all([
    supabaseAdmin
      .from(SALES_ORGANIZATIONS_TABLE)
      .select("id, name, surgical_crm_archived_at, surgical_crm_status")
      .is("surgical_crm_archived_at", null)
      .ilike("name", p)
      .order("name", { ascending: true })
      .limit(24),
    supabaseAdmin
      .from("surgical_sales_cases")
      .select("id, case_number, account_id, surgeon_contact_id, case_date, status")
      .ilike("case_number", p)
      .order("case_date", { ascending: false })
      .limit(LIM),
    supabaseAdmin
      .from("surgical_sales_cases")
      .select("id, case_number, account_id, surgeon_contact_id, case_date, status")
      .ilike("procedure_type", p)
      .order("case_date", { ascending: false })
      .limit(LIM),
    supabaseAdmin.from("surgical_sales_products").select("id, name").ilike("name", p).order("name", { ascending: true }).limit(LIM),
    supabaseAdmin
      .from("surgical_sales_product_skus")
      .select("id, sku, description, product_id")
      .or(`sku.ilike.${quoteIlikePattern(p)},description.ilike.${quoteIlikePattern(p)}`)
      .limit(LIM),
    supabaseAdmin
      .from("surgical_sales_contacts")
      .select("id, organization_id, account_id, first_name, last_name, email, phone, mobile_phone, role_type, archived_at")
      .is("archived_at", null)
      .or(`first_name.ilike.${quoteIlikePattern(p)},last_name.ilike.${quoteIlikePattern(p)},email.ilike.${quoteIlikePattern(p)},phone.ilike.${quoteIlikePattern(p)},mobile_phone.ilike.${quoteIlikePattern(p)}`)
      .limit(120),
  ]);

  const accFiltered = ((accCandRes.data || []) as { id: string; name?: string | null; surgical_crm_status?: string | null }[])
    .filter((a) => orgIds.has(a.id) && String(a.surgical_crm_status ?? "").toLowerCase() !== "inactive")
    .slice(0, LIM);

  const accountIdsFromName = accFiltered.map((a) => a.id);

  const contactRows = scopedContactRowsRaw as {
    id: string;
    account_id: string;
    organization_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    role_type?: string | null;
  }[];
  const contactRichRowsAll = ((contactRichRes.data || []) as Array<{
    id: string;
    organization_id?: string | null;
    account_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile_phone?: string | null;
    role_type?: string | null;
    created_by?: string | null;
    created_by_user_id?: string | null;
  }>).filter((c) => {
    const orgId = String(c.organization_id ?? c.account_id ?? "");
    return !orgId || orgIds.has(orgId);
  });

  const contactRichRows = viewerIsAdmin
    ? contactRichRowsAll
    : (
        await Promise.all(
          contactRichRowsAll.map(async (row) => ((await repCanAccessContact(userId, row as never)) ? row : null)),
        )
      ).filter(Boolean) as typeof contactRichRowsAll;

  const [caseByAccountRes, caseBySurgeonRes] = await Promise.all([
    accountIdsFromName.length
      ? supabaseAdmin
          .from("surgical_sales_cases")
          .select("id, case_number, account_id, surgeon_contact_id, case_date, status")
          .in("account_id", accountIdsFromName)
          .order("case_date", { ascending: false })
          .limit(LIM)
      : Promise.resolve({ data: [] as CaseRow[] }),
    contactRows.length
      ? supabaseAdmin
          .from("surgical_sales_cases")
          .select("id, case_number, account_id, surgeon_contact_id, case_date, status")
          .in(
            "surgeon_contact_id",
            contactRows.map((c) => c.id)
          )
          .order("case_date", { ascending: false })
          .limit(LIM)
      : Promise.resolve({ data: [] as CaseRow[] }),
  ]);

  const caseBuckets: CaseRow[] = [
    ...((caseNumRes.data || []) as CaseRow[]),
    ...((caseProcRes.data || []) as CaseRow[]),
    ...((caseByAccountRes.data || []) as CaseRow[]),
    ...((caseBySurgeonRes.data || []) as CaseRow[]),
  ];

  const contactOrgKeys = [...new Set(contactRows.map((c) => String(c.organization_id ?? c.account_id)))];
  const accountNameBy = await batchSalesOrganizationNames(contactOrgKeys);
  const contactHits: GlobalSearchHit[] = contactRows.map((c) => {
    const oid = String(c.organization_id ?? c.account_id);
    const orgName = accountNameBy.get(oid) ?? "Organization";
    const roleLabel = formatSurgicalContactRole(c.role_type);
    const isDoctor = ["surgeon", "physician_assistant"].includes(String(c.role_type || ""));
    const openHref = `/portal/sales/contacts/${encodeURIComponent(c.id)}`;
    const newCaseHref = `/portal/sales/cases/new?account_id=${encodeURIComponent(oid)}${
      isDoctor ? `&surgeon_contact_id=${encodeURIComponent(c.id)}` : ""
    }`;
    const linkHref = isDoctor
      ? `/portal/sales/contacts/${encodeURIComponent(c.id)}?manage=1`
      : `/portal/sales/accounts/${encodeURIComponent(oid)}?tab=contacts`;
    return {
      id: c.id,
      title: contactDisplayName(c),
      subtitle: `${roleLabel} · ${orgName}`,
      href: openHref,
      roleLabel,
      organizationName: orgName,
      organizationId: oid,
      relationshipLabel: null,
      actions: [
        { label: "Open", href: openHref },
        { label: "Create case", href: newCaseHref },
        { label: "Link contact", href: linkHref },
      ],
    };
  });

  const productHits: GlobalSearchHit[] = ((prodRes.data || []) as { id: string; name?: string | null }[]).map((pr) => ({
    id: pr.id,
    title: String(pr.name ?? "Product"),
    subtitle: "Surgical product",
    href: `/portal/sales/cases?product_id=${encodeURIComponent(pr.id)}`,
  }));

  const skuRows = (skuRes.data || []) as { id: string; sku?: string | null; description?: string | null; product_id: string }[];
  const prodIds = [...new Set(skuRows.map((s) => s.product_id))];
  const pnameBy = await batchProductNames(prodIds);
  const skuHits: GlobalSearchHit[] = skuRows.map((s) => ({
    id: s.id,
    title: String(s.sku ?? "SKU"),
    subtitle: `${pnameBy.get(s.product_id) ?? "Product"}${s.description ? ` · ${String(s.description).slice(0, 80)}` : ""}`,
    href: `/portal/sales/cases?product_id=${encodeURIComponent(s.product_id)}`,
  }));

  const caseHits = await mergeAndEnrichCases(caseBuckets, "portal");

  const richOrgIds = [...new Set(contactRichRows.map((c) => String(c.organization_id ?? c.account_id ?? "")).filter(Boolean))];
  const richOrgNames = await batchSalesOrganizationNames(richOrgIds);
  const byContactId = new Map(contactRichRows.map((c) => [String(c.id), c]));
  const supportContactIds = contactRichRows
    .filter((c) => !["surgeon", "physician_assistant"].includes(String(c.role_type || "")))
    .map((c) => String(c.id));
  const doctorBySupport = new Map<string, string[]>();
  if (supportContactIds.length > 0) {
    const { data: rels } = await supabaseAdmin
      .from("surgical_sales_contact_relationships")
      .select("primary_contact_id, related_contact_id")
      .in("related_contact_id", supportContactIds)
      .limit(300);
    const primaryIds = [...new Set((rels || []).map((r) => String((r as { primary_contact_id: string }).primary_contact_id)))];
    const { data: primaryContacts } =
      primaryIds.length > 0
        ? await supabaseAdmin.from("surgical_sales_contacts").select("id, first_name, last_name, email").in("id", primaryIds)
        : { data: [] as Array<Record<string, unknown>> };
    const pName = new Map<string, string>();
    for (const c of (primaryContacts || []) as Array<{ id: string; first_name?: string | null; last_name?: string | null; email?: string | null }>) {
      pName.set(String(c.id), contactDisplayName(c));
    }
    for (const r of (rels || []) as Array<{ primary_contact_id: string; related_contact_id: string }>) {
      const rid = String(r.related_contact_id);
      const name = pName.get(String(r.primary_contact_id));
      if (!name) continue;
      if (!doctorBySupport.has(rid)) doctorBySupport.set(rid, []);
      doctorBySupport.get(rid)!.push(name);
    }
  }

  const doctorsHits: GlobalSearchHit[] = contactRichRows
    .filter((c) => ["surgeon", "physician_assistant"].includes(String(c.role_type || "")))
    .slice(0, LIM)
    .map((c) => {
      const cid = String(c.id);
      const orgId = String(c.organization_id ?? c.account_id ?? "");
      const orgName = orgId ? richOrgNames.get(orgId) ?? "Unassigned" : "Unassigned";
      const emailPhone = [c.email, c.phone || c.mobile_phone].filter(Boolean).join(" · ") || "No contact details";
      const roleLabel = formatSurgicalContactRole(c.role_type);
      const openHref = `/portal/sales/contacts/${encodeURIComponent(cid)}`;
      return {
        id: cid,
        title: contactDisplayName(c),
        subtitle: `${roleLabel} · ${orgName} · ${emailPhone}`,
        href: openHref,
        roleLabel,
        organizationName: orgName,
        organizationId: orgId || null,
        relationshipLabel: null,
        actions: [
          { label: "Open", href: openHref },
          {
            label: "Create case",
            href: `/portal/sales/cases/new?account_id=${encodeURIComponent(orgId)}&surgeon_contact_id=${encodeURIComponent(cid)}`,
          },
          { label: "Link contact", href: `/portal/sales/contacts/${encodeURIComponent(cid)}?manage=1` },
        ],
      };
    });

  const supportHits: GlobalSearchHit[] = contactRichRows
    .filter((c) => !["surgeon", "physician_assistant"].includes(String(c.role_type || "")))
    .slice(0, LIM)
    .map((c) => {
      const cid = String(c.id);
      const orgId = String(c.organization_id ?? c.account_id ?? "");
      const orgName = orgId ? richOrgNames.get(orgId) ?? "Unassigned" : "Unassigned";
      const supported = (doctorBySupport.get(cid) || []).slice(0, 2);
      const supportsLabel = supported.length ? `Supports: ${supported.join(", ")}` : "No linked surgeons";
      const emailPhone = [c.email, c.phone || c.mobile_phone].filter(Boolean).join(" · ") || "No contact details";
      const roleLabel = formatSurgicalContactRole(c.role_type);
      const openHref = `/portal/sales/contacts/${encodeURIComponent(cid)}`;
      return {
        id: cid,
        title: contactDisplayName(c),
        subtitle: `${roleLabel} · ${orgName} · ${supportsLabel} · ${emailPhone}`,
        href: openHref,
        roleLabel,
        organizationName: orgName,
        organizationId: orgId || null,
        relationshipLabel: supportsLabel,
        actions: [
          { label: "Open", href: openHref },
          { label: "Create case", href: `/portal/sales/cases/new?account_id=${encodeURIComponent(orgId)}` },
          { label: "Link contact", href: orgId ? `/portal/sales/accounts/${encodeURIComponent(orgId)}?tab=contacts` : "/portal/sales/accounts" },
        ],
      };
    });

  const organizationHits: GlobalSearchHit[] = accFiltered.map((a) => {
    const name = String(a.name ?? "Organization");
    const href = `/portal/sales/accounts/${encodeURIComponent(a.id)}`;
    return {
      id: a.id,
      title: name,
      subtitle: name,
      href,
      roleLabel: "Organization",
      organizationName: name,
      organizationId: a.id,
      relationshipLabel: null,
      actions: [
        { label: "Open", href },
        { label: "Create case", href: `/portal/sales/cases/new?account_id=${encodeURIComponent(a.id)}` },
        { label: "Link contact", href: `/portal/sales/accounts/${encodeURIComponent(a.id)}?tab=contacts` },
      ],
    };
  });

  return {
    accounts: [],
    cases: caseHits,
    contacts: contactHits,
    products: productHits,
    skus: skuHits,
    organizations: organizationHits,
    doctors: doctorsHits,
    supporting_contacts: supportHits,
  };
}
