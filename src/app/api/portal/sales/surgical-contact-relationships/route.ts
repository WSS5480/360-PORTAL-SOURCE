import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import {
  repCanAccessContact,
  SURGICAL_CONTACT_RELATIONSHIP_TYPES,
} from "@/lib/surgical-sales/contactManagement";

export const dynamic = "force-dynamic";

const PostSchema = z.object({
  primary_contact_id: z.string().uuid(),
  related_contact_id: z.string().uuid(),
  relationship_type: z.enum(SURGICAL_CONTACT_RELATIONSHIP_TYPES),
  ownership_type: z.enum(["provider", "organization", "shared"]).optional().nullable(),
  workflow_role: z.string().max(120).optional().nullable(),
  notes: z.string().max(8000).optional().nullable(),
}).strict();

function relationshipError(error: { code?: string; message?: string } | null): string {
  if (!error) return "Relationship request failed.";
  if (error.code === "23514") return "A contact cannot be related to itself.";
  if (error.code === "23505") return "This relationship already exists.";
  return error.message || "Relationship request failed.";
}

async function requireRep() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid };
}

async function requireRepContactAccess(userId: string, contactId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();
  if (!data) return false;
  return repCanAccessContact(userId, data as Record<string, unknown> as never);
}

export async function GET(req: Request) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const url = new URL(req.url);
  const primaryContactId = (url.searchParams.get("primary_contact_id") || "").trim();
  const relatedContactId = (url.searchParams.get("related_contact_id") || "").trim();
  const contactId = (url.searchParams.get("contact_id") || "").trim();

  if (primaryContactId && !(await requireRepContactAccess(gate.uid, primaryContactId))) {
    return NextResponse.json({ ok: false, error: "Primary contact not found." }, { status: 404 });
  }
  if (relatedContactId && !(await requireRepContactAccess(gate.uid, relatedContactId))) {
    return NextResponse.json({ ok: false, error: "Related contact not found." }, { status: 404 });
  }
  if (contactId && !(await requireRepContactAccess(gate.uid, contactId))) {
    return NextResponse.json({ ok: false, error: "Contact not found." }, { status: 404 });
  }

  let query = supabaseAdmin
    .from("surgical_sales_contact_relationships")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (primaryContactId) query = query.eq("primary_contact_id", primaryContactId);
  if (relatedContactId) query = query.eq("related_contact_id", relatedContactId);
  if (contactId) query = query.or(`primary_contact_id.eq.${contactId},related_contact_id.eq.${contactId}`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = (data || []) as Array<{ primary_contact_id: string; related_contact_id: string } & Record<string, unknown>>;
  const filtered: typeof rows = [];
  for (const row of rows) {
    const primaryOk = await requireRepContactAccess(gate.uid, row.primary_contact_id);
    if (!primaryOk) continue;
    const relatedOk = await requireRepContactAccess(gate.uid, row.related_contact_id);
    if (!relatedOk) continue;
    filtered.push(row);
  }

  const ids = [...new Set(filtered.flatMap((r) => [r.primary_contact_id, r.related_contact_id]))];
  const byId = new Map<string, Record<string, unknown>>();
  if (ids.length > 0) {
    const { data: contacts } = await supabaseAdmin.from("surgical_sales_contacts").select("*").in("id", ids);
    for (const c of (contacts || []) as Record<string, unknown>[]) byId.set(String(c.id), c);
  }

  const relationships = filtered.map((r) => ({
    ...r,
    primary_contact: byId.get(r.primary_contact_id) ?? null,
    related_contact: byId.get(r.related_contact_id) ?? null,
  }));
  return NextResponse.json({
    ok: true,
    relationships,
    support_contacts: primaryContactId ? relationships.map((r) => r.related_contact).filter(Boolean) : undefined,
    supported_doctors: relatedContactId ? relationships.map((r) => r.primary_contact).filter(Boolean) : undefined,
  });
}

export async function POST(req: Request) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const raw = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  if (!(await requireRepContactAccess(gate.uid, parsed.data.primary_contact_id))) {
    return NextResponse.json({ ok: false, error: "Primary contact not found." }, { status: 404 });
  }
  if (!(await requireRepContactAccess(gate.uid, parsed.data.related_contact_id))) {
    return NextResponse.json({ ok: false, error: "Related contact not found." }, { status: 404 });
  }

  const payload = {
    ...parsed.data,
    notes: parsed.data.notes?.trim() || null,
    created_by: gate.uid,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin.from("surgical_sales_contact_relationships").insert(payload).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: relationshipError(error) }, { status: 400 });
  return NextResponse.json({ ok: true, relationship: data });
}

