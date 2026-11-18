"use client";

import { useCallback, useEffect, useState } from "react";

type LocRow = { id: string; name: string; created_at?: string };

const C = {
  borderSubtle: "rgba(0,0,0,0.08)",
  borderSoft: "rgba(0,0,0,0.10)",
  borderInput: "rgba(0,0,0,0.18)",
  bgSoft: "rgba(0,0,0,0.02)",
};

function inputStyle(): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: C.borderInput,
    fontWeight: 800,
    fontSize: 13,
    boxSizing: "border-box",
    minWidth: 0,
    background: "white",
  };
}

function btn(primary?: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: primary ? "#111" : "rgba(0,0,0,0.14)",
    background: primary ? "#111" : "white",
    color: primary ? "white" : "#111",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  };
}

export default function InventoryLocationsClient(props: { onChanged?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<LocRow[]>([]);
  const [newName, setNewName] = useState("");
  const [edits, setEdits] = useState<Record<string, { name: string }>>({});

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/inventory/locations", { method: "GET", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErr(data?.error || `Failed (${res.status})`);
        setRows([]);
        return;
      }
      const list = (data.locations ?? []) as LocRow[];
      setRows(list);
      const next: Record<string, { name: string }> = {};
      for (const r of list) {
        next[r.id] = { name: r.name };
      }
      setEdits(next);
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Network error");
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addLocation() {
    const name = newName.trim();
    if (!name) {
      setErr("Enter a location name.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/inventory/locations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErr(data?.error || `Failed (${res.status})`);
        return;
      }
      setNewName("");
      await load();
      props.onChanged?.();
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Network error");
    } finally {
      setBusy(false);
    }
  }

  async function saveRow(id: string) {
    const e = edits[id];
    if (!e) return;
    const name = e.name.trim();
    if (!name) {
      setErr("Location name cannot be empty.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/inventory/locations/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErr(data?.error || `Failed (${res.status})`);
        return;
      }
      await load();
      props.onChanged?.();
    } catch (e2: any) {
      setErr(e2?.message ? String(e2.message) : "Network error");
    } finally {
      setBusy(false);
    }
  }

  function onNameBlur(id: string, row: LocRow) {
    const e = edits[id];
    if (!e) return;
    const next = e.name.trim();
    if (next === row.name) return;
    void saveRow(id);
  }

  function onNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  }

  async function removeRow(id: string, name: string) {
    if (!window.confirm(`Delete location “${name}”? Only allowed if no lot rows use this bin name.`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/inventory/locations/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErr(data?.error || `Failed (${res.status})`);
        return;
      }
      await load();
      props.onChanged?.();
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {err ? (
        <div style={{ padding: 10, borderRadius: 12, background: "rgba(220,53,69,0.10)", fontWeight: 800, fontSize: 13 }}>
          {err}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New location name (e.g. Building A / Aisle 3)"
          style={{ ...inputStyle(), flex: "1 1 220px", maxWidth: 420 }}
          disabled={busy}
        />
        <button type="button" onClick={() => void addLocation()} disabled={busy} style={btn(true)}>
          Add location
        </button>
        <button type="button" onClick={() => void load()} disabled={busy} style={btn(false)}>
          Refresh
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.65 }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8, width: 100 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
                <td style={{ padding: 8 }}>
                  <input
                    value={edits[r.id]?.name ?? r.name}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [r.id]: { ...(prev[r.id] ?? { name: r.name }), name: e.target.value },
                      }))
                    }
                    onBlur={() => onNameBlur(r.id, r)}
                    onKeyDown={onNameKeyDown}
                    title="Renames save when you leave this field (or press Enter)"
                    style={{ ...inputStyle(), width: "100%", maxWidth: 360 }}
                    disabled={busy}
                  />
                </td>
                <td style={{ padding: 8 }}>
                  <button type="button" onClick={() => void removeRow(r.id, r.name)} disabled={busy} style={btn(false)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !busy ? (
              <tr>
                <td colSpan={2} style={{ padding: 12, opacity: 0.7 }}>
                  No locations yet. Add one above — use the same spelling when receiving so lots stay grouped.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
