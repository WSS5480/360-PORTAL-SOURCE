import Link from "next/link";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { fulfillmentSignals } from "@/lib/admin/fulfillmentSignals";
import { INVOICE_KIND_PRIMARY, INVOICE_KIND_SHIPPING_SUPPLEMENT } from "@/lib/billing/invoiceKinds";
import { effectivePaymentTermsDays } from "@/lib/billing/effectivePaymentTermsDays";
import { formatStatusLabel } from "@/lib/formatStatusLabel";
import { supabaseAdmin } from "@/lib/supabase/admin";
import OrderStatusFlow from "@/components/admin/OrderStatusFlow";
import ShippingConfirmAction from "@/components/admin/ShippingConfirmAction";

const USD_FMT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function safeUpper(v: any) {
  return String(v ?? "").toUpperCase();
}
function safeStr(v: any) {
  return typeof v === "string" ? v.trim() : "";
}
function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return USD_FMT.format(v);
}
function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

type AccountRow = { id: string; name: string | null };
type ProfileRow = { user_id: string; email: string; full_name: string | null };
type ContactRow = { id: string; email: string; full_name: string | null };

function displayAccount(a: AccountRow | null | undefined) {
  const nm = String(a?.name ?? "").trim();
  return nm || "—";
}
function displayUser(p: ProfileRow | null | undefined) {
  if (!p) return "—";
  const nm = String(p.full_name ?? "").trim();
  if (nm) return nm;
  const em = String(p.email ?? "").trim();
  return em || "—";
}
function displayContact(p: ContactRow | null | undefined) {
  if (!p) return "—";
  const nm = String(p.full_name ?? "").trim();
  if (nm) return nm;
  const em = String(p.email ?? "").trim();
  return em || "—";
}

const ORDER_SELECT = `id, account_id, order_number, status, created_by_user_id, submitted_by_contact_id,
bulk_mode, payment_terms_label_snapshot, payment_terms_days_snapshot, total, subtotal, shipping_total, created_at, placed_at, invoice_address, delivery_address` as const;

const INVOICE_SELECT = `id, invoice_number, status, metadata, created_at, issued_at, voided_at, total, amount_paid` as const;

const FULFILLMENT_SELECT =
  `id, order_id, status, fulfillment_source, created_at, closed_at, shipped_at, tracking_number, metadata,
dropship_vendor_id, dropship_status, dropship_packing_slip_number, dropship_tracking_number, dropship_carrier, dropship_ship_date` as const;

const ACCT_SELECT = `id, name` as const;
const PROFILE_SELECT = `user_id, email, full_name` as const;

export type OrderStatusFlowCloseBehavior =
  | { mode: "order" }
  | { mode: "fulfillment"; fulfillmentId: string; isOpen: boolean; closeReady: boolean };

type Props = {
  orderId: string;
  /** When provided (e.g. order detail page), avoids a second fulfillments query */
  fulfillmentRows?: any[] | null;
  closeBehavior: OrderStatusFlowCloseBehavior;
};

export default async function OrderStatusFlowForOrder(props: Props) {
  await requireOrdersStaffOrAdmin();

  const orderId = props.orderId;

  const { data: order } = await supabaseAdmin.from("orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();
  if (!order) return null;

  const [{ data: acctRow }, { data: pricingRow }, { data: placedByRow }, { data: contactRow }] = await Promise.all([
    supabaseAdmin.from("accounts").select(ACCT_SELECT).eq("id", (order as any).account_id).maybeSingle(),
    supabaseAdmin
      .from("account_pricing")
      .select("payment_terms_days")
      .eq("account_id", (order as any).account_id)
      .maybeSingle(),
    (order as any).created_by_user_id
      ? supabaseAdmin
          .from("user_profiles")
          .select(PROFILE_SELECT)
          .eq("user_id", (order as any).created_by_user_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
    (order as any).submitted_by_contact_id
      ? supabaseAdmin
          .from("account_contacts")
          .select("id, email, full_name")
          .eq("id", (order as any).submitted_by_contact_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const account: AccountRow | null = acctRow
    ? { id: String((acctRow as any).id), name: (acctRow as any).name ?? null }
    : null;

  const placedBy: ProfileRow | null = placedByRow
    ? {
        user_id: String((placedByRow as any).user_id),
        email: String((placedByRow as any).email ?? ""),
        full_name: (placedByRow as any).full_name ?? null,
      }
    : null;

  const placedByContact: ContactRow | null = contactRow
    ? {
        id: String((contactRow as any).id),
        email: String((contactRow as any).email ?? ""),
        full_name: (contactRow as any).full_name ?? null,
      }
    : null;

  const { data: existingInvoice } = await supabaseAdmin
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_PRIMARY)
    .maybeSingle();

  const { data: shippingSupplementInvoices } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, status, total, created_at, metadata")
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_SHIPPING_SUPPLEMENT)
    .order("created_at", { ascending: true });

  let primaryInvoiceHasShippingLine = false;
  if (safeStr((existingInvoice as any)?.id)) {
    const { data: piLines } = await supabaseAdmin
      .from("invoice_items")
      .select("line_type, line_total")
      .eq("invoice_id", safeStr((existingInvoice as any).id))
      .limit(400);
    primaryInvoiceHasShippingLine = (piLines ?? []).some(
      (r: any) => safeUpper(r.line_type) === "SHIPPING" && safeNum(r.line_total) > 0
    );
  }

  const invMeta: any = (existingInvoice as any)?.metadata ?? {};
  const invoiceSentAt = safeStr(invMeta?.last_invoice_emailed_at);
  const invoiceSent = !!invoiceSentAt;

  const invoicePdfObj: any =
    invMeta?.invoice_pdf && typeof invMeta.invoice_pdf === "object" ? invMeta.invoice_pdf : {};
  const pdfBucket = safeStr(invoicePdfObj?.bucket) || safeStr(invMeta?.invoice_pdf_bucket) || "";
  const pdfPath = safeStr(invoicePdfObj?.path) || safeStr(invMeta?.invoice_pdf_path) || "";
  const pdfNumber = safeStr(invoicePdfObj?.number) || safeStr(invMeta?.invoice_pdf_number) || "";

  const hasInvoice = !!(existingInvoice as any)?.id;
  const invoiceId = safeStr((existingInvoice as any)?.id);
  const hasInvoicePdf = !!pdfBucket && !!pdfPath;

  const invoiceTotal = safeNum((existingInvoice as any)?.total ?? (order as any)?.total);
  const amountPaid = safeNum((existingInvoice as any)?.amount_paid);
  const outstanding = Math.max(0, invoiceTotal - amountPaid);
  const termsDays = effectivePaymentTermsDays({
    bulk_mode: (order as any)?.bulk_mode,
    payment_terms_days_snapshot: (order as any)?.payment_terms_days_snapshot,
    payment_terms_label_snapshot: (order as any)?.payment_terms_label_snapshot,
    account_payment_terms_days: (pricingRow as any)?.payment_terms_days,
  });
  const baseDateRaw =
    safeStr((existingInvoice as any)?.issued_at) ||
    safeStr((existingInvoice as any)?.created_at) ||
    safeStr((order as any)?.placed_at) ||
    safeStr((order as any)?.created_at);
  const baseDate = baseDateRaw ? new Date(baseDateRaw) : null;
  const dueDate = baseDate && !Number.isNaN(baseDate.getTime()) ? addDays(baseDate, termsDays) : null;
  const now = new Date();
  const isOverdue = !!dueDate && outstanding > 0 && now.getTime() > dueDate.getTime();

  const primaryPaidLocked =
    safeUpper((existingInvoice as any)?.status) === "PAID" || (invoiceTotal > 0 && outstanding <= 0.02);
  const orderShipAmt = safeNum((order as any).shipping_total);
  const supplementList = Array.isArray(shippingSupplementInvoices) ? shippingSupplementInvoices : [];
  const canCreateShippingSupplement =
    !!(order as any).bulk_mode &&
    hasInvoice &&
    primaryPaidLocked &&
    orderShipAmt > 0 &&
    !primaryInvoiceHasShippingLine &&
    supplementList.length === 0;

  const fulfillmentRows = Array.isArray(props.fulfillmentRows)
    ? props.fulfillmentRows
    : ((
        await supabaseAdmin
          .from("fulfillments")
          .select(FULFILLMENT_SELECT)
          .eq("order_id", orderId)
          .order("created_at", { ascending: true })
      ).data ?? []);

  const openFulfillments = fulfillmentRows.filter((f: any) => safeUpper(f.status) === "OPEN");
  const openFulfillment =
    openFulfillments.find((f: any) => safeUpper(f.fulfillment_source || "") === "INVENTORY") ??
    openFulfillments[0] ??
    null;
  const latestFulfillment = fulfillmentRows.length ? fulfillmentRows[fulfillmentRows.length - 1] : null;
  const allFulfillmentsClosed = fulfillmentRows.length > 0 && openFulfillments.length === 0;

  const openFlowSignals = openFulfillment ? fulfillmentSignals(openFulfillment) : null;
  const openShippingMeta = openFulfillment ? (openFulfillment as any)?.metadata?.shipping_confirmation : null;
  const shippingSentOpen = !!openShippingMeta?.sent_at;
  const shippingSkippedOpen = !!openShippingMeta?.skipped_at;
  const shippingConfirmedOpen = shippingSentOpen || shippingSkippedOpen;
  const { data: openPickRows } = openFulfillment?.id
    ? await supabaseAdmin
        .from("fulfillment_items")
        .select("picked_qty")
        .eq("fulfillment_id", openFulfillment.id)
    : { data: [] as any[] };
  const pickedItemsDone = (openPickRows ?? []).some((r: any) => safeNum(r?.picked_qty) > 0);
  const fulfillmentIsOpen = !!openFulfillment;
  const closeReady =
    pickedItemsDone &&
    !!openFlowSignals?.packingSlipGenerated &&
    !!openFlowSignals?.shippingInfoSaved &&
    shippingConfirmedOpen;
  const canEmailShipping = !!openFlowSignals?.packingSlipGenerated && !!openFlowSignals?.shippingInfoSaved;

  let packingSlipAgg = false;
  let shippingInfoAgg = false;
  let shippingSentAgg = false;
  let shippingSkippedAgg = false;
  for (const f of fulfillmentRows) {
    const sig = fulfillmentSignals(f);
    if (sig.packingSlipGenerated) packingSlipAgg = true;
    if (sig.shippingInfoSaved) shippingInfoAgg = true;
    const m = (f as any)?.metadata?.shipping_confirmation;
    if (m?.sent_at) shippingSentAgg = true;
    if (m?.skipped_at) shippingSkippedAgg = true;
  }
  const shippingConfirmedAgg = shippingSentAgg || shippingSkippedAgg;

  const fulfillmentIds = fulfillmentRows.map((f: any) => String(f.id)).filter(Boolean);
  let pickedItemsDoneAgg = false;
  if (fulfillmentIds.length) {
    const { data: allPickRows } = await supabaseAdmin
      .from("fulfillment_items")
      .select("picked_qty")
      .in("fulfillment_id", fulfillmentIds as any);
    pickedItemsDoneAgg = (allPickRows ?? []).some((r: any) => safeNum(r?.picked_qty) > 0);
  }

  const openInventoryFulfillment = openFulfillments.find(
    (f: any) => safeUpper(f.fulfillment_source || "") === "INVENTORY"
  );
  const closedInventoryFulfillment = fulfillmentRows.find(
    (f: any) => safeUpper(f.fulfillment_source || "") === "INVENTORY" && safeUpper(f.status) === "CLOSED"
  );
  const pulseShippingInvoiceCreate =
    !!canCreateShippingSupplement &&
    primaryPaidLocked &&
    !!closedInventoryFulfillment &&
    !openInventoryFulfillment;

  const billingEmail =
    safeStr(invMeta?.billing_email) ||
    safeStr(placedByContact?.email) ||
    safeStr(placedBy?.email) ||
    safeStr((order as any)?.invoice_address?.email) ||
    safeStr((order as any)?.delivery_address?.email);

  const latestShippingSup = supplementList.length ? supplementList[supplementList.length - 1] : null;
  const latestShippingSupId = latestShippingSup ? safeStr((latestShippingSup as any).id) : "";
  const shipSupMeta: any = (latestShippingSup as any)?.metadata ?? {};
  const shipSupPdfPath =
    safeStr(shipSupMeta?.invoice_pdf?.path) ||
    safeStr(shipSupMeta?.invoice_pdf_path) ||
    "";
  const shipSupPdfReady = !!shipSupPdfPath;
  const shippingSupInvoiceEmailed = !!safeStr(shipSupMeta?.last_invoice_emailed_at);
  const canSendShippingInvoiceEmail =
    !!(order as any).bulk_mode &&
    hasInvoice &&
    primaryPaidLocked &&
    !!latestShippingSupId &&
    shipSupPdfReady &&
    !!billingEmail &&
    !shippingSupInvoiceEmailed;

  const statusUpper = safeUpper((order as any).status);
  const invoiceReadyForCustomer =
    invoiceSent ||
    hasInvoicePdf ||
    !!safeStr((existingInvoice as any)?.issued_at) ||
    statusUpper === "INVOICED";

  const canCreateInvoice =
    (statusUpper === "NEEDS_INVOICE" ||
      statusUpper === "COMPLETED" ||
      statusUpper === "FULFILLING") &&
    !hasInvoice;

  const shippingInvoiceTimelineExtra =
    !!(order as any).bulk_mode && hasInvoice && primaryPaidLocked ? (
      <div
        style={{
          display: "grid",
          gap: 8,
          padding: "8px 10px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.06)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 950, color: "rgba(255,255,255,0.88)" }}>Shipping invoice (separate)</div>
        {canCreateShippingSupplement ? (
          <form action={`/api/admin/orders/${encodeURIComponent(orderId)}/shipping-invoice`} method="post">
            <button
              type="submit"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.35)",
                background: "rgba(16, 185, 129, 0.25)",
                color: "white",
                fontSize: 10,
                fontWeight: 900,
                cursor: "pointer",
                animation: pulseShippingInvoiceCreate ? "order-flow-cta 1.6s ease-in-out infinite" : undefined,
                width: "100%",
                justifyContent: "center",
              }}
              title="Creates an invoice for the order shipping line only (primary invoice stays as paid)."
            >
              Create shipping invoice
            </button>
          </form>
        ) : null}
        {latestShippingSupId ? (
          <div style={{ display: "grid", gap: 6 }}>
            <Link
              href={`/admin/invoices/${encodeURIComponent(latestShippingSupId)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.12)",
                color: "white",
                fontSize: 10,
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Open shipping invoice
            </Link>
            {!shipSupPdfReady ? (
              <form action={`/api/admin/invoices/${encodeURIComponent(latestShippingSupId)}/pdf`} method="post">
                <button
                  type="submit"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(255,255,255,0.12)",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 900,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Generate shipping PDF
                </button>
              </form>
            ) : null}
            {shipSupPdfReady && billingEmail ? (
              <form method="POST" action={`/api/admin/orders/${encodeURIComponent(orderId)}/email-invoice`}>
                <input type="hidden" name="invoice_id" value={latestShippingSupId} />
                <input type="hidden" name="to_email" value={billingEmail} />
                <button
                  type="submit"
                  disabled={!billingEmail || shippingSupInvoiceEmailed}
                  title={billingEmail ? `Send to ${billingEmail}` : "No customer email on file"}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: shippingSupInvoiceEmailed ? "1px solid rgba(34,197,94,0.8)" : "1px solid #0b5cab",
                    background: shippingSupInvoiceEmailed ? "rgba(34,197,94,0.95)" : "#0b5cab",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 900,
                    cursor: billingEmail && !shippingSupInvoiceEmailed ? "pointer" : "not-allowed",
                    opacity: billingEmail && !shippingSupInvoiceEmailed ? 1 : 0.6,
                    width: "100%",
                    animation:
                      canSendShippingInvoiceEmail && !shippingSupInvoiceEmailed
                        ? "order-flow-cta 1.6s ease-in-out infinite"
                        : undefined,
                  }}
                >
                  {shippingSupInvoiceEmailed ? "Shipping invoice emailed" : "Send shipping invoice"}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    ) : null;

  const closeAction =
    props.closeBehavior.mode === "order" ? (
      openFulfillment?.id ? (
        <form action={`/api/admin/fulfillments/${encodeURIComponent(String(openFulfillment.id))}/close`} method="post">
          <button
            type="submit"
            disabled={!fulfillmentIsOpen || !closeReady}
            style={{
              fontSize: 10,
              fontWeight: 900,
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.12)",
              color: "white",
              cursor: fulfillmentIsOpen && closeReady ? "pointer" : "not-allowed",
              opacity: fulfillmentIsOpen && closeReady ? 1 : 0.5,
            }}
            title={
              closeReady
                ? "Close fulfillment"
                : !shippingConfirmedOpen
                ? "Send or skip shipping confirmation to the customer first"
                : "Complete pick items, packing slip, and shipping info first"
            }
          >
            Close
          </button>
        </form>
      ) : null
    ) : (
      <form
        action={`/api/admin/fulfillments/${encodeURIComponent(String(props.closeBehavior.fulfillmentId))}/close`}
        method="post"
      >
        <button
          type="submit"
          disabled={!props.closeBehavior.isOpen || !props.closeBehavior.closeReady}
          style={{
            fontSize: 10,
            fontWeight: 900,
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.12)",
            color: "white",
            cursor: props.closeBehavior.isOpen && props.closeBehavior.closeReady ? "pointer" : "not-allowed",
            opacity: props.closeBehavior.isOpen && props.closeBehavior.closeReady ? 1 : 0.5,
          }}
          title={props.closeBehavior.closeReady ? "Close fulfillment" : "Complete fulfillment requirements first"}
        >
          Close
        </button>
      </form>
    );

  const closeActive =
    props.closeBehavior.mode === "order"
      ? fulfillmentIsOpen && closeReady
      : props.closeBehavior.isOpen && props.closeBehavior.closeReady;

  return (
    <OrderStatusFlow
      orderStatus={String((order as any).status || "")}
      hasInvoice={hasInvoice}
      fulfillment={{
        pickedItems: pickedItemsDoneAgg,
        packingSlipGenerated: packingSlipAgg,
        shippingInfoSaved: shippingInfoAgg,
        shippingConfirmationSent: shippingSentAgg,
        shippingConfirmationSkipped: shippingSkippedAgg,
        allFulfillmentsClosed,
      }}
      confirmedMeta={{
        accountName: displayAccount(account),
        submittedName: placedByContact ? displayContact(placedByContact) : displayUser(placedBy),
        submittedEmail: placedByContact?.email
          ? String(placedByContact.email)
          : placedBy?.email
            ? String(placedBy.email)
            : "",
      }}
      betweenLabel={
        openFulfillment?.id ? (
          <Link
            href={`/admin/fulfillments/${encodeURIComponent(String(openFulfillment.id))}`}
            style={{ fontWeight: 900, textDecoration: "none", color: "white" }}
          >
            Open fulfillment
          </Link>
        ) : (latestFulfillment as any)?.id ? (
          <Link
            href={`/admin/fulfillments/${encodeURIComponent(String((latestFulfillment as any).id))}`}
            style={{ fontWeight: 900, textDecoration: "none", color: "white" }}
          >
            Last fulfillment
          </Link>
        ) : (
          "No fulfillment"
        )
      }
      invoiceAction={
        hasInvoice ? (
          <div style={{ display: "grid", gap: 6 }}>
            <Link
              href={`/api/admin/invoices/${encodeURIComponent(invoiceId)}/open`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.12)",
                color: "white",
                fontSize: 10,
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              View invoice
            </Link>
            {invoiceReadyForCustomer ? (
              <label
                style={{
                  display: "inline-flex",
                  gap: 6,
                  alignItems: "center",
                  fontSize: 10,
                  fontWeight: 900,
                  color: "rgba(34,197,94,0.95)",
                }}
              >
                <input
                  type="checkbox"
                  checked
                  readOnly
                  style={{ accentColor: "#22c55e", transform: "translateY(0.5px)" }}
                />
                Invoice issued
              </label>
            ) : null}
            <form method="POST" action={`/api/admin/orders/${encodeURIComponent(String(orderId))}/email-invoice`}>
              <input type="hidden" name="to_email" value={billingEmail} />
              <button
                type="submit"
                disabled={!billingEmail || invoiceSent}
                title={billingEmail ? `Send to ${billingEmail}` : "No customer email on file"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: invoiceSent ? "1px solid rgba(34,197,94,0.8)" : "1px solid #0b5cab",
                  background: invoiceSent ? "rgba(34,197,94,0.95)" : "#0b5cab",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 900,
                  textDecoration: "none",
                  cursor: billingEmail && !invoiceSent ? "pointer" : "not-allowed",
                  opacity: billingEmail && !invoiceSent ? 1 : 0.6,
                  animation:
                    !invoiceSent && !invoiceReadyForCustomer ? "order-flow-cta 1.6s ease-in-out infinite" : undefined,
                }}
              >
                {invoiceSent ? "Invoice emailed" : "Send invoice"}
              </button>
            </form>
          </div>
        ) : canCreateInvoice ? (
          <form action={`/api/admin/orders/${encodeURIComponent(orderId)}/invoice`} method="post">
            <button
              type="submit"
              style={{
                fontSize: 10,
                fontWeight: 900,
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.12)",
                color: "white",
                cursor: "pointer",
              }}
              title="Create invoice"
            >
              Create invoice
            </button>
          </form>
        ) : null
      }
      invoiceActive={canCreateInvoice && !hasInvoice}
      closeActive={closeActive}
      closeAction={closeAction}
      shippingAction={
        <ShippingConfirmAction
          actionUrl={`/api/admin/orders/${encodeURIComponent(orderId)}/email-shipping`}
          enabled={canEmailShipping}
          onDark
          sent={shippingSentAgg}
          skipped={shippingSkippedAgg}
          pulse={!!openFulfillment && !shippingConfirmedAgg}
        />
      }
      invoiceSummary={
        hasInvoice
          ? {
              sent: invoiceReadyForCustomer,
              total: money(invoiceTotal),
              paid: money(amountPaid),
              outstanding: money(outstanding),
              overdue: dueDate
                ? isOverdue
                  ? `Overdue ${money(outstanding)} • Due ${dueDate.toLocaleDateString()}`
                  : `Due ${money(outstanding)} • ${dueDate.toLocaleDateString()}`
                : undefined,
            }
          : undefined
      }
      invoiceIssuedExtra={shippingInvoiceTimelineExtra}
    />
  );
}
