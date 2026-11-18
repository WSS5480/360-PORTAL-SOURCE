import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { buildRelationshipStrategySummary } from "@/lib/surgical-sales/buildRelationshipStrategySummary";
import { buildObservationAccessBriefingBullets } from "@/lib/surgical-sales/providerObservationReadiness";

const SCAN_MAX = 110;

export type PrepareKnownIntelligenceBullet = {
  key: string;
  label: string;
  value: string;
};

export type PrepareLastKeyInsight = {
  body: string;
  at_label: string;
  source_label: string;
  href: string | null;
};

export type PrepareKnownIntelligence = {
  bullets: PrepareKnownIntelligenceBullet[];
  last_key_insight: PrepareLastKeyInsight | null;
};

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

/** First line only, capped — no paragraph blocks in prepare UI. */
export function toScannableIntelligenceLine(text: string, max = SCAN_MAX): string {
  const line = text
    .split(/\r?\n/)
    .map((s) => s.replace(/^[-*•]\s*/, "").trim())
    .find((s) => s.length > 0);
  const t = (line ?? text).trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatInsightAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function buildPrepareKnownIntelligence(input: {
  provider: Record<string, unknown>;
  snapshot: ProviderIntelligenceSnapshot;
  providerTimeline?: Array<{
    id: string;
    at?: string | null;
    title?: string;
    body?: string;
    href?: string | null;
  }>;
  engagementActivities?: Array<{
    id: string;
    at?: string | null;
    title?: string;
    body?: string;
  }>;
}): PrepareKnownIntelligence {
  const { provider, snapshot: snap } = input;
  const bullets: PrepareKnownIntelligenceBullet[] = [];

  for (const accessBullet of buildObservationAccessBriefingBullets(provider)) {
    bullets.push(accessBullet);
  }

  const communication =
    snap.communication_style ||
    trimOrNull(provider.provider_communication_style) ||
    trimOrNull(provider.personality_notes);
  if (communication) {
    bullets.push({
      key: "communication",
      label: "Communication style",
      value: toScannableIntelligenceLine(communication),
    });
  }

  const productInterests =
    snap.product_interests ||
    snap.product_preferences ||
    trimOrNull(provider.provider_product_interests);
  if (productInterests) {
    bullets.push({
      key: "product_interests",
      label: "Product interests",
      value: toScannableIntelligenceLine(productInterests),
    });
  }

  const competitors = snap.competitive_products || trimOrNull(provider.provider_competitive_products);
  const vendors = snap.current_vendors || trimOrNull(provider.provider_current_vendors);
  if (competitors || vendors) {
    const parts = [
      competitors ? `Competitive: ${toScannableIntelligenceLine(competitors, 72)}` : null,
      vendors ? `Current: ${toScannableIntelligenceLine(vendors, 72)}` : null,
    ].filter((p): p is string => Boolean(p));
    bullets.push({
      key: "competitor_usage",
      label: "Competitor usage",
      value: parts.join(" · "),
    });
  }

  const relationship =
    snap.relationship_summary ||
    buildRelationshipStrategySummary(provider) ||
    trimOrNull(provider.provider_rep_strategy_notes);
  if (relationship) {
    bullets.push({
      key: "relationship_strategy",
      label: "Relationship strategy",
      value: toScannableIntelligenceLine(relationship),
    });
  }

  const proceduralParts = [
    snap.procedures || trimOrNull(provider.provider_procedure_focus),
    snap.technique_preferences || trimOrNull(provider.provider_technique_preferences),
  ].filter((p): p is string => Boolean(p));
  if (proceduralParts.length > 0) {
    bullets.push({
      key: "procedural_preferences",
      label: "Procedural preferences",
      value: toScannableIntelligenceLine(proceduralParts.join(" · ")),
    });
  }

  const orDynamics =
    snap.or_team_dynamics || trimOrNull(provider.provider_or_team_dynamics);
  if (orDynamics) {
    bullets.push({
      key: "or_dynamics",
      label: "OR dynamics",
      value: toScannableIntelligenceLine(orDynamics),
    });
  }

  const last_key_insight = pickLastKeyInsight(input);

  return { bullets, last_key_insight };
}

function pickLastKeyInsight(input: {
  provider: Record<string, unknown>;
  snapshot: ProviderIntelligenceSnapshot;
  providerTimeline?: Array<{
    id: string;
    at?: string | null;
    title?: string;
    body?: string;
    href?: string | null;
  }>;
  engagementActivities?: Array<{
    id: string;
    at?: string | null;
    title?: string;
    body?: string;
  }>;
}): PrepareLastKeyInsight | null {
  type Candidate = {
    at: string;
    body: string;
    source_label: string;
    href: string | null;
    sort: number;
  };

  const candidates: Candidate[] = [];

  for (const a of input.providerTimeline ?? []) {
    const body = trimOrNull(a.body);
    const at = trimOrNull(a.at);
    if (!body || !at) continue;
    candidates.push({
      at,
      body,
      source_label: String(a.title || "Provider activity"),
      href: a.href ? String(a.href) : null,
      sort: new Date(at).getTime(),
    });
  }

  for (const a of input.engagementActivities ?? []) {
    const body = trimOrNull(a.body);
    const at = trimOrNull(a.at);
    if (!body || !at) continue;
    candidates.push({
      at,
      body,
      source_label: String(a.title || "Engagement"),
      href: null,
      sort: new Date(at).getTime(),
    });
  }

  candidates.sort((a, b) => b.sort - a.sort);
  const best = candidates[0];
  if (best) {
    return {
      body: toScannableIntelligenceLine(best.body, 140),
      at_label: formatInsightAt(best.at),
      source_label: best.source_label,
      href: best.href,
    };
  }

  const profileNote =
    trimOrNull(input.provider.personality_notes) ||
    trimOrNull(input.provider.provider_rep_strategy_notes);
  if (profileNote) {
    return {
      body: toScannableIntelligenceLine(profileNote, 140),
      at_label: "",
      source_label: "Profile note",
      href: `/portal/sales/providers/${encodeURIComponent(input.snapshot.provider_id)}?tab=intelligence`,
    };
  }

  return null;
}
