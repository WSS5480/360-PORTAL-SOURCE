import Link from "next/link";
import { formatStatusLabel } from "@/lib/formatStatusLabel";
import { formatFedexServiceLabel } from "@/lib/fedex/shippingPriorityMap";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reconcilePendingStripeSubmissionsForInvoice } from "@/lib/stripe/reconcilePendingStripeSubmissions";
import { canViewOrders } from "@/lib/portal/portalRoles";
import { isPortalInvoiceRowViewable } from "@/lib/portal/portalRowScope";
import PrintButtonClient from "./PrintButtonClient";
import InvoiceDownloadClient from "@/app/portal/orders/[orderId]/InvoiceDownloadClient";

export const dynamic = "force-dynamic";

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

function safeUpper(v: any) {
  return String(v ?? "").toUpperCase();
}

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function dateTime(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function pill(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    whiteSpace: "nowrap",
  };

  const s = safeUpper(status);
  if (s === "DRAFT") return { ...base, background: "rgba(0,0,0,0.04)" };
  if (s === "ISSUED") return { ...base, background: "rgba(13, 110, 253, 0.14)" };
  if (s === "SENT") return { ...base, background: "rgba(13, 110, 253, 0.10)" };
  if (s === "PAID") return { ...base, background: "rgba(25, 135, 84, 0.14)" };
  if (s === "VOID") return { ...base, background: "rgba(220, 53, 69, 0.12)" };
  return base;
}


export default async function PortalInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const ctx = await requireCurrentAccount();
  const accountId = ctx.currentAccountId;

  if (!accountId) {
    return (
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>Invoice</h1>
        <p style={{ marginTop: 10, opacity: 0.75 }}>No account selected.</p>
      </div>
    );
  }

  if (!canViewOrders(ctx.currentRole)) {
    return (
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>Invoice</h1>
        <p style={{ marginTop: 10, color: "crimson", fontWeight: 900 }}>
          Forbidden: your role can’t view invoices for this account.
        </p>
      </div>
    );
  }

  const resolved = await params;
  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");

  if (!UUID_RE.test(invoiceId)) {
    return (
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>Invoice</h1>
        <p style={{ marginTop: 10, color: "crimson", fontWeight: 900 }}>Invalid invoiceId.</p>
        <Link href="/portal/orders" style={{ textDecoration: "none", fontWeight: 950 }}>
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const { data: invoice, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select(
      "id, account_id, order_id, invoice_number, invoice_kind, status, issued_at, subtotal, shipping_total, total, metadata, created_at, amount_paid"
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) {
    return (
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>Invoice</h1>
        <p style={{ marginTop: 10, color: "crimson", fontWeight: 900 }}>{invErr.message}</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>Invoice</h1>
        <p style={{ marginTop: 10, opacity: 0.75 }}>Not found.</p>
      </div>
    );
  }

  // critical account boundary
  if (String((invoice as any).account_id) !== String(accountId)) {
    return (
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>Invoice</h1>
        <p style={{ marginTop: 10, color: "crimson", fontWeight: 900 }}>Forbidden.</p>
      </div>
    );
  }

  const portalUserId = String((ctx.user as any)?.id ?? "");
  const viewable = await isPortalInvoiceRowViewable(supabaseAdmin as any, accountId, portalUserId, ctx.currentRole, invoice as any);
  if (!viewable) {
    return (
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>Invoice</h1>
        <p style={{ marginTop: 10, opacity: 0.75 }}>Not found.</p>
      </div>
    );
  }

  await reconcilePendingStripeSubmissionsForInvoice(invoiceId);

  const orderIdForInvoice = String((invoice as any).order_id ?? "").trim();
  const { data: orderRow } =
    orderIdForInvoice && UUID_RE.test(orderIdForInvoice)
      ? await supabaseAdmin.from("orders").select("bulk_mode").eq("id", orderIdForInvoice).maybeSingle()
      : { data: null };

  const showShippingPerFulfillmentNote =
    safeUpper((invoice as any).invoice_kind) === "SHIPPING_SUPPLEMENT" || !!(orderRow as any)?.bulk_mode;

  const { data: items, error: itemErr } = await supabaseAdmin
    .from("invoice_items")
    .select("id, description, quantity, uom, unit_price, discount_percent, line_total, line_type, sort_order")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true });

  if (itemErr) {
    return (
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>Invoice</h1>
        <p style={{ marginTop: 10, color: "crimson", fontWeight: 900 }}>{itemErr.message}</p>
      </div>
    );
  }

  const meta: any = (invoice as any).metadata ?? {};
  const ship: any = meta?.shipping ?? {};
  const statusUpper = safeUpper((invoice as any).status);
  const isVoided = statusUpper === "VOID" || statusUpper === "VOIDED";

  let paymentsTotal = 0;
  try {
    const { data: payRows } = await supabaseAdmin
      .from("invoice_payments")
      .select("amount")
      .eq("invoice_id", invoiceId);
    paymentsTotal = (payRows ?? []).reduce((sum: number, r: any) => sum + (Number(r?.amount) || 0), 0);
  } catch {
    paymentsTotal = 0;
  }

  const storedPaid = Number((invoice as any).amount_paid) || 0;
  const amountPaid = Math.max(storedPaid, paymentsTotal);
  const invoiceTotal = Number((invoice as any).total) || 0;
  const remaining = Math.max(0, invoiceTotal - amountPaid);
  const canPay = remaining > 0 && !isVoided;
  const noBalanceDue = !isVoided && invoiceTotal <= 0.005 && statusUpper !== "PAID";

  return (
    <main style={{ padding: 18, maxWidth: 1100, margin: "0 auto", display: "grid", gap: 14 }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              button, a[href^="/portal/"] { display:none !important; }
              main { padding: 0 !important; }
            }
          `,
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            <Link href="/portal/orders" style={{ textDecoration: "none", fontWeight: 950 }}>
              ← Orders
            </Link>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 950, margin: "8px 0 0" }}>
            Invoice {invoice.invoice_number ?? String(invoice.id).slice(0, 8) + "…"}
          </h1>

          <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={pill(String(invoice.status))}>{formatStatusLabel(invoice.status)}</span>
            <span style={{ fontSize: 13, opacity: 0.8 }}>
              Created: <b>{dateTime(invoice.created_at)}</b>
            </span>
            <span style={{ fontSize: 13, opacity: 0.8 }}>
              Issued: <b>{dateTime(invoice.issued_at)}</b>
            </span>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            Order:{" "}
            <Link href={`/portal/orders/${encodeURIComponent(String(invoice.order_id))}`} style={{ textDecoration: "none", fontWeight: 950 }}>
              {String(invoice.order_id).slice(0, 8)}…
            </Link>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <InvoiceDownloadClient invoiceId={invoiceId} enabled />
          <PrintButtonClient />
        </div>
      </div>

      <div
        style={{
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 16,
          background: "white",
          boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 950 }}>Payment status</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Paid {money(amountPaid)} · Remaining {money(remaining)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>
            {remaining > 0
              ? "Remaining balance due."
              : noBalanceDue
                ? "No balance due on this invoice."
                : "Paid in full."}
          </div>
        </div>
        {canPay ? (
          <Link
            href={`/portal/invoices/${encodeURIComponent(String(invoice.id))}/pay`}
            style={{
              textDecoration: "none",
              fontWeight: 950,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "#111",
              color: "white",
            }}
          >
            Pay invoice
          </Link>
        ) : (
          <div
            style={{
              fontSize: 14,
              fontWeight: 950,
              color: isVoided ? "rgba(15,23,42,0.55)" : noBalanceDue ? "rgba(15,23,42,0.75)" : "#15803d",
            }}
          >
            {isVoided ? "Invoice is voided." : noBalanceDue ? "No payment due" : "Paid"}
          </div>
        )}
      </div>

      {String(ship?.tracking_number ?? "").trim() ? (
        <div
          style={{
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 16,
            background: "white",
            boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 950 }}>Shipment</div>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9, fontWeight: 850 }}>
            Carrier: {ship?.carrier ?? "—"} · Tracking: <span style={{ fontWeight: 950 }}>{ship?.tracking_number}</span>
          </div>
          {ship?.service ? (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, fontWeight: 850 }}>
              Service: {formatFedexServiceLabel(ship.service, { saturdayDelivery: !!ship?.saturday_delivery })}
            </div>
          ) : null}
          {ship?.service_change_reason ? (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                padding: 10,
                borderRadius: 10,
                background: "rgba(255,153,0,0.08)",
                border: "1px solid rgba(255,153,0,0.25)",
                color: "rgba(120,60,0,1)",
                fontWeight: 850,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 950, marginBottom: 4 }}>
                Service change: {ship?.service_changed_from ? `from ${formatFedexServiceLabel(ship.service_changed_from)}` : ""}
              </div>
              {ship.service_change_reason}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 16,
          overflow: "hidden",
          background: "white",
          boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 950 }}>Invoice Lines</div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
                <th style={{ padding: 12 }}>Description</th>
                <th style={{ padding: 12 }}>Qty</th>
                <th style={{ padding: 12 }}>Unit</th>
                <th style={{ padding: 12 }}>Discount</th>
                <th style={{ padding: 12 }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((it: any) => (
                <tr key={it.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: 12, fontWeight: 900 }}>{it.description}</td>
                  <td style={{ padding: 12, fontWeight: 900 }}>{Number(it.quantity ?? 0) || 0}</td>
                  <td style={{ padding: 12, opacity: 0.85 }}>{it.uom ?? "Units"}</td>
                  <td style={{ padding: 12, fontWeight: 900 }}>{Number(it.discount_percent ?? 0) || 0}%</td>
                  <td style={{ padding: 12, fontWeight: 950 }}>{money(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: 12, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div style={{ opacity: 0.75, fontWeight: 900 }}>Subtotal</div>
            <div style={{ fontWeight: 950 }}>{money(invoice.subtotal)}</div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 8,
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={{ opacity: 0.75, fontWeight: 900 }}>Shipping</div>
              {showShippingPerFulfillmentNote && Number(invoice.shipping_total ?? 0) > 0 ? (
                <div style={{ fontSize: 11, opacity: 0.65, fontWeight: 700, marginTop: 4 }}>
                  Invoiced separately per fulfillment
                </div>
              ) : null}
            </div>
            <div style={{ fontWeight: 950 }}>{money(invoice.shipping_total)}</div>
          </div>
          <div style={{ height: 1, background: "rgba(0,0,0,0.08)", marginTop: 10 }} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontWeight: 950 }}>Total</div>
            <div style={{ fontWeight: 950, fontSize: 18 }}>{money(invoice.total)}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
