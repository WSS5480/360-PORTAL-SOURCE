"use client";

import React from "react";
import { UnifiedActivityFeed } from "@/components/sales/UnifiedActivityFeed";
import { useUnifiedActivityFeed } from "@/hooks/useUnifiedActivityFeed";
import {
  legacyProviderTimelineToFeedItem,
  type UnifiedActivityFeedFilterId,
  type UnifiedActivityFeedItem,
} from "@/lib/activity/activityFeedPresentation";
import { SURGICAL_CONTACT_NOTES_PHI_NOTICE } from "@/lib/surgical-sales/labels";
import { userFacingError } from "@/lib/errors/userFacingError";

export function ProviderProfileActivityFeed({
  providerId,
  provider,
  timeline,
  onReload,
  noteFocus: _noteFocus,
}: {
  providerId: string;
  provider: Record<string, unknown>;
  timeline: Array<Record<string, unknown>>;
  onReload: () => void;
  noteFocus: boolean;
}) {
  void _noteFocus;
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [outreachOpen, setOutreachOpen] = React.useState(false);
  const [activityFilter, setActivityFilter] = React.useState<UnifiedActivityFeedFilterId>("all");
  const contactNotes = String(provider.notes || "").trim();
  const accessNotes = String(provider.access_notes || "").trim();

  const buildLegacyFallback = React.useCallback((): UnifiedActivityFeedItem[] => {
    const items: UnifiedActivityFeedItem[] = [];
    if (contactNotes) {
      items.push({
        id: "legacy-contact-notes",
        category: "notes",
        title: "Contact notes",
        summary: contactNotes,
        timestamp: String(provider.updated_at || provider.created_at || new Date().toISOString()),
        userLabel: "Contact record",
        isLegacyFallback: true,
      });
    }
    for (const entry of timeline) {
      const mapped = legacyProviderTimelineToFeedItem(entry);
      if (mapped) items.push(mapped);
    }
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [contactNotes, timeline, provider.updated_at, provider.created_at]);

  const timelineKey = timeline.map((e) => `${e.kind}-${e.id}-${e.at}`).join("|");
  const { items, loading, reload } = useUnifiedActivityFeed({
    entityType: "provider",
    entityId: providerId,
    buildLegacyFallback,
    refreshKey: timelineKey,
  });

  async function appendQuickNote(body: string) {
    const line = body.trim();
    if (!line) return;
    setSaving(true);
    setMsg(null);
    try {
      const stamp = `[${new Date().toLocaleString()}] ${line}`;
      const next = accessNotes ? `${accessNotes}\n${stamp}` : stamp;
      const res = await fetch(`/api/portal/sales/surgical-contacts/${encodeURIComponent(providerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_notes: next }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "");
      onReload();
      void reload();
      setMsg("Note added");
    } catch (e: unknown) {
      setMsg(userFacingError(e, "We could not save your changes. Please try again."));
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function deleteActivityItem(item: UnifiedActivityFeedItem) {
    const res = await fetch(
      `/api/portal/sales/activity-events/${encodeURIComponent(item.id)}?entityType=provider&entityId=${encodeURIComponent(providerId)}`,
      { method: "DELETE" },
    );
    const j = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !j.ok) throw new Error(j.error || "");
    onReload();
    void reload();
    setMsg("Note deleted");
  }

  return (
    <section className="provider-activity-feed">
      <UnifiedActivityFeed
        items={items}
        loading={loading}
        activityFilter={activityFilter}
        onFilterChange={setActivityFilter}
        totalCount={items.length}
        disabled={saving}
        busy={saving}
        onSaveNote={appendQuickNote}
        onDeleteItem={deleteActivityItem}
        notePlaceholder="Quick note…"
        headerExtra={
          <>
            <p className="provider-activity-phi" style={{ margin: 0, fontSize: 11 }}>
              {SURGICAL_CONTACT_NOTES_PHI_NOTICE}
            </p>
            {msg ? <p className="provider-activity-msg">{msg}</p> : null}
            <button
              type="button"
              className="provider-activity-outreach-toggle"
              aria-expanded={outreachOpen}
              onClick={() => setOutreachOpen((o) => !o)}
            >
              Outreach & follow-up {outreachOpen ? "▾" : "▸"}
            </button>
            {outreachOpen ? (
              <div className="provider-activity-outreach">
                <p className="provider-accordion-readonly-line">
                  <span>Last contacted</span>{" "}
                  {provider.last_contacted_at
                    ? new Date(String(provider.last_contacted_at)).toLocaleString()
                    : "—"}
                </p>
                <p className="provider-accordion-readonly-line">
                  <span>Next follow-up</span>{" "}
                  {provider.next_follow_up_at
                    ? new Date(String(provider.next_follow_up_at)).toLocaleString()
                    : "—"}
                </p>
                {accessNotes ? (
                  <p className="provider-activity-access-notes">{accessNotes}</p>
                ) : (
                  <p className="provider-at-a-glance-empty">No access notes yet.</p>
                )}
              </div>
            ) : null}
          </>
        }
      />
    </section>
  );
}
