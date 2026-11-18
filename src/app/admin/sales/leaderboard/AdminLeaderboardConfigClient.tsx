"use client";

import React from "react";
import type { AdminLeaderboardConfigPayload, AdminLeaderboardMetricView } from "@/lib/surgical-sales/leaderboardConfigDb";
import { DEFAULT_EXECUTION_LEADERBOARD_CONFIG } from "@/lib/surgical-sales/executionLeaderboardConfig";
import { categoryLabel } from "@/lib/surgical-sales/leaderboardMetricCatalog";

type DraftMetric = AdminLeaderboardMetricView;

function captureStatusPill(status: DraftMetric["captureStatus"]): React.CSSProperties {
  const tone =
    status === "wired"
      ? { bg: "color-mix(in srgb, #059669 14%, #fff)", color: "#047857" }
      : { bg: "color-mix(in srgb, #d97706 14%, #fff)", color: "#b45309" };
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

function MetricRow({
  metric,
  onPointsChange,
  onRemove,
  onAdd,
  mode,
  disabled,
}: {
  metric: DraftMetric;
  onPointsChange?: (points: number) => void;
  onRemove?: () => void;
  onAdd?: () => void;
  mode: "active" | "available";
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: mode === "active" ? "minmax(220px, 1.4fr) 120px 120px minmax(180px, 1fr) auto" : "minmax(220px, 1.4fr) 120px minmax(180px, 1fr) auto",
        gap: 12,
        alignItems: "center",
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{metric.label}</div>
        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>{metric.description}</div>
        <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 6 }}>Source: {metric.dataSource}</div>
      </div>

      <div>
        <span style={captureStatusPill(metric.captureStatus)}>
          {metric.captureStatus === "wired" ? "Scoring live" : "Catalog only"}
        </span>
      </div>

      {mode === "active" ? (
        <div>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>Points</span>
            <input
              type="number"
              min={0}
              max={10000}
              step={1}
              value={metric.points}
              disabled={disabled}
              onChange={(e) => onPointsChange?.(Math.max(0, Number(e.target.value) || 0))}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontWeight: 700,
              }}
            />
          </label>
        </div>
      ) : null}

      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{categoryLabel(metric.category)}</div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {mode === "active" ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            style={{
              border: "1px solid color-mix(in srgb, #dc2626 35%, var(--border))",
              background: "color-mix(in srgb, #dc2626 8%, #fff)",
              color: "#b91c1c",
              borderRadius: 8,
              padding: "8px 12px",
              fontWeight: 800,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            Remove
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={onAdd}
            style={{
              border: "1px solid color-mix(in srgb, var(--brand-600) 35%, var(--border))",
              background: "color-mix(in srgb, var(--brand-600) 10%, #fff)",
              color: "var(--brand-700)",
              borderRadius: 8,
              padding: "8px 12px",
              fontWeight: 800,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            Add to leaderboard
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminLeaderboardConfigClient({
  initialPayload,
}: {
  initialPayload: AdminLeaderboardConfigPayload;
}) {
  const [activeMetrics, setActiveMetrics] = React.useState<DraftMetric[]>(initialPayload.activeMetrics);
  const [availableMetrics, setAvailableMetrics] = React.useState<DraftMetric[]>(initialPayload.availableMetrics);
  const [updatedAt, setUpdatedAt] = React.useState(initialPayload.updatedAt);
  const [saving, setSaving] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);

  function applyPayload(payload: AdminLeaderboardConfigPayload) {
    setActiveMetrics(payload.activeMetrics);
    setAvailableMetrics(payload.availableMetrics);
    setUpdatedAt(payload.updatedAt);
  }

  function markDirty() {
    setDirty(true);
    setSuccess(null);
  }

  function updateActiveMetric(key: string, updater: (metric: DraftMetric) => DraftMetric) {
    setActiveMetrics((rows) => rows.map((row) => (row.key === key ? updater(row) : row)));
    markDirty();
  }

  function removeMetric(key: string) {
    const removed = activeMetrics.find((row) => row.key === key);
    if (!removed) return;
    if (activeMetrics.length <= 1) {
      setError("At least one metric must remain on the leaderboard.");
      return;
    }
    setActiveMetrics((rows) => rows.filter((row) => row.key !== key));
    setAvailableMetrics((rows) => [...rows, { ...removed, enabled: false }].sort((a, b) => a.label.localeCompare(b.label)));
    setError(null);
    markDirty();
  }

  function addMetric(key: string) {
    const metric = availableMetrics.find((row) => row.key === key);
    if (!metric) return;
    setAvailableMetrics((rows) => rows.filter((row) => row.key !== key));
    setActiveMetrics((rows) => [...rows, { ...metric, enabled: true, points: metric.defaultPoints }]);
    setError(null);
    markDirty();
  }

  async function saveConfig() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/sales/leaderboard/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabledMetrics: activeMetrics.map((metric) => metric.key),
          metricPoints: Object.fromEntries(activeMetrics.map((metric) => [metric.key, metric.points])),
        }),
      });
      const json = (await res.json()) as AdminLeaderboardConfigPayload & { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to save leaderboard config");
      applyPayload(json);
      setDirty(false);
      setSuccess("Leaderboard configuration saved.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save leaderboard config");
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    setResetting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/sales/leaderboard/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabledMetrics: DEFAULT_EXECUTION_LEADERBOARD_CONFIG.enabledMetrics,
          metricPoints: DEFAULT_EXECUTION_LEADERBOARD_CONFIG.metricPoints,
        }),
      });
      const json = (await res.json()) as AdminLeaderboardConfigPayload & { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to reset leaderboard config");
      applyPayload(json);
      setDirty(false);
      setSuccess("Restored default leaderboard metrics.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reset leaderboard config");
    } finally {
      setResetting(false);
    }
  }

  const totalPossiblePerEvent = activeMetrics.reduce((sum, metric) => sum + metric.points, 0);

  return (
    <main style={{ padding: 24, maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Sales Admin
          </div>
          <h1 style={{ margin: "6px 0 8px", fontSize: 28, fontWeight: 900 }}>Leaderboard Scoring</h1>
          <p style={{ margin: 0, color: "var(--muted)", maxWidth: 760, lineHeight: 1.5 }}>
            Control which metrics count toward the Sales Execution Score and how many points each event earns.
            Metrics marked catalog only can be added now but will not affect scores until their counting logic is wired.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={resetting || saving}
            onClick={() => void resetDefaults()}
            style={{
              border: "1px solid var(--border)",
              background: "#fff",
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 800,
              cursor: resetting || saving ? "not-allowed" : "pointer",
            }}
          >
            {resetting ? "Resetting…" : "Reset defaults"}
          </button>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => void saveConfig()}
            style={{
              border: "none",
              background: dirty ? "var(--brand-600)" : "color-mix(in srgb, var(--brand-600) 45%, #fff)",
              color: "#fff",
              borderRadius: 10,
              padding: "10px 16px",
              fontWeight: 900,
              cursor: !dirty || saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 16, background: "#fff" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>Active metrics</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{activeMetrics.length}</div>
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 16, background: "#fff" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>Available to add</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{availableMetrics.length}</div>
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 16, background: "#fff" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>Max points per single event</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{totalPossiblePerEvent.toLocaleString()}</div>
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 16, background: "#fff" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>Last updated</div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 8 }}>
            {updatedAt ? new Date(updatedAt).toLocaleString() : "Defaults only"}
          </div>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "color-mix(in srgb, #dc2626 10%, #fff)",
            color: "#991b1b",
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "color-mix(in srgb, #059669 10%, #fff)",
            color: "#047857",
            fontWeight: 700,
          }}
        >
          {success}
        </div>
      ) : null}

      <section style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Active leaderboard metrics</h2>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>
            These metrics appear in rep scoring guides and rank calculations.
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            border: "1px solid var(--border)",
            borderRadius: 16,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {activeMetrics.length === 0 ? (
            <div style={{ padding: 20, color: "var(--muted)", fontWeight: 700 }}>No active metrics configured.</div>
          ) : (
            activeMetrics.map((metric) => (
              <MetricRow
                key={metric.key}
                metric={metric}
                mode="active"
                disabled={saving}
                onPointsChange={(points) => updateActiveMetric(metric.key, (row) => ({ ...row, points }))}
                onRemove={() => removeMetric(metric.key)}
              />
            ))
          )}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Available metrics</h2>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>
            Captured by the platform today or planned — add when you want them on the board.
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            border: "1px solid var(--border)",
            borderRadius: 16,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {availableMetrics.length === 0 ? (
            <div style={{ padding: 20, color: "var(--muted)", fontWeight: 700 }}>All catalog metrics are active.</div>
          ) : (
            availableMetrics.map((metric) => (
              <MetricRow
                key={metric.key}
                metric={metric}
                mode="available"
                disabled={saving}
                onAdd={() => addMetric(metric.key)}
              />
            ))
          )}
        </div>
      </section>
    </main>
  );
}
