"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import {
  contactDisplayName,
  formatSurgicalContactRole,
  SURGICAL_PHI_UI_NOTICE,
} from "@/lib/surgical-sales/labels";
import { userFacingError } from "@/lib/errors/userFacingError";
import { parseOptionalCaseRevenue } from "@/lib/surgical-sales/newSurgicalCasePageLogic";
import { SURGICAL_PRODUCT_FAMILY_ORDER } from "@/lib/surgical-sales/productFamilyVisual";

type AccountRow = { id: string; name?: string | null };
type ProductRow = { id: string; name: string };
type ContactRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role_type?: string | null;
};

function lsLastAccountKey(userId: string) {
  return `surgical-new-case:v1:lastAccount:${userId}`;
}
function lsLastProductKey(userId: string) {
  return `surgical-new-case:v1:lastProduct:${userId}`;
}

function allowedProduct(p: ProductRow): boolean {
  const n = String(p.name || "").trim().toLowerCase();
  return SURGICAL_PRODUCT_FAMILY_ORDER.some((f) => f.toLowerCase() === n);
}

export type QuickAddSurgicalCasePanelProps = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful create so parent can refresh lists. */
  onCreated?: () => void;
};

export function QuickAddSurgicalCasePanel({ open, onClose, onCreated }: QuickAddSurgicalCasePanelProps) {
  const router = useRouter();
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const [portalUserId, setPortalUserId] = React.useState<string | null>(null);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [contacts, setContacts] = React.useState<ContactRow[]>([]);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);
  const [loadBusy, setLoadBusy] = React.useState(false);

  const [accountId, setAccountId] = React.useState("");
  const [caseDate, setCaseDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [caseTime, setCaseTime] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [surgeonId, setSurgeonId] = React.useState("");
  const [expectedRevenue, setExpectedRevenue] = React.useState("");

  const [submitErr, setSubmitErr] = React.useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = React.useState(false);
  const [phase, setPhase] = React.useState<"form" | "success">("form");
  const [createdCase, setCreatedCase] = React.useState<{ id: string; case_number: string } | null>(null);

  const resetForm = React.useCallback(() => {
    setCaseDate(new Date().toISOString().slice(0, 10));
    setCaseTime("");
    setSurgeonId("");
    setExpectedRevenue("");
    setSubmitErr(null);
    setPhase("form");
    setCreatedCase(null);
    try {
      if (portalUserId) {
        const la = localStorage.getItem(lsLastAccountKey(portalUserId));
        if (la && accounts.some((a) => a.id === la)) setAccountId(la);
        const lp = localStorage.getItem(lsLastProductKey(portalUserId));
        if (lp && products.some((p) => p.id === lp)) setProductId(lp);
      }
    } catch {
      /* ignore */
    }
  }, [portalUserId, accounts, products]);

  React.useEffect(() => {
    if (!open) return;
    setPhase("form");
    setCreatedCase(null);
    setSubmitErr(null);
    let cancelled = false;
    void (async () => {
      setLoadBusy(true);
      setLoadErr(null);
      try {
        const [meRes, aRes, pRes] = await Promise.all([
          fetch("/api/portal/me", { cache: "no-store" }),
          fetch("/api/portal/sales/surgical-accounts", { cache: "no-store" }),
          fetch("/api/portal/sales/surgical-catalog/products", { cache: "no-store" }),
        ]);
        const meJson = (await meRes.json()) as { ok?: boolean; user?: { id?: string } };
        const aJson = (await aRes.json()) as { ok?: boolean; organizations?: AccountRow[]; error?: string };
        const pJson = (await pRes.json()) as { ok?: boolean; products?: ProductRow[]; error?: string };
        if (cancelled) return;
        if (!meJson.ok || !meJson.user?.id) throw new Error("Could not resolve user");
        if (!aJson.ok) throw new Error(aJson.error || "");
        if (!pJson.ok) throw new Error(pJson.error || "");
        const uid = String(meJson.user.id);
        setPortalUserId(uid);
        setAccounts(aJson.organizations || []);
        const prods = (pJson.products || []).filter(allowedProduct);
        setProducts(prods);

        let nextAccount = "";
        let nextProduct = "";
        try {
          const la = localStorage.getItem(lsLastAccountKey(uid));
          if (la && (aJson.organizations || []).some((a) => a.id === la)) nextAccount = la;
          const lp = localStorage.getItem(lsLastProductKey(uid));
          if (lp && prods.some((p) => p.id === lp)) nextProduct = lp;
        } catch {
          /* ignore */
        }
        setAccountId(nextAccount);
        setProductId(nextProduct);
        setCaseDate(new Date().toISOString().slice(0, 10));
        setCaseTime("");
        setSurgeonId("");
        setExpectedRevenue("");
      } catch (e: unknown) {
        if (!cancelled) setLoadErr(userFacingError(e, "We could not load this page. Please try again."));
      } finally {
        if (!cancelled) setLoadBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open || !accountId) {
      setContacts([]);
      if (!accountId) setSurgeonId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/portal/sales/surgical-accounts/${encodeURIComponent(accountId)}`, { cache: "no-store" });
      const j = (await res.json()) as { ok?: boolean; contacts?: ContactRow[] };
      if (cancelled) return;
      if (!j.ok || !j.contacts) {
        setContacts([]);
        return;
      }
      setContacts(j.contacts);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, accountId]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("select,button")?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open, phase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitErr(null);
    if (!accountId || !caseDate || !productId || !surgeonId) {
      setSubmitErr("Organization, date, product, and surgeon are required.");
      return;
    }
    const revenueParsed = parseOptionalCaseRevenue(expectedRevenue);
    if (!revenueParsed.ok) {
      setSubmitErr("Revenue per case must be a valid amount (zero or greater).");
      return;
    }
    setSubmitBusy(true);
    try {
      const body: Record<string, unknown> = {
        account_id: accountId,
        case_date: caseDate,
        case_time: caseTime.trim() || null,
        product_id: productId,
        surgeon_contact_id: surgeonId,
        expected_revenue: revenueParsed.value,
      };
      const res = await fetch("/api/portal/sales/surgical-cases/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        case?: { id: string; case_number: string };
        error?: unknown;
        warnings?: string[];
      };

      if (!res.ok || !j.ok) {
        const msg =
          typeof j.error === "string"
            ? j.error
            : j.error && typeof j.error === "object" && "formErrors" in (j.error as object)
              ? "Check required fields"
              : "Could not create case";
        throw new Error(msg);
      }
      if (!j.case?.id) throw new Error("Missing case id");

      if (portalUserId) {
        try {
          localStorage.setItem(lsLastAccountKey(portalUserId), accountId);
          localStorage.setItem(lsLastProductKey(portalUserId), productId);
        } catch {
          /* ignore */
        }
      }

      const warns = j.warnings?.filter((x) => typeof x === "string") ?? [];
      if (warns.length) {
        try {
          sessionStorage.setItem(`surgical-case-warnings:${j.case.id}`, JSON.stringify(warns));
        } catch {
          /* ignore */
        }
      }

      setCreatedCase({ id: j.case.id, case_number: j.case.case_number || j.case.id });
      setPhase("success");
      onCreated?.();
    } catch (err: unknown) {
      setSubmitErr(userFacingError(err, "We could not create that record. Please try again."));
    } finally {
      setSubmitBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        /* Above SurgicalSalesNotificationsHost (200); below portal processing overlays (240+). */
        zIndex: 220,
        background: "color-mix(in srgb, var(--foreground) 38%, transparent)",
        display: "grid",
        justifyContent: "end",
        alignItems: "stretch",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal
        aria-labelledby="quick-add-case-title"
        style={{
          width: "min(400px, 100vw)",
          maxWidth: "100vw",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 32px color-mix(in srgb, var(--foreground) 12%, transparent)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "100vh",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <h2 id="quick-add-case-title" style={{ margin: 0, fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}>
            Quick add case
          </h2>
          <button type="button" onClick={onClose} style={{ ...sc.btnSecondary, padding: "8px 12px", fontSize: 12 }} aria-label="Close">
            Close
          </button>
        </div>

        <div style={{ padding: 16, overflowY: "auto", flex: 1, display: "grid", gap: 14 }}>
          {loadBusy ? <div style={{ color: "var(--muted)", fontWeight: 600 }}>Loading…</div> : null}
          {loadErr ? (
            <div role="alert" style={sc.alertError}>
              {loadErr}
            </div>
          ) : null}

          {phase === "success" && createdCase ? (
            <div style={{ display: "grid", gap: 14 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.45 }}>
                Saved <span style={{ color: "var(--brand-700)" }}>{createdCase.case_number}</span>.
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontWeight: 600, lineHeight: 1.5 }}>
                SKU and quantity were filled from your usual patterns. Open the full record to add notes or documents.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button
                  type="button"
                  style={sc.btnPrimary}
                  onClick={() => {
                    onClose();
                    router.push(`/portal/sales/cases/${encodeURIComponent(createdCase.id)}`);
                  }}
                >
                  Open full case
                </button>
                <button
                  type="button"
                  style={sc.btnSecondary}
                  onClick={() => {
                    resetForm();
                  }}
                >
                  Add another
                </button>
              </div>
              <Link href="/portal/sales/cases/new" style={{ ...sc.linkBrand, fontSize: 13 }}>
                Full new case form →
              </Link>
            </div>
          ) : !loadErr ? (
            <form onSubmit={(e) => void submit(e)} style={{ display: "grid", gap: 14 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--muted)", lineHeight: 1.45 }}>
                {SURGICAL_PHI_UI_NOTICE} Only scheduling and product context — no patient identifiers.
              </p>

              {submitErr ? (
                <div role="alert" style={sc.alertError}>
                  {submitErr}
                </div>
              ) : null}

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>Organization</span>
                <select required value={accountId} onChange={(e) => setAccountId(e.target.value)} style={sc.input} disabled={loadBusy}>
                  <option value="">Select organization…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name || a.id}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>Case date</span>
                <input required type="date" value={caseDate} onChange={(e) => setCaseDate(e.target.value)} style={sc.input} disabled={loadBusy} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>Case time (optional)</span>
                <input type="time" value={caseTime} onChange={(e) => setCaseTime(e.target.value)} style={sc.input} disabled={loadBusy} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>Product</span>
                <select required value={productId} onChange={(e) => setProductId(e.target.value)} style={sc.input} disabled={loadBusy}>
                  <option value="">Select…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>Surgeon</span>
                <select required value={surgeonId} onChange={(e) => setSurgeonId(e.target.value)} disabled={!accountId || loadBusy} style={sc.input}>
                  <option value="">Select surgeon…</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {contactDisplayName(c)} · {formatSurgicalContactRole(c.role_type)}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>Revenue per case (optional)</span>
                <input
                  value={expectedRevenue}
                  onChange={(e) => setExpectedRevenue(e.target.value)}
                  placeholder="e.g. 4500"
                  inputMode="decimal"
                  autoComplete="off"
                  style={sc.input}
                  disabled={loadBusy}
                />
              </label>

              <button type="submit" disabled={submitBusy || loadBusy} style={{ ...sc.btnPrimary, marginTop: 4 }}>
                {submitBusy ? "Saving…" : "Save case"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
