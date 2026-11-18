"use client";

import React from "react";
import {
  activityEventsToFeedItems,
  type UnifiedActivityFeedItem,
} from "@/lib/activity/activityFeedPresentation";
import type { ActivityEvent } from "@/lib/activity/activityEvent";

type FeedSource = "unified" | "legacy" | "loading";

function feedItemDedupeKey(item: UnifiedActivityFeedItem): string {
  const pulseId = String(item.pulseId ?? "").trim();
  if (pulseId) return `pulse:${pulseId}`;
  return [
    item.category,
    item.eventType ?? "",
    item.timestamp,
    item.title.trim().toLowerCase(),
    item.summary.trim().toLowerCase().slice(0, 120),
  ].join("|");
}

function mergeUnifiedWithLegacyFallback(
  unified: UnifiedActivityFeedItem[],
  legacy: UnifiedActivityFeedItem[],
): UnifiedActivityFeedItem[] {
  const seen = new Set<string>();
  const merged: UnifiedActivityFeedItem[] = [];
  for (const item of [...unified, ...legacy]) {
    const key = feedItemDedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function useUnifiedActivityFeed(params: {
  entityType: "case" | "provider" | "opportunity" | "organization" | "engagement";
  entityId: string;
  /** Used when unified_activity_events has no rows for this entity yet. */
  buildLegacyFallback: () => UnifiedActivityFeedItem[];
  enabled?: boolean;
  refreshKey?: string | number;
}) {
  const { entityType, entityId, buildLegacyFallback, enabled = true, refreshKey = 0 } = params;
  const [items, setItems] = React.useState<UnifiedActivityFeedItem[]>([]);
  const [source, setSource] = React.useState<FeedSource>("loading");
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!enabled || !entityId) return;
    setError(null);
    setSource("loading");
    try {
      const qs = new URLSearchParams({ entityType, entityId });
      const res = await fetch(`/api/portal/sales/activity-events?${qs.toString()}`);
      const json = (await res.json()) as {
        ok?: boolean;
        events?: ActivityEvent[];
        unifiedCount?: number;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Could not load activity feed");
      }
      const unified = activityEventsToFeedItems(json.events || []);
      if (unified.length > 0) {
        setItems(mergeUnifiedWithLegacyFallback(unified, buildLegacyFallback()));
        setSource("unified");
      } else {
        setItems(buildLegacyFallback());
        setSource("legacy");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Load failed");
      setItems(buildLegacyFallback());
      setSource("legacy");
    }
  }, [enabled, entityId, entityType, buildLegacyFallback]);

  React.useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return { items, source, error, reload: load, loading: source === "loading" };
}
