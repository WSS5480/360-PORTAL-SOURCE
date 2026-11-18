import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import {
  ORG_PRODUCT_APPROVAL_STATUSES,
  orgProductApprovalStatusSideEffects,
  summarizeOrgProductApprovals,
} from "@/lib/surgical-sales/organizationProductApprovals";
import { loadOrganizationProductApprovals } from "@/lib/surgical-sales/loadOrganizationProductApprovals";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CreateSchema = z
  .object({
    product_id: z.string().uuid(),
    status: z.enum(ORG_PRODUCT_APPROVAL_STATUSES).optional(),
    champion_contact_id: z.string().uuid().nullable().optional(),
    notes: z.string().max(8000).nullable().optional(),
  })
  .strict();

async function assertOrgAccess(uid: string, accountId: string) {
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  const canView = await repCanViewSurgicalAccount(uid, accountId);
  if (!canView) return { ok: false as const, status: 404, error: "Not found" };
  return { ok: true as const };
}

export async function GET(_req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { accountId } = await ctx.params;
  if (!UUID_RE.test(accountId)) {
    return NextResponse.json({ ok: false, error: "Invalid organization id" }, { status: 400 });
  }

  const access = await assertOrgAccess(auth.user.id, accountId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  try {
    const approvals = await loadOrganizationProductApprovals(accountId);
    return NextResponse.json({
      ok: true,
      approvals,
      summary: summarizeOrgProductApprovals(approvals),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load product approvals";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;

  const { accountId } = await ctx.params;
  if (!UUID_RE.test(accountId)) {
    return NextResponse.json({ ok: false, error: "Invalid organization id" }, { status: 400 });
  }

  const access = await assertOrgAccess(uid, accountId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;
  const status = p.status ?? "not_started";
  const nowIso = new Date().toISOString();
  const dates = orgProductApprovalStatusSideEffects(status, { status: "not_started", submitted_at: null, approved_at: null }, nowIso);

  const { data: product, error: productErr } = await supabaseAdmin
    .from("surgical_sales_products")
    .select("id")
    .eq("id", p.product_id)
    .maybeSingle();
  if (productErr) return NextResponse.json({ ok: false, error: productErr.message }, { status: 500 });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });

  if (p.champion_contact_id) {
    const { data: champion, error: championErr } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("id")
      .eq("id", p.champion_contact_id)
      .maybeSingle();
    if (championErr) return NextResponse.json({ ok: false, error: championErr.message }, { status: 500 });
    if (!champion) return NextResponse.json({ ok: false, error: "Champion contact not found." }, { status: 404 });
  }

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("sales_organization_product_approvals")
    .insert({
      organization_id: accountId,
      product_id: p.product_id,
      status,
      champion_contact_id: p.champion_contact_id ?? null,
      notes: p.notes ?? null,
      submitted_at: dates.submitted_at,
      approved_at: dates.approved_at,
      created_by_user_id: uid,
      updated_at: nowIso,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ ok: false, error: "This product is already tracked for this organization." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }

  const approvals = await loadOrganizationProductApprovals(accountId);
  const created = approvals.find((a) => a.id === String((inserted as { id: string }).id));
  return NextResponse.json({ ok: true, approval: created ?? null, summary: summarizeOrgProductApprovals(approvals) });
}
