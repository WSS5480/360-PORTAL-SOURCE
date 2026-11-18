"use client";

import React from "react";
import { ScMobileListHeaderRow } from "@/components/sales/ScMobileListHeaderRow";
import { SalesCommandPage, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";

type ProductRow = { id: string; name: string; code?: string | null };

export default function PortalSalesProductsClient() {
  const [busy, setBusy] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [products, setProducts] = React.useState<ProductRow[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch("/api/portal/sales/surgical-catalog/products", { cache: "no-store" });
        const j = (await res.json()) as { ok?: boolean; error?: string; products?: ProductRow[] };
        if (!j.ok) throw new Error(j.error || "");
        if (!cancelled) setProducts(j.products || []);
      } catch (e) {
        if (!cancelled) setErr(userFacingError(e, "We could not load products. Please try again."));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SalesCommandPage
      title="Products"
      subtitle="Surgical product families for cases and opportunities."
      omitBuiltInHeader
      nativeLayout
      actions={null}
    >
      <div className="sc-native-page surgical-cases-mobile-root">
        <div className="sc-mobile-list-sticky-shell">
          <header className="sc-mobile-list-header">
            <ScMobileListHeaderRow
              title="Products"
              countLabel={busy ? "Loading…" : `${products.length} families`}
            />
          </header>
        </div>
        <div className="sc-mobile-list-body">
          {err ? <div style={{ ...sc.alertError, margin: "8px 12px" }}>{err}</div> : null}
          {busy ? <div style={{ padding: "12px", color: "var(--muted)", fontSize: 13 }}>Loading products…</div> : null}
          {!busy && products.length === 0 ? (
            <div style={{ padding: "16px 12px", color: "var(--muted)", fontSize: 13 }}>No products found.</div>
          ) : null}
          {!busy && products.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {products.map((p) => (
                <li
                  key={p.id}
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))",
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.02em" }}>{p.name}</div>
                  {p.code ? <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{p.code}</div> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </SalesCommandPage>
  );
}
