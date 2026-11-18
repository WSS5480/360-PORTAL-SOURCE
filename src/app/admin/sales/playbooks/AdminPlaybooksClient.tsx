"use client";

import Link from "next/link";
import React from "react";
import type { AdminPlaybookRow } from "@/lib/surgical-sales/preCallPlanTemplateAdminDb";
import {
  PRE_CALL_PLAN_TEMPLATE_STATUSES,
  PRE_CALL_PLAN_TEMPLATE_STATUS_LABELS,
  type PreCallPlanTemplateStatus,
} from "@/lib/surgical-sales/preCallPlanTemplateStatus";
import {
  PRE_CALL_PLAN_PRODUCT_LINES,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import { ENGAGEMENT_TYPE_LABELS } from "@/lib/surgical-sales/engagements/engagementTypes";
import { formatPlaybookNextStageConversionRatio } from "@/lib/surgical-sales/playbookPathwayOutcome";
import { engagementLabel, scopeLabel } from "./adminPlaybookFormShared";

type ScopeFilter = "all" | "company" | "user";

function statusPill(status: PreCallPlanTemplateStatus): React.CSSProperties {
  const colors: Record<PreCallPlanTemplateStatus, { bg: string; color: string }> = {
    active: { bg: "color-mix(in srgb, #059669 14%, #fff)", color: "#047857" },
    inactive: { bg: "color-mix(in srgb, #d97706 14%, #fff)", color: "#b45309" },
    archived: { bg: "color-mix(in srgb, #64748b 14%, #fff)", color: "#475569" },
  };
  const tone = colors[status];
  return {
    display: "inline-flex",
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    background: tone.bg,
    color: tone.color,
  };
}

export default function AdminPlaybooksClient({ initialPlaybooks }: { initialPlaybooks: AdminPlaybookRow[] }) {
  const [playbooks, setPlaybooks] = React.useState(initialPlaybooks);
  const [scope, setScope] = React.useState<ScopeFilter>("all");
  const [status, setStatus] = React.useState<PreCallPlanTemplateStatus | "">("");
  const [productLine, setProductLine] = React.useState("");
  const [engagementType, setEngagementType] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (scope !== "all") params.set("scope", scope);
      if (status) params.set("status", status);
      if (productLine) params.set("productLine", productLine);
      if (engagementType) params.set("engagementType", engagementType);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/admin/sales/playbooks?${params.toString()}`, { cache: "no-store" });
      const j = (await res.json()) as { ok?: boolean; playbooks?: AdminPlaybookRow[]; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Failed to load playbooks");
      setPlaybooks(j.playbooks ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load playbooks");
    } finally {
      setLoading(false);
    }
  }, [scope, status, productLine, engagementType, search]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function setPlaybookStatus(templateId: string, nextStatus: PreCallPlanTemplateStatus) {
    setActionBusyId(templateId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sales/playbooks/${encodeURIComponent(templateId)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Could not update status");
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setActionBusyId(null);
    }
  }

  async function promotePlaybook(templateId: string) {
    if (!window.confirm("Promote this user playbook to a company playbook? The user copy will be archived.")) {
      return;
    }
    setActionBusyId(templateId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sales/playbooks/${encodeURIComponent(templateId)}/promote`, {
        method: "POST",
      });
      const j = (await res.json()) as { ok?: boolean; error?: string; company?: { id: string } };
      if (!res.ok || !j.ok) throw new Error(j.error || "Could not promote playbook");
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not promote playbook");
    } finally {
      setActionBusyId(null);
    }
  }

  async function deletePlaybook(templateId: string) {
    if (!window.confirm("Delete this user playbook permanently?")) return;
    setActionBusyId(templateId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sales/playbooks/${encodeURIComponent(templateId)}`, {
        method: "DELETE",
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Could not delete playbook");
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not delete playbook");
    } finally {
      setActionBusyId(null);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 950 }}>Sales playbooks</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.75, maxWidth: 720 }}>
            Manage company intro-call and engagement playbooks. Active playbooks appear in rep pre-call planning.
            Archive company playbooks instead of deleting them.
          </p>
        </div>
        <Link
          href="/admin/sales/playbooks/new"
          style={{
            alignSelf: "flex-start",
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--brand-600)",
            color: "#fff",
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          New company playbook
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          marginBottom: 14,
        }}
      >
        <FilterSelect label="Scope" value={scope} onChange={(v) => setScope(v as ScopeFilter)}>
          <option value="all">All</option>
          <option value="company">Company</option>
          <option value="user">User-created</option>
        </FilterSelect>
        <FilterSelect label="Status" value={status} onChange={(v) => setStatus(v as PreCallPlanTemplateStatus | "")}>
          <option value="">Any</option>
          {PRE_CALL_PLAN_TEMPLATE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PRE_CALL_PLAN_TEMPLATE_STATUS_LABELS[s]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Product" value={productLine} onChange={setProductLine}>
          <option value="">Any</option>
          {PRE_CALL_PLAN_PRODUCT_LINES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Engagement" value={engagementType} onChange={setEngagementType}>
          <option value="">Any</option>
          {Object.entries(ENGAGEMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FilterSelect>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.7 }}>Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, tags, focus…"
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 13,
            }}
          />
        </label>
      </div>

      {error ? (
        <p style={{ color: "crimson", fontSize: 13 }} role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p style={{ fontSize: 13, opacity: 0.7 }}>Loading playbooks…</p> : null}

      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.02)", textAlign: "left" }}>
              <th style={th}>Playbook</th>
              <th style={th}>Advanced</th>
              <th style={th}>No advance</th>
              <th style={th}>Conversion</th>
              <th style={th}>Scope</th>
              <th style={th}>Product</th>
              <th style={th}>Engagement</th>
              <th style={th}>Status</th>
              <th style={th}>Owner</th>
              <th style={{ ...th, width: 48 }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {playbooks.map((row) => {
              const busy = actionBusyId === row.id;
              return (
                <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={td}>
                    <Link
                      href={`/admin/sales/playbooks/${encodeURIComponent(row.id)}`}
                      style={{ fontWeight: 900, color: "var(--brand-600)", textDecoration: "none" }}
                    >
                      {row.name}
                    </Link>
                    {row.description ? (
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{row.description}</div>
                    ) : null}
                  </td>
                  <td
                    style={td}
                    title="Completed engagements using this playbook where the provider advanced to the next sales pathway stage"
                  >
                    <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                      {row.nextStageSuccessCount}
                    </span>
                  </td>
                  <td
                    style={td}
                    title="Completed engagements using this playbook where the provider did not advance to the next sales pathway stage"
                  >
                    <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                      {row.nextStageNoAdvanceCount}
                    </span>
                  </td>
                  <td
                    style={td}
                    title={
                      row.nextStageConversionRatio === null
                        ? "No completed engagements with pathway outcome data yet"
                        : `${row.nextStageSuccessCount} of ${row.nextStageSuccessCount + row.nextStageNoAdvanceCount} advanced to the next stage`
                    }
                  >
                    <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                      {formatPlaybookNextStageConversionRatio(row.nextStageConversionRatio)}
                    </span>
                  </td>
                  <td style={td}>{scopeLabel(row.isSystemTemplate)}</td>
                  <td style={td}>{row.productLine}</td>
                  <td style={td}>{engagementLabel(row.engagementType)}</td>
                  <td style={td}>
                    <span style={statusPill(row.status)}>{PRE_CALL_PLAN_TEMPLATE_STATUS_LABELS[row.status]}</span>
                  </td>
                  <td style={td}>{row.ownerLabel ?? (row.isSystemTemplate ? "360 Medical" : "—")}</td>
                  <td style={{ ...td, width: 48, textAlign: "right" }}>
                    <PlaybookRowActionsMenu
                      row={row}
                      busy={busy}
                      onSetStatus={setPlaybookStatus}
                      onPromote={promotePlaybook}
                      onDelete={deletePlaybook}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && playbooks.length === 0 ? (
          <p style={{ padding: 16, margin: 0, opacity: 0.7 }}>No playbooks match these filters.</p>
        ) : null}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.7 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}
      >
        {children}
      </select>
    </label>
  );
}

function PlaybookRowActionsMenu({
  row,
  busy,
  onSetStatus,
  onPromote,
  onDelete,
}: {
  row: AdminPlaybookRow;
  busy: boolean;
  onSetStatus: (templateId: string, nextStatus: PreCallPlanTemplateStatus) => Promise<void>;
  onPromote: (templateId: string) => Promise<void>;
  onDelete: (templateId: string) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function closeAndRun(action: () => void | Promise<void>) {
    setOpen(false);
    void action();
  }

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        aria-label={`Actions for ${row.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
        style={{
          width: 32,
          height: 32,
          display: "grid",
          placeItems: "center",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "#fff",
          fontSize: 18,
          lineHeight: 1,
          fontWeight: 900,
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.6 : 1,
          color: "inherit",
        }}
      >
        ⋮
      </button>
      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            minWidth: 168,
            display: "grid",
            gap: 4,
            padding: 6,
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "#fff",
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            zIndex: 20,
          }}
        >
          <MenuItem
            href={`/admin/sales/playbooks/${encodeURIComponent(row.id)}`}
            onNavigate={() => setOpen(false)}
          >
            Edit
          </MenuItem>
          {row.status !== "active" ? (
            <MenuItem onClick={() => closeAndRun(() => onSetStatus(row.id, "active"))}>Activate</MenuItem>
          ) : (
            <MenuItem onClick={() => closeAndRun(() => onSetStatus(row.id, "inactive"))}>Deactivate</MenuItem>
          )}
          {row.status !== "archived" ? (
            <MenuItem onClick={() => closeAndRun(() => onSetStatus(row.id, "archived"))}>Archive</MenuItem>
          ) : null}
          {!row.isSystemTemplate ? (
            <>
              <MenuItem onClick={() => closeAndRun(() => onPromote(row.id))}>Promote to company</MenuItem>
              <MenuItem danger onClick={() => closeAndRun(() => onDelete(row.id))}>
                Delete
              </MenuItem>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  href,
  onNavigate,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  onNavigate?: () => void;
  danger?: boolean;
}) {
  const style: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    fontSize: 12,
    fontWeight: 800,
    textAlign: "left",
    cursor: "pointer",
    textDecoration: "none",
    color: danger ? "crimson" : "inherit",
  };

  if (href) {
    return (
      <Link href={href} role="menuitem" style={style} onClick={onNavigate}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" role="menuitem" onClick={onClick} style={style}>
      {children}
    </button>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", fontSize: 11, fontWeight: 900, letterSpacing: 0.2 };
const td: React.CSSProperties = { padding: "12px", verticalAlign: "top" };
