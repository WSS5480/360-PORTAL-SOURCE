import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import type { PrepareKnownIntelligenceBullet } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import type { PrepareRecentActivityRow } from "@/lib/surgical-sales/engagements/prepareForMeetingRecentActivity";

export type PrepareProviderContextBlock = {
  id: string;
  label: string;
  value: string | null;
  href?: string | null;
};

export type PrepareProviderContextView = {
  blocks: PrepareProviderContextBlock[];
  recentActivity: PrepareRecentActivityRow[];
  recentActivityProfileHref: string | null;
  hasAnyContent: boolean;
};

const CONTACT_BULLET_KEYS = new Set(["communication", "relationship_strategy"]);
const CONTACT_PATTERN = /coordinator|contact|scheduling owner|office manager|gatekeeper/i;

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function formatLastEngagement(snapshot: PrepareForMeetingView["provider_snapshot"]): {
  value: string | null;
  href: string | null;
} {
  const title = trimOrNull(snapshot.last_engagement_title);
  const date = trimOrNull(snapshot.last_engagement_date_label);
  if (!title && !date) return { value: null, href: null };
  const value = title && date ? `${title} · ${date}` : title ?? date;
  return { value, href: snapshot.last_engagement_href };
}

function intelligenceBulletsForContext(bullets: PrepareKnownIntelligenceBullet[]): string | null {
  const lines = bullets
    .filter(
      (b) =>
        !CONTACT_BULLET_KEYS.has(b.key) && !CONTACT_PATTERN.test(`${b.label} ${b.value}`),
    )
    .slice(0, 4)
    .map((b) => `${b.label}: ${b.value}`);

  return lines.length ? lines.join(" · ") : null;
}

export function buildPrepareProviderContext(
  data: Pick<
    PrepareForMeetingView,
    "provider_snapshot" | "upcoming_engagement" | "known_intelligence" | "recent_activity" | "provider_href"
  >,
): PrepareProviderContextView {
  const snapshot = data.provider_snapshot;
  const org =
    trimOrNull(snapshot.organization_name) ?? trimOrNull(data.upcoming_engagement.organization_name);
  const location = trimOrNull(snapshot.location_label);
  const organizationValue =
    org && location ? `${org} · ${location}` : org ?? location;

  const lastEng = formatLastEngagement(snapshot);

  const intelParts: string[] = [];
  const bulletLine = intelligenceBulletsForContext(data.known_intelligence.bullets);
  if (bulletLine) intelParts.push(bulletLine);
  const insight = data.known_intelligence.last_key_insight?.body?.trim();
  if (insight) {
    const meta = data.known_intelligence.last_key_insight;
    const suffix = meta?.at_label ? ` (${meta.at_label})` : "";
    intelParts.push(`Last insight${suffix}: ${insight}`);
  }

  const blocks: PrepareProviderContextBlock[] = [
    {
      id: "specialty",
      label: "Specialty",
      value: trimOrNull(snapshot.specialty),
    },
    {
      id: "organization",
      label: "Organization",
      value: organizationValue,
    },
    {
      id: "last_engagement",
      label: "Last engagement",
      value: lastEng.value,
      href: lastEng.href,
    },
    {
      id: "relevant_intelligence",
      label: "Relevant intelligence",
      value: intelParts.length ? intelParts.join(" · ") : null,
    },
    {
      id: "support_contacts",
      label: "Support contacts",
      value: trimOrNull(snapshot.support_contacts_summary),
    },
  ];

  const recentActivity = data.recent_activity.items.slice(0, 3);
  const hasAnyContent =
    blocks.some((b) => Boolean(b.value?.trim())) || recentActivity.length > 0;

  return {
    blocks,
    recentActivity,
    recentActivityProfileHref: data.provider_href,
    hasAnyContent,
  };
}
