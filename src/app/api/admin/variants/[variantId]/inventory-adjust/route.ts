import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ variantId: string }> }
) {
  const ctx = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { variantId } = await Promise.resolve(params);
  if (!UUID_RE.test(variantId)) {
    return NextResponse.json({ ok: false, error: "Invalid variantId" }, { status: 400 });
  }

  const form = await req.formData();
  const deltaRaw = String(form.get("delta") ?? "").trim();
  const reason = String(form.get("reason") ?? "").trim();

  const delta = Number(deltaRaw);
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ ok: false, error: "Delta must be a non-zero number" }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ ok: false, error: "Reason is required" }, { status: 400 });
  }

  // Read portal truth current qty
  const { data: invRow, error: invErr } = await sb
    .from("product_variant_inventory")
    .select("variant_id, qty_on_hand")
    .eq("variant_id", variantId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

  const current = Number(invRow?.qty_on_hand ?? 0) || 0;
  const next = current + delta;

  const nowIso = new Date().toISOString();

  // Update portal truth
  const { error: upErr } = await sb
    .from("product_variant_inventory")
    .upsert(
      { variant_id: variantId, qty_on_hand: next, updated_at: nowIso },
      { onConflict: "variant_id" }
    );

  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  // Keep legacy table in sync
  try {
    await sb
      .from("variant_inventory")
      .upsert(
        { variant_id: variantId, on_hand: next, updated_at: nowIso },
        { onConflict: "variant_id" }
      );
  } catch {
    // ignore
  }

  // Movement log (immutable)
  const actorUserId = String((ctx as any)?.user?.id ?? "");
  if (actorUserId) {
    try {
      await sb.from("inventory_movements").insert({
        variant_id: variantId,
        delta,
        resulting_on_hand: next,
        reason,
        actor_user_id: actorUserId,
        meta: { prior_qty_on_hand: current, source: "admin_inventory_adjust" },
        ip: getClientIp(req),
        user_agent: req.headers.get("user-agent"),
      });
    } catch {
      // ignore
    }
  }

  return NextResponse.redirect(urlFromRequest(req, `/admin/variants/${encodeURIComponent(variantId)}`));
}
