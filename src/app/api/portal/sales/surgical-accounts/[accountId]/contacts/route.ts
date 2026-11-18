import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import {
  mapContactWriteFields,
  mergeContactSalesIntelligenceIntoPatch,
  repCanAccessContact,
  upsertContactOrganizationLink,
  SURGICAL_CONTACT_INFLUENCE_LEVELS,
  SURGICAL_CONTACT_PREFERRED_METHODS,
  SURGICAL_CONTACT_RELATIONSHIP_STRENGTHS,
  SURGICAL_CONTACT_ROLE_TYPES_V2,
} from "@/lib/surgical-sales/contactManagement";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ContactSchema = z
  .object({
    link_existing_contact_id: z.string().uuid().optional(),
    allow_duplicate: z.boolean().optional(),
    first_name: z.string().max(200).optional().nullable(),
    last_name: z.string().max(200).optional().nullable(),
    title: z.string().max(200).optional().nullable(),
    email: z.string().max(320).optional().nullable(),
    phone: z.string().max(80).optional().nullable(),
    mobile_phone: z.string().max(80).optional().nullable(),
    role_type: z.enum(SURGICAL_CONTACT_ROLE_TYPES_V2).optional().default("other"),
    influence_level: z.enum(SURGICAL_CONTACT_INFLUENCE_LEVELS).optional().default("unknown"),
    relationship_strength: z.enum(SURGICAL_CONTACT_RELATIONSHIP_STRENGTHS).optional().default("unknown"),
    is_primary: z.boolean().optional(),
    is_primary_contact: z.boolean().optional(),
    notes: z.string().max(8000).optional().nullable(),
    preferred_contact_method: z.enum(SURGICAL_CONTACT_PREFERRED_METHODS).optional(),
    best_time_to_contact: z.string().max(500).optional().nullable(),
    access_notes: z.string().max(8000).optional().nullable(),
    personality_notes: z.string().max(8000).optional().nullable(),
    do_not_contact: z.boolean().optional(),
    last_contacted_at: z.union([z.string(), z.null()]).optional(),
    next_follow_up_at: z.union([z.string(), z.null()]).optional(),
    org_specialty: z.string().max(200).optional().nullable(),
    org_notes: z.string().max(8000).optional().nullable(),
    preferred_hospital: z.string().max(300).optional().nullable(),
    org_influence_level: z.enum(SURGICAL_CONTACT_INFLUENCE_LEVELS).optional(),
    org_role_type: z.enum(SURGICAL_CONTACT_ROLE_TYPES_V2).optional(),
    org_is_primary: z.boolean().optional(),
    org_is_active: z.boolean().optional(),
  })
  .strict();

async function clearOtherPrimary(accountId: string, keepId: string) {
  await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({ is_primary: false, is_primary_contact: false, updated_at: new Date().toISOString() })
    .or(`organization_id.eq.${accountId},account_id.eq.${accountId}`)
    .neq("id", keepId);
}

function normalizeName(s: string | null | undefined): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePhone(s: string | null | undefined): string {
  return String(s || "").replace(/\D+/g, "");
}

export async function POST(req: Request, ctx: { params: Promise<{ accountId: string }> }) {
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
    return NextResponse.json({ ok: false, error: "Invalid account id" }, { status: 400 });
  }

  const canView = await repCanViewSurgicalAccount(uid, accountId);
  if (!canView) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }
  const parsed = ContactSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;
  const roleType = p.role_type ?? "other";
  const inferredInfluence = p.org_influence_level ?? p.influence_level ?? "unknown";

  if (p.link_existing_contact_id) {
    const { data: existingContact, error: existingErr } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("*")
      .eq("id", p.link_existing_contact_id)
      .maybeSingle();
    if (existingErr) return NextResponse.json({ ok: false, error: existingErr.message }, { status: 500 });
    if (!existingContact) return NextResponse.json({ ok: false, error: "Contact not found." }, { status: 404 });
    if (!(await repCanAccessContact(uid, existingContact as Record<string, unknown> as never))) {
      return NextResponse.json({ ok: false, error: "Contact not found." }, { status: 404 });
    }

    await upsertContactOrganizationLink({
      contactId: String(existingContact.id),
      accountId,
      actorId: uid,
      roleType: p.org_role_type ?? roleType,
      isPrimary: Boolean(p.org_is_primary ?? p.is_primary_contact ?? p.is_primary ?? false),
      isActive: p.org_is_active ?? true,
      specialty: p.org_specialty ?? null,
      relationshipNotes: p.org_notes ?? null,
      preferredHospital: p.preferred_hospital ?? null,
      influenceLevel: inferredInfluence,
    });

    return NextResponse.json({ ok: true, contact: existingContact, linked_existing: true });
  }

  if (!p.allow_duplicate) {
    const full = normalizeName(`${p.first_name || ""} ${p.last_name || ""}`);
    const em = String(p.email || "").trim().toLowerCase();
    const ph = normalizePhone(p.phone);
    const mph = normalizePhone(p.mobile_phone);
    let dupQ = supabaseAdmin.from("surgical_sales_contacts").select("*").is("archived_at", null).limit(10);
    if (em) {
      dupQ = dupQ.eq("email", em);
    } else if (ph || mph) {
      const p1 = ph || mph;
      dupQ = dupQ.or(`phone.ilike.%${p1}%,mobile_phone.ilike.%${p1}%`);
    } else if (full) {
      const parts = full.split(" ").filter(Boolean);
      if (parts.length >= 2) {
        dupQ = dupQ.ilike("last_name", `%${parts[parts.length - 1]}%`);
      } else {
        dupQ = dupQ.or(`first_name.ilike.%${full}%,last_name.ilike.%${full}%`);
      }
    }
    const { data: dupRows, error: dupErr } = await dupQ;
    if (dupErr) return NextResponse.json({ ok: false, error: dupErr.message }, { status: 500 });
    const possible = (dupRows || []).filter((r) => {
      const row = r as Record<string, unknown>;
      const rowName = normalizeName(`${String(row.first_name || "")} ${String(row.last_name || "")}`);
      const rowEmail = String(row.email || "").trim().toLowerCase();
      const rowPhone = normalizePhone(String(row.phone || ""));
      const rowMobile = normalizePhone(String(row.mobile_phone || ""));
      const nameHit = full && rowName && (rowName.includes(full) || full.includes(rowName));
      const emailHit = em && rowEmail && em === rowEmail;
      const phoneHit = Boolean((ph && (rowPhone.includes(ph) || rowMobile.includes(ph))) || (mph && (rowPhone.includes(mph) || rowMobile.includes(mph))));
      return Boolean(nameHit || emailHit || phoneHit);
    });
    if (possible.length > 0) {
      const ids = possible.map((r) => String((r as { id: string }).id));
      const { data: rels } = await supabaseAdmin
        .from("surgical_sales_contact_organizations")
        .select("contact_id, account_id, accounts:sales_organizations!account_id(name)")
        .in("contact_id", ids)
        .limit(100);
      const orgByContact = new Map<string, string[]>();
      for (const row of (rels || []) as Array<{ contact_id: string; accounts?: { name?: string | null } | null }>) {
        const k = String(row.contact_id);
        const arr = orgByContact.get(k) || [];
        const name = String(row.accounts?.name || "").trim();
        if (name) arr.push(name);
        orgByContact.set(k, arr);
      }
      return NextResponse.json(
        {
          ok: false,
          error: "Possible existing clinician found.",
          code: "possible_duplicate",
          matches: possible.map((r) => {
            const id = String((r as { id: string }).id);
            return { ...(r as Record<string, unknown>), existing_orgs: orgByContact.get(id) || [] };
          }),
        },
        { status: 409 },
      );
    }
  }

  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    ...mapContactWriteFields({
      organization_id: accountId,
      first_name: p.first_name,
      last_name: p.last_name,
      title: p.title,
      email: p.email,
      phone: p.phone,
      mobile_phone: p.mobile_phone,
      role_type: roleType,
      influence_level: p.influence_level ?? "unknown",
      relationship_strength: p.relationship_strength,
      is_primary_contact: p.is_primary_contact ?? p.is_primary,
      notes: p.notes,
      created_by: uid,
    }),
    created_at: now,
    updated_at: now,
  };
  const intelErr = mergeContactSalesIntelligenceIntoPatch(row, {
    preferred_contact_method: p.preferred_contact_method,
    best_time_to_contact: p.best_time_to_contact,
    access_notes: p.access_notes,
    personality_notes: p.personality_notes,
    do_not_contact: p.do_not_contact,
    last_contacted_at: p.last_contacted_at,
    next_follow_up_at: p.next_follow_up_at,
  });
  if (intelErr) return NextResponse.json({ ok: false, error: intelErr }, { status: 400 });

  const { data: created, error } = await supabaseAdmin.from("surgical_sales_contacts").insert(row).select("*").single();
  if (error || !created) {
    return NextResponse.json({ ok: false, error: error?.message || "Insert failed" }, { status: 500 });
  }

  if (created.is_primary) {
    await clearOtherPrimary(accountId, created.id);
  }

  await upsertContactOrganizationLink({
    contactId: String(created.id),
    accountId,
    actorId: uid,
    roleType: p.org_role_type ?? roleType,
    isPrimary: Boolean(p.org_is_primary ?? p.is_primary_contact ?? p.is_primary ?? false),
    isActive: p.org_is_active ?? true,
    specialty: p.org_specialty ?? null,
    relationshipNotes: p.org_notes ?? p.notes ?? null,
    preferredHospital: p.preferred_hospital ?? null,
    influenceLevel: inferredInfluence,
  });

  return NextResponse.json({ ok: true, contact: created });
}
