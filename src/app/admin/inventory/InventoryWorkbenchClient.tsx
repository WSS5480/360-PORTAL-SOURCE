"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import InventoryLookupClient from "./InventoryLookupClient";
import InventoryScanClient from "./InventoryScanClient";
import InventoryImportClient from "./InventoryImportClient";
import { displayLotIdentifier } from "@/lib/inventory/displayLotIdentifier";

type TabKey = "lookup" | "receive" | "remove" | "import";

type FindLotRow = {
  lot_id: string;
  variant_id: string;
  sku: string;
  product_name: string | null;
  size_label: string | null;
  is_active: boolean;

  lot_number: string | null;
  serial_number: string | null;
  expiration_date: string | null;
  qty: number;
  location: string | null;
  created_at: string;
  raw_scan?: string | null;
};

type FindLotResponse = { ok: true; rows: FindLotRow[] } | { ok: false; error: string };

const C = {
  border: "rgba(0,0,0,0.10)",
  borderSubtle: "rgba(0,0,0,0.08)",
  borderInput: "rgba(0,0,0,0.18)",
  bgSoft: "rgba(0,0,0,0.02)",
  bgSofter: "rgba(0,0,0,0.03)",
  shadow: "0 10px 26px rgba(0,0,0,0.06)",
};

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: active ? "#111" : "rgba(0,0,0,0.14)",
    background: active ? "#111" : "white",
    color: active ? "white" : "black",
    fontWeight: 950,
    cursor: "pointer",
    boxSizing: "border-box",
  };
}

function panelCard(): React.CSSProperties {
  return {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: C.border,
    borderRadius: 18,
    background: "white",
    boxShadow: C.shadow,
    overflow: "hidden",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: C.borderInput,
    fontWeight: 900,
    fontSize: 13,
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
  };
}

function buttonStyle(kind: "primary" | "muted" | "default"): React.CSSProperties {
  if (kind === "primary") {
    return {
      padding: "10px 12px",
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "#111",
      background: "#111",
      color: "white",
      fontWeight: 950,
      cursor: "pointer",
      boxSizing: "border-box",
    };
  }
  if (kind === "muted") {
    return {
      padding: "10px 12px",
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "rgba(0,0,0,0.14)",
      background: C.bgSofter,
      fontWeight: 950,
      cursor: "pointer",
      boxSizing: "border-box",
    };
  }
  return {
    padding: "10px 12px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.14)",
    background: "white",
    fontWeight: 950,
    cursor: "pointer",
    boxSizing: "border-box",
  };
}

function pillStyle(tone: "muted" | "ok" | "warn"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.12)",
    whiteSpace: "nowrap",
  };
  if (tone === "ok") return { ...base, background: "rgba(25, 135, 84, 0.12)" };
  if (tone === "warn") return { ...base, background: "rgba(220, 53, 69, 0.12)" };
  return { ...base, background: "rgba(0,0,0,0.04)", opacity: 0.92 };
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString();
}

function identifierValue(r: FindLotRow): string {
  return displayLotIdentifier({
    serial_number: r.serial_number,
    lot_number: r.lot_number,
    raw_scan: r.raw_scan,
  });
}

export default function InventoryWorkbenchClient() {
  const [tab, setTab] = useState<TabKey>("lookup");

  // Global lot/serial search
  const [lotQ, setLotQ] = useState("");
  const [lotBusy, setLotBusy] = useState(false);
  const [lotMsg, setLotMsg] = useState<{ tone: "muted" | "ok" | "warn"; text: string } | null>(null);
  const [lotRows, setLotRows] = useState<FindLotRow[]>([]);
  const [lotLimit, setLotLimit] = useState<number>(100);

  // Wire into SKU lookup tab
  const [jumpSku, setJumpSku] = useState<string | null>(null);
  const lotRef = useRef<HTMLInputElement | null>(null);

  const header = useMemo(() => {
    if (tab === "lookup") {
      return {
        title: "Inventory",
        desc: "Search by SKU (or use Lot/Serial search above) to view on-hand and locations.",
        tone: "Tip: If you have a label/box in hand, search Lot/Serial first.",
      };
    }
    if (tab === "receive") {
      return {
        title: "Receive (Scan-in)",
        desc: "Scan SKU + label to add inventory. This increments portal truth on-hand.",
        tone: "Tip: Keep SKU selected, scan labels repeatedly for fast receiving.",
      };
    }
    return {
      title: "Import (Advanced)",
      desc: "Baseline initialization only. This can overwrite on-hand totals.",
      tone: "Tip: Use only when setting up or doing a controlled reset.",
    };
  }, [tab]);

  const qtyLimit = useMemo(() => {
    const n = Number(lotLimit);
    if (!Number.isFinite(n)) return 100;
    return Math.min(300, Math.max(25, Math.floor(n)));
  }, [lotLimit]);

  async function runFindLot() {
    const q = lotQ.trim();
    if (!q) {
      setLotMsg({ tone: "warn", text: "Enter a Lot/Serial (or paste raw scan text) to search." });
      lotRef.current?.focus();
      return;
    }

    setLotBusy(true);
    setLotMsg(null);

    try {
      const url = new URL("/api/admin/inventory/find-lot", window.location.origin);
      url.searchParams.set("q", q);
      url.searchParams.set("limit", String(qtyLimit));

      const res = await fetch(url.toString(), { method: "GET" });
      const json: FindLotResponse = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !json.ok) {
        const err = (json as any)?.error || `Request failed (${res.status})`;
        setLotRows([]);
        setLotMsg({ tone: "warn", text: err });
        return;
      }

      setLotRows(json.rows ?? []);
      setLotMsg({
        tone: "ok",
        text: `Found ${json.rows.length} match(es). Click a row to open SKU details.`,
      });
    } catch (e: any) {
      setLotRows([]);
      setLotMsg({ tone: "warn", text: e?.message ? String(e.message) : "Network error" });
    } finally {
      setLotBusy(false);
    }
  }

  function onLotKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      runFindLot();
    }
  }

  function openSkuFromResult(sku: string) {
    const s = String(sku ?? "").trim();
    if (!s) return;

    setJumpSku(s);
    setTab("lookup");
    setLotMsg({ tone: "muted", text: `Opening SKU: ${s}` });
  }

  // small QoL: auto focus lot search when on lookup tab and nothing typed
  useEffect(() => {
    if (tab !== "lookup") return;
    if (lotQ.trim()) return;
    const t = window.setTimeout(() => lotRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [tab, lotQ]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Top: Inventory Workbench header + tabs */}
      <div
        style={{
          ...panelCard(),
          padding: 12,
          display: "grid",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>{header.title}</div>
            <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>{header.desc}</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={() => setTab("lookup")} style={tabBtn(tab === "lookup")}>
              Lookup
            </button>
            <button type="button" onClick={() => setTab("receive")} style={tabBtn(tab === "receive")}>
              Receive
            </button>
            <button type="button" onClick={() => setTab("remove")} style={tabBtn(tab === "remove")}>
              Remove
            </button>
            <button type="button" onClick={() => setTab("import")} style={tabBtn(tab === "import")}>
              Import
            </button>
          </div>
        </div>

        <div
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: C.borderSubtle,
            borderRadius: 14,
            padding: 10,
            background: C.bgSoft,
            fontSize: 12,
            opacity: 0.85,
            lineHeight: 1.35,
          }}
        >
          <b>Tip:</b> {header.tone}
        </div>
      </div>

      {/* Lot/Serial Search (always visible, because it answers the most common question) */}
      <div style={panelCard()}>
        <div
          style={{
            padding: 12,
            borderWidth: 0,
            borderStyle: "solid",
            borderColor: C.borderSubtle,
            borderBottomWidth: 1,
            fontWeight: 950,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>Find by Identifier (Lot/Serial)</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Scan/paste from a label → click result → opens SKU</div>
        </div>

        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          {lotMsg ? (
            <div style={pillStyle(lotMsg.tone)}>{lotMsg.text}</div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Enter a Lot/Serial number (or paste raw scan output). This searches across all inventory lots.
            </div>
          )}

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 140px) auto auto",
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Identifier</div>
              <input
                ref={lotRef}
                value={lotQ}
                onChange={(e) => setLotQ(e.target.value)}
                onKeyDown={onLotKeyDown}
                placeholder="Scan/paste lot/serial…"
                style={inputStyle()}
              />
            </label>

            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Limit</div>
              <input
                value={String(qtyLimit)}
                onChange={(e) => setLotLimit(Number(e.target.value))}
                type="number"
                min={25}
                max={300}
                step={25}
                style={inputStyle()}
              />
            </label>

            <button
              type="button"
              onClick={runFindLot}
              disabled={lotBusy}
              style={{
                ...buttonStyle("primary"),
                cursor: lotBusy ? "not-allowed" : "pointer",
                opacity: lotBusy ? 0.65 : 1,
              }}
            >
              {lotBusy ? "Searching…" : "Search"}
            </button>

            <button
              type="button"
              onClick={() => {
                setLotQ("");
                setLotRows([]);
                setLotMsg({ tone: "muted", text: "Cleared lot/serial search." });
                setTimeout(() => lotRef.current?.focus(), 0);
              }}
              disabled={lotBusy}
              style={{
                ...buttonStyle("muted"),
                cursor: lotBusy ? "not-allowed" : "pointer",
                opacity: lotBusy ? 0.65 : 1,
              }}
            >
              Clear
            </button>
          </div>

          {lotRows.length > 0 && (
            <div
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: C.borderSubtle,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.75, background: C.bgSoft }}>
                      <th style={{ padding: 10 }}>SKU</th>
                      <th style={{ padding: 10 }}>Product</th>
                      <th style={{ padding: 10 }}>Size</th>
                      <th style={{ padding: 10 }}>Location</th>
                      <th style={{ padding: 10 }}>Identifier</th>
                      <th style={{ padding: 10, width: 80 }}>Qty</th>
                      <th style={{ padding: 10, width: 120 }}>EXP</th>
                      <th style={{ padding: 10, width: 210 }}>Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotRows.map((r) => (
                      <tr
                        key={r.lot_id}
                        onClick={() => openSkuFromResult(r.sku)}
                        style={{
                          borderWidth: 0,
                          borderStyle: "solid",
                          borderColor: C.borderSubtle,
                          borderTopWidth: 1,
                          cursor: "pointer",
                        }}
                        title="Click to open SKU detail"
                      >
                        <td style={{ padding: 10, fontWeight: 950 }}>{r.sku}</td>
                        <td style={{ padding: 10, opacity: 0.9 }}>{r.product_name ?? "—"}</td>
                        <td style={{ padding: 10, opacity: 0.85 }}>{r.size_label ?? "—"}</td>
                        <td style={{ padding: 10, fontWeight: 950 }}>{r.location ?? "—"}</td>
                        <td style={{ padding: 10, fontWeight: 950 }}>{identifierValue(r)}</td>
                        <td style={{ padding: 10, fontWeight: 950 }}>{r.qty ?? 0}</td>
                        <td style={{ padding: 10, opacity: 0.9 }}>{r.expiration_date ?? "—"}</td>
                        <td style={{ padding: 10, opacity: 0.8 }}>{fmtDateTime(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: 10, fontSize: 12, opacity: 0.7, background: "white" }}>
                Click a row to open the SKU in Lookup (then filter by location if needed).
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {tab === "lookup" && (
        // We pass jumpSku via key trick: remount the lookup client when a jump happens.
        // This avoids needing to refactor InventoryLookupClient to accept props.
        <InventoryLookupClient key={jumpSku ? `lookup:${jumpSku}` : "lookup"} />
      )}

      {tab === "receive" && <InventoryScanClient />}

      {tab === "remove" && <InventoryScanClient mode="remove" />}

      {tab === "import" && (
        <div style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              ...panelCard(),
              padding: 12,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "rgba(220, 53, 69, 0.25)",
              background: "rgba(220, 53, 69, 0.05)",
            }}
          >
            <div style={{ fontWeight: 950 }}>Warning</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, lineHeight: 1.35 }}>
              Import is intended for baseline initialization. It may <b>set</b> on-hand values and can override live counts.
              Use in controlled scenarios only.
            </div>
          </div>

          <InventoryImportClient />
        </div>
      )}
    </div>
  );
}
