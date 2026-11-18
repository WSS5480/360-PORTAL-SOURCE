"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { displayLotNumberOnly } from "@/lib/inventory/displayLotIdentifier";

const C = {
  borderInput: "rgba(0,0,0,0.18)",
  bgSoft: "rgba(0,0,0,0.02)",
};

type LotRow = {
  lot_row_id: string;
  variant_id: string;
  sku: string;
  product_name: string | null;
  lot_number: string | null;
  serial_number: string | null;
  qty: number;
  location: string | null;
  in_stock: boolean;
};

type OrderEventRow = {
  pick_id: string;
  fulfillment_id: string;
  order_id: string;
  order_number: string | null;
  order_date: string | null;
  account_id: string | null;
  account_name: string | null;
  placer_email: string | null;
  placer_name: string | null;
  pick_qty: number;
  picked_at: string | null;
  fulfillment_source: string | null;
  tracking_number: string | null;
  carrier: string | null;
  label_url: string | null;
  shipped_at: string | null;
  no_tracking: boolean;
  dropship_packing_slip_number: string | null;
  dropship_tracking: string | null;
  dropship_carrier: string | null;
  dropship_ship_date: string | null;
  internal_packing_slip_bucket: string | null;
  internal_packing_slip_path: string | null;
  internal_packing_slip_generated_at: string | null;
  admin_fulfillment_url: string;
  admin_order_url: string;
};

function inputStyle(): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: C.borderInput,
    fontWeight: 800,
    fontSize: 13,
    boxSizing: "border-box",
    minWidth: 0,
    background: "white",
    flex: "1 1 240px",
    maxWidth: 480,
  };
}

function btn(primary?: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: primary ? "#111" : "rgba(0,0,0,0.14)",
    background: primary ? "#111" : "white",
    color: primary ? "white" : "#111",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  };
}

const DT_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return "—";
  return DT_FMT.format(d);
}

export default function InventorySerialLookupClient() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [orderEvents, setOrderEvents] = useState<OrderEventRow[]>([]);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const searchSeq = useRef(0);

  const clear = useCallback(() => {
    searchSeq.current += 1;
    setBusy(false);
    setErr(null);
    setQ("");
    setLots([]);
    setOrderEvents([]);
    setLastQuery(null);
  }, []);

  const run = useCallback(async () => {
    const qq = q.trim();
    if (qq.length < 2) {
      setErr("Enter at least 2 characters.");
      return;
    }
    const seq = ++searchSeq.current;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/inventory/serial-lookup?q=${encodeURIComponent(qq)}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (seq !== searchSeq.current) return;
      if (!res.ok || !data?.ok) {
        setErr(data?.error || `Failed (${res.status})`);
        setLots([]);
        setOrderEvents([]);
        return;
      }
      setLots(Array.isArray(data.lots) ? data.lots : []);
      setOrderEvents(Array.isArray(data.order_events) ? data.order_events : []);
      setLastQuery(String(data.query ?? qq));
    } catch (e: unknown) {
      if (seq !== searchSeq.current) return;
      setErr(e instanceof Error ? e.message : "Network error");
      setLots([]);
      setOrderEvents([]);
    } finally {
      if (seq === searchSeq.current) setBusy(false);
    }
  }, [q]);

  async function openInternalPackingSlip(fulfillmentId: string) {
    try {
      const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(fulfillmentId)}/packing-slip/url`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.url) {
        window.alert(data?.error || "Could not open packing slip.");
        return;
      }
      window.open(String(data.url), "_blank", "noopener,noreferrer");
    } catch {
      window.alert("Could not open packing slip.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void run();
          }}
          placeholder="Serial #, lot #, or scan text…"
          style={inputStyle()}
          disabled={busy}
          aria-label="Serial or lot lookup"
        />
        <button type="button" onClick={() => void run()} disabled={busy} style={btn(true)}>
          Search
        </button>
        <button type="button" onClick={() => clear()} style={btn(false)} title="Clear search and results">
          Clear
        </button>
      </div>

      {err ? (
        <div style={{ padding: 10, borderRadius: 12, background: "rgba(220,53,69,0.10)", fontWeight: 800, fontSize: 13 }}>
          {err}
        </div>
      ) : null}

      {lastQuery && !err ? (
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Results for <b>{lastQuery}</b>
        </div>
      ) : null}

      {lots.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 950, fontSize: 13 }}>Inventory / trace rows</div>
          <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "white" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.65, background: C.bgSoft }}>
                  <th style={{ padding: 8 }}>SKU</th>
                  <th style={{ padding: 8 }}>Product</th>
                  <th style={{ padding: 8 }}>Serial</th>
                  <th style={{ padding: 8 }}>Lot</th>
                  <th style={{ padding: 8 }}>Qty</th>
                  <th style={{ padding: 8 }}>Location</th>
                  <th style={{ padding: 8 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((r) => (
                  <tr key={r.lot_row_id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <td style={{ padding: 8, fontWeight: 800 }}>{r.sku}</td>
                    <td style={{ padding: 8 }}>{r.product_name ?? "—"}</td>
                    <td style={{ padding: 8, fontFamily: "ui-monospace, monospace" }}>{r.serial_number ?? "—"}</td>
                    <td style={{ padding: 8, fontFamily: "ui-monospace, monospace" }}>{displayLotNumberOnly(r.lot_number, null)}</td>
                    <td style={{ padding: 8 }}>{r.qty}</td>
                    <td style={{ padding: 8 }}>{r.location ?? "—"}</td>
                    <td style={{ padding: 8 }}>{r.in_stock ? "On hand" : "Not on hand"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {lastQuery && !busy && lots.length === 0 && orderEvents.length === 0 && !err ? (
        <div style={{ fontSize: 13, opacity: 0.75 }}>No matching lot rows or fulfillment picks for this search.</div>
      ) : null}

      {orderEvents.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 950, fontSize: 13 }}>Order &amp; shipment history</div>
          {orderEvents.map((ev) => (
            <div
              key={ev.pick_id}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.10)",
                padding: 12,
                background: "white",
                display: "grid",
                gap: 8,
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline" }}>
                <span style={{ fontWeight: 950 }}>
                  Order{" "}
                  <Link href={ev.admin_order_url} style={{ fontWeight: 950 }}>
                    {ev.order_number ?? ev.order_id.slice(0, 8) + "…"}
                  </Link>
                </span>
                <span style={{ opacity: 0.65 }}>·</span>
                <span>
                  Placed: <b>{fmtWhen(ev.order_date)}</b>
                </span>
              </div>
              <div>
                Account: <b>{ev.account_name ?? "—"}</b>
                {ev.account_id ? (
                  <span style={{ opacity: 0.65, marginLeft: 6, fontSize: 12 }}>({ev.account_id.slice(0, 8)}…)</span>
                ) : null}
              </div>
              <div>
                Placed by:{" "}
                <b>{ev.placer_email ?? "—"}</b>
                {ev.placer_name ? <span style={{ opacity: 0.75, marginLeft: 6 }}>({ev.placer_name})</span> : null}
              </div>
              <div style={{ opacity: 0.85 }}>
                Pick qty: <b>{ev.pick_qty}</b>
                {ev.picked_at ? (
                  <>
                    {" "}
                    · Picked at <b>{fmtWhen(ev.picked_at)}</b>
                  </>
                ) : null}
                {ev.fulfillment_source ? (
                  <>
                    {" "}
                    · <b>{ev.fulfillment_source}</b>
                  </>
                ) : null}
              </div>
              <div>
                Tracking:{" "}
                {ev.no_tracking ? (
                  <b>No tracking</b>
                ) : ev.tracking_number ? (
                  ev.label_url ? (
                    <a href={ev.label_url} target="_blank" rel="noreferrer" style={{ fontWeight: 950 }}>
                      {ev.tracking_number}
                    </a>
                  ) : (
                    <b>{ev.tracking_number}</b>
                  )
                ) : (
                  "—"
                )}
                {ev.carrier ? (
                  <span style={{ marginLeft: 8, opacity: 0.8 }}>
                    Carrier: <b>{ev.carrier}</b>
                  </span>
                ) : null}
                {ev.shipped_at ? (
                  <span style={{ marginLeft: 8, opacity: 0.8 }}>
                    Shipped: <b>{fmtWhen(ev.shipped_at)}</b>
                  </span>
                ) : null}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <span>
                  Packing slip:{" "}
                  {String(ev.fulfillment_source ?? "").toUpperCase() === "DROPSHIP" ? (
                    ev.dropship_packing_slip_number ? (
                      <b>Vendor #{ev.dropship_packing_slip_number}</b>
                    ) : (
                      "—"
                    )
                  ) : ev.internal_packing_slip_path ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void openInternalPackingSlip(ev.fulfillment_id)}
                        style={{
                          ...btn(true),
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 10px",
                          fontSize: 12,
                        }}
                      >
                        Open PDF
                      </button>
                      {ev.internal_packing_slip_generated_at ? (
                        <span style={{ marginLeft: 8, opacity: 0.75, fontSize: 12 }}>
                          {fmtWhen(ev.internal_packing_slip_generated_at)}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    "Not generated"
                  )}
                </span>
                <Link href={ev.admin_fulfillment_url} style={{ fontWeight: 950, fontSize: 13 }}>
                  Fulfillment →
                </Link>
              </div>
              {String(ev.fulfillment_source ?? "").toUpperCase() === "DROPSHIP" &&
              (ev.dropship_tracking || ev.dropship_carrier || ev.dropship_ship_date) ? (
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  Dropship:{" "}
                  {[ev.dropship_carrier, ev.dropship_tracking, ev.dropship_ship_date].filter(Boolean).join(" · ") ||
                    "—"}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : lastQuery && !busy && lots.length > 0 ? (
        <div style={{ fontSize: 13, opacity: 0.75 }}>No fulfillment picks found for this search (unit may not have shipped yet).</div>
      ) : null}
    </div>
  );
}
