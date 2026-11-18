"use client";

import Link from "next/link";
import React from "react";
import { SalesPanel, sc } from "@/components/sales/salesCommandUi";
import { SURGICAL_CONTACT_NOTES_PHI_NOTICE } from "@/lib/surgical-sales/labels";
import { SURGICAL_CONTACT_PREFERRED_METHODS } from "@/lib/surgical-sales/contactConstants";
import { userFacingError } from "@/lib/errors/userFacingError";

type Contact = Record<string, unknown>;

const field: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: 9,
  border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
  fontSize: 13,
  background: "var(--surface)",
  color: "var(--foreground)",
};

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ContactSalesIntelligencePanel({
  contactId,
  contact,
  apiPrefix,
  tasksHref,
  appearance = "portal",
  onUpdated,
  autoFocusQuickNote,
  embedded = false,
  panelTitle = "Sales intelligence",
  onMarkContactedRef,
}: {
  contactId: string;
  contact: Contact;
  apiPrefix: string;
  tasksHref?: string | null;
  appearance?: "portal" | "admin";
  onUpdated: () => void;
  autoFocusQuickNote?: boolean;
  embedded?: boolean;
  panelTitle?: string;
  onMarkContactedRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const [preferred, setPreferred] = React.useState(String(contact.preferred_contact_method ?? "unknown"));
  const [bestTime, setBestTime] = React.useState(String(contact.best_time_to_contact ?? ""));
  const [accessNotes, setAccessNotes] = React.useState(String(contact.access_notes ?? ""));
  const [personalityNotes, setPersonalityNotes] = React.useState(String(contact.personality_notes ?? ""));
  const [doNotContact, setDoNotContact] = React.useState(Boolean(contact.do_not_contact));
  const [nextFollowUp, setNextFollowUp] = React.useState(toDatetimeLocalValue(contact.next_follow_up_at as string | undefined));
  const [quickNote, setQuickNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const quickNoteRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!autoFocusQuickNote) return;
    quickNoteRef.current?.focus();
  }, [autoFocusQuickNote]);

  React.useEffect(() => {
    setPreferred(String(contact.preferred_contact_method ?? "unknown"));
    setBestTime(String(contact.best_time_to_contact ?? ""));
    setAccessNotes(String(contact.access_notes ?? ""));
    setPersonalityNotes(String(contact.personality_notes ?? ""));
    setDoNotContact(Boolean(contact.do_not_contact));
    setNextFollowUp(toDatetimeLocalValue(contact.next_follow_up_at as string | undefined));
  }, [contact]);

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${apiPrefix}/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Save failed");
      onUpdated();
      setMsg("Saved.");
      return true;
    } catch (e: unknown) {
      setMsg(userFacingError(e, "We could not save your changes. Please try again."));
      return false;
    } finally {
      setSaving(false);
    }
  }

  const markContactedNow = () => {
    void patch({ last_contacted_at: new Date().toISOString() });
  };

  React.useEffect(() => {
    if (onMarkContactedRef) {
      onMarkContactedRef.current = markContactedNow;
    }
  });

  const lastAt = contact.last_contacted_at ? new Date(String(contact.last_contacted_at)).toLocaleString() : "Not logged";
  const hintColor = appearance === "admin" ? "#64748b" : "var(--muted)";
  const compact = embedded;

  const content = (
    <>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: hintColor,
          marginTop: 0,
          marginBottom: compact ? 8 : 10,
          lineHeight: 1.45,
        }}
      >
        {SURGICAL_CONTACT_NOTES_PHI_NOTICE}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "repeat(auto-fit, minmax(160px, 1fr))" : "repeat(auto-fit, minmax(220px, 1fr))",
          gap: compact ? 8 : 10,
        }}
      >
        <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 700 }}>
          Preferred contact method
          <select value={preferred} onChange={(e) => setPreferred(e.target.value)} style={field} disabled={saving}>
            {SURGICAL_CONTACT_PREFERRED_METHODS.map((m) => (
              <option key={m} value={m}>
                {m === "in_person" ? "In person" : m.charAt(0).toUpperCase() + m.slice(1).replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 700 }}>
          Best time to contact
          <input
            value={bestTime}
            onChange={(e) => setBestTime(e.target.value)}
            placeholder="e.g. weekday mornings"
            style={field}
            disabled={saving}
          />
        </label>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: hintColor, marginBottom: 4 }}>Last contact</div>
          <div style={{ fontSize: 13 }}>{lastAt}</div>
          {!embedded ? (
            <button type="button" style={{ ...sc.btnSecondary, marginTop: 6, fontSize: 12, padding: "6px 10px" }} disabled={saving} onClick={markContactedNow}>
              Mark contacted now
            </button>
          ) : null}
        </div>
        <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 700 }}>
          Next follow-up
          <input
            type="datetime-local"
            value={nextFollowUp}
            onChange={(e) => setNextFollowUp(e.target.value)}
            style={field}
            disabled={saving}
          />
        </label>
      </div>

      <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 12, fontWeight: 700 }}>
        <input type="checkbox" checked={doNotContact} onChange={(e) => setDoNotContact(e.target.checked)} disabled={saving} />
        Do not contact
      </label>

      {tasksHref ? (
        <p style={{ fontSize: 11, fontWeight: 600, color: hintColor, margin: "6px 0 0" }}>
          Opportunity tasks with due dates live in{" "}
          <Link href={tasksHref} style={sc.linkBrand}>
            My tasks
          </Link>
          .
        </p>
      ) : null}

      <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 700, marginTop: 10 }}>
        Access notes
        <textarea
          value={accessNotes}
          onChange={(e) => setAccessNotes(e.target.value)}
          rows={compact ? 2 : 3}
          style={{ ...field, resize: "vertical" }}
          disabled={saving}
        />
      </label>

      <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 700, marginTop: 8 }}>
        Relationship notes
        <textarea
          value={personalityNotes}
          onChange={(e) => setPersonalityNotes(e.target.value)}
          rows={compact ? 2 : 3}
          style={{ ...field, resize: "vertical" }}
          disabled={saving}
        />
      </label>

      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Quick log line</summary>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
          <input
            ref={quickNoteRef}
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            placeholder="Append to access notes…"
            style={{ ...field, flex: "1 1 180px" }}
            disabled={saving}
          />
          <button
            type="button"
            style={sc.btnGhost}
            disabled={saving || !quickNote.trim()}
            onClick={() => {
              const line = `[${new Date().toLocaleString()}] ${quickNote.trim()}`;
              const next = accessNotes.trim() ? `${accessNotes.trim()}\n${line}` : line;
              void patch({ access_notes: next }).then((ok) => {
                if (ok) setQuickNote("");
              });
            }}
          >
            Append
          </button>
        </div>
      </details>

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          style={{ ...sc.btnPrimary, fontSize: 13, padding: "8px 14px" }}
          disabled={saving}
          onClick={() => {
            let nextIso: string | null = null;
            if (nextFollowUp.trim()) {
              const d = new Date(nextFollowUp);
              if (Number.isNaN(d.getTime())) {
                setMsg("Invalid follow-up date.");
                return;
              }
              nextIso = d.toISOString();
            }
            void patch({
              preferred_contact_method: preferred,
              best_time_to_contact: bestTime.trim() || null,
              access_notes: accessNotes.trim() || null,
              personality_notes: personalityNotes.trim() || null,
              do_not_contact: doNotContact,
              next_follow_up_at: nextIso,
            });
          }}
        >
          {saving ? "Saving…" : "Save access intelligence"}
        </button>
        {msg ? (
          <span style={{ fontSize: 12, color: msg === "Saved." ? "var(--brand-700)" : "var(--danger)" }}>{msg}</span>
        ) : null}
      </div>
    </>
  );

  if (embedded) {
    return <div className="contact-access-intel">{content}</div>;
  }

  const panelDesc =
    appearance === "admin"
      ? "Outreach preferences and rep-maintained notes."
      : "How to reach this person, access dynamics, and follow-up.";

  return (
    <SalesPanel title={panelTitle} description={panelDesc}>
      {content}
    </SalesPanel>
  );
}
