import {
  compareActivityEventsNewestFirst,
  sortActivityEventsNewestFirst,
  type ActivityEvent,
  type ActivityEntityType,
} from "@/lib/activity/activityEvent";
import type { ActivityEventType } from "@/lib/activity/activityEventTypes";

export type ActivityFeedFilter = {
  entityType?: ActivityEntityType;
  entityId?: string;
  types?: ActivityEventType[];
  tags?: string[];
  aiGeneratedOnly?: boolean;
  workflowStage?: string;
};

export function filterActivityEvents(
  events: ActivityEvent[],
  filter: ActivityFeedFilter,
): ActivityEvent[] {
  return events.filter((event) => {
    if (filter.entityType && event.entityType !== filter.entityType) return false;
    if (filter.entityId && event.entityId !== filter.entityId) {
      const relatedMatch = event.relatedEntities.some((r) => r.entityId === filter.entityId);
      if (!relatedMatch) return false;
    }
    if (filter.types?.length && !filter.types.includes(event.type)) return false;
    if (filter.aiGeneratedOnly && !event.aiGenerated) return false;
    if (filter.workflowStage && event.workflowStage !== filter.workflowStage) return false;
    if (filter.tags?.length) {
      const hasTag = filter.tags.some((t) => event.tags.includes(t));
      if (!hasTag) return false;
    }
    return true;
  });
}

export function mergeActivityFeeds(...feeds: ActivityEvent[][]): ActivityEvent[] {
  const byId = new Map<string, ActivityEvent>();
  for (const feed of feeds) {
    for (const event of feed) {
      byId.set(event.id, event);
    }
  }
  return sortActivityEventsNewestFirst([...byId.values()]);
}

export function paginateActivityEvents(
  events: ActivityEvent[],
  options: { limit: number; offset?: number },
): ActivityEvent[] {
  const sorted = sortActivityEventsNewestFirst(events);
  const offset = options.offset ?? 0;
  return sorted.slice(offset, offset + options.limit);
}

export { compareActivityEventsNewestFirst, sortActivityEventsNewestFirst };
