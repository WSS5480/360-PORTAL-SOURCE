"use client";

import React from "react";
import Link from "next/link";
import { SalesMetricCard, SalesPanel, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  ORG_PRODUCT_APPROVAL_STATUSES,
  ORG_PRODUCT_APPROVAL_STATUS_LABEL,
  orgProductApprovalStatusLabel,
  orgProductApprovalStatusStyle,
  type OrgProductApprovalListItem,
} from "@/lib/surgical-sales/organizationProductApprovals";

type ContactOption = Record<string, unknown> & { id?: string };
type ProductOption = { id: string; name: string; category?: string | null; active?: boolean | null };

const inputStyle: React.CSSProperties = {
  ...sc.input,
  minHeight: 40,
  fontSize: 13,
};

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function StatusChip({ status }: { status: string }) {
  const style = orgProductApprovalStatusStyle(status);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.fg,
        whiteSpace: "nowrap",
      }}
    >
      {orgProductApprovalStatusLabel(status)}
    </span>
  );
}

function CreateApprovalModal({
  accountId,
  contacts,
  existingProductIds,
  onClose,
  onSaved,
}: {
  accountId: string;
  contacts: ContactOption[];
  existingProductIds: Set<string>;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [products, setProducts] = React.useState<ProductOption[]>([]);
  const [productId, setProductId] = React.useState("");
  const [status, setStatus] = React.useState<(typeof ORG_PRODUCT_APPROVAL_STATUSES)[number]>("not_started");
  const [championContactId, setChampionContactId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [bootBusy, setBootBusy] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBootBusy(true);
      try {
        const res = await fetch("/api/portal/sales/surgical-catalog/products", { cache: "no-store" });
        const json = (await res.json()) as { ok?: boolean; products?: ProductOption[] };
        if (!cancelled && json.ok && Array.isArray(json.products)) {
          setProducts(json.products.filter((p) => p.active !== false));
        }
      } finally {
        if (!cancelled) setBootBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableProducts = products.filter((p) => !existingProductIds.has(p.id));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!productId) {
      setErr("Select a product.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/portal/sales/surgical-accounts/${encodeURIComponent(accountId)}/product-approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          status,
          champion_contact_id: championContactId || null,
          notes: notes.trim() || null,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: unknown };
      if (!res.ok || !json.ok) {
        throw new Error(userFacingError(json.error, "Could not create product approval."));
      }
      await onSaved();
      onClose();
    } catch (saveErr) {
      setErr(saveErr instanceof Error ? saveErr.message : "Could not create product approval.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-approval-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "color-mix(in srgb, var(--foreground) 28%, transparent)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          maxHeight: "min(90vh, 720px)",
          overflow: "auto",
          borderRadius: 16,
          border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
          background: "var(--surface)",
          padding: 20,
          boxShadow: "0 24px 64px color-mix(in srgb, var(--foreground) 18%, transparent)",
        }}
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id="create-approval-title" style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900 }}>
          Track product approval
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--muted)" }}>
          Record a product submitted for hospital VAC / formulary review at this organization.
        </p>

        {bootBusy ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Loading products…</p>
        ) : (
          <form onSubmit={(ev) => void handleSave(ev)} style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>
              Product
              <select value={productId} onChange={(ev) => setProductId(ev.target.value)} style={inputStyle} required disabled={saving}>
                <option value="">Select product…</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.category ? ` · ${p.category}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {availableProducts.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>All catalog products are already tracked for this organization.</p>
            ) : null}

            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>
              Status
              <select value={status} onChange={(ev) => setStatus(ev.target.value as typeof status)} style={inputStyle} disabled={saving}>
                {ORG_PRODUCT_APPROVAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORG_PRODUCT_APPROVAL_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>
              Physician champion (optional)
              <select value={championContactId} onChange={(ev) => setChampionContactId(ev.target.value)} style={inputStyle} disabled={saving}>
                <option value="">No champion selected</option>
                {contacts.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {contactDisplayName(c as Parameters<typeof contactDisplayName>[0])}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>
              Notes (optional)
              <textarea
                value={notes}
                onChange={(ev) => setNotes(ev.target.value)}
                rows={3}
                style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                disabled={saving}
                placeholder="Committee date, submission method, restrictions…"
              />
            </label>

            {err ? (
              <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>
                {err}
              </p>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button type="button" style={sc.btnGhost} onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" style={sc.btnPrimary} disabled={saving || !productId}>
                {saving ? "Saving…" : "Add product"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ApprovalRowEditor({
  item,
  contacts,
  accountId,
  onSaved,
}: {
  item: OrgProductApprovalListItem;
  contacts: ContactOption[];
  accountId: string;
  onSaved: (updated: OrgProductApprovalListItem) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState(item.status);
  const [championContactId, setChampionContactId] = React.useState(item.champion_contact_id ?? "");
  const [notes, setNotes] = React.useState(item.notes ?? "");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    setStatus(item.status);
    setChampionContactId(item.champion_contact_id ?? "");
    setNotes(item.notes ?? "");
  }, [item]);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/portal/sales/surgical-accounts/${encodeURIComponent(accountId)}/product-approvals/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            champion_contact_id: championContactId || null,
            notes: notes.trim() || null,
          }),
        },
      );
      const json = (await res.json()) as { ok?: boolean; approval?: OrgProductApprovalListItem; error?: unknown };
      if (!res.ok || !json.ok || !json.approval) {
        throw new Error(userFacingError(json.error, "Could not update product approval."));
      }
      onSaved(json.approval);
      setOpen(false);
    } catch (saveErr) {
      setErr(saveErr instanceof Error ? saveErr.message : "Could not update product approval.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr>
        <td style={{ padding: "12px 10px", fontWeight: 800, fontSize: 13 }}>{item.product_name}</td>
        <td style={{ padding: "12px 10px" }}>
          <StatusChip status={item.status} />
        </td>
        <td style={{ padding: "12px 10px", fontSize: 13, color: "var(--muted)" }}>
          {item.champion_contact_id ? (
            <Link href={`/portal/sales/providers/${encodeURIComponent(item.champion_contact_id)}`} style={sc.linkBrandAction}>
              {item.champion_name || "Champion"}
            </Link>
          ) : (
            "—"
          )}
        </td>
        <td style={{ padding: "12px 10px", fontSize: 13, color: "var(--muted)" }}>{fmtDate(item.submitted_at)}</td>
        <td style={{ padding: "12px 10px", fontSize: 13, color: "var(--muted)" }}>{fmtDate(item.approved_at)}</td>
        <td style={{ padding: "12px 10px", textAlign: "right" }}>
          <button type="button" style={{ ...sc.btnGhost, fontSize: 12, padding: "6px 10px" }} onClick={() => setOpen(true)}>
            Update
          </button>
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={6} style={{ padding: "0 10px 14px" }}>
            <div
              style={{
                borderRadius: 12,
                border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
                padding: 14,
                background: "color-mix(in srgb, var(--surface-2) 40%, var(--surface))",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>
                  Status
                  <select value={status} onChange={(ev) => setStatus(ev.target.value as typeof status)} style={inputStyle} disabled={busy}>
                    {ORG_PRODUCT_APPROVAL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ORG_PRODUCT_APPROVAL_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>
                  Physician champion
                  <select value={championContactId} onChange={(ev) => setChampionContactId(ev.target.value)} style={inputStyle} disabled={busy}>
                    <option value="">No champion selected</option>
                    {contacts.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {contactDisplayName(c as Parameters<typeof contactDisplayName>[0])}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>
                Notes
                <textarea
                  value={notes}
                  onChange={(ev) => setNotes(ev.target.value)}
                  rows={2}
                  style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
                  disabled={busy}
                />
              </label>
              {err ? (
                <p role="alert" style={{ margin: 0, fontSize: 12, color: "var(--danger)", fontWeight: 600 }}>
                  {err}
                </p>
              ) : null}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" style={sc.btnGhost} onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </button>
                <button type="button" style={sc.btnPrimary} onClick={() => void save()} disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function OrganizationProductApprovalsPanel({
  accountId,
  contacts,
  narrow,
}: {
  accountId: string;
  contacts: ContactOption[];
  narrow?: boolean;
}) {
  const [approvals, setApprovals] = React.useState<OrgProductApprovalListItem[]>([]);
  const [summary, setSummary] = React.useState({ total: 0, approved: 0, pending: 0, denied: 0 });
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<"" | "pending" | "approved" | "denied">("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-accounts/${encodeURIComponent(accountId)}/product-approvals`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        approvals?: OrgProductApprovalListItem[];
        summary?: { total: number; approved: number; pending: number; denied: number };
        error?: unknown;
      };
      if (!res.ok || !json.ok) {
        throw new Error(userFacingError(json.error, "Could not load product approvals."));
      }
      setApprovals(json.approvals ?? []);
      setSummary(json.summary ?? { total: 0, approved: 0, pending: 0, denied: 0 });
    } catch (loadErr) {
      setErr(loadErr instanceof Error ? loadErr.message : "Could not load product approvals.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const existingProductIds = React.useMemo(() => new Set(approvals.map((a) => a.product_id)), [approvals]);

  const filtered = React.useMemo(() => {
    if (!statusFilter) return approvals;
    if (statusFilter === "approved") return approvals.filter((a) => a.status === "approved");
    if (statusFilter === "denied") return approvals.filter((a) => a.status === "denied");
    return approvals.filter((a) => a.status !== "approved" && a.status !== "denied");
  }, [approvals, statusFilter]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
        }}
      >
        <SalesMetricCard label="Approved" value={String(summary.approved)} hint="On formulary / committee approved" />
        <SalesMetricCard label="In pipeline" value={String(summary.pending)} hint="Not yet approved or denied" />
        <SalesMetricCard label="Denied" value={String(summary.denied)} hint="Committee rejected" />
        <SalesMetricCard label="Total tracked" value={String(summary.total)} hint="Products with approval records" />
      </div>

      <SalesPanel
        density="compact"
        nativeFlat={narrow}
        title="Product approvals"
        description="Track which products are approved, pending VAC review, or denied at this organization."
        headerExtra={
          <button type="button" style={sc.btnPrimary} onClick={() => setCreateOpen(true)}>
            Track product
          </button>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {(
            [
              { id: "", label: "All" },
              { id: "pending", label: "In pipeline" },
              { id: "approved", label: "Approved" },
              { id: "denied", label: "Denied" },
            ] as const
          ).map((f) => {
            const on = statusFilter === f.id;
            return (
              <button
                key={f.id || "all"}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                style={{
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 800,
                  border: on ? "1px solid color-mix(in srgb, var(--brand-600) 45%, var(--border))" : "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
                  background: on ? "color-mix(in srgb, var(--brand-600) 12%, var(--surface))" : "var(--surface)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Loading product approvals…</p>
        ) : err ? (
          <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>
            {err}
          </p>
        ) : filtered.length === 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
              {approvals.length === 0
                ? "No product approvals tracked yet. Add a product when a hospital VAC submission starts."
                : "No products match this filter."}
            </p>
            {approvals.length === 0 ? (
              <button type="button" style={{ ...sc.btnSecondary, width: "fit-content" }} onClick={() => setCreateOpen(true)}>
                Track first product
              </button>
            ) : null}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))" }}>
                  {["Product", "Status", "Champion", "Submitted", "Approved", ""].map((h) => (
                    <th
                      key={h || "actions"}
                      style={{
                        padding: "8px 10px",
                        textAlign: h ? "left" : "right",
                        fontSize: 11,
                        fontWeight: 800,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <ApprovalRowEditor
                    key={item.id}
                    item={item}
                    contacts={contacts}
                    accountId={accountId}
                    onSaved={(updated) => {
                      setApprovals((prev) => {
                        const next = prev.map((a) => (a.id === updated.id ? updated : a));
                        setSummary({
                          total: next.length,
                          approved: next.filter((a) => a.status === "approved").length,
                          denied: next.filter((a) => a.status === "denied").length,
                          pending: next.filter((a) => a.status !== "approved" && a.status !== "denied").length,
                        });
                        return next;
                      });
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SalesPanel>

      {createOpen ? (
        <CreateApprovalModal
          accountId={accountId}
          contacts={contacts}
          existingProductIds={existingProductIds}
          onClose={() => setCreateOpen(false)}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}
