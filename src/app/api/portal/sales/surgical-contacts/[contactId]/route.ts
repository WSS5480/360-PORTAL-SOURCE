import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { isSalesCrmTeamMember } from "@/lib/sales/isSalesCrmTeamMember";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import { formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import {
  mapContactWriteFields,
  mergeContactSalesIntelligenceIntoPatch,
  formatSurgicalContactDbError,
  repCanAccessContact,
  SURGICAL_CONTACT_INFLUENCE_LEVELS,
  SURGICAL_CONTACT_PREFERRED_METHODS,
  SURGICAL_CONTACT_RELATIONSHIP_STRENGTHS,
  SURGICAL_CONTACT_ROLE_TYPES_V2,
  SURGICAL_CONTACT_VERIFICATION_STATUSES,
  upsertContactOrganizationLink,
} from "@/lib/surgical-sales/contactManagement";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { logSurgicalProviderActivity } from "@/lib/surgical-sales/providerActivityLog";
import { isMissingHiddenFromProviderDirectoryColumn } from "@/lib/surgical-sales/providerRemoveScope";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PatchSchema = z
  .object({
    organization_id: z.string().uuid().optional().nullable(),
    first_name: z.string().max(200).optional().nullable(),
    last_name: z.string().max(200).optional().nullable(),
    title: z.string().max(200).optional().nullable(),
    email: z.string().max(320).optional().nullable(),
    phone: z.string().max(80).optional().nullable(),
    mobile_phone: z.string().max(80).optional().nullable(),
    role_type: z.enum(SURGICAL_CONTACT_ROLE_TYPES_V2).optional(),
    influence_level: z.enum(SURGICAL_CONTACT_INFLUENCE_LEVELS).optional(),
    relationship_strength: z.enum(SURGICAL_CONTACT_RELATIONSHIP_STRENGTHS).optional(),
    is_primary: z.boolean().optional(),
    is_primary_contact: z.boolean().optional(),
    notes: z.string().max(8000).optional().nullable(),
    archive: z.boolean().optional(),
    preferred_contact_method: z.enum(SURGICAL_CONTACT_PREFERRED_METHODS).optional(),
    best_time_to_contact: z.string().max(500).optional().nullable(),
    access_notes: z.string().max(8000).optional().nullable(),
    personality_notes: z.string().max(8000).optional().nullable(),
    do_not_contact: z.boolean().optional(),
    last_contacted_at: z.union([z.string(), z.null()]).optional(),
    next_follow_up_at: z.union([z.string(), z.null()]).optional(),
    link_organization_id: z.string().uuid().optional().nullable(),
    link_organization_role_type: z.string().max(80).optional().nullable(),
    verification_status: z.enum(SURGICAL_CONTACT_VERIFICATION_STATUSES).optional(),
  })
  .strict();

async function clearOtherPrimary(accountId: string, keepId: string) {
  await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({ is_primary: false, is_primary_contact: false, updated_at: new Date().toISOString() })
    .or(`organization_id.eq.${accountId},account_id.eq.${accountId}`)
    .neq("id", keepId);
}

async function requireRepAuth() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid };
}

function valuesDiffer(a: unknown, b: unknown): boolean {
  return String(a ?? "").trim() !== String(b ?? "").trim();
}

function stripLocalTimestamp(line: string): string {
  return line.replace(/^\[[^\]]+\]\s*/, "").trim();
}

function appendedAccessNote(prev: unknown, next: unknown): string {
  const before = String(prev ?? "").trim();
  const after = String(next ?? "").trim();
  if (!after) return "Access note cleared.";
  if (!before) return stripLocalTimestamp(after.split(/\r?\n/).at(-1) ?? after);
  if (after.startsWith(before)) {
    const delta = after.slice(before.length).trim();
    if (delta) return stripLocalTimestamp(delta.split(/\r?\n/).at(-1) ?? delta);
  }
  return "Access notes updated.";
}

export async function PATCH(req: Request, ctx: { params: Promise<{ contactId: string }> }) {
  const gate = await requireRepAuth();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const uid = gate.uid;

  const { contactId } = await ctx.params;
  if (!UUID_RE.test(contactId)) {
    return NextResponse.json({ ok: false, error: "Invalid contact id" }, { status: 400 });
  }

  const { data: existing, error: loadErr } = await supabaseAdmin.from("surgical_sales_contacts").select("*").eq("id", contactId).maybeSingle();
  if (loadErr) return NextResponse.json({ ok: false, error: loadErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const canAccessExisting = await repCanAccessContact(uid, existing as Record<string, unknown> as never);
  if (!canAccessExisting) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;
  if (p.archive === true || p.archive === false) {
    if (!(await isSalesCrmTeamMember(uid))) {
      return NextResponse.json(
        { ok: false, error: "You do not have permission to remove or restore this contact." },
        { status: 403 },
      );
    }
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const mapped = mapContactWriteFields({
    organization_id: p.organization_id,
    first_name: p.first_name,
    last_name: p.last_name,
    title: p.title,
    email: p.email,
    phone: p.phone,
    mobile_phone: p.mobile_phone,
    role_type: p.role_type,
    influence_level: p.influence_level,
    relationship_strength: p.relationship_strength,
    is_primary_contact: p.is_primary_contact ?? p.is_primary,
    notes: p.notes,
    verification_status: p.verification_status,
  });
  for (const key of [
    "organization_id",
    "account_id",
    "first_name",
    "last_name",
    "title",
    "email",
    "phone",
    "mobile_phone",
    "role_type",
    "influence_level",
    "relationship_strength",
    "is_primary_contact",
    "is_primary",
    "notes",
    "verification_status",
  ]) {
    if (key in p || (key === "account_id" && "organization_id" in p)) {
      patch[key] = mapped[key];
    }
  }
  if (p.archive === true) {
    const now = new Date().toISOString();
    patch.archived_at = now;
    patch.hidden_from_provider_directory_at = now;
  }
  if (p.archive === false) {
    patch.archived_at = null;
    patch.hidden_from_provider_directory_at = null;
  }

  const intelErr = mergeContactSalesIntelligenceIntoPatch(patch, {
    preferred_contact_method: p.preferred_contact_method,
    best_time_to_contact: p.best_time_to_contact,
    access_notes: p.access_notes,
    personality_notes: p.personality_notes,
    do_not_contact: p.do_not_contact,
    last_contacted_at: p.last_contacted_at,
    next_follow_up_at: p.next_follow_up_at,
  });
  if (intelErr) return NextResponse.json({ ok: false, error: intelErr }, { status: 400 });

  const targetOrg = String((patch.organization_id ?? patch.account_id ?? (existing as { organization_id?: string | null; account_id?: string | null }).organization_id ?? (existing as { account_id?: string | null }).account_id ?? ""));
  if (targetOrg && !(await repCanViewSurgicalAccount(uid, targetOrg))) {
    return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });
  }
  const linkOrgId = p.link_organization_id ?? null;
  if (linkOrgId && !(await repCanViewSurgicalAccount(uid, linkOrgId))) {
    return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });
  }

  const changedFields = Object.keys(patch).filter(
    (key) => key !== "updated_at" && valuesDiffer((existing as Record<string, unknown>)[key], patch[key]),
  );

  let { data, error } = await supabaseAdmin.from("surgical_sales_contacts").update(patch).eq("id", contactId).select("*").single();
  if (error && isMissingHiddenFromProviderDirectoryColumn(error.message) && "hidden_from_provider_directory_at" in patch) {
    const fallbackPatch = { ...patch };
    delete fallbackPatch.hidden_from_provider_directory_at;
    const fallback = await supabaseAdmin.from("surgical_sales_contacts").update(fallbackPatch).eq("id", contactId).select("*").single();
    data = fallback.data;
    error = fallback.error;
  }
  if (error) return NextResponse.json({ ok: false, error: formatSurgicalContactDbError(error.message) }, { status: 500 });

  if (changedFields.includes("access_notes")) {
    const logged = await logSurgicalProviderActivity({
      providerId: contactId,
      userId: uid,
      activityType: "note_added",
      body: appendedAccessNote((existing as Record<string, unknown>).access_notes, patch.access_notes).slice(0, 2000),
      metadataJson: {
        activity_category: "provider_activity",
        source: "surgical_contact_patch",
        changed_fields: ["access_notes"],
      },
    });
    if (!logged.ok) console.warn("[provider-activity] access note activity log skipped:", logged.message);
  }

  const nonNoteChangedFields = changedFields.filter((field) => field !== "access_notes");
  if (nonNoteChangedFields.length > 0) {
    const logged = await logSurgicalProviderActivity({
      providerId: contactId,
      userId: uid,
      activityType: "provider_updated",
      body: `Provider contact updated: ${nonNoteChangedFields.join(", ")}.`,
      metadataJson: {
        activity_category: "provider_profile",
        source: "surgical_contact_patch",
        changed_fields: nonNoteChangedFields,
      },
    });
    if (!logged.ok) console.warn("[provider-activity] contact update activity log skipped:", logged.message);
  }

  if (data?.is_primary || data?.is_primary_contact) {
    const orgId = String((data as { organization_id?: string | null; account_id?: string | null }).organization_id ?? (data as { account_id?: string | null }).account_id ?? "");
    if (orgId) await clearOtherPrimary(orgId, contactId);
  }

  if (p.archive === true) {
    await logSurgicalSalesCrmAudit({
      actorUserId: uid,
      action: "contact_archived",
      meta: { contact_id: contactId },
      req,
    });
  } else if (p.archive === false) {
    await logSurgicalSalesCrmAudit({
      actorUserId: uid,
      action: "contact_restored",
      meta: { contact_id: contactId },
      req,
    });
  }

  if (linkOrgId && data) {
    const roleType =
      p.link_organization_role_type ??
      String((data as { role_type?: string | null }).role_type ?? "other");
    await upsertContactOrganizationLink({
      contactId,
      accountId: linkOrgId,
      actorId: uid,
      roleType,
      isPrimary: false,
    });
  }

  return NextResponse.json({ ok: true, contact: data });
}

export async function GET(_req: Request, ctx: { params: Promise<{ contactId: string }> }) {
  const reqUrl = _req.url ? new URL(_req.url) : null;
  const includeContext = reqUrl?.searchParams.get("include_context") === "1";
  const gate = await requireRepAuth();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const { contactId } = await ctx.params;
  if (!UUID_RE.test(contactId)) {
    return NextResponse.json({ ok: false, error: "Invalid contact id" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*, organization:sales_organizations!organization_id(id,name), account:sales_organizations!account_id(id,name)")
    .eq("id", contactId)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: formatSurgicalContactDbError(error.message) }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!(await repCanAccessContact(gate.uid, data as Record<string, unknown> as never))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (!includeContext) return NextResponse.json({ ok: true, contact: data });

  const { data: orgLinks } = await supabaseAdmin
    .from("surgical_sales_contact_organizations")
    .select("id, account_id, role_type, is_primary_org, is_active, specialty, relationship_notes, preferred_hospital, influence_level, accounts:sales_organizations!account_id(id,name)")
    .eq("contact_id", contactId)
    .order("is_primary_org", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(100);

  const contactIdStr = String(contactId);
  const isDoctor = ["surgeon", "physician_assistant"].includes(String((data as { role_type?: string | null }).role_type || ""));
  const relFilter = isDoctor ? `primary_contact_id.eq.${contactIdStr}` : `related_contact_id.eq.${contactIdStr}`;
  const { data: rels } = await supabaseAdmin
    .from("surgical_sales_contact_relationships")
    .select("*")
    .or(relFilter)
    .order("updated_at", { ascending: false })
    .limit(500);

  const relationships = (rels || []) as Array<Record<string, unknown>>;
  const relatedIds = [
    ...new Set(
      relationships.map((r) =>
        String(
          isDoctor
            ? (r.related_contact_id as string | undefined)
            : (r.primary_contact_id as string | undefined)
        )
      )
    ),
  ].filter((x) => !!x && x !== "undefined");

  let relatedContacts: Record<string, unknown>[] = [];
  if (relatedIds.length > 0) {
    const { data: rc } = await supabaseAdmin.from("surgical_sales_contacts").select("*").in("id", relatedIds);
    relatedContacts = (rc || []) as Record<string, unknown>[];
  }

  const surgeonIds = isDoctor ? [contactIdStr] : relatedIds;
  const { data: caseRows } =
    surgeonIds.length > 0
      ? await supabaseAdmin
          .from("surgical_sales_cases")
          .select("id, case_number, case_date, status, account_id, surgeon_contact_id, updated_at")
          .in("surgeon_contact_id", surgeonIds)
          .order("case_date", { ascending: false })
          .limit(300)
      : { data: [] as Record<string, unknown>[] };

  const cases = (caseRows || []) as Record<string, unknown>[];
  const nowYmd = new Date().toISOString().slice(0, 10);
  const upcomingCases = cases
    .filter((c) => String(c.case_date || "") >= nowYmd)
    .map((c) => ({ ...c, case_number: formatSurgicalCaseNumber(String(c.case_number ?? "")) }));
  const pastCases = cases
    .filter((c) => !c.case_date || String(c.case_date || "") < nowYmd)
    .map((c) => ({ ...c, case_number: formatSurgicalCaseNumber(String(c.case_number ?? "")) }));

  const caseIds = cases.map((c) => String(c.id));
  const { data: activities } =
    caseIds.length > 0
      ? await supabaseAdmin
          .from("surgical_sales_case_activities")
          .select("id, case_id, activity_type, body, user_id, created_at")
          .in("case_id", caseIds)
          .order("created_at", { ascending: false })
          .limit(200)
      : { data: [] as Record<string, unknown>[] };

  return NextResponse.json({
    ok: true,
    contact: data,
    organization_links: orgLinks || [],
    organization_count: (orgLinks || []).length,
    relationships,
    related_contacts: relatedContacts,
    upcoming_cases: upcomingCases,
    past_cases: pastCases,
    activities: activities || [],
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ contactId: string }> }) {
  const gate = await requireRepAuth();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const { contactId } = await ctx.params;
  if (!UUID_RE.test(contactId)) {
    return NextResponse.json({ ok: false, error: "Invalid contact id" }, { status: 400 });
  }
  const { data: existing } = await supabaseAdmin.from("surgical_sales_contacts").select("*").eq("id", contactId).maybeSingle();
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!(await repCanAccessContact(gate.uid, existing as Record<string, unknown> as never))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  const now = new Date().toISOString();
  let { data, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({ archived_at: now, hidden_from_provider_directory_at: now, updated_at: now })
    .eq("id", contactId)
    .select("*")
    .single();
  if (error && isMissingHiddenFromProviderDirectoryColumn(error.message)) {
    const fallback = await supabaseAdmin
      .from("surgical_sales_contacts")
      .update({ archived_at: now, updated_at: now })
      .eq("id", contactId)
      .select("*")
      .single();
    data = fallback.data;
    error = fallback.error;
  }
  if (error) return NextResponse.json({ ok: false, error: formatSurgicalContactDbError(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true, contact: data });
}
