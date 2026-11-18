import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

function safeRedirect(req: Request, fallbackPath: string) {
  const ref = req.headers.get("referer");
  try {
    return ref ? new URL(ref) : urlFromRequest(req, fallbackPath);
  } catch {
    return urlFromRequest(req, fallbackPath);
  }
}

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string; submissionId: string }> | { invoiceId: string; submissionId: string } }
) {
  const authCtx = await requireOrdersStaffOrAdmin();
  const actorUserId = String((authCtx as any)?.user?.id ?? "").trim() || null;

  const resolved = await Promise.resolve(params as any);
  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");
  const submissionId = normalizeParam(resolved?.submissionId ?? "");

  if (!UUID_RE.test(invoiceId) || !UUID_RE.test(submissionId)) {
    return NextResponse.json({ ok: false, error: "Invalid invoiceId or submissionId" }, { status: 400 });
  }

  const { data: submission, error: subErr } = await supabaseAdmin
    .from("invoice_payment_submissions")
    .select("id, invoice_id, status, method")
    .eq("id", submissionId)
    .maybeSingle();

  if (subErr) return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });
  if (!submission) return NextResponse.json({ ok: false, error: "Submission not found" }, { status: 404 });
  if (String((submission as any).invoice_id) !== String(invoiceId)) {
    return NextResponse.json({ ok: false, error: "Submission does not match invoice" }, { status: 400 });
  }
  if (String((submission as any).method ?? "").toUpperCase() !== "WIRE") {
    return NextResponse.json({ ok: false, error: "Only wire submissions can be rejected here." }, { status: 400 });
  }

  const st = String((submission as any).status ?? "").toUpperCase();
  if (st !== "PENDING" && st !== "WIRE_PENDING") {
    return NextResponse.json({ ok: false, error: "Submission already processed" }, { status: 400 });
  }

  const { data: invRow } = await supabaseAdmin
    .from("invoices")
    .select("order_id")
    .eq("id", invoiceId)
    .maybeSingle();
  const orderId = safeStr((invRow as any)?.order_id);

  await supabaseAdmin
    .from("invoice_payment_submissions")
    .update({
      status: "REJECTED",
      verified_at: new Date().toISOString(),
      verified_by_user_id: actorUserId,
    })
    .eq("id", submissionId);

  const { data: stillPending } = await supabaseAdmin
    .from("invoice_payment_submissions")
    .select("id")
    .eq("invoice_id", invoiceId)
    .in("status", ["PENDING", "WIRE_PENDING"]);

  if (UUID_RE.test(orderId) && (stillPending ?? []).length === 0) {
    const { data: ord } = await supabaseAdmin.from("orders").select("id, status").eq("id", orderId).maybeSingle();
    const ordU = safeStr((ord as any)?.status).toUpperCase();
    if (ordU === "PENDING_WIRE") {
      const { data: wireEv } = await supabaseAdmin
        .from("order_status_events")
        .select("from_status")
        .eq("order_id", orderId)
        .eq("to_status", "PENDING_WIRE")
        .neq("from_status", "PENDING_WIRE")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      const revertTo = safeStr(wireEv?.from_status) || "INVOICED";
      const fromStatus = safeStr((ord as any)?.status);
      try {
        await supabaseAdmin.from("orders").update({ status: revertTo }).eq("id", orderId);
        await supabaseAdmin.from("order_status_events").insert({
          order_id: orderId,
          from_status: fromStatus,
          to_status: revertTo,
          changed_by_user_id: actorUserId,
          comment: "Wire payment submission rejected (no pending wire proofs left)",
        });
      } catch {
        // non-blocking
      }
    }
  }

  const back = safeRedirect(req, `/admin/invoices/${invoiceId}`);
  back.searchParams.set("ok", "1");
  back.searchParams.set("msg", "Wire payment rejected");
  return NextResponse.redirect(back, { status: 303 });
}
