// src/app/admin/fulfillments/[fulfillmentId]/page.tsx
import Link from "next/link";
import type { CSSProperties } from "react";
import { resolveInternalVendorAccountId } from "@/lib/admin/internalVendorAccount";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { formatStatusLabel } from "@/lib/formatStatusLabel";
import { supabaseAdmin } from "@/lib/supabase/admin";
import FulfillmentClient from "./FulfillmentClient";
import FulfillmentShippingCard from "./FulfillmentShippingCard";
import PackingSlipPrintButton from "./PackingSlipPrintButton";
import DropshipPanelClient from "./DropshipPanelClient";
import OrderStatusFlowForOrder from "@/components/admin/OrderStatusFlowForOrder";
import { loadPartnerOrigin } from "@/lib/integrations/partnerOriginLabel";

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

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: any) {
  return typeof v === "string" ? v : "";
}

function safeUpper(v: any) {
  return String(v ?? "").toUpperCase();
}

function isVirtualWarehouseBulkDepositLineDescription(desc: unknown): boolean {
  return String(desc ?? "").trim().startsWith("Virtual warehouse bulk purchase");
}

function dateTime(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function pill(t: "open" | "closed" | "warn" | "neutral"): CSSProperties {
  const base: CSSProperties = {
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
  if (t === "open") return { ...base, background: "rgba(13, 110, 253, 0.12)" };
  if (t === "closed") return { ...base, background: "rgba(25, 135, 84, 0.12)" };
  if (t === "warn") return { ...base, background: "rgba(255, 153, 0, 0.16)" };
  return base;
}

function btn(primary: boolean): CSSProperties {
  return {
    fontSize: 13,
    fontWeight: 950,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: primary ? "#111" : "white",
    color: primary ? "white" : "#111",
    cursor: "pointer",
    width: "100%",
  };
}

function bannerStyle(tone: "ok" | "warn" | "muted"): CSSProperties {
  return {
    borderRadius: 14,
    padding: 12,
    border: "1px solid rgba(0,0,0,0.10)",
    background:
      tone === "ok"
        ? "rgba(25,135,84,0.10)"
        : tone === "warn"
        ? "rgba(220,53,69,0.10)"
        : "rgba(0,0,0,0.03)",
    fontWeight: 900,
    fontSize: 13,
    boxShadow: "0 10px 26px rgba(0,0,0,0.06)",
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  };
}

function card(): CSSProperties {
  return {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 16,
    background: "white",
    boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
    overflow: "hidden",
  };
}

function cardHeader(): CSSProperties {
  return {
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    fontWeight: 950,
  };
}

function inventoryCard(): CSSProperties {
  return {
    ...card(),
    border: "1px solid rgba(15,76,129,0.25)",
    background: "rgba(15,76,129,0.04)",
  };
}

function inventoryCardHeader(): CSSProperties {
  return {
    ...cardHeader(),
    background: "rgba(15,76,129,0.08)",
    color: "#0f3556",
  };
}

function actionLink(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    textDecoration: "none",
    fontWeight: 950,
    width: "100%",
    background: "white",
    color: "#111",
  };
}

function mono(): CSSProperties {
  return { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
}

function fulfillmentSignalsForFlow(f: any, packingSlipPath: string, shipping: any) {
  const isDropship = String(f?.fulfillment_source || "").toUpperCase() === "DROPSHIP";

  if (isDropship) {
    const tracking = String(f?.dropship_tracking_number || "").trim();
    const carrier = String(f?.dropship_carrier || "").trim();
    const shipDate = String(f?.dropship_ship_date || "").trim();
    const noTracking = !!shipping?.no_tracking;
    const labelUrl = String(shipping?.label_url || "").trim();
    const shippedAt = String(shipping?.shipped_at || f?.shipped_at || "").trim();
    const packingSlipNo = String(f?.dropship_packing_slip_number || "").trim();

    return {
      packingSlipGenerated: !!packingSlipNo,
      shippingInfoSaved: !!(tracking && carrier) || !!shipDate || !!labelUrl || !!noTracking || !!shippedAt,
    };
  }

  const tracking = String(shipping?.tracking_number || f?.tracking_number || "").trim();
  const labelUrl = String(shipping?.label_url || "").trim();
  const shippedAt = String(shipping?.shipped_at || f?.shipped_at || "").trim();
  const noTracking = !!shipping?.no_tracking;

  return {
    packingSlipGenerated: !!packingSlipPath,
    shippingInfoSaved: !!tracking || !!labelUrl || !!noTracking || !!shippedAt,
  };
}

function HeroStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 10,
        borderRight: "1px solid rgba(255,255,255,0.12)",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 950, color: "white", textAlign: "right" }}>{value}</div>
    </div>
  );
}

export default async function AdminFulfillmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ fulfillmentId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOrdersStaffOrAdmin();

  const resolved = await params;
  const fulfillmentId = normalizeParam(resolved?.fulfillmentId ?? "");

  const sp = searchParams ? await searchParams : ({} as Record<string, string | string[] | undefined>);
  const ok = safeStr(sp?.ok);
  const msg = safeStr(sp?.msg);
  const error = safeStr(sp?.error);

  if (!UUID_RE.test(fulfillmentId)) {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Fulfillment</h1>
        <div style={{ marginTop: 12, color: "crimson", fontWeight: 950 }}>Invalid fulfillmentId.</div>
      </main>
    );
  }

  const { data: f, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select(
      [
        "id",
        "order_id",
        "invoice_id",
        "status",
        "created_at",
        "closed_at",
        "metadata",
        "fulfillment_source",
        "dropship_vendor_id",
        "po_number",
        "po_sent_at",
        "po_sent_to",
        "po_pdf_bucket",
        "po_pdf_path",
        "dropship_status",
        "dropship_packing_slip_number",
        "dropship_tracking_number",
        "dropship_carrier",
        "dropship_ship_date",
        "dropship_notes",
      ].join(",")
    )
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Fulfillment</h1>
        <div style={{ marginTop: 12, color: "crimson", fontWeight: 950 }}>{fErr.message}</div>
      </main>
    );
  }

  if (!f) {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Fulfillment</h1>
        <div style={{ marginTop: 12, opacity: 0.8 }}>Not found.</div>
      </main>
    );
  }

  const fRow: any = f;
  const orderId = String(fRow.order_id || "");
  const invoiceId = fRow.invoice_id ? String(fRow.invoice_id) : "";

  const statusUpper = String(fRow.status || "").toUpperCase();
  const isOpen = statusUpper === "OPEN";

  const fulfillmentSource = String(fRow.fulfillment_source || "INVENTORY").toUpperCase();
  const isDropship = fulfillmentSource === "DROPSHIP";

  const { data: itemsRaw, error: iErr } = await supabaseAdmin
    .from("fulfillment_items")
    .select("id, order_item_id, description, variant_id, required_qty, picked_qty, uom, sort_order")
    .eq("fulfillment_id", fulfillmentId)
    .order("sort_order", { ascending: true });

  if (iErr) {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Fulfillment</h1>
        <div style={{ marginTop: 12, color: "crimson", fontWeight: 950 }}>{iErr.message}</div>
      </main>
    );
  }

  const items = (itemsRaw ?? []).filter((x: any) => !isVirtualWarehouseBulkDepositLineDescription(x.description));

  // Inventory map for "on-hand"
  const variantIds = Array.from(new Set((items ?? []).map((x: any) => String(x.variant_id)))).filter(Boolean);
  const invMap = new Map<string, number>();

  if (variantIds.length) {
    const { data: invRows } = await supabaseAdmin
      .from("variant_inventory")
      .select("variant_id, on_hand")
      .in("variant_id", variantIds as any);

    for (const r of invRows ?? []) invMap.set(String((r as any).variant_id), safeNum((r as any).on_hand));
  }

  // ✅ READY/SHORT logic differs by source
  let allReady = true;
  let anyShort = false;
  let dropshipMissingCount = 0;

  if (!isDropship) {
    // Include dropship-assigned quantities in remaining calc
    const variantIdsForDropship = Array.from(new Set((items ?? []).map((x: any) => String(x.variant_id)))).filter(Boolean);
    const dropshipByVariant: Record<string, number> = {};

    if (variantIdsForDropship.length) {
      const { data: dropshipF } = await supabaseAdmin
        .from("fulfillments")
        .select("id")
        .eq("order_id", orderId)
        .eq("fulfillment_source", "DROPSHIP");

      const dropIds = (dropshipF ?? []).map((f: any) => String(f.id)).filter(Boolean);
      if (dropIds.length) {
        const { data: dropItems } = await supabaseAdmin
          .from("fulfillment_items")
          .select("variant_id, required_qty")
          .in("fulfillment_id", dropIds as any)
          .in("variant_id", variantIdsForDropship as any);

        for (const it of dropItems ?? []) {
          const vid = String((it as any).variant_id || "");
          if (!vid) continue;
          dropshipByVariant[vid] = safeNum(dropshipByVariant[vid]) + safeNum((it as any).required_qty);
        }
      }
    }

    const remainingByItem = (items ?? []).map((x: any) => {
      const req = safeNum(x.required_qty);
      const picked = safeNum(x.picked_qty);
      const dropshipAssigned = safeNum(dropshipByVariant[String(x.variant_id) || ""]);
      return Math.max(0, req - picked - dropshipAssigned);
    });

    allReady = remainingByItem.every((r) => r <= 0);
    anyShort = remainingByItem.some((r) => r > 0);
  } else {
    // DROPSHIP: use trace completeness (sum qty per fulfillment_item_id >= required_qty)
    const { data: traces, error: tErr } = await supabaseAdmin
      .from("fulfillment_item_trace")
      .select("fulfillment_item_id, qty")
      .eq("fulfillment_id", fulfillmentId)
      .limit(10000);

    if (!tErr) {
      const gotByItem = new Map<string, number>();
      for (const t of Array.isArray(traces) ? traces : []) {
        const k = String((t as any).fulfillment_item_id || "");
        if (!k) continue;
        gotByItem.set(k, (gotByItem.get(k) ?? 0) + safeNum((t as any).qty));
      }

      const rows = Array.isArray(items) ? items : [];
      const missing: string[] = [];
      for (const r of rows) {
        const itemId = String((r as any).id || "");
        const reqQty = safeNum((r as any).required_qty);
        if (!itemId || reqQty <= 0) continue;
        const got = gotByItem.get(itemId) ?? 0;
        if (got + 1e-9 < reqQty) missing.push(itemId);
      }

      dropshipMissingCount = missing.length;
      allReady = missing.length === 0;
      anyShort = missing.length > 0;
    } else {
      // If trace query fails, fail safe: show not-ready
      allReady = false;
      anyShort = true;
    }
  }

  const banner =
    error?.trim()
      ? { tone: "warn" as const, text: error.trim() }
      : ok === "1" && msg?.trim()
      ? { tone: "ok" as const, text: msg.trim() }
      : null;

  const meta: any = typeof fRow.metadata === "object" && fRow.metadata ? fRow.metadata : {};
  const shipping = (meta?.shipping ?? null) as any;

  // Internal generated packing slip (metadata)
  const packingSlip = (meta?.packing_slip ?? null) as any;
  const packingSlipPath = typeof packingSlip?.path === "string" ? packingSlip.path : "";
  const packingSlipGeneratedAt = typeof packingSlip?.generated_at === "string" ? packingSlip.generated_at : "";

  const flowSignals = fulfillmentSignalsForFlow(fRow, packingSlipPath, shipping);
  const canEmailShipping = flowSignals.packingSlipGenerated && flowSignals.shippingInfoSaved;
  const shippingConfirmMeta = (fRow as any)?.metadata?.shipping_confirmation;
  const shippingConfirmSent = !!shippingConfirmMeta?.sent_at;
  const shippingConfirmSkipped = !!shippingConfirmMeta?.skipped_at;
  const shippingConfirmationDone = shippingConfirmSent || shippingConfirmSkipped;

  // ✅ Order accountId (customer account that owns the order)
  const { data: orderRow } = await supabaseAdmin
    .from("orders")
    .select("id, account_id, status, created_by_user_id, submitted_by_contact_id, shipping_priority, delivery_address")
    .eq("id", orderId)
    .maybeSingle();
  const orderAccountId = orderRow?.account_id ? String(orderRow.account_id) : "";
  const orderStatus = orderRow?.status ? String(orderRow.status) : "";
  const orderStatusUpper = orderStatus.toUpperCase();


  const vendorDirectory = resolveInternalVendorAccountId();
  const vendorAccountIds = Array.from(
    new Set([orderAccountId, vendorDirectory.ok ? vendorDirectory.accountId : ""].filter(Boolean)),
  );

  const { data: vendors } =
    vendorAccountIds.length > 0
      ? await supabaseAdmin
          .from("dropship_vendors")
          .select("id, account_id, name, email, disabled_at, created_at")
          .in("account_id", vendorAccountIds as any)
          .is("disabled_at", null)
          .order("created_at", { ascending: false })
          .limit(500)
      : { data: [] as any[] };

  const vendorNameById = new Map<string, string>();
  for (const v of vendors ?? []) vendorNameById.set(String((v as any).id), String((v as any).name || ""));

  const dropshipVendorId = fRow.dropship_vendor_id ? String(fRow.dropship_vendor_id) : "";
  const dropshipVendorName = dropshipVendorId ? vendorNameById.get(dropshipVendorId) || null : null;

  const { data: acctRow } = orderAccountId
    ? await supabaseAdmin.from("accounts").select("id, name").eq("id", orderAccountId).maybeSingle()
    : ({ data: null } as any);
  const accountName = acctRow?.name ? String(acctRow.name) : "";
  const partnerOrigin = await loadPartnerOrigin(supabaseAdmin, orderId);

  const submitterUserId = orderRow?.created_by_user_id ? String(orderRow.created_by_user_id) : "";
  const submitterContactId = orderRow?.submitted_by_contact_id ? String(orderRow.submitted_by_contact_id) : "";
  const { data: submitterProfile } = submitterUserId
    ? await supabaseAdmin.from("user_profiles").select("user_id, email, full_name").eq("user_id", submitterUserId).maybeSingle()
    : ({ data: null } as any);
  const { data: submitterContact } = submitterContactId
    ? await supabaseAdmin.from("account_contacts").select("id, email, full_name").eq("id", submitterContactId).maybeSingle()
    : ({ data: null } as any);

  const submittedName =
    (submitterContact?.full_name ? String(submitterContact.full_name) : "") ||
    (submitterProfile?.full_name ? String(submitterProfile.full_name) : "");
  const submittedEmail =
    (submitterContact?.email ? String(submitterContact.email) : "") ||
    (submitterProfile?.email ? String(submitterProfile.email) : "");

  /** Enables the Close control in the timeline: picks complete, slip + shipping info, and send/skip shipping confirmation. */
  const closeReady =
    isOpen &&
    allReady &&
    flowSignals.packingSlipGenerated &&
    flowSignals.shippingInfoSaved &&
    shippingConfirmationDone;
  const totalRequired = (items ?? []).reduce((sum: number, it: any) => sum + safeNum(it?.required_qty), 0);
  const totalPicked = (items ?? []).reduce((sum: number, it: any) => sum + safeNum(it?.picked_qty), 0);
  const readinessLabel = isDropship
    ? dropshipMissingCount > 0
      ? `Trace remaining (${dropshipMissingCount})`
      : "Trace complete"
    : anyShort
    ? "Items remaining"
    : "All picked";

  return (
    <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto", display: "grid", gap: 14 }}>
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            .admin-fulfillment-grid {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: 14px;
              align-items: start;
              min-width: 0;
            }
            @media (min-width: 1200px) {
              .admin-fulfillment-grid {
                grid-template-columns: minmax(0, 1fr) 380px;
              }
            }
          `,
        }}
      />
      {vendorDirectory.ok ? null : (
        <div style={bannerStyle("warn")}>{vendorDirectory.error}</div>
      )}

      {banner ? (
        <div style={bannerStyle(banner.tone)}>
          <div>{banner.text}</div>
          <Link
            href={`/admin/fulfillments/${encodeURIComponent(fulfillmentId)}`}
            style={{ fontWeight: 950, textDecoration: "none", color: "inherit", opacity: 0.85 }}
            title="Clear message"
          >
            ✕
          </Link>
        </div>
      ) : null}

      {/* Recovery: DROPSHIP mode but has inventory picks — likely wrong fulfillment or accidental switch */}
      {isDropship && totalPicked > 0 ? (
        <div style={bannerStyle("warn")}>
          <div>
            This fulfillment shows DROPSHIP mode but has <b>{totalPicked}</b> picked quantity. Your picks may be here.
            Switch to <b>INVENTORY</b> in the Dropship panel (right) to view and manage picks, or check the order page
            for another fulfillment.
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div
        style={{
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(129,140,248,0.26)",
          background:
            "radial-gradient(900px 240px at 15% 10%, rgba(99,102,241,0.24), transparent 60%)," +
            "linear-gradient(180deg, #0a1428, #050d16)",
          boxShadow: "0 16px 36px rgba(15,23,42,0.12)",
        }}
      >
        <div
          style={{
            padding: 16,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 14,
            alignItems: "end",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.7, fontWeight: 900, textTransform: "uppercase", color: "white" }}>
              Admin
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, color: "white" }}>
              <Link href={`/admin/orders/${encodeURIComponent(orderId)}`} style={{ textDecoration: "none", fontWeight: 950, color: "white" }}>
                ← Back to Order
              </Link>
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 24, fontWeight: 950, margin: 0, color: "white" }}>
                Fulfillment {String(fRow.id).slice(0, 8)}…
              </h1>
              <span style={{ ...pill(isOpen ? "open" : "closed"), background: "rgba(255,255,255,0.12)", color: "white" }}>
                {formatStatusLabel(fRow.status)}
              </span>
              <span style={pill("neutral")}>Source: {fulfillmentSource}</span>
              {partnerOrigin ? (
                <span style={{ ...pill("neutral"), background: "rgba(255,255,255,0.12)", color: "white" }}>
                  Partner order · {partnerOrigin.partnerName} · {partnerOrigin.externalOrderNumber}
                </span>
              ) : null}
              <span style={{ fontSize: 12, opacity: 0.75, color: "white" }}>
                Invoice: {invoiceId ? invoiceId.slice(0, 8) + "…" : "—"}
              </span>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85, lineHeight: 1.5, color: "white" }}>
              Created: <b>{dateTime(fRow.created_at)}</b> · Closed: <b>{dateTime(fRow.closed_at)}</b>
            </div>

          </div>

          <div style={{ display: "grid", gap: 8, justifyItems: "end", color: "white" }}>
            <span style={{ ...pill("neutral"), background: "rgba(255,255,255,0.12)", color: "white" }}>{readinessLabel}</span>
            <div style={{ fontSize: 12, opacity: 0.8, textAlign: "right" }}>
              Required: <b>{totalRequired}</b> · Picked: <b>{totalPicked}</b>
            </div>
          </div>
        </div>

        <OrderStatusFlowForOrder
          orderId={orderId}
          closeBehavior={{
            mode: "fulfillment",
            fulfillmentId,
            isOpen,
            closeReady,
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <HeroStat label="Items" value={`${(items ?? []).length}`} />
          <HeroStat label="Required qty" value={totalRequired} />
          <HeroStat label="Picked qty" value={totalPicked} />
          <HeroStat label="Status" value={formatStatusLabel(fRow.status) || "—"} />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="admin-fulfillment-grid">
        {/* LEFT */}
        <div style={{ minWidth: 0 }}>
          <div style={card()}>
            <div style={cardHeader()}>
              Line Items
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                {isDropship ? "Enter traceability and packing slip details for dropship items." : "Pick items from inventory and update quantities."}
              </div>
            </div>
            <div style={{ padding: 12 }}>
              <FulfillmentClient
                fulfillmentId={fulfillmentId}
                isOpen={isOpen}
                orderId={orderId}
                items={(items ?? []).map((it: any) => ({
                  id: String(it.id),
                  order_item_id: String(it.order_item_id || ""),
                  description: String(it.description ?? ""),
                  variant_id: String(it.variant_id ?? ""),
                  required_qty: safeNum(it.required_qty),
                  picked_qty: safeNum(it.picked_qty),
                  uom: String(it.uom ?? "Units"),
                  sort_order: typeof it.sort_order === "number" ? it.sort_order : null,
                }))}
                onHandByVariant={Object.fromEntries(Array.from(invMap.entries()))}
                fulfillmentSource={fulfillmentSource as any}
                dropshipStatus={fRow.dropship_status ? String(fRow.dropship_status) : null}
                dropshipVendorName={dropshipVendorName}
              />
            </div>
            <div style={{ padding: 12, borderTop: "1px solid rgba(0,0,0,0.08)", opacity: 0.75, fontSize: 12 }}>
              Split shipment? Manage the other fulfillment from the order page.
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "grid", gap: 14, position: "sticky", top: 14, alignSelf: "start" }}>
          {/* Inventory packing slip */}
          {!isDropship ? (
            <div style={inventoryCard()}>
              <div style={inventoryCardHeader()}>Inventory packing slip</div>
              <div style={{ padding: 12, display: "grid", gap: 10 }}>
                <form action={`/api/admin/fulfillments/${encodeURIComponent(fulfillmentId)}/packing-slip`} method="post">
                  <button type="submit" style={btn(true)}>
                    Generate / Regenerate Inventory Packing Slip
                  </button>
                </form>

                <PackingSlipPrintButton fulfillmentId={fulfillmentId} />

                {packingSlipPath ? (
                  <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.45 }}>
                    Generated: <b>{dateTime(packingSlipGeneratedAt)}</b>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                    Not generated yet. Click <b>Generate</b>, then click <b>Open / Print</b>.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Shipping (inventory only) */}
          {!isDropship ? (
            <FulfillmentShippingCard
              fulfillmentId={fulfillmentId}
              orderId={orderId}
              deliveryAddress={orderRow?.delivery_address ?? null}
              fulfillmentStatus={String(fRow.status)}
              existingShipping={shipping}
              orderShippingPriority={orderRow?.shipping_priority ? String(orderRow.shipping_priority) : null}
              accent={{
                border: "1px solid rgba(15,76,129,0.25)",
                background: "rgba(15,76,129,0.04)",
                headerBackground: "rgba(15,76,129,0.08)",
                headerText: "#0f3556",
              }}
            />
          ) : null}

          {/* Dropship */}
          <DropshipPanelClient
            fulfillmentId={fulfillmentId}
            orderId={orderId}
            accountId={orderAccountId}
            isOpen={isOpen}
            fulfillmentSource={fulfillmentSource as any}
            dropshipVendorId={dropshipVendorId}
            vendors={(vendors ?? []).map((v: any) => ({
              id: String(v.id),
              name: String(v.name || ""),
              email: String(v.email || ""),
            }))}
            po={{
              number: String(fRow.po_number || ""),
              sent_at: fRow.po_sent_at ? String(fRow.po_sent_at) : "",
              sent_to: String(fRow.po_sent_to || ""),
              bucket: String(fRow.po_pdf_bucket || ""),
              path: String(fRow.po_pdf_path || ""),
              status: String(fRow.dropship_status || ""),
            }}
            packingSlip={{
              number: String(fRow.dropship_packing_slip_number || ""),
              carrier: String(fRow.dropship_carrier || ""),
              tracking: String(fRow.dropship_tracking_number || ""),
              ship_date: String(fRow.dropship_ship_date || ""),
              notes: String(fRow.dropship_notes || ""),
            }}
          />

          {/* Docs */}
          <div style={card()}>
            <div style={cardHeader()}>Documents</div>
            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 8 }}>
                {invoiceId ? (
                  <Link href={`/admin/invoices/${encodeURIComponent(invoiceId)}`} style={actionLink()}>
                    Open Invoice →
                  </Link>
                ) : null}
                <Link href={`/admin/orders/${encodeURIComponent(orderId)}`} style={actionLink()}>
                  Open Order →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
