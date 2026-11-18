"use client";

import React from "react";
import { PortalEmptyState } from "@/components/sales/PortalEmptyState";
import { SalesPanel, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import { SURGICAL_PHI_UI_NOTICE } from "@/lib/surgical-sales/labels";
import type { OrgStatusNote } from "@/lib/surgical-sales/buildOrganizationActivityFeed";
import { readResponseJson } from "@/lib/utils/readResponseJson";

export function OrganizationNotesPanel({
  accountId,
  notes,
  standingNotes,
  archived,
  narrow,
  onSaved,
  onEditStandingNotes,
}: {
  accountId: string;
  notes: OrgStatusNote[];
  standingNotes: string;
  archived?: boolean;
  narrow?: boolean;
  onSaved: () => Promise<void> | void;
  onEditStandingNotes?: () => void;
}) {
  const [body, setBody] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed || saving || archived) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/sales/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: "organization",
          entity_id: accountId,
          body: trimmed,
          note_type: "general",
          tags: ["status_update"],
        }),
      });
      const json = await readResponseJson<{ ok?: boolean; error?: unknown }>(res);
      if (!res.ok || !json.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Could not save note");
      }
      setBody("");
      await onSaved();
    } catch (e: unknown) {
      setError(userFacingError(e, "Could not save note"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <SalesPanel
        density="compact"
        nativeFlat={narrow}
        title="Organization notes"
        description="Status updates for this facility — separate from case notes and provider intelligence."
      >
        {archived && notes.length > 0 ? (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--muted)", fontWeight: 650 }}>
            Restore this organization before adding notes.
          </p>
        ) : null}
        {!archived ? (
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={narrow ? 4 : 5}
              disabled={saving}
              placeholder="Add a status update…"
              aria-label="Organization note"
              style={{ ...sc.input, resize: "vertical", fontSize: 14 }}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", fontWeight: 600, lineHeight: 1.35 }}>
              {SURGICAL_PHI_UI_NOTICE}
            </p>
            {error ? <div style={sc.alertError}>{error}</div> : null}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                style={{
                  ...(body.trim() ? sc.btnPrimary : sc.btnSecondary),
                  minHeight: 44,
                  padding: "10px 16px",
                }}
                disabled={saving || !body.trim()}
                onClick={() => void submit()}
              >
                {saving ? "Saving…" : "Add note"}
              </button>
            </div>
          </div>
        ) : null}

        {notes.length === 0 ? (
          archived ? (
            <PortalEmptyState
              compact
              icon="📝"
              title="No organization notes yet"
              description="Restore this organization to add status updates."
            />
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontWeight: 650, lineHeight: 1.45 }}>
              Nothing logged yet. Case and provider notes stay on their own records and still show up under Activity.
            </p>
          )
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {notes.map((note) => (
              <article
                key={note.id}
                style={{
                  borderRadius: 14,
                  border: "1px solid var(--crm-card-edge, color-mix(in srgb, var(--foreground) 9%, var(--border)))",
                  background: "var(--crm-surface-elevated, var(--surface))",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {note.body}
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)", fontWeight: 700, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span>{new Date(note.created_at).toLocaleString()}</span>
                  <span>·</span>
                  <span>{note.actor_display_name === "—" ? "Actor not recorded" : note.actor_display_name}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </SalesPanel>

      {standingNotes ? (
        <SalesPanel
          density="compact"
          nativeFlat={narrow}
          title="Standing notes"
          description="Profile notes on the organization record. Intelligence from provider captures can land here."
        >
          <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{standingNotes}</div>
          {onEditStandingNotes ? (
            <button type="button" style={{ ...sc.btnGhost, marginTop: 10 }} onClick={onEditStandingNotes}>
              Edit standing notes
            </button>
          ) : null}
        </SalesPanel>
      ) : null}
    </div>
  );
}
