"use client";

import Link from "next/link";
import React from "react";
import { SalesCommandPage, SalesMetricCard, SalesPanel, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";

type SurgicalDashJson = {
  ok: boolean;
  cases_this_month?: number;
  completed_this_month?: number;
  surgeons_engaged_month?: number;
  product_usage_by_family?: Array<{ family: string; units: number }>;
  operational?: {
    active_accounts?: number;
    billing_review?: number;
    upcoming_48h?: number;
  };
  error?: string;
};

export default function PortalSalesAnalyticsClient() {
  const [busy, setBusy] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<SurgicalDashJson | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch("/api/portal/sales/surgical-dashboard", { cache: "no-store" });
        const j = (await res.json()) as SurgicalDashJson;
        if (!j.ok) throw new Error(j.error || "");
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled) setErr(userFacingError(e, "We could not load analytics. Please try again."));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const op = data?.operational;
  const usage = data?.product_usage_by_family || [];

  return (
    <SalesCommandPage title="Analytics" subtitle="Surgical activity and product utilization for your book of business.">
      <div className="sales-analytics-page">
      {err ? <div style={sc.alertError}>{err}</div> : null}
      {busy ? <div style={{ color: "var(--muted)" }}>Loading analytics…</div> : null}
      {!busy && !err ? (
        <>
          <section className="sales-analytics-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
            <SalesMetricCard label="Cases this month" value={String(data?.cases_this_month ?? 0)} href="/portal/sales/cases" />
            <SalesMetricCard label="Completed this month" value={String(data?.completed_this_month ?? 0)} href="/portal/sales/cases?status=completed" />
            <SalesMetricCard label="Providers engaged" value={String(data?.surgeons_engaged_month ?? 0)} href="/portal/sales/providers" />
            <SalesMetricCard label="Active organizations" value={String(op?.active_accounts ?? 0)} href="/portal/sales/accounts" />
          </section>

          <SalesPanel title="Product utilization (month)" density="compact">
            {usage.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>No product usage recorded this month yet.</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                {usage.map((row) => (
                  <li
                    key={row.family}
                    className="sales-analytics-usage-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "7px 10px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 750 }}>{row.family}</span>
                    <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{row.units} units</span>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: 10 }}>
              <Link href="/portal/sales/products" style={sc.linkBrandAction}>
                View product catalog →
              </Link>
            </div>
          </SalesPanel>
        </>
      ) : null}
      </div>
    </SalesCommandPage>
  );
}
