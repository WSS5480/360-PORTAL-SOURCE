import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { isInternalPortalAdmin } from "@/lib/sales/isInternalPortalAdmin";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import {
  repCanAccessContact,
  SURGICAL_CONTACT_RELATIONSHIP_TYPES,
} from "@/lib/surgical-sales/contactManagement";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PatchSchema = z.object({
  relationship_type: z.enum(SURGICAL_CONTACT_RELATIONSHIP_TYPES).optional(),
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

async function canAccessRelationship(userId: string, row: { primary_contact_id: string; related_contact_id: string }): Promise<boolean> {
  const { data: contacts } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .in("id", [row.primary_contact_id, row.related_contact_id]);
  const map = new Map<string, Record<string, unknown>>();
  for (const c of (contacts || []) as Record<string, unknown>[]) map.set(String(c.id), c);
  const primary = map.get(row.primary_contact_id);
  const related = map.get(row.related_contact_id);
  if (!primary || !related) return false;
  const pOk = await repCanAccessContact(userId, primary as never);
  const rOk = await repCanAccessContact(userId, related as never);
  return pOk && rOk;
}

export async function GET(_req: Request, ctx: { params: Promise<{ relationshipId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const { relationshipId } = await ctx.params;
  if (!UUID_RE.test(relationshipId)) return NextResponse.json({ ok: false, error: "Invalid relationship id" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("surgical_sales_contact_relationships").select("*").eq("id", relationshipId).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!(await canAccessRelationship(gate.uid, data))) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, relationship: data });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ relationshipId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const { relationshipId } = await ctx.params;
  if (!UUID_RE.test(relationshipId)) return NextResponse.json({ ok: false, error: "Invalid relationship id" }, { status: 400 });
  const { data: existing } = await supabaseAdmin.from("surgical_sales_contact_relationships").select("*").eq("id", relationshipId).maybeSingle();
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!(await canAccessRelationship(gate.uid, existing))) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const raw = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.relationship_type !== undefined) patch.relationship_type = parsed.data.relationship_type;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes?.trim() || null;
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_contact_relationships")
    .update(patch)
    .eq("id", relationshipId)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: relationshipError(error) }, { status: 400 });
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, relationship: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ relationshipId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const { relationshipId } = await ctx.params;
  if (!UUID_RE.test(relationshipId)) return NextResponse.json({ ok: false, error: "Invalid relationship id" }, { status: 400 });
  const { data: existing } = await supabaseAdmin.from("surgical_sales_contact_relationships").select("*").eq("id", relationshipId).maybeSingle();
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!(await canAccessRelationship(gate.uid, existing))) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const admin = await isInternalPortalAdmin(gate.uid);
  const createdBy =
    (existing as { created_by?: string | null }).created_by != null
      ? String((existing as { created_by?: string | null }).created_by)
      : null;
  if (!admin) {
    if (createdBy && createdBy !== gate.uid) {
      return NextResponse.json(
        { ok: false, error: "Only the user who created this link or an admin can remove it." },
        { status: 403 },
      );
    }
    if (!createdBy) {
      return NextResponse.json(
        { ok: false, error: "Only an admin can remove legacy support links that have no recorded creator." },
        { status: 403 },
      );
    }
  }

  const { error } = await supabaseAdmin.from("surgical_sales_contact_relationships").delete().eq("id", relationshipId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await logSurgicalSalesCrmAudit({
    actorUserId: gate.uid,
    action: "contact_relationship_removed",
    meta: {
      relationship_id: relationshipId,
      primary_contact_id: String((existing as { primary_contact_id: string }).primary_contact_id),
      related_contact_id: String((existing as { related_contact_id: string }).related_contact_id),
    },
    req,
  });
  return NextResponse.json({ ok: true });
}

