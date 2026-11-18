import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const AddLineSchema = z.object({
  product_id: z.string().uuid(),
  sku_id: z.string().uuid(),
  expected_quantity: z.number().positive().max(1_000_000),
  actual_quantity: z.number().nonnegative().max(1_000_000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
}).strict();

export async function POST(req: Request, ctx: { params: Promise<{ caseId: string }> }) {
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

  const { caseId } = await ctx.params;
  if (!UUID_RE.test(caseId)) {
    return NextResponse.json({ ok: false, error: "Invalid case id" }, { status: 400 });
  }

  const row = await loadSurgicalCaseForPortalActor(caseId, uid, { includeArchived: true });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if ((row as { archived_at?: string | null }).archived_at) {
    return NextResponse.json({ ok: false, error: "Restore the case before editing line items." }, { status: 409 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }
  const parsed = AddLineSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;

  const { data: skuRow, error: skuErr } = await supabaseAdmin
    .from("surgical_sales_product_skus")
    .select("id, product_id, active, sku")
    .eq("id", p.sku_id)
    .maybeSingle();
  if (skuErr || !skuRow) {
    return NextResponse.json({ ok: false, error: "SKU not found" }, { status: 400 });
  }
  if (!(skuRow as { active?: boolean }).active) {
    return NextResponse.json({ ok: false, error: "SKU is inactive" }, { status: 400 });
  }
  if (String((skuRow as { product_id: string }).product_id) !== p.product_id) {
    return NextResponse.json({ ok: false, error: "SKU does not match product" }, { status: 400 });
  }

  const { data: prod, error: pErr } = await supabaseAdmin
    .from("surgical_sales_products")
    .select("id, active, name")
    .eq("id", p.product_id)
    .maybeSingle();
  if (pErr || !prod || !(prod as { active?: boolean }).active) {
    return NextResponse.json({ ok: false, error: "Product not found or inactive" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: line, error: insErr } = await supabaseAdmin
    .from("surgical_sales_case_products")
    .insert({
      case_id: caseId,
      product_id: p.product_id,
      sku_id: p.sku_id,
      expected_quantity: p.expected_quantity,
      actual_quantity: p.actual_quantity ?? null,
      notes: p.notes?.trim() || null,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insErr || !line) {
    return NextResponse.json({ ok: false, error: insErr?.message || "Insert failed" }, { status: 500 });
  }

  const skuCode = String((skuRow as { sku: string }).sku);
  const prodName = String((prod as { name?: string }).name ?? "");
  const log = await logSurgicalCaseActivity({
    caseId,
    userId: uid,
    activityType: "product_updated",
    body: `Added line: ${prodName} · ${skuCode} (expected qty ${p.expected_quantity}).`,
    metadataJson: { line_id: (line as { id: string }).id, product_id: p.product_id, sku_id: p.sku_id, action: "line_added" },
    newValues: {
      line_id: (line as { id: string }).id,
      product_id: p.product_id,
      sku_id: p.sku_id,
      expected_quantity: p.expected_quantity,
      actual_quantity: p.actual_quantity ?? null,
      notes: p.notes?.trim() || null,
    },
  });
  if (!log.ok) {
    await supabaseAdmin.from("surgical_sales_case_products").delete().eq("id", (line as { id: string }).id);
    return NextResponse.json({ ok: false, error: log.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, line_id: (line as { id: string }).id });
}
