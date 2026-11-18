"use client";

import React from "react";
import {
  PRODUCT_INTELLIGENCE_KNOWLEDGE_LABELS,
  PRODUCT_INTELLIGENCE_KNOWLEDGE_TYPES,
  type ProductIntelligenceKnowledgeType,
} from "@/lib/surgical-sales/productIntelligence";

type CandidateStatus = "pending" | "approved" | "rejected";
type CandidateConfidence = "high" | "medium" | "low";

export type ProductIntelligenceCandidateReviewRow = {
  id: string;
  knowledge_type: ProductIntelligenceKnowledgeType;
  title: string;
  content: string;
  evidence: string | null;
  confidence: CandidateConfidence;
  status: CandidateStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function cardStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 16,
    background: "white",
    boxShadow: "0 8px 22px rgba(0,0,0,0.05)",
    overflow: "hidden",
  };
}

function inputStyle(): React.CSSProperties {
  return { padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" };
}

function buttonStyle(tone: "light" | "approve" | "reject" | "muted" = "light"): React.CSSProperties {
  const styles: Record<typeof tone, React.CSSProperties> = {
    light: { background: "rgba(0,0,0,0.04)", color: "inherit" },
    approve: { background: "rgba(25,135,84,0.12)", color: "rgb(20,83,45)" },
    reject: { background: "rgba(220,53,69,0.10)", color: "rgb(153,27,27)" },
    muted: { background: "rgba(100,116,139,0.10)", color: "rgb(51,65,85)" },
  };
  return {
    padding: "9px 11px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.14)",
    fontWeight: 950,
    cursor: "pointer",
    ...styles[tone],
  };
}

function pill(status: string): React.CSSProperties {
  const color =
    status === "approved" ? "25,135,84" : status === "pending" ? "245,158,11" : status === "rejected" ? "220,53,69" : "30,136,229";
  return {
    display: "inline-flex",
    padding: "4px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    background: `rgba(${color},0.12)`,
    border: `1px solid rgba(${color},0.22)`,
    whiteSpace: "nowrap",
  };
}

function dateTime(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  return JSON.parse(text) as Record<string, unknown>;
}

function normalizeCandidate(value: unknown): ProductIntelligenceCandidateReviewRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as ProductIntelligenceCandidateReviewRow;
  if (!row.id) return null;
  return row;
}

function replaceRows(
  rows: ProductIntelligenceCandidateReviewRow[],
  updates: ProductIntelligenceCandidateReviewRow[],
): ProductIntelligenceCandidateReviewRow[] {
  const byId = new Map(updates.map((row) => [row.id, row]));
  return rows.map((row) => byId.get(row.id) ?? row);
}

function CandidateCard({
  candidate,
  busy,
  onSave,
  onStatus,
}: {
  candidate: ProductIntelligenceCandidateReviewRow;
  busy: boolean;
  onSave: (id: string, patch: Partial<ProductIntelligenceCandidateReviewRow>) => Promise<void>;
  onStatus: (id: string, status: CandidateStatus) => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(candidate);
  const label = PRODUCT_INTELLIGENCE_KNOWLEDGE_LABELS[candidate.knowledge_type] ?? "Other";

  React.useEffect(() => {
    setDraft(candidate);
  }, [candidate]);

  async function save() {
    await onSave(candidate.id, draft);
    setEditing(false);
  }

  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong>{candidate.title}</strong>
            <span style={pill(candidate.status)}>{candidate.status}</span>
            <span style={pill("other")}>{label}</span>
            <span style={{ fontSize: 12, opacity: 0.68 }}>{candidate.confidence} confidence</span>
          </div>
          {!editing ? <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.45 }}>{candidate.content}</p> : null}
        </div>
        <button type="button" onClick={() => setEditing((value) => !value)} disabled={busy} style={buttonStyle("muted")}>
          {editing ? "Cancel Edit" : "Edit"}
        </button>
      </div>

      {!editing && candidate.evidence ? (
        <div style={{ fontSize: 12, opacity: 0.76, lineHeight: 1.45 }}>
          <b>Evidence:</b> {candidate.evidence}
        </div>
      ) : null}
      {!editing && candidate.admin_notes ? (
        <div style={{ fontSize: 12, opacity: 0.76, lineHeight: 1.45 }}>
          <b>Admin notes:</b> {candidate.admin_notes}
        </div>
      ) : null}

      {editing ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 900, opacity: 0.7 }}>Type</span>
              <select
                value={draft.knowledge_type}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    knowledge_type: event.target.value as ProductIntelligenceKnowledgeType,
                  }))
                }
                style={inputStyle()}
              >
                {PRODUCT_INTELLIGENCE_KNOWLEDGE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PRODUCT_INTELLIGENCE_KNOWLEDGE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 900, opacity: 0.7 }}>Confidence</span>
              <select
                value={draft.confidence}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    confidence: event.target.value as CandidateConfidence,
                  }))
                }
                style={inputStyle()}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 900, opacity: 0.7 }}>Title</span>
            <input value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} style={inputStyle()} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 900, opacity: 0.7 }}>Content</span>
            <textarea
              value={draft.content}
              onChange={(event) => setDraft((value) => ({ ...value, content: event.target.value }))}
              rows={4}
              style={inputStyle()}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 900, opacity: 0.7 }}>Evidence</span>
            <textarea
              value={draft.evidence ?? ""}
              onChange={(event) => setDraft((value) => ({ ...value, evidence: event.target.value }))}
              rows={2}
              style={inputStyle()}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 900, opacity: 0.7 }}>Admin notes</span>
            <textarea
              value={draft.admin_notes ?? ""}
              onChange={(event) => setDraft((value) => ({ ...value, admin_notes: event.target.value }))}
              rows={2}
              style={inputStyle()}
            />
          </label>
          <button type="button" onClick={save} disabled={busy || !draft.title.trim() || !draft.content.trim()} style={buttonStyle("light")}>
            Save Edits
          </button>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {candidate.status !== "approved" ? (
          <button type="button" onClick={() => onStatus(candidate.id, "approved")} disabled={busy} style={buttonStyle("approve")}>
            Approve
          </button>
        ) : null}
        {candidate.status !== "rejected" ? (
          <button type="button" onClick={() => onStatus(candidate.id, "rejected")} disabled={busy} style={buttonStyle("reject")}>
            Reject
          </button>
        ) : null}
        {candidate.status !== "pending" ? (
          <button type="button" onClick={() => onStatus(candidate.id, "pending")} disabled={busy} style={buttonStyle("muted")}>
            Move Back to Pending
          </button>
        ) : null}
        {candidate.status !== "pending" ? (
          <span style={{ fontSize: 12, opacity: 0.65 }}>Reviewed: {dateTime(candidate.reviewed_at)}</span>
        ) : null}
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  rows,
  emptyText,
  children,
  busyId,
  onSave,
  onStatus,
}: {
  title: string;
  rows: ProductIntelligenceCandidateReviewRow[];
  emptyText: string;
  children?: React.ReactNode;
  busyId: string | null;
  onSave: (id: string, patch: Partial<ProductIntelligenceCandidateReviewRow>) => Promise<void>;
  onStatus: (id: string, status: CandidateStatus) => Promise<void>;
}) {
  return (
    <section style={cardStyle()}>
      <div style={{ padding: 14, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 950 }}>{title}</div>
          {children}
        </div>
      </div>
      <div style={{ padding: 14, display: "grid", gap: 10 }}>
        {rows.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            busy={busyId === candidate.id}
            onSave={onSave}
            onStatus={onStatus}
          />
        ))}
        {rows.length === 0 ? <div style={{ fontSize: 13, opacity: 0.72 }}>{emptyText}</div> : null}
      </div>
    </section>
  );
}

export default function ProductIntelligenceReviewClient({
  productId,
  initialCandidates,
}: {
  productId: string;
  initialCandidates: ProductIntelligenceCandidateReviewRow[];
}) {
  const [rows, setRows] = React.useState(initialCandidates);
  const [bulkNote, setBulkNote] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const pending = rows.filter((row) => row.status === "pending");
  const approved = rows.filter((row) => row.status === "approved");
  const rejected = rows.filter((row) => row.status === "rejected");

  async function updateCandidate(id: string, patch: Partial<ProductIntelligenceCandidateReviewRow>) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sales/product-intelligence/candidates/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await readJson(res);
      if (!res.ok || json.ok === false) throw new Error(String(json.error ?? `Update failed (${res.status})`));
      const candidate = normalizeCandidate(json.candidate);
      if (!candidate) throw new Error("Server did not return the updated candidate.");
      setRows((current) => replaceRows(current, [candidate]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function bulkReview(action: "approve_all" | "reject_all") {
    setBusyId("bulk");
    setError(null);
    try {
      const res = await fetch(`/api/admin/sales/product-intelligence/products/${encodeURIComponent(productId)}/candidates/bulk-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, admin_notes: bulkNote }),
      });
      const json = await readJson(res);
      if (!res.ok || json.ok === false) throw new Error(String(json.error ?? `Bulk update failed (${res.status})`));
      const updates = Array.isArray(json.candidates)
        ? json.candidates.map(normalizeCandidate).filter((row): row is ProductIntelligenceCandidateReviewRow => Boolean(row))
        : [];
      setRows((current) => replaceRows(current, updates));
      setBulkNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk update failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {error ? (
        <div role="alert" style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(220,53,69,0.25)", background: "rgba(220,53,69,0.08)", color: "rgb(153,27,27)", fontWeight: 900 }}>
          {error}
        </div>
      ) : null}

      <ReviewSection
        title={`Pending review (${pending.length})`}
        rows={pending}
        emptyText="No pending candidates."
        busyId={busyId}
        onSave={updateCandidate}
        onStatus={(id, status) => updateCandidate(id, { status })}
      >
        {pending.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={bulkNote}
              onChange={(event) => setBulkNote(event.target.value)}
              placeholder="Optional note for all"
              style={{ ...inputStyle(), padding: "8px 10px", minWidth: 220 }}
            />
            <button type="button" onClick={() => bulkReview("approve_all")} disabled={busyId === "bulk"} style={buttonStyle("approve")}>
              Accept All
            </button>
            <button type="button" onClick={() => bulkReview("reject_all")} disabled={busyId === "bulk"} style={buttonStyle("reject")}>
              Reject All
            </button>
          </div>
        ) : null}
      </ReviewSection>

      <ReviewSection
        title={`Approved knowledge (${approved.length})`}
        rows={approved}
        emptyText="No approved knowledge yet."
        busyId={busyId}
        onSave={updateCandidate}
        onStatus={(id, status) => updateCandidate(id, { status })}
      />

      <ReviewSection
        title={`Rejected (${rejected.length})`}
        rows={rejected}
        emptyText="No rejected candidates."
        busyId={busyId}
        onSave={updateCandidate}
        onStatus={(id, status) => updateCandidate(id, { status })}
      />
    </div>
  );
}
