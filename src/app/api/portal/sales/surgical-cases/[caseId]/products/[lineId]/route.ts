import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { SURGICAL_STATUSES_PAST_SCHEDULED } from "@/lib/surgical-sales/surgicalCaseIntegrity";
import { surgicalCaseRequiresBillingWorkflow } from "@/lib/surgical-sales/billingReadiness";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PatchLineSchema = z.object({
  expected_quantity: z.number().positive().max(1_000_000).optional(),
  actual_quantity: z.number().nonnegative().max(1_000_000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
}).strict();

export async function PATCH(req: Request, ctx: { params: Promise<{ caseId: string; lineId: string }> }) {
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

  const { caseId, lineId } = await ctx.params;
  if (!UUID_RE.test(caseId) || !UUID_RE.test(lineId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const row = await loadSurgicalCaseForPortalActor(caseId, uid, { includeArchived: true });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if ((row as { archived_at?: string | null }).archived_at) {
    return NextResponse.json({ ok: false, error: "Restore the case before editing line items." }, { status: 409 });
  }

  const { data: existing, error: exErr } = await supabaseAdmin
    .from("surgical_sales_case_products")
    .select("id, case_id, product_id, sku_id, expected_quantity, actual_quantity, notes")
    .eq("id", lineId)
    .maybeSingle();
  if (exErr || !existing || String((existing as { case_id: string }).case_id) !== caseId) {
    return NextResponse.json({ ok: false, error: "Line not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }
  const parsed = PatchLineSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;
  const keys = Object.keys(p).filter((k) => p[k as keyof typeof p] !== undefined);
  if (keys.length === 0) {
    return NextResponse.json({ ok: false, error: "No changes" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (p.expected_quantity !== undefined) patch.expected_quantity = p.expected_quantity;
  if (p.actual_quantity !== undefined) patch.actual_quantity = p.actual_quantity;
  if (p.notes !== undefined) patch.notes = p.notes?.trim() || null;

  const { data: updated, error: upErr } = await supabaseAdmin
    .from("surgical_sales_case_products")
    .update(patch)
    .eq("id", lineId)
    .select("*")
    .single();

  if (upErr || !updated) {
    return NextResponse.json({ ok: false, error: upErr?.message || "Update failed" }, { status: 500 });
  }

  let skuCode = "";
  const sid = (updated as { sku_id?: string | null }).sku_id;
  if (sid) {
    const { data: sk } = await supabaseAdmin.from("surgical_sales_product_skus").select("sku").eq("id", sid).maybeSingle();
    skuCode = String((sk as { sku?: string } | null)?.sku ?? "");
  }

  const parts: string[] = [];
  if (p.expected_quantity !== undefined) parts.push(`expected qty → ${p.expected_quantity}`);
  if (p.actual_quantity !== undefined) parts.push(`actual qty → ${p.actual_quantity == null ? "—" : p.actual_quantity}`);
  if (p.notes !== undefined) parts.push("notes updated");

  const ex = existing as {
    product_id: string;
    sku_id: string | null;
    expected_quantity: number;
    actual_quantity: number | null;
    notes: string | null;
  };
  const up = updated as {
    product_id: string;
    sku_id: string | null;
    expected_quantity: number;
    actual_quantity: number | null;
    notes: string | null;
  };

  const log = await logSurgicalCaseActivity({
    caseId,
    userId: uid,
    activityType: "product_updated",
    body: `Updated line${skuCode ? ` (${skuCode})` : ""}: ${parts.join("; ")}.`,
    metadataJson: { line_id: lineId, action: "line_updated" },
    previousValues: {
      line_id: lineId,
      product_id: ex.product_id,
      sku_id: ex.sku_id,
      expected_quantity: ex.expected_quantity,
      actual_quantity: ex.actual_quantity,
      notes: ex.notes,
    },
    newValues: {
      line_id: lineId,
      product_id: up.product_id,
      sku_id: up.sku_id,
      expected_quantity: up.expected_quantity,
      actual_quantity: up.actual_quantity,
      notes: up.notes,
    },
  });
  if (!log.ok) {
    return NextResponse.json({ ok: false, error: log.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, line: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ caseId: string; lineId: string }> }) {
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

  const { caseId, lineId } = await ctx.params;
  if (!UUID_RE.test(caseId) || !UUID_RE.test(lineId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const row = await loadSurgicalCaseForPortalActor(caseId, uid, { includeArchived: true });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if ((row as { archived_at?: string | null }).archived_at) {
    return NextResponse.json({ ok: false, error: "Restore the case before editing line items." }, { status: 409 });
  }

  const { data: existing, error: exErr } = await supabaseAdmin
    .from("surgical_sales_case_products")
    .select("id, case_id, product_id, sku_id, expected_quantity, actual_quantity, notes")
    .eq("id", lineId)
    .maybeSingle();
  if (exErr || !existing || String((existing as { case_id: string }).case_id) !== caseId) {
    return NextResponse.json({ ok: false, error: "Line not found" }, { status: 404 });
  }

  const { data: siblingRows, error: sibErr } = await supabaseAdmin
    .from("surgical_sales_case_products")
    .select("id, product_id")
    .eq("case_id", caseId);
  if (sibErr) {
    return NextResponse.json({ ok: false, error: sibErr.message }, { status: 500 });
  }

  const remaining = ((siblingRows || []) as Array<{ id: string; product_id: string }>).filter(
    (line) => String(line.id) !== lineId,
  );
  const caseType = String((row as { case_type?: string | null }).case_type ?? "product_support");
  const caseProductId = (row as { product_id?: string | null }).product_id
    ? String((row as { product_id: string }).product_id)
    : null;
  const status = String((row as { status?: string | null }).status ?? "").toLowerCase();
  const requiresBilling = surgicalCaseRequiresBillingWorkflow({
    caseType,
    productId: remaining[0]?.product_id ?? null,
    productLineCount: remaining.length,
  });
  if (remaining.length === 0 && SURGICAL_STATUSES_PAST_SCHEDULED.has(status) && requiresBilling) {
    return NextResponse.json(
      {
        ok: false,
        error: "This case needs at least one product. Add a replacement before removing this line.",
      },
      { status: 400 },
    );
  }

  let skuCode = "";
  const sid = (existing as { sku_id?: string | null }).sku_id;
  if (sid) {
    const { data: sk } = await supabaseAdmin.from("surgical_sales_product_skus").select("sku").eq("id", sid).maybeSingle();
    skuCode = String((sk as { sku?: string } | null)?.sku ?? "");
  }
  let productName = "";
  const pid = String((existing as { product_id: string }).product_id);
  if (pid) {
    const { data: prod } = await supabaseAdmin.from("surgical_sales_products").select("name").eq("id", pid).maybeSingle();
    productName = String((prod as { name?: string } | null)?.name ?? "");
  }

  const { error: delErr } = await supabaseAdmin.from("surgical_sales_case_products").delete().eq("id", lineId);
  if (delErr) {
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
  }

  const remainingProductIds = new Set(remaining.map((line) => String(line.product_id)));
  const nextPrimaryProductId = remaining[0]?.product_id ? String(remaining[0].product_id) : null;
  if (!caseProductId || !remainingProductIds.has(caseProductId)) {
    const { error: caseErr } = await supabaseAdmin
      .from("surgical_sales_cases")
      .update({ product_id: nextPrimaryProductId, updated_at: new Date().toISOString() })
      .eq("id", caseId);
    if (caseErr) {
      return NextResponse.json({ ok: false, error: caseErr.message }, { status: 500 });
    }
  }

  const label = [productName, skuCode ? `SKU ${skuCode}` : ""].filter(Boolean).join(" · ") || "product line";
  const log = await logSurgicalCaseActivity({
    caseId,
    userId: uid,
    activityType: "product_updated",
    body: `Removed line: ${label}.`,
    metadataJson: { line_id: lineId, action: "line_removed" },
    previousValues: {
      line_id: lineId,
      product_id: (existing as { product_id: string }).product_id,
      sku_id: (existing as { sku_id: string | null }).sku_id,
      expected_quantity: (existing as { expected_quantity: number }).expected_quantity,
      actual_quantity: (existing as { actual_quantity: number | null }).actual_quantity,
      notes: (existing as { notes: string | null }).notes,
    },
  });
  if (!log.ok) {
    return NextResponse.json({ ok: false, error: log.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
