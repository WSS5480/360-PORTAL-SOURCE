// src/app/admin/accounts/virtual-balances/page.tsx
import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sqcmFromVariant } from "@/lib/virtualWarehouse/sqcmFromVariant";

export const dynamic = "force-dynamic";

function fmtSqcm(n: unknown) {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Sum sq cm debited from the fungible pool per account (one debit row per shipped VW fulfillment).
 */
async function computeVirtualWarehouseUsedSqcmByAccount(
  supabase: SupabaseClient,
  accountIdSet: Set<string>
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (accountIdSet.size === 0) return out;

  const { data: debits } = await supabase.from("virtual_warehouse_ship_debits").select("fulfillment_id").limit(50000);
  const fids = Array.from(new Set((debits ?? []).map((d: { fulfillment_id?: string }) => String(d.fulfillment_id ?? "")).filter(Boolean)));
  if (!fids.length) return out;

  const fuls: { id: string; order_id: string }[] = [];
  for (const part of chunk(fids, 400)) {
    const { data: rows } = await supabase.from("fulfillments").select("id, order_id").in("id", part as string[]);
    for (const r of rows ?? []) fuls.push({ id: String((r as { id: string }).id), order_id: String((r as { order_id: string }).order_id) });
  }

  const orderIds = Array.from(new Set(fuls.map((f) => f.order_id).filter(Boolean)));
  if (!orderIds.length) return out;

  const ords: { id: string; account_id: string; virtual_warehouse_shipment: boolean | null }[] = [];
  for (const part of chunk(orderIds, 400)) {
    const { data: rows } = await supabase
      .from("orders")
      .select("id, account_id, virtual_warehouse_shipment")
      .in("id", part as string[]);
    for (const r of rows ?? []) {
      const row = r as { id: string; account_id: string; virtual_warehouse_shipment: boolean | null };
      ords.push(row);
    }
  }

  const orderById = new Map(ords.map((o) => [o.id, o]));
  const fidToAccount = new Map<string, string>();
  for (const f of fuls) {
    const o = orderById.get(f.order_id);
    if (!o?.account_id || !o.virtual_warehouse_shipment) continue;
    if (!accountIdSet.has(String(o.account_id))) continue;
    fidToAccount.set(f.id, String(o.account_id));
  }

  const trackedFids = Array.from(fidToAccount.keys());
  if (!trackedFids.length) return out;

  const fiRows: { fulfillment_id: string; variant_id: string; required_qty: unknown }[] = [];
  for (const part of chunk(trackedFids, 400)) {
    const { data: rows } = await supabase
      .from("fulfillment_items")
      .select("fulfillment_id, variant_id, required_qty")
      .in("fulfillment_id", part as string[]);
    for (const r of rows ?? []) {
      const row = r as { fulfillment_id: string; variant_id: string; required_qty: unknown };
      fiRows.push(row);
    }
  }

  const variantIds = Array.from(new Set(fiRows.map((r) => String(r.variant_id ?? "")).filter(Boolean)));
  const byVar = new Map<string, { total_sqcm?: unknown; width_cm?: unknown; length_cm?: unknown; size_label?: unknown }>();
  for (const part of chunk(variantIds, 400)) {
    const { data: vars } = await supabase
      .from("product_variants")
      .select("id, total_sqcm, width_cm, length_cm, size_label")
      .in("id", part as string[]);
    for (const v of vars ?? []) {
      const row = v as { id: string };
      byVar.set(String(row.id), v as { total_sqcm?: unknown; width_cm?: unknown; length_cm?: unknown; size_label?: unknown });
    }
  }

  const sqcmByFid = new Map<string, number>();
  for (const row of fiRows) {
    const fid = String(row.fulfillment_id);
    if (!fidToAccount.has(fid)) continue;
    const vid = String(row.variant_id ?? "");
    const qty = Math.max(0, Math.floor(Number(row.required_qty) || 0));
    const per = sqcmFromVariant(byVar.get(vid) ?? {});
    sqcmByFid.set(fid, (sqcmByFid.get(fid) ?? 0) + per * qty);
  }

  for (const [fid, aid] of fidToAccount) {
    const sq = sqcmByFid.get(fid) ?? 0;
    out[aid] = (out[aid] ?? 0) + sq;
  }

  return out;
}

type PricingRow = {
  account_id: string;
  virtual_sqcm_balance: number | string | null;
  virtual_warehouse_enabled: boolean | null;
  bulk_enabled: boolean | null;
};

export default async function AdminVirtualBalancesPage() {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();

  const { data: pricingRaw, error: pricingErr } = await supabase
    .from("account_pricing")
    .select("account_id, virtual_sqcm_balance, virtual_warehouse_enabled, bulk_enabled")
    .eq("virtual_warehouse_enabled", true)
    .limit(5000);

  if (pricingErr) {
    return (
      <main style={{ padding: 0, maxWidth: 1400, margin: "0 auto" }}>
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            border: "1px solid rgba(220,38,38,0.25)",
            background: "rgba(254,242,242,0.95)",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Virtual warehouse balances</h1>
          <p style={{ marginTop: 12, fontSize: 13, color: "#b91c1c", whiteSpace: "pre-wrap" }}>{pricingErr.message}</p>
          <p style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
            If you recently pulled changes, apply the latest database migrations, then refresh.
          </p>
          <Link href="/admin/accounts" style={{ marginTop: 12, display: "inline-block", fontWeight: 900, color: "var(--brand-600)" }}>
            ← Accounts
          </Link>
        </div>
      </main>
    );
  }

  const pricingRows = (pricingRaw ?? []) as PricingRow[];

  const accountIds = Array.from(new Set(pricingRows.map((r) => r.account_id).filter(Boolean)));
  const { data: accountsRaw } = await supabase
    .from("accounts")
    .select("id,name")
    .in("id", accountIds.length ? accountIds : ["00000000-0000-0000-0000-000000000000"]);

  const nameById: Record<string, string> = {};
  for (const a of accountsRaw ?? []) {
    const row = a as { id: string; name: string | null };
    nameById[String(row.id)] = String(row.name ?? "—");
  }

  const accountIdSet = new Set(accountIds.map(String));
  const usedByAccount = await computeVirtualWarehouseUsedSqcmByAccount(supabase, accountIdSet);

  const rows = pricingRows
    .map((r) => {
      const bal = Number(r.virtual_sqcm_balance ?? 0);
      const remaining = Number.isFinite(bal) ? bal : 0;
      const used = Math.max(0, Number(usedByAccount[r.account_id] ?? 0) || 0);
      const purchased = used + remaining;
      return {
        accountId: r.account_id,
        name: nameById[r.account_id] ?? "—",
        remaining,
        used,
        purchased,
        bulkEnabled: !!r.bulk_enabled,
      };
    })
    .sort((a, b) => {
      if (b.remaining !== a.remaining) return b.remaining - a.remaining;
      return a.name.localeCompare(b.name);
    });

  const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);
  const totalUsed = rows.reduce((s, r) => s + r.used, 0);
  const totalPurchased = rows.reduce((s, r) => s + r.purchased, 0);
  const withBalance = rows.filter((r) => r.remaining > 0).length;

  return (
    <main style={{ padding: 0, maxWidth: 1400, margin: "0 auto", display: "grid", gap: 16 }}>
      <div
        style={{
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(30,136,229,0.22)",
          background:
            "radial-gradient(900px 240px at 15% 10%, rgba(30,136,229,0.35), transparent 60%)," +
            "linear-gradient(180deg, #08172f, #060e1b)",
          color: "white",
          boxShadow: "0 16px 36px rgba(15,23,42,0.12)",
        }}
      >
        <div style={{ padding: 16, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 0.4,
                  opacity: 0.7,
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                Admin · Accounts
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 950, margin: "6px 0 0" }}>Virtual warehouse balances</h1>
              <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13, opacity: 0.92 }}>
                <Link href="/admin/accounts" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  ← All accounts
                </Link>
                <Link href="/admin" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  Dashboard
                </Link>
              </div>
            </div>
            <div style={{ display: "grid", gap: 6, textAlign: "right", fontSize: 12, opacity: 0.88 }}>
              <div>
                Rows: <b>{rows.length}</b> · Non-zero remaining: <b>{withBalance}</b>
              </div>
              <div>
                Σ Total: <b>{fmtSqcm(totalPurchased)}</b> · Σ Used: <b>{fmtSqcm(totalUsed)}</b> · Σ Remaining:{" "}
                <b>{fmtSqcm(totalRemaining)}</b> sq cm
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: 16,
          background: "white",
          overflow: "hidden",
          boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(0,0,0,0.03)",
            fontWeight: 900,
            fontSize: 12,
            letterSpacing: 0.35,
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          Balances
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.03)" }}>
                {(["Account", "Total (sq cm)", "Used (sq cm)", "Remaining (sq cm)", "Bulk enabled"] as const).map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 14px",
                      fontSize: 11,
                      letterSpacing: 0.35,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      opacity: 0.65,
                      borderBottom: "1px solid rgba(0,0,0,0.08)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "20px 14px", opacity: 0.75, fontWeight: 700 }}>
                    No accounts have virtual warehouse enabled yet.
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((r) => (
                    <tr key={r.accountId} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 800 }}>
                        <Link
                          href={`/admin/accounts/${encodeURIComponent(r.accountId)}`}
                          style={{ color: "var(--brand-600)", textDecoration: "none", fontWeight: 950 }}
                        >
                          {r.name}
                        </Link>
                        <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 700, marginTop: 4, wordBreak: "break-all" }}>
                          {r.accountId}
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 950, whiteSpace: "nowrap" }}>{fmtSqcm(r.purchased)}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 950, whiteSpace: "nowrap" }}>{fmtSqcm(r.used)}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 950, whiteSpace: "nowrap" }}>{fmtSqcm(r.remaining)}</td>
                      <td style={{ padding: "12px 14px" }}>{r.bulkEnabled ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                  {rows.length > 0 ? (
                    <tr style={{ borderTop: "2px solid rgba(0,0,0,0.12)", background: "rgba(0,0,0,0.02)" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 950 }}>Totals (this page)</td>
                      <td style={{ padding: "12px 14px", fontWeight: 950, whiteSpace: "nowrap" }}>{fmtSqcm(totalPurchased)}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 950, whiteSpace: "nowrap" }}>{fmtSqcm(totalUsed)}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 950, whiteSpace: "nowrap" }}>{fmtSqcm(totalRemaining)}</td>
                      <td style={{ padding: "12px 14px" }}>—</td>
                    </tr>
                  ) : null}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
