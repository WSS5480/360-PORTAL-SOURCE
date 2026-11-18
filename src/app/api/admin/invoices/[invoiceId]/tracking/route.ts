// src/app/api/admin/invoices/[invoiceId]/tracking/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { invoiceId } = await Promise.resolve(params);
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ ok: false, error: "Invalid invoiceId" }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);

  const carrier = safeStr(form?.get("carrier")).trim();
  const tracking_number = safeStr(form?.get("tracking_number")).trim();
  const label_url = safeStr(form?.get("label_url")).trim();

  const { data: inv, error: invErr } = await sb
    .from("invoices")
    .select("id, order_id, status, voided_at, metadata")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!inv) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });

  if (inv.voided_at || safeUpper(inv.status) === "VOID") {
    return NextResponse.json({ ok: false, error: "Invoice is voided" }, { status: 400 });
  }

  const prevMeta: any = inv.metadata ?? {};
  const prevShip: any = prevMeta?.shipping ?? {};

  const nextShip: any = {
    ...prevShip,
    carrier,
    tracking_number,
    label_url,
    updated_at: new Date().toISOString(),
  };

  // If all three are blank-ish, keep it clean (remove shipping block)
  const allBlank =
    !String(nextShip.carrier ?? "").trim() &&
    !String(nextShip.tracking_number ?? "").trim() &&
    !String(nextShip.label_url ?? "").trim();

  const nextMeta: any = {
    ...prevMeta,
    ...(allBlank ? { shipping: undefined } : { shipping: nextShip }),
  };

  // JSON stringify drops undefined keys; but Supabase update will store object.
  // To truly remove key, set it to null then have readers treat null as absent.
  if (allBlank) {
    nextMeta.shipping = null;
  }

  const { error: upErr } = await sb.from("invoices").update({ metadata: nextMeta }).eq("id", invoiceId);
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  // Best-effort audit
  try {
    await sb.from("order_audit_log").insert({
      order_id: String(inv.order_id),
      actor_user_id: String(ctx?.user?.id ?? ""),
      action: "TRACKING_SAVED",
      meta: { invoice_id: invoiceId, carrier: carrier || null, tracking_number: tracking_number || null, label_url: label_url || null },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {
    // ignore
  }

  return NextResponse.redirect(urlFromRequest(req, `/admin/invoices/${invoiceId}`));
}
