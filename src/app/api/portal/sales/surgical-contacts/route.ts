import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
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

export const dynamic = "force-dynamic";

const ContactCreateSchema = z
  .object({
    organization_id: z.string().uuid().optional().nullable(),
    first_name: z.string().max(200).optional().nullable(),
    last_name: z.string().max(200).optional().nullable(),
    title: z.string().max(200).optional().nullable(),
    email: z.string().max(320).optional().nullable(),
    phone: z.string().max(80).optional().nullable(),
    mobile_phone: z.string().max(80).optional().nullable(),
    role_type: z.enum(SURGICAL_CONTACT_ROLE_TYPES_V2).optional().default("other"),
    influence_level: z.enum(SURGICAL_CONTACT_INFLUENCE_LEVELS).optional().default("unknown"),
    relationship_strength: z.enum(SURGICAL_CONTACT_RELATIONSHIP_STRENGTHS).optional().default("unknown"),
    is_primary_contact: z.boolean().optional(),
    notes: z.string().max(8000).optional().nullable(),
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

async function requireRep() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid };
}

export async function GET(req: Request) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const organizationId = (url.searchParams.get("organization_id") || "").trim();
  const roleType = (url.searchParams.get("role_type") || "").trim();
  const contactKind = (url.searchParams.get("contact_kind") || "").trim();
  const specialtyQ = (url.searchParams.get("specialty") || "").trim().toLowerCase();
  const includeArchived = url.searchParams.get("include_archived") === "1";

  if (organizationId && !(await repCanViewSurgicalAccount(gate.uid, organizationId))) {
    return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });
  }

  let query = supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*, organization:sales_organizations!organization_id(id,name), account:sales_organizations!account_id(id,name)")
    .order("updated_at", { ascending: false })
    .limit(700);
  if (!includeArchived) query = query.is("archived_at", null);
  if (organizationId) query = query.or(`organization_id.eq.${organizationId},account_id.eq.${organizationId}`);
  if (roleType) query = query.eq("role_type", roleType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: formatSurgicalContactDbError(error.message) }, { status: 500 });

  const allowed: Record<string, unknown>[] = [];
  for (const row of (data || []) as Record<string, unknown>[]) {
    if (await repCanAccessContact(gate.uid, row as never)) allowed.push(row);
  }

  const allowedIds = allowed.map((row) => String((row as { id: string }).id)).filter(Boolean);
  const orgLinksByContact = new Map<string, Array<Record<string, unknown>>>();
  if (allowedIds.length > 0) {
    const { data: links } = await supabaseAdmin
      .from("surgical_sales_contact_organizations")
      .select("contact_id, account_id, role_type, specialty, is_primary_org, is_active, influence_level, accounts:sales_organizations!account_id(id,name)")
      .in("contact_id", allowedIds)
      .limit(3000);
    for (const row of (links || []) as Array<Record<string, unknown>>) {
      const key = String(row.contact_id || "");
      const arr = orgLinksByContact.get(key) || [];
      arr.push(row);
      orgLinksByContact.set(key, arr);
    }
  }

  const isClinicianRole = (r: string) => ["surgeon", "physician_assistant"].includes(r);
  const contacts = allowed
    .map((row) => {
      const id = String((row as { id: string }).id);
      const links = orgLinksByContact.get(id) || [];
      const activeLinks = links.filter((l) => Boolean(l.is_active ?? true));
      return {
        ...row,
        organization_count: activeLinks.length || links.length,
        organization_links: links,
      };
    })
    .filter((row) => {
    if (!q) return true;
    const orgName = String((row as { organization?: { name?: string | null } | null }).organization?.name || "").toLowerCase();
    const acctName = String((row as { account?: { name?: string | null } | null }).account?.name || "").toLowerCase();
    const first = String((row as { first_name?: string | null }).first_name || "").toLowerCase();
    const last = String((row as { last_name?: string | null }).last_name || "").toLowerCase();
    const email = String((row as { email?: string | null }).email || "").toLowerCase();
    const phone = String((row as { phone?: string | null }).phone || "").toLowerCase();
    const mobile = String((row as { mobile_phone?: string | null }).mobile_phone || "").toLowerCase();
      const specs = ((row as { organization_links?: Array<{ specialty?: string | null }> }).organization_links || [])
        .map((x) => String(x.specialty || "").toLowerCase())
        .join(" ");
      return [orgName, acctName, first, last, email, phone, mobile, `${first} ${last}`, specs].some((v) => v.includes(q));
    })
    .filter((row) => {
      if (!specialtyQ) return true;
      const specs = ((row as { organization_links?: Array<{ specialty?: string | null }> }).organization_links || [])
        .map((x) => String(x.specialty || "").toLowerCase())
        .join(" ");
      return specs.includes(specialtyQ);
    })
    .filter((row) => {
      if (!contactKind) return true;
      const role = String((row as { role_type?: string | null }).role_type || "");
      if (contactKind === "clinician") return isClinicianRole(role);
      if (contactKind === "support") return !isClinicianRole(role);
      return true;
    });

  return NextResponse.json({ ok: true, contacts });
}

export async function POST(req: Request) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  const parsed = ContactCreateSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });

  const orgId = parsed.data.organization_id ?? null;
  const linkOrgId = parsed.data.link_organization_id ?? orgId ?? null;
  if (orgId && !(await repCanViewSurgicalAccount(gate.uid, orgId))) {
    return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });
  }
  if (linkOrgId && linkOrgId !== orgId && !(await repCanViewSurgicalAccount(gate.uid, linkOrgId))) {
    return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });
  }

  const row: Record<string, unknown> = {
    ...mapContactWriteFields({ ...parsed.data, created_by: gate.uid }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const intelErr = mergeContactSalesIntelligenceIntoPatch(row, {
    preferred_contact_method: parsed.data.preferred_contact_method,
    best_time_to_contact: parsed.data.best_time_to_contact,
    access_notes: parsed.data.access_notes,
    personality_notes: parsed.data.personality_notes,
    do_not_contact: parsed.data.do_not_contact,
    last_contacted_at: parsed.data.last_contacted_at,
    next_follow_up_at: parsed.data.next_follow_up_at,
  });
  if (intelErr) return NextResponse.json({ ok: false, error: intelErr }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("surgical_sales_contacts").insert(row).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: formatSurgicalContactDbError(error.message) }, { status: 400 });

  if (linkOrgId && data) {
    await upsertContactOrganizationLink({
      contactId: String(data.id),
      accountId: linkOrgId,
      actorId: gate.uid,
      roleType: parsed.data.link_organization_role_type ?? parsed.data.role_type ?? "other",
      isPrimary: false,
    });
  }

  return NextResponse.json({ ok: true, contact: data });
}

