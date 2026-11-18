// src/app/admin/orders/page.tsx
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import AdminOrdersTableClient from "./AdminOrdersTableClient";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  order_number: string | null;
  status: string | null;
  subtotal: number | null;
  shipping_total: number | null;
  total: number | null;
  /** From `orders.total_sqcm` (bulk contract total when VW bulk; else line sum / stored total). */
  total_sqcm?: number | null;
  bulk_mode?: boolean | null;
  bulk_contract_sqcm?: number | null;
  /** Product sq cm excluding the VW bulk deposit line (ship-now / pick work). */
  ship_now_sqcm?: number | null;
  /** Count of OPEN fulfillments for this order (warehouse / shipping work still in progress). */
  open_fulfillment_count?: number;
  /** Total fulfillments (any status) for this order. */
  total_fulfillment_count?: number;
  created_at: string | null;
  placed_at: string | null;
  locked_at: string | null;

  // embedded
  accounts?: { id: string; name: string | null } | null;
  placed_by?: { user_id: string; full_name: string | null; email: string } | null;
};

function normalizeSearchParam(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

function safeUpper(v: any) {
  return String(v ?? "").toUpperCase();
}

function pill(status: string | null): React.CSSProperties {
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
  if (s === "CONFIRMED") return { ...base, background: "rgba(13,110,253,0.14)" };
  if (s === "LOCKED") return { ...base, background: "rgba(0,0,0,0.08)" };
  if (s === "FULFILLING") return { ...base, background: "rgba(255,153,0,0.16)" };
  if (s === "COMPLETED") return { ...base, background: "rgba(13,110,253,0.12)" };
  if (s === "CANCELLED") return { ...base, background: "rgba(220,53,69,0.12)" };
  return base;
}

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtSqcm(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function dateTime(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isVwBulkDepositDescription(desc: unknown): boolean {
  return String(desc ?? "").trim().startsWith("Virtual warehouse bulk purchase");
}

function sqcmFromVariant(v: any): number {
  const direct = safeNum(v?.total_sqcm);
  if (direct > 0) return direct;

  const w = safeNum(v?.width_cm);
  const l = safeNum(v?.length_cm);
  if (w > 0 && l > 0) return w * l;

  const s = String(v?.size_label ?? "").toLowerCase().replace(/\s+/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)(?:cm)?$/i);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) return a * b;
  }

  return 0;
}

function displayPerson(p?: { full_name: string | null; email: string } | null) {
  if (!p) return "—";
  const name = String(p.full_name ?? "").trim();
  if (name) return name;
  return p.email || "—";
}

function statCard(
  label: string,
  value: React.ReactNode,
  tone?: "brand" | "ok" | "warn" | "muted",
  sub?: React.ReactNode
) {
  const base: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16,
    padding: "12px 14px",
    background: "white",
    boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
    minWidth: 0,
  };
  const toneStyle: React.CSSProperties =
    tone === "brand"
      ? { borderColor: "rgba(30,136,229,0.28)", background: "rgba(30,136,229,0.08)" }
      : tone === "ok"
      ? { borderColor: "rgba(25,135,84,0.28)", background: "rgba(25,135,84,0.08)" }
      : tone === "warn"
      ? { borderColor: "rgba(255,153,0,0.32)", background: "rgba(255,153,0,0.1)" }
      : tone === "muted"
      ? { background: "rgba(0,0,0,0.03)" }
      : {};
  return (
    <div style={{ ...base, ...toneStyle }}>
      <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.7, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950 }}>{value}</div>
      {sub ? <div style={{ marginTop: 4, fontSize: 11, fontWeight: 900, opacity: 0.7 }}>{sub}</div> : null}
    </div>
  );
}

/**
 * Sq cm for fulfillment (excludes the VW bulk deposit line, which uses the pricing ref variant size ×1 and is not “ship now”).
 */
async function buildShipNowSqcmByOrder(orderIds: string[]) {
  const sqcmByOrder: Record<string, number> = {};
  if (!orderIds.length) return sqcmByOrder;

  const { data: itemRows } = await supabaseAdmin
    .from("order_items")
    .select("order_id, product_variant_id, quantity, description")
    .in("order_id", orderIds as any)
    .limit(20000);

  const items = Array.isArray(itemRows) ? itemRows : [];
  const variantIds = Array.from(
    new Set(items.map((i: any) => String(i?.product_variant_id || "")).filter(Boolean))
  );

  const { data: variantsRaw } = variantIds.length
    ? await supabaseAdmin
        .from("product_variants")
        .select("id, total_sqcm, width_cm, length_cm, size_label")
        .in("id", variantIds as any)
        .limit(5000)
    : { data: [] };

  const variants = Array.isArray(variantsRaw) ? variantsRaw : [];
  const sqcmByVariant = new Map<string, number>();
  for (const v of variants) {
    const id = String((v as any)?.id || "");
    if (!id) continue;
    sqcmByVariant.set(id, sqcmFromVariant(v));
  }

  for (const it of items) {
    const orderId = String((it as any)?.order_id || "");
    if (!orderId) continue;
    if (isVwBulkDepositDescription((it as any)?.description)) continue;
    const variantId = String((it as any)?.product_variant_id || "");
    const qty = safeNum((it as any)?.quantity);
    if (!variantId || qty <= 0) continue;
    const perSq = sqcmByVariant.get(variantId) ?? 0;
    sqcmByOrder[orderId] = (sqcmByOrder[orderId] ?? 0) + perSq * qty;
  }

  return sqcmByOrder;
}

function calcCounts(rows: OrderRow[]) {
  return rows.reduce(
    (acc, row) => {
      const s = safeUpper(row.status);
      acc.total += 1;
      acc.totalValue += Number(row.total ?? 0) || 0;
      const bulk = safeNum((row as any).bulk_contract_sqcm);
      const ship = safeNum((row as any).ship_now_sqcm);
      if (bulk > 0) {
        acc.totalSqcm += bulk;
        acc.shipNowSqcm += ship;
      } else {
        acc.totalSqcm += Number(row.total_sqcm ?? 0) || 0;
      }
      if (s === "DRAFT") acc.draft += 1;
      if (s === "CONFIRMED") acc.confirmed += 1;
      if (s === "LOCKED") acc.locked += 1;
      if (s === "FULFILLING") acc.fulfilling += 1;
      if (s === "COMPLETED") acc.completed += 1;
      if (s === "CANCELLED") acc.cancelled += 1;
      return acc;
    },
    {
      total: 0,
      draft: 0,
      confirmed: 0,
      locked: 0,
      fulfilling: 0,
      completed: 0,
      cancelled: 0,
      totalValue: 0,
      totalSqcm: 0,
      shipNowSqcm: 0,
    }
  );
}

function pct(part: number, whole: number) {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return "—";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

export default async function AdminOrdersPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let accessLabel = "—";
  try {
    const ctx = await requireOrdersStaffOrAdmin();
    accessLabel = ctx.kind === "ADMIN" ? "Internal admin" : "Order manager";
  } catch {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Orders Command Center</h1>
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(220,53,69,0.35)",
            background: "rgba(220,53,69,0.06)",
          }}
        >
          <div style={{ fontWeight: 950, color: "crimson" }}>Forbidden</div>
          <div style={{ marginTop: 6, opacity: 0.85, fontSize: 13 }}>You don’t have permission to access Orders.</div>
          <div style={{ marginTop: 10 }}>
            <Link href="/admin/ivr" style={{ textDecoration: "none", fontWeight: 950 }}>
              ← Back to IVR Queue
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const sp = await props.searchParams;
  const q = normalizeSearchParam(sp.q);
  const status = normalizeSearchParam(sp.status);
  const accountId = normalizeSearchParam(sp.account_id);
  const accountName = normalizeSearchParam(sp.account_name);
  const sortRaw = normalizeSearchParam(sp.sort);
  const dirRaw = normalizeSearchParam(sp.dir);
  const sort = ["order_number", "status", "created_at", "placed_at", "total"].includes(sortRaw) ? sortRaw : "created_at";
  const dir = dirRaw === "asc" ? "asc" : "desc";

  const limit = 300;

  let accountIdsFromName: string[] = [];
  if (!accountId && accountName) {
    const { data: acctMatches } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .ilike("name", `%${accountName}%`)
      .limit(50);
    accountIdsFromName = (acctMatches ?? []).map((a: any) => String(a.id)).filter(Boolean);
  }

  let query = supabaseAdmin
    .from("orders")
    .select(
      [
        "id",
        "order_number",
        "status",
        "subtotal",
        "shipping_total",
        "total",
        "created_at",
        "placed_at",
        "locked_at",
        "bulk_mode",
        "bulk_contract_sqcm",
        "total_sqcm",
        // embedded account
        "accounts:account_id (id, name)",
        // embedded placed-by (requires FK orders.created_by_user_id -> user_profiles.user_id)
        "placed_by:created_by_user_id (user_id, full_name, email)",
        "placed_by_contact:submitted_by_contact_id (id, full_name, email)",
      ].join(",")
    )
    .order(sort, { ascending: dir === "asc", nullsFirst: false })
    .limit(limit);
  if (sort !== "created_at") query = query.order("created_at", { ascending: false });

  const OPEN_STATUSES = ["DRAFT", "SENT", "CONFIRMED", "FULFILLING", "LOCKED"];
  if (status) {
    if (status.toUpperCase() === "OPEN") {
      query = query.in("status", OPEN_STATUSES as any);
    } else {
      query = query.eq("status", status);
    }
  }
  if (q) query = query.ilike("order_number", `%${q}%`);
  if (accountId) query = query.eq("account_id", accountId);
  if (!accountId && accountIdsFromName.length) query = query.in("account_id", accountIdsFromName as any);

  const { data: rowsRaw, error } = await query;
  const rowsBase: OrderRow[] = (rowsRaw ?? []) as any;
  const shipNowSqcmByOrder = await buildShipNowSqcmByOrder(rowsBase.map((r) => String(r.id)));
  const orderIdsForFf = rowsBase.map((r) => String(r.id)).filter(Boolean);
  let openFulfillmentCountByOrder: Record<string, number> = {};
  let totalFulfillmentCountByOrder: Record<string, number> = {};
  if (orderIdsForFf.length) {
    const { data: ffRows } = await supabaseAdmin
      .from("fulfillments")
      .select("order_id, status")
      .in("order_id", orderIdsForFf);
    for (const f of ffRows ?? []) {
      const oid = String((f as any).order_id ?? "");
      if (!oid) continue;
      totalFulfillmentCountByOrder[oid] = (totalFulfillmentCountByOrder[oid] ?? 0) + 1;
      if (String((f as any).status ?? "").toUpperCase() === "OPEN") {
        openFulfillmentCountByOrder[oid] = (openFulfillmentCountByOrder[oid] ?? 0) + 1;
      }
    }
  }

  const rows: OrderRow[] = rowsBase.map((r) => {
    const id = String(r.id);
    const bulkContract = safeNum((r as any).bulk_contract_sqcm);
    const shipNow = shipNowSqcmByOrder[id] ?? 0;
    const dbTotal = safeNum((r as any).total_sqcm);
    return {
      ...r,
      bulk_contract_sqcm: bulkContract,
      ship_now_sqcm: shipNow,
      total_sqcm: bulkContract > 0 ? bulkContract : dbTotal,
      open_fulfillment_count: openFulfillmentCountByOrder[id] ?? 0,
      total_fulfillment_count: totalFulfillmentCountByOrder[id] ?? 0,
    };
  });

  const isFiltered = !!(status || q || accountId || accountName);
  let rowsAll: OrderRow[] = rows;
  if (isFiltered) {
    const { data: allRaw } = await supabaseAdmin
      .from("orders")
      .select(
        [
          "id",
          "order_number",
          "status",
          "subtotal",
          "shipping_total",
          "total",
          "created_at",
          "placed_at",
          "locked_at",
          "bulk_mode",
          "bulk_contract_sqcm",
          "total_sqcm",
          "accounts:account_id (id, name)",
          "placed_by:created_by_user_id (user_id, full_name, email)",
          "placed_by_contact:submitted_by_contact_id (id, full_name, email)",
        ].join(",")
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    const allRowsBase: OrderRow[] = (allRaw ?? []) as any;
    const allShipNow = await buildShipNowSqcmByOrder(allRowsBase.map((r) => String(r.id)));
    rowsAll = allRowsBase.map((r) => {
      const id = String(r.id);
      const bulkContract = safeNum((r as any).bulk_contract_sqcm);
      const shipNow = allShipNow[id] ?? 0;
      const dbTotal = safeNum((r as any).total_sqcm);
      return {
        ...r,
        bulk_contract_sqcm: bulkContract,
        ship_now_sqcm: shipNow,
        total_sqcm: bulkContract > 0 ? bulkContract : dbTotal,
      };
    });
  }

  const countsAll = calcCounts(rowsAll);
  const countsFiltered = calcCounts(rows);

  const { data: accountRow } = accountId
    ? await supabaseAdmin.from("accounts").select("id,name").eq("id", accountId).maybeSingle()
    : { data: null };

  return (
    <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            .admin-orders-table tbody tr:hover {
              background: rgba(30,136,229,0.06);
            }
          `,
        }}
      />

      <div
        style={{
          borderRadius: 20,
          padding: 16,
          border: "1px solid rgba(30,136,229,0.22)",
          background:
            "radial-gradient(900px 200px at 15% 0%, rgba(30,136,229,0.25), transparent 55%)," +
            "linear-gradient(180deg, #0b1b3a, #081226)",
          color: "white",
          boxShadow: "0 16px 36px rgba(15,23,42,0.12)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.7, fontWeight: 900, textTransform: "uppercase" }}>Admin</div>
            <h1 style={{ fontSize: 24, fontWeight: 950, margin: "6px 0 0" }}>Orders Command Center</h1>
            <p style={{ marginTop: 6, opacity: 0.75, fontSize: 13, maxWidth: 820 }}>
              Triage CONFIRMED orders first, then lock for fulfillment.
            </p>
            <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
              Access: <b>{accessLabel}</b> · Showing <b>{rows.length}</b> / <b>{limit}</b>
              {accountId ? (
                <span>
                  {" "}
                  · Account filter: <b>{accountRow?.name || accountId}</b> ·{" "}
                  <Link href="/admin/orders" style={{ color: "white", textDecoration: "underline", fontWeight: 900 }}>
                    Clear filter
                  </Link>
                </span>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Link
              href="/admin/orders/intake"
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              + Admin Intake
            </Link>
            <Link href="/admin" style={{ fontSize: 13, color: "white", fontWeight: 900, textDecoration: "none" }}>
              ← Admin Dashboard
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {statCard("Total orders", countsAll.total, "brand")}
          {statCard("Confirmed", countsAll.confirmed, "ok")}
          {statCard("Fulfilling", countsAll.fulfilling, "warn")}
          {statCard("Completed", countsAll.completed, "ok")}
          {statCard(
            "Total sq cm",
            fmtSqcm(countsAll.totalSqcm),
            "muted",
            countsAll.shipNowSqcm > 0 ? `Ship now (lines): ${fmtSqcm(countsAll.shipNowSqcm)}` : undefined
          )}
          {statCard("Total value", money(countsAll.totalValue), "muted")}
        </div>

        {isFiltered ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase" }}>
              Filtered {accountId ? `• ${accountRow?.name || accountId}` : accountName ? `• ${accountName}` : ""}
            </div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {statCard("Orders", countsFiltered.total, "brand", `${pct(countsFiltered.total, countsAll.total)} of overall`)}
              {statCard("Confirmed", countsFiltered.confirmed, "ok", pct(countsFiltered.confirmed, countsAll.confirmed))}
              {statCard("Fulfilling", countsFiltered.fulfilling, "warn", pct(countsFiltered.fulfilling, countsAll.fulfilling))}
              {statCard("Completed", countsFiltered.completed, "ok", pct(countsFiltered.completed, countsAll.completed))}
              {statCard(
                "Total sq cm",
                fmtSqcm(countsFiltered.totalSqcm),
                "muted",
                [
                  countsFiltered.shipNowSqcm > 0 ? `Ship now: ${fmtSqcm(countsFiltered.shipNowSqcm)}` : null,
                  pct(countsFiltered.totalSqcm, countsAll.totalSqcm),
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              )}
              {statCard("Total value", money(countsFiltered.totalValue), "muted", pct(countsFiltered.totalValue, countsAll.totalValue))}
            </div>
          </div>
        ) : null}
      </div>

      <form
        method="get"
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.08)",
          background: "white",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search order #…"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", minWidth: 220, fontWeight: 900 }}
          />
          <select
            name="status"
            defaultValue={status}
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", fontWeight: 900 }}
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open (Draft→Locked)</option>
            <option value="DRAFT">DRAFT</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="LOCKED">LOCKED</option>
            <option value="FULFILLING">FULFILLING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <input
            name="account_id"
            defaultValue={accountId}
            placeholder="Account ID (filter)"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", minWidth: 260, fontWeight: 900 }}
          />
          <input
            name="account_name"
            defaultValue={accountName}
            placeholder="Account name (filter)"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", minWidth: 240, fontWeight: 900 }}
          />
          <button
            type="submit"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", fontWeight: 900, background: "white" }}
          >
            Apply filters
          </button>
          {isFiltered ? (
            <Link href="/admin/orders" style={{ textDecoration: "none", fontWeight: 900 }}>
              Clear
            </Link>
          ) : null}
        </div>
        <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
          Showing <b>{rows.length}</b> / <b>{limit}</b>
        </div>
      </form>

      {error ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(220,53,69,0.35)",
            background: "rgba(220,53,69,0.06)",
            color: "crimson",
            fontWeight: 950,
          }}
        >
          {error.message}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 16,
          overflow: "hidden",
          background: "white",
          boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 950 }}>Queue</div>

          <form style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search order #"
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.18)", minWidth: 220, outline: "none" }}
            />

            <select
              name="status"
              defaultValue={status}
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.18)", background: "white", outline: "none", fontWeight: 800 }}
            >
              <option value="">All statuses</option>
              <option value="OPEN">Open (Draft→Locked)</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="LOCKED">LOCKED</option>
              <option value="FULFILLING">FULFILLING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <button type="submit" style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.18)", background: "#111", color: "white", fontWeight: 950, cursor: "pointer" }}>
              Apply
            </button>

            {(q || status) && (
              <Link href="/admin/orders" style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.18)", background: "white", color: "inherit", textDecoration: "none", fontWeight: 950 }}>
                Clear
              </Link>
            )}
          </form>
        </div>

        <div style={{ padding: "10px 12px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.6 }}>Quick filters</span>
          <Link href="/admin/orders" style={{ textDecoration: "none" }}>
            <span style={pill(null)}>All</span>
          </Link>
          <Link href="/admin/orders?status=OPEN" style={{ textDecoration: "none" }}>
            <span style={pill("CONFIRMED")}>Open</span>
          </Link>
          <Link href="/admin/orders?status=CONFIRMED" style={{ textDecoration: "none" }}>
            <span style={pill("CONFIRMED")}>Confirmed</span>
          </Link>
          <Link href="/admin/orders?status=LOCKED" style={{ textDecoration: "none" }}>
            <span style={pill("LOCKED")}>Locked</span>
          </Link>
          <Link href="/admin/orders?status=FULFILLING" style={{ textDecoration: "none" }}>
            <span style={pill("FULFILLING")}>Fulfilling</span>
          </Link>
          <Link href="/admin/orders?status=COMPLETED" style={{ textDecoration: "none" }}>
            <span style={pill("COMPLETED")}>Completed</span>
          </Link>
          <Link href="/admin/orders?status=CANCELLED" style={{ textDecoration: "none" }}>
            <span style={pill("CANCELLED")}>Cancelled</span>
          </Link>
        </div>

        <AdminOrdersTableClient rows={rows} />

        <div style={{ padding: 12, borderTop: "1px solid rgba(0,0,0,0.08)", opacity: 0.75, fontSize: 12 }}>
          Tip: Confirmed → Lock → Fulfill → Pack/Label → Ship → Invoice.
        </div>
      </div>
    </main>
  );
}
