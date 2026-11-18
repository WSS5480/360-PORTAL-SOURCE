"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PortalOrderHero from "@/components/portal/PortalOrderHero";
import VwSqcmPieChart from "@/components/portal/VwSqcmPieChart";
import { formatStatusLabel } from "@/lib/formatStatusLabel";
import InvoiceDownloadClient from "@/app/portal/orders/[orderId]/InvoiceDownloadClient";
import PackingSlipDownloadClient from "@/app/portal/orders/[orderId]/PackingSlipDownloadClient";

type ShipmentOrderSummary = {
  order_id: string;
  order_number: string | null;
  order_status: string | null;
  placed_at: string | null;
  invoice: {
    id: string;
    invoice_number: string | null;
    status: string | null;
    has_pdf: boolean;
  } | null;
  packing_slip_fulfillment_id: string | null;
  packing_slip_available: boolean;
  shipped: boolean;
  tracking_url: string | null;
  carrier: string | null;
  tracking_number: string | null;
  lines: Array<{
    product_variant_id: string;
    sku: string;
    product_name: string | null;
    quantity: number;
    serials: string[];
    lots: string[];
  }>;
};

type VwBulkOrderLine = {
  description: string;
  sku: string;
  quantity: number;
  virtual_warehouse_qty: number;
  ship_now_qty: number;
  sqcm_per_unit: number;
  line_sqcm: number;
  ship_now_sqcm: number;
  vw_sqcm: number;
  is_bulk_deposit_line: boolean;
};

type VwBulkOrderRow = {
  id: string;
  order_number: string | null;
  status: string | null;
  created_at: string | null;
  placed_at: string | null;
  bulk_contract_sqcm: number;
  total_sqcm: number;
  allocated_sqcm: number;
  headroom_sqcm: number;
  ship_now_sqcm: number;
  invoice: {
    id: string;
    status: string | null;
    invoice_number: string | null;
    amount_paid: number | null;
    total: number | null;
  } | null;
  lines: VwBulkOrderLine[];
};

function fmtSqcm(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtWhen(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function VirtualWarehouseClient(props: { accountName: string }) {
  const [totalSqcmOnHand, setTotalSqcmOnHand] = useState<number | null>(null);
  const [sqcmVwUsed, setSqcmVwUsed] = useState<number | null>(null);
  const [vwSqcmSummaryLoading, setVwSqcmSummaryLoading] = useState(true);
  const [vwSummaryErr, setVwSummaryErr] = useState<string | null>(null);
  const [shipmentOrders, setShipmentOrders] = useState<ShipmentOrderSummary[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [vwOrdersLoading, setVwOrdersLoading] = useState(true);
  const [vwOrdersErr, setVwOrdersErr] = useState<string | null>(null);
  const [vwOrders, setVwOrders] = useState<VwBulkOrderRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setVwSqcmSummaryLoading(true);
      setVwSummaryErr(null);
      try {
        const res = await fetch("/api/portal/virtual-warehouse", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (res.ok && json?.ok) {
          const raw = json?.sqcm_pool ?? json?.total_sqcm_on_hand;
          const rawStr =
            raw === undefined || raw === null || raw === ""
              ? ""
              : typeof raw === "number"
                ? String(raw)
                : String(raw).trim();
          const n = Number(rawStr.replace(/,/g, ""));
          setTotalSqcmOnHand(Number.isFinite(n) ? Math.max(0, n) : null);
          const u = json?.sqcm_vw_used;
          const usedStr =
            u === undefined || u === null || u === ""
              ? ""
              : typeof u === "number"
                ? String(u)
                : String(u).trim();
          const usedNum = Number(usedStr.replace(/,/g, ""));
          setSqcmVwUsed(Number.isFinite(usedNum) ? Math.max(0, usedNum) : 0);
        } else {
          const msg =
            (json && typeof json === "object" && "error" in json && String((json as { error?: unknown }).error)) ||
            `Could not load balance (${res.status})`;
          setVwSummaryErr(msg);
          setTotalSqcmOnHand(null);
          setSqcmVwUsed(null);
        }
      } catch {
        if (alive) {
          setVwSummaryErr("Could not load virtual warehouse balance (network error).");
          setTotalSqcmOnHand(null);
          setSqcmVwUsed(null);
        }
      } finally {
        if (alive) setVwSqcmSummaryLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setActivityLoading(true);
      try {
        const res = await fetch("/api/portal/virtual-warehouse/activity", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok || !json?.ok) {
          setShipmentOrders([]);
          return;
        }
        setShipmentOrders(Array.isArray(json.shipment_orders) ? json.shipment_orders : []);
      } catch {
        if (alive) setShipmentOrders([]);
      } finally {
        if (alive) setActivityLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setVwOrdersLoading(true);
      setVwOrdersErr(null);
      try {
        const res = await fetch("/api/portal/virtual-warehouse/orders", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok || !json?.ok) {
          setVwOrdersErr(json?.error || `Failed to load orders (${res.status})`);
          setVwOrders([]);
          return;
        }
        setVwOrders(Array.isArray(json.orders) ? json.orders : []);
      } catch (e: any) {
        if (!alive) return;
        setVwOrdersErr(e?.message || "Failed to load orders");
        setVwOrders([]);
      } finally {
        if (alive) setVwOrdersLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PortalOrderHero
        title="Virtual warehouse"
        accountName={props.accountName}
        backHref="/portal/orders"
        backLabel="← Orders"
        density="compact"
        titleRight={
          <VwSqcmPieChart
            loading={vwSqcmSummaryLoading}
            sqcmOnHand={totalSqcmOnHand}
            sqcmVwUsed={sqcmVwUsed}
          />
        }
        stats={[
          {
            label: "Sq cm on hand",
            value: vwSummaryErr
              ? "—"
              : totalSqcmOnHand != null && totalSqcmOnHand > 0
                ? fmtSqcm(totalSqcmOnHand)
                : totalSqcmOnHand === 0
                  ? "0"
                  : "—",
          },
          { label: "VW orders", value: vwOrdersLoading ? "…" : vwOrders.length },
          { label: "Shipment requests", value: activityLoading ? "…" : shipmentOrders.length },
        ]}
      />

      {vwSummaryErr ? (
        <div
          role="alert"
          style={{
            borderRadius: 14,
            padding: 14,
            border: "1px solid rgba(220, 38, 38, 0.35)",
            background: "rgba(254, 242, 242, 0.95)",
            color: "rgb(127, 29, 29)",
            fontWeight: 800,
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontWeight: 950, marginBottom: 6 }}>Balance could not be loaded</div>
          {vwSummaryErr}
        </div>
      ) : null}

      <div
        style={{
          borderRadius: 18,
          padding: 16,
          border: "1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border))",
          background: "var(--surface)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 8 }}>Request a shipment</div>
        <div style={{ marginTop: 10 }}>
          <Link
            href="/portal/virtual-warehouse/fulfill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 18px",
              borderRadius: 12,
              border: "1px solid color-mix(in srgb, var(--brand-600) 35%, var(--border))",
              background: "color-mix(in srgb, var(--brand-600) 14%, var(--surface))",
              color: "var(--foreground)",
              fontWeight: 950,
              textDecoration: "none",
              fontSize: 15,
            }}
          >
            Select products & fulfill from balance
          </Link>
        </div>
      </div>

      <div
        style={{
          borderRadius: 18,
          padding: 16,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 18, marginBottom: 6 }}>Virtual warehouse orders</div>
        <p style={{ margin: 0, opacity: 0.82, fontWeight: 700, lineHeight: 1.45, fontSize: 13, marginBottom: 12 }}>
          Bulk orders you placed (same statuses as{" "}
          <Link href="/portal/orders" style={{ fontWeight: 900, color: "var(--brand-600)" }}>
            Orders
          </Link>
          ). <b style={{ fontWeight: 900 }}>Unused bulk</b> (contract minus sq cm on product lines) is what becomes your
          pooled VW balance when the invoice is paid — same as &quot;remaining bulk pool&quot; below. Per-line ship vs VW
          split is in the table.
        </p>
        {vwOrdersLoading ? (
          <div style={{ fontWeight: 800, opacity: 0.85 }}>Loading virtual warehouse orders…</div>
        ) : vwOrdersErr ? (
          <div style={{ color: "crimson", fontWeight: 900 }}>{vwOrdersErr}</div>
        ) : vwOrders.length === 0 ? (
          <div style={{ opacity: 0.78, fontWeight: 700 }}>No virtual warehouse bulk orders yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {vwOrders.map((o) => {
              const invSt = String(o.invoice?.status ?? "").toUpperCase();
              const invPaid =
                invSt === "PAID" ||
                (o.invoice?.total != null &&
                  o.invoice?.amount_paid != null &&
                  o.invoice.amount_paid >= o.invoice.total - 0.01);
              return (
                <div
                  key={o.id}
                  style={{
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    padding: 12,
                    background: "color-mix(in srgb, var(--muted) 6%, transparent)",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <Link
                      href={`/portal/orders/${encodeURIComponent(o.id)}`}
                      style={{ fontWeight: 950, fontSize: 15, textDecoration: "none", color: "var(--brand-600)" }}
                    >
                      {o.order_number ?? `#${o.id.slice(0, 8)}`}
                    </Link>
                    <span
                      style={{
                        display: "inline-flex",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 900,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                      }}
                    >
                      {formatStatusLabel(o.status)}
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                      {fmtWhen(o.placed_at || o.created_at)}
                    </span>
                    {o.invoice ? (
                      <span style={{ fontSize: 12, opacity: 0.85, fontWeight: 800 }}>
                        Invoice {o.invoice.invoice_number ?? `#${o.invoice.id.slice(0, 8)}`}{" "}
                        <span style={{ opacity: 0.6 }}>·</span> {formatStatusLabel(o.invoice.status)}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>No invoice yet</span>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 8,
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    <div>
                      <div style={{ opacity: 0.75, fontSize: 11, fontWeight: 900 }}>Bulk purchase</div>
                      <div>{fmtSqcm(o.bulk_contract_sqcm)} sq cm</div>
                    </div>
                    <div>
                      <div style={{ opacity: 0.75, fontSize: 11, fontWeight: 900 }}>Used on lines</div>
                      <div>{fmtSqcm(o.allocated_sqcm)} sq cm</div>
                    </div>
                    <div>
                      <div style={{ opacity: 0.75, fontSize: 11, fontWeight: 900 }}>Remaining bulk pool (→ VW)</div>
                      <div>{fmtSqcm(o.headroom_sqcm)} sq cm</div>
                    </div>
                    <div>
                      <div style={{ opacity: 0.75, fontSize: 11, fontWeight: 900 }}>Ships first (sq cm)</div>
                      <div>{fmtSqcm(o.ship_now_sqcm)} sq cm</div>
                    </div>
                  </div>

                  {!invPaid ? (
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85, fontWeight: 850 }}>
                      Virtual inventory units are credited after the invoice is paid (ship-now lines still follow normal
                      fulfillment).
                    </div>
                  ) : null}

                  <details style={{ marginTop: 10 }}>
                    <summary style={{ cursor: "pointer", fontWeight: 950, fontSize: 13 }}>
                      Line items & breakdown
                    </summary>
                    <div style={{ marginTop: 8, overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ textAlign: "left", background: "color-mix(in srgb, var(--muted) 12%, transparent)" }}>
                            <th style={{ padding: 8 }}>SKU / Description</th>
                            <th style={{ padding: 8 }}>Qty</th>
                            <th style={{ padding: 8 }}>Ship now</th>
                            <th style={{ padding: 8 }}>To VW</th>
                            <th style={{ padding: 8 }}>Sq cm</th>
                          </tr>
                        </thead>
                        <tbody>
                          {o.lines.map((ln, idx) => (
                            <tr key={idx} style={{ borderTop: "1px solid var(--border)" }}>
                              <td style={{ padding: 8, fontWeight: 850 }}>
                                {ln.is_bulk_deposit_line ? (
                                  <span style={{ fontWeight: 950 }}>{ln.description}</span>
                                ) : (
                                  <>
                                    <span style={{ fontWeight: 950 }}>{ln.sku}</span>
                                    <div style={{ opacity: 0.75, fontWeight: 700 }}>{ln.description}</div>
                                  </>
                                )}
                              </td>
                              <td style={{ padding: 8 }}>{ln.is_bulk_deposit_line ? "—" : ln.quantity}</td>
                              <td style={{ padding: 8 }}>{ln.is_bulk_deposit_line ? "—" : ln.ship_now_qty}</td>
                              <td style={{ padding: 8 }}>{ln.is_bulk_deposit_line ? "—" : ln.virtual_warehouse_qty}</td>
                              <td style={{ padding: 8, fontWeight: 900 }}>{fmtSqcm(ln.line_sqcm)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          borderRadius: 14,
          padding: 16,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <div style={{ fontWeight: 950, marginBottom: 12 }}>Shipments requested (from virtual inventory)</div>
        {activityLoading ? (
          <div style={{ fontWeight: 800, opacity: 0.8 }}>Loading history…</div>
        ) : shipmentOrders.length === 0 ? (
          <div style={{ opacity: 0.75, fontWeight: 700 }}>No shipment requests yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {shipmentOrders.map((so) => {
              const pillBase: React.CSSProperties = {
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 900,
                border: "1px solid var(--border)",
                gap: 6,
                textDecoration: "none",
                cursor: "default",
                whiteSpace: "nowrap",
              };
              const fulfillmentReady = so.packing_slip_available && !!so.packing_slip_fulfillment_id;
              const shippedActive = so.shipped && !!so.tracking_url;
              return (
                <div
                  key={so.order_id}
                  style={{
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    padding: 12,
                    background: "color-mix(in srgb, var(--muted) 6%, transparent)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      alignItems: "center",
                      justifyContent: "space-between",
                      rowGap: 10,
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", minWidth: 0 }}>
                      <Link
                        href={`/portal/orders/${encodeURIComponent(so.order_id)}`}
                        style={{ fontWeight: 950, fontSize: 15, textDecoration: "none", color: "var(--brand-600)" }}
                      >
                        {so.order_number ?? `#${so.order_id.slice(0, 8)}`}
                      </Link>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 900,
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                        }}
                      >
                        {formatStatusLabel(so.order_status)}
                      </span>
                      <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>{fmtWhen(so.placed_at)}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      {so.invoice ? (
                        <>
                          <Link
                            href={`/portal/invoices/${encodeURIComponent(so.invoice.id)}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              color: "var(--foreground)",
                              fontWeight: 950,
                              fontSize: 12,
                              textDecoration: "none",
                            }}
                          >
                            Invoice {so.invoice.invoice_number ?? `#${so.invoice.id.slice(0, 8)}`}
                          </Link>
                          <InvoiceDownloadClient invoiceId={so.invoice.id} enabled={so.invoice.has_pdf} compact />
                        </>
                      ) : (
                        <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>No invoice yet</span>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 900, opacity: 0.65, marginRight: 2 }}>Fulfillment</span>
                    {fulfillmentReady ? (
                      <PackingSlipDownloadClient
                        fulfillmentId={so.packing_slip_fulfillment_id!}
                        enabled
                        compact
                      />
                    ) : (
                      <span
                        style={{
                          ...pillBase,
                          background: "rgba(0,0,0,0.05)",
                          opacity: 0.9,
                        }}
                        title="Packing slip is available after fulfillment generates it."
                      >
                        Slip pending
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 900, opacity: 0.65, marginLeft: 8, marginRight: 2 }}>
                      Shipped
                    </span>
                    {shippedActive ? (
                      <a
                        href={so.tracking_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          ...pillBase,
                          background: "var(--brand-700)",
                          color: "white",
                          borderColor: "color-mix(in srgb, var(--brand-700) 40%, var(--border))",
                          cursor: "pointer",
                        }}
                      >
                        Shipped · track
                      </a>
                    ) : so.shipped ? (
                      <span
                        style={{
                          ...pillBase,
                          background: "rgba(16, 185, 129, 0.14)",
                          borderColor: "rgba(16, 185, 129, 0.35)",
                        }}
                        title={so.tracking_number ? `${so.carrier ?? "Carrier"} ${so.tracking_number}` : undefined}
                      >
                        Shipped
                        {so.tracking_number ? ` · ${so.tracking_number}` : ""}
                      </span>
                    ) : (
                      <span style={{ ...pillBase, background: "rgba(0,0,0,0.04)", opacity: 0.85 }}>Not shipped</span>
                    )}
                  </div>

                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", fontWeight: 950, fontSize: 13 }}>
                      Line items, serials & lots
                    </summary>
                    <div style={{ marginTop: 10, overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr
                            style={{
                              textAlign: "left",
                              background: "color-mix(in srgb, var(--muted) 12%, transparent)",
                            }}
                          >
                            <th style={{ padding: 8 }}>SKU</th>
                            <th style={{ padding: 8 }}>Product</th>
                            <th style={{ padding: 8 }}>Qty</th>
                            <th style={{ padding: 8 }}>Serial #</th>
                            <th style={{ padding: 8 }}>Lot #</th>
                          </tr>
                        </thead>
                        <tbody>
                          {so.lines.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ padding: 8, opacity: 0.75 }}>
                                No line detail yet (order may still be awaiting fulfillment).
                              </td>
                            </tr>
                          ) : (
                            so.lines.map((ln) => (
                              <tr key={ln.product_variant_id} style={{ borderTop: "1px solid var(--border)" }}>
                                <td style={{ padding: 8, fontWeight: 900 }}>{ln.sku || "—"}</td>
                                <td style={{ padding: 8, fontWeight: 750 }}>{ln.product_name ?? "—"}</td>
                                <td style={{ padding: 8, fontWeight: 900 }}>{ln.quantity}</td>
                                <td
                                  style={{
                                    padding: 8,
                                    fontFamily: "ui-monospace, monospace",
                                    fontSize: 11,
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {ln.serials.length ? ln.serials.join(", ") : "—"}
                                </td>
                                <td
                                  style={{
                                    padding: 8,
                                    fontFamily: "ui-monospace, monospace",
                                    fontSize: 11,
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {ln.lots.length ? ln.lots.join(", ") : "—"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
