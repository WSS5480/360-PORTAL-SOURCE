import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { SURGICAL_CRM_ACCOUNT_COLUMNS } from "@/lib/surgical-sales/accountSelectColumns";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { canActorArchiveSurgicalOrganization, logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import type { AccountIntelligence } from "@/lib/surgical-sales/accountIntelligence";
import { fetchSurgicalAccountIntelligence } from "@/lib/surgical-sales/fetchSurgicalAccountIntelligence";
import { enrichSurgicalCasesForList } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import type { SurgicalCaseListRow } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import {
  buildOrganizationActivityFeed,
  mapOrganizationStatusNotes,
} from "@/lib/surgical-sales/buildOrganizationActivityFeed";
import { loadOpportunitiesForOrganization } from "@/lib/surgical-sales/opportunityRelationships";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PatchOrgSchema = z
  .object({
    archive: z.boolean().optional(),
    restore: z.boolean().optional(),
    name: z.string().max(400).optional(),
    surgical_crm_type: z.string().max(80).optional(),
    surgical_crm_status: z.string().max(80).optional(),
    surgical_crm_website: z.string().max(500).optional().nullable(),
    surgical_crm_phone: z.string().max(80).optional().nullable(),
    surgical_crm_billing_address: z.string().max(8000).optional().nullable(),
    surgical_crm_billing_city: z.string().max(120).optional().nullable(),
    surgical_crm_billing_state: z.string().max(80).optional().nullable(),
    surgical_crm_billing_postal_code: z.string().max(32).optional().nullable(),
    surgical_crm_notes: z.string().max(16000).optional().nullable(),
  })
  .strict();

async function loadProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (uniq.length === 0) return map;
  const { data } = await supabaseAdmin.from("user_profiles").select("user_id, full_name, email").in("user_id", uniq);
  for (const r of data || []) {
    const id = String((r as { user_id: string }).user_id);
    const fn = String((r as { full_name?: string | null }).full_name ?? "").trim();
    const em = String((r as { email?: string | null }).email ?? "").trim();
    map.set(id, fn || em || id);
  }
  return map;
}

export async function GET(_req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { accountId } = await ctx.params;
  if (!UUID_RE.test(accountId)) {
    return NextResponse.json({ ok: false, error: "Invalid organization id" }, { status: 400 });
  }

  const ok = await repCanViewSurgicalAccount(uid, accountId, { allowArchived: true });
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const { data: account, error: aErr } = await supabaseAdmin
    .from(SALES_ORGANIZATIONS_TABLE)
    .select(SURGICAL_CRM_ACCOUNT_COLUMNS)
    .eq("id", accountId)
    .maybeSingle();

  if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });
  if (!account) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const [{ data: contactLinks }, { data: cases }] = await Promise.all([
    supabaseAdmin
      .from("surgical_sales_contact_organizations")
      .select("contact_id, role_type, is_primary_org, is_active, specialty, relationship_notes, preferred_hospital, influence_level")
      .eq("account_id", accountId)
      .order("is_primary_org", { ascending: false })
      .order("updated_at", { ascending: false }),
    supabaseAdmin
      .from("surgical_sales_cases")
      .select(
        "id, case_number, account_id, case_date, case_time, status, case_type, sales_rep_id, product_id, surgeon_contact_id, expected_revenue, actual_revenue, updated_at, created_at, notes, billing_reviewed_at, billing_admin_notes, archived_at",
      )
      .eq("account_id", accountId)
      .order("case_date", { ascending: false })
      .limit(100),
  ]);

  const linksByContact = new Map<string, Record<string, unknown>>();
  for (const l of (contactLinks || []) as Record<string, unknown>[]) {
    linksByContact.set(String(l.contact_id), l);
  }

  const { data: legacyContactRows } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .or(`organization_id.eq.${accountId},account_id.eq.${accountId}`)
    .is("archived_at", null)
    .order("last_name", { ascending: true });

  const contactIdSet = new Set<string>([...linksByContact.keys()]);
  for (const row of (legacyContactRows || []) as Record<string, unknown>[]) {
    const id = String(row.id || "");
    if (!id) continue;
    contactIdSet.add(id);
    if (!linksByContact.has(id)) {
      linksByContact.set(id, {
        contact_id: id,
        role_type: row.role_type ?? "other",
        is_primary_org: Boolean(row.is_primary_contact ?? row.is_primary ?? false),
        is_active: true,
        specialty: null,
        relationship_notes: row.notes ?? null,
        preferred_hospital: null,
        influence_level: row.influence_level ?? "unknown",
      });
    }
  }

  const contactIds = [...contactIdSet];
  let contacts: Record<string, unknown>[] = [];
  if (contactIds.length > 0) {
    const { data: allLinks } = await supabaseAdmin
      .from("surgical_sales_contact_organizations")
      .select("contact_id, account_id, is_active")
      .in("contact_id", contactIds)
      .limit(5000);
    const orgCountByContact = new Map<string, number>();
    for (const l of (allLinks || []) as Array<{ contact_id: string; is_active?: boolean | null }>) {
      if (l.is_active === false) continue;
      const k = String(l.contact_id);
      orgCountByContact.set(k, (orgCountByContact.get(k) || 0) + 1);
    }

    const { data: contactRows } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("*")
      .in("id", contactIds)
      .is("archived_at", null)
      .order("last_name", { ascending: true });

    contacts = ((contactRows || []) as Record<string, unknown>[]).map((c) => {
      const link = linksByContact.get(String(c.id)) || {};
      return {
        ...c,
        organization_count: orgCountByContact.get(String(c.id)) || 1,
        org_relationship_role_type: link.role_type ?? null,
        org_relationship_influence_level: link.influence_level ?? null,
        org_relationship_is_primary: Boolean(link.is_primary_org ?? false),
        org_relationship_is_active: Boolean(link.is_active ?? true),
        org_relationship_specialty: link.specialty ?? null,
        org_relationship_notes: link.relationship_notes ?? null,
        org_relationship_preferred_hospital: link.preferred_hospital ?? null,
      };
    });

    const visibleContacts: Record<string, unknown>[] = [];
    for (const contact of contacts) {
      if (await repCanAccessContact(uid, contact as never)) visibleContacts.push(contact);
    }
    contacts = visibleContacts;
  }
  let relationships: Record<string, unknown>[] = [];
  if (contactIds.length > 0) {
    const { data: rels } = await supabaseAdmin
      .from("surgical_sales_contact_relationships")
      .select("*")
      .in("primary_contact_id", contactIds)
      .in("related_contact_id", contactIds)
      .order("updated_at", { ascending: false })
      .limit(1500);
    relationships = (rels ?? []) as Record<string, unknown>[];
  }

  const contactRows = (contacts ?? []) as Array<{
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  }>;

  let account_intelligence: AccountIntelligence | null = null;
  try {
    const bundle = await fetchSurgicalAccountIntelligence({
      accountId,
      contacts: contactRows,
    });
    account_intelligence = bundle.intelligence;
  } catch (e) {
    console.error("[portal surgical-accounts GET] intelligence", e);
  }

  const rawCaseRows = (cases ?? []) as Record<string, unknown>[];
  const listRows: SurgicalCaseListRow[] = rawCaseRows.map((row) => ({
    id: String(row.id),
    case_number: String(row.case_number ?? ""),
    case_type: (row.case_type as string | null | undefined) ?? null,
    account_id: String(row.account_id ?? accountId),
    surgeon_contact_id: (row.surgeon_contact_id as string | null | undefined) ?? null,
    sales_rep_id: row.sales_rep_id != null ? String(row.sales_rep_id) : undefined,
    case_date: (row.case_date as string | null | undefined) ?? null,
    case_time: (row.case_time as string | null | undefined) ?? null,
    status: String(row.status ?? ""),
    product_id: (row.product_id as string | null | undefined) ?? null,
    expected_revenue: (row.expected_revenue as number | null | undefined) ?? null,
    actual_revenue: (row.actual_revenue as number | null | undefined) ?? null,
    notes: (row.notes as string | null | undefined) ?? null,
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
    billing_reviewed_at: (row.billing_reviewed_at as string | null | undefined) ?? null,
    billing_admin_notes: (row.billing_admin_notes as string | null | undefined) ?? null,
    archived_at: (row.archived_at as string | null | undefined) ?? null,
  }));

  const enrichedCases = await enrichSurgicalCasesForList(listRows);

  const caseIds = enrichedCases.map((c) => c.id);
  const caseNumBy = new Map(enrichedCases.map((c) => [c.id, c.case_number]));

  let caseActRows: Array<{
    id: string;
    case_id: string;
    activity_type: string;
    body: string | null;
    metadata_json: unknown;
    created_at: string;
    user_id: string;
  }> = [];

  if (caseIds.length > 0) {
    const { data: acts } = await supabaseAdmin
      .from("surgical_sales_case_activities")
      .select("id, case_id, activity_type, body, metadata_json, created_at, user_id")
      .in("case_id", caseIds)
      .order("created_at", { ascending: false })
      .limit(400);
    caseActRows = (acts || []) as typeof caseActRows;
  }

  const { data: orgNoteRows, error: orgNotesErr } = await supabaseAdmin
    .from("sales_operational_notes")
    .select("id, body, note_type, created_at, created_by_user_id")
    .eq("entity_type", "organization")
    .eq("entity_id", accountId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (orgNotesErr) {
    console.error("[portal surgical-accounts GET] organization notes", orgNotesErr);
  }

  const contactRowsForFeed = (contacts ?? []) as Array<{
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    created_by?: string | null;
  }>;

  const relRowsForFeed = (relationships ?? []) as Array<{
    id: string;
    primary_contact_id: string;
    related_contact_id: string;
    relationship_type: string;
    created_at?: string | null;
    created_by?: string | null;
  }>;

  const userIdsForFeed = new Set<string>();
  for (const a of caseActRows) {
    if (a.user_id) userIdsForFeed.add(String(a.user_id));
  }
  for (const c of contactRowsForFeed) {
    if (c.created_by) userIdsForFeed.add(String(c.created_by));
  }
  for (const r of relRowsForFeed) {
    if (r.created_by) userIdsForFeed.add(String(r.created_by));
  }
  for (const n of orgNoteRows || []) {
    const uid = String((n as { created_by_user_id?: string }).created_by_user_id || "");
    if (uid) userIdsForFeed.add(uid);
  }
  const profileByFeed = await loadProfileNames([...userIdsForFeed]);

  const organization_notes = mapOrganizationStatusNotes(
    (orgNoteRows || []) as Array<{
      id: string;
      body: string | null;
      note_type?: string | null;
      created_at: string;
      created_by_user_id: string;
    }>,
    profileByFeed,
  );

  const account_activity_feed = buildOrganizationActivityFeed({
    caseActivities: caseActRows,
    caseNumberById: caseNumBy,
    contacts: contactRowsForFeed,
    relationships: relRowsForFeed,
    organizationNotes: organization_notes,
    profileBy: profileByFeed,
  });

  const opportunities = await loadOpportunitiesForOrganization(accountId);

  return NextResponse.json({
    ok: true,
    account,
    contacts: contacts ?? [],
    relationships,
    cases: enrichedCases,
    opportunities,
    account_intelligence,
    account_activity_feed,
    organization_notes,
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { accountId } = await ctx.params;
  if (!UUID_RE.test(accountId)) {
    return NextResponse.json({ ok: false, error: "Invalid organization id" }, { status: 400 });
  }

  const gate = await repCanViewSurgicalAccount(uid, accountId, { allowArchived: true });
  if (!gate) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }
  const parsed = PatchOrgSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;
  if (p.archive === true && p.restore === true) {
    return NextResponse.json({ ok: false, error: "Choose archive or restore, not both." }, { status: 400 });
  }

  const { data: account, error: aErr } = await supabaseAdmin
    .from(SALES_ORGANIZATIONS_TABLE)
    .select(SURGICAL_CRM_ACCOUNT_COLUMNS)
    .eq("id", accountId)
    .maybeSingle();
  if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });
  if (!account) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();
  const archivedAt = (account as { surgical_crm_archived_at?: string | null }).surgical_crm_archived_at;

  if (p.archive === true) {
    const permitted = await canActorArchiveSurgicalOrganization({
      actorUserId: uid,
      account: account as { surgical_crm_created_by?: string | null },
    });
    if (!permitted) {
      return NextResponse.json({ ok: false, error: "You can only archive organizations you created (admins can archive any)." }, { status: 403 });
    }
    if (archivedAt) {
      return NextResponse.json({ ok: false, error: "Organization is already archived." }, { status: 400 });
    }
    const { data: updated, error: upErr } = await supabaseAdmin
      .from(SALES_ORGANIZATIONS_TABLE)
      .update({
        surgical_crm_archived_at: now,
        surgical_crm_archived_by: uid,
        surgical_crm_updated_at: now,
      })
      .eq("id", accountId)
      .select(SURGICAL_CRM_ACCOUNT_COLUMNS)
      .maybeSingle();
    if (upErr || !updated) {
      console.error("[portal surgical-accounts PATCH archive]", upErr);
      return NextResponse.json({ ok: false, error: upErr?.message || "Archive failed" }, { status: 500 });
    }
    await logSurgicalSalesCrmAudit({
      actorUserId: uid,
      action: "organization_archived",
      meta: { account_id: accountId },
      req,
    });
    return NextResponse.json({ ok: true, organization: updated });
  }

  if (p.restore === true) {
    const permitted = await canActorArchiveSurgicalOrganization({
      actorUserId: uid,
      account: account as { surgical_crm_created_by?: string | null },
    });
    if (!permitted) {
      return NextResponse.json({ ok: false, error: "You can only restore organizations you created (admins can restore any)." }, { status: 403 });
    }
    if (!archivedAt) {
      return NextResponse.json({ ok: false, error: "Organization is not archived." }, { status: 400 });
    }
    const { data: updated, error: upErr } = await supabaseAdmin
      .from(SALES_ORGANIZATIONS_TABLE)
      .update({
        surgical_crm_archived_at: null,
        surgical_crm_archived_by: null,
        surgical_crm_updated_at: now,
      })
      .eq("id", accountId)
      .select(SURGICAL_CRM_ACCOUNT_COLUMNS)
      .maybeSingle();
    if (upErr || !updated) {
      console.error("[portal surgical-accounts PATCH restore]", upErr);
      return NextResponse.json({ ok: false, error: upErr?.message || "Restore failed" }, { status: 500 });
    }
    await logSurgicalSalesCrmAudit({
      actorUserId: uid,
      action: "organization_restored",
      meta: { account_id: accountId },
      req,
    });
    return NextResponse.json({ ok: true, organization: updated });
  }

  const patch: Record<string, unknown> = { surgical_crm_updated_at: now };
  if (p.name !== undefined) patch.name = p.name.trim();
  if (p.surgical_crm_type !== undefined) patch.surgical_crm_type = p.surgical_crm_type;
  if (p.surgical_crm_status !== undefined) patch.surgical_crm_status = p.surgical_crm_status;
  if (p.surgical_crm_website !== undefined) patch.surgical_crm_website = p.surgical_crm_website;
  if (p.surgical_crm_phone !== undefined) patch.surgical_crm_phone = p.surgical_crm_phone;
  if (p.surgical_crm_billing_address !== undefined) patch.surgical_crm_billing_address = p.surgical_crm_billing_address;
  if (p.surgical_crm_billing_city !== undefined) patch.surgical_crm_billing_city = p.surgical_crm_billing_city;
  if (p.surgical_crm_billing_state !== undefined) patch.surgical_crm_billing_state = p.surgical_crm_billing_state;
  if (p.surgical_crm_billing_postal_code !== undefined) patch.surgical_crm_billing_postal_code = p.surgical_crm_billing_postal_code;
  if (p.surgical_crm_notes !== undefined) patch.surgical_crm_notes = p.surgical_crm_notes;

  const patchKeys = Object.keys(patch).filter((k) => k !== "surgical_crm_updated_at");
  if (patchKeys.length === 0) {
    return NextResponse.json({ ok: false, error: "No changes" }, { status: 400 });
  }

  const { data: updated, error: upErr } = await supabaseAdmin
    .from(SALES_ORGANIZATIONS_TABLE)
    .update(patch)
    .eq("id", accountId)
    .select(SURGICAL_CRM_ACCOUNT_COLUMNS)
    .maybeSingle();
  if (upErr || !updated) {
    return NextResponse.json({ ok: false, error: upErr?.message || "Update failed" }, { status: 500 });
  }
  await logSurgicalSalesCrmAudit({
    actorUserId: uid,
    action: "organization_updated",
    meta: { account_id: accountId, fields: patchKeys },
    req,
  });
  return NextResponse.json({ ok: true, organization: updated });

  return NextResponse.json({ ok: false, error: "Unsupported" }, { status: 400 });
}
