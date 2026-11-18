"use client";

import type { ProviderOverviewFieldIntelFeedItem } from "@/lib/surgical-sales/buildProviderOverviewFieldIntelFeed";

const GROUP_ORDER: Array<NonNullable<ProviderOverviewFieldIntelFeedItem["timeGroup"]>> = [
  "today",
  "yesterday",
  "earlier",
];

const GROUP_LABEL: Record<NonNullable<ProviderOverviewFieldIntelFeedItem["timeGroup"]>, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
};

function groupItems(items: ProviderOverviewFieldIntelFeedItem[]) {
  const buckets = new Map<string, ProviderOverviewFieldIntelFeedItem[]>();
  for (const item of items) {
    const key = item.timeGroup ?? "earlier";
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }
  return GROUP_ORDER.filter((g) => buckets.has(g)).map((g) => ({
    group: g,
    label: GROUP_LABEL[g],
    items: buckets.get(g)!,
  }));
}

export function ProviderOverviewRecentFieldIntel({
  items,
}: {
  items: ProviderOverviewFieldIntelFeedItem[];
}) {
  if (items.length === 0) return null;
  const groups = groupItems(items);

  return (
    <section
      className="pov-main-section pov-main-section--activity pov-timeline pov-timeline-section"
      aria-label="Recent field intelligence"
      data-testid="pov-timeline"
    >
      <h2 className="pov-section-kicker">Recent activity</h2>
      <div className="pov-timeline__track">
        {groups.map((group) => (
          <div key={group.group} className="pov-timeline__group">
            <p className="pov-timeline__when">{group.label}</p>
            <ul className="pov-timeline__events">
              {group.items.map((item) => (
                <li key={item.id} className={`pov-timeline__event pov-timeline__event--${item.kind}`}>
                  <span className="pov-timeline__bullet" aria-hidden />
                  <span className="pov-timeline__text">{item.line}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
