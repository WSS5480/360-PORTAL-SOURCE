import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { canViewOrders } from "@/lib/portal/portalRoles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPortalInvoiceRowViewable } from "@/lib/portal/portalRowScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_PROOF_BYTES = 12 * 1024 * 1024;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected" }, { status: 400 });
  }

  if (!canViewOrders(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const resolved = await Promise.resolve(params as any);
  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ ok: false, error: "Invalid invoiceId" }, { status: 400 });
  }

  const ct = safeStr(req.headers.get("content-type")).toLowerCase();
  let amount = 0;
  let reference = "";
  let sentAt = "";
  let note = "";
  let proofFile: File | null = null;

  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Wire payment must be submitted as multipart form data with a proof file (PDF, PNG, JPG, or screenshot).",
      },
      { status: 400 }
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: "Invalid form submission." }, { status: 400 });
  }
  amount = safeNum(form.get("amount"));
  reference = safeStr(form.get("reference"));
  sentAt = safeStr(form.get("sent_at"));
  note = safeStr(form.get("note"));
  const p = form.get("proof");
  if (p instanceof File && p.size > 0) proofFile = p;

  const { data: invoice, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, account_id, order_id, status, total, amount_paid")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!invoice) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });

  if (String((invoice as any).account_id) !== String(accountId)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const portalUserId = String((ctx.user as any)?.id ?? "");
  const viewable = await isPortalInvoiceRowViewable(supabaseAdmin as any, accountId, portalUserId, ctx.currentRole, invoice as any);
  if (!viewable) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const statusUpper = String((invoice as any).status ?? "").toUpperCase();
  if (statusUpper === "VOID" || statusUpper === "VOIDED") {
    return NextResponse.json({ ok: false, error: "Invoice is voided." }, { status: 400 });
  }

  if (amount <= 0) {
    return NextResponse.json({ ok: false, error: "Amount must be greater than 0." }, { status: 400 });
  }

  let paymentsTotal = 0;
  try {
    const { data: payRows } = await supabaseAdmin
      .from("invoice_payments")
      .select("amount")
      .eq("invoice_id", invoiceId);
    paymentsTotal = (payRows ?? []).reduce((sum: number, r: any) => sum + safeNum(r?.amount), 0);
  } catch {
    paymentsTotal = 0;
  }

  const total = safeNum((invoice as any).total);
  const storedPaid = safeNum((invoice as any).amount_paid);
  const amountPaid = Math.max(storedPaid, paymentsTotal);
  const remaining = Math.max(0, total - amountPaid);

  if (amount > remaining) {
    return NextResponse.json({ ok: false, error: "Amount exceeds remaining balance." }, { status: 400 });
  }

  if (!proofFile || proofFile.size <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Upload proof of wire (bank receipt, confirmation PDF, or screenshot).",
      },
      { status: 400 }
    );
  }

  if (proofFile.size > MAX_PROOF_BYTES) {
    return NextResponse.json({ ok: false, error: "Proof file is too large (max 12 MB)." }, { status: 400 });
  }

  try {
    const { data: submission, error: subErr } = await supabaseAdmin
      .from("invoice_payment_submissions")
      .insert({
        invoice_id: invoiceId,
        account_id: accountId,
        method: "WIRE",
        amount,
        status: "WIRE_PENDING",
        reference: reference || null,
        sent_at: sentAt ? new Date(sentAt).toISOString() : null,
        note: note || null,
        created_by_user_id: ctx.user?.id ?? null,
        proof_bucket: null,
        proof_path: null,
      })
      .select("id, method, amount, status, reference, sent_at, note, created_at, proof_bucket, proof_path")
      .maybeSingle();

    if (subErr) return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });

    const subId = safeStr((submission as any)?.id);
    if (!UUID_RE.test(subId)) {
      return NextResponse.json({ ok: false, error: "Failed to create submission." }, { status: 500 });
    }

    const bucket = "order-private";
    const orig = safeStr(proofFile.name) || "proof";
    const ext = (orig.split(".").pop() || "bin").replace(/[^\w]/g, "").slice(0, 8) || "bin";
    const objectPath = `wire-proofs/${invoiceId}/${subId}.${ext}`;
    const buf = Buffer.from(await proofFile.arrayBuffer());
    const { error: upErr } = await supabaseAdmin.storage.from(bucket).upload(objectPath, buf, {
      contentType: proofFile.type || "application/octet-stream",
      upsert: true,
    });

    if (upErr) {
      await supabaseAdmin.from("invoice_payment_submissions").delete().eq("id", subId);
      return NextResponse.json({ ok: false, error: "Failed to upload proof file. Try again." }, { status: 500 });
    }

    await supabaseAdmin
      .from("invoice_payment_submissions")
      .update({ proof_bucket: bucket, proof_path: objectPath })
      .eq("id", subId);
    (submission as any).proof_bucket = bucket;
    (submission as any).proof_path = objectPath;
    (submission as any).status = "WIRE_PENDING";

    let orderId = safeStr((invoice as any)?.order_id);
    if (!UUID_RE.test(orderId)) {
      const { data: invLine } = await supabaseAdmin
        .from("invoice_items")
        .select("order_item_id")
        .eq("invoice_id", invoiceId)
        .not("order_item_id", "is", null)
        .limit(1)
        .maybeSingle();
      const oiId = safeStr((invLine as any)?.order_item_id);
      if (UUID_RE.test(oiId)) {
        const { data: oi } = await supabaseAdmin.from("order_items").select("order_id").eq("id", oiId).maybeSingle();
        orderId = safeStr((oi as any)?.order_id);
      }
    }

    const accountIdForAudit = String((invoice as any).account_id ?? "");

    if (UUID_RE.test(orderId)) {
      const { data: ord } = await supabaseAdmin.from("orders").select("id, status").eq("id", orderId).maybeSingle();
      const cur = safeStr((ord as any)?.status);
      const curU = cur.toUpperCase();
      // Do not move terminal / pre-payment states into wire-pending
      const blockPendingWire = new Set(["CANCELLED", "DRAFT", "PENDING_WIRE", "COMPLETED"]);
      if (ord && !blockPendingWire.has(curU)) {
        const { error: ordUpErr } = await supabaseAdmin.from("orders").update({ status: "PENDING_WIRE" }).eq("id", orderId);
        if (!ordUpErr) {
          try {
            await supabaseAdmin.from("order_status_events").insert({
              order_id: orderId,
              from_status: cur,
              to_status: "PENDING_WIRE",
              changed_by_user_id: ctx.user?.id ?? null,
              comment: "Customer submitted wire payment proof (pending verification)",
            });
          } catch {
            // non-blocking
          }
        } else {
          try {
            await supabaseAdmin.from("audit_events").insert({
              account_id: accountIdForAudit || null,
              actor_user_id: ctx.user?.id ?? null,
              action: "INVOICE_WIRE_SUBMITTED_ORDER_STATUS_NOT_UPDATED",
              resource_type: "order",
              resource_id: orderId,
              metadata: {
                invoice_id: invoiceId,
                submission_id: subId,
                message:
                  "Wire proof saved. Order status could not be set to PENDING_WIRE (run DB migration adding PENDING_WIRE to orders.status enum if needed).",
                error: ordUpErr.message,
              },
            });
          } catch {
            // non-blocking
          }
        }
      }
    }

    return NextResponse.json({ ok: true, submission }, { status: 200 });
  } catch (err) {
    console.error("[portal wire]", err);
    return NextResponse.json({ ok: false, error: "Failed to submit wire. Try again." }, { status: 500 });
  }
}
