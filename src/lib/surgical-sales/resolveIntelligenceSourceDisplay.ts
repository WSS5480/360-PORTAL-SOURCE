/**
 * Display-only source typing for Provider Intelligence timeline and evidence.
 * Does not affect extraction, save, or stage-gate logic.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { IntelligenceFieldAttribution } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { formatIntelligenceTimelineWhen } from "@/lib/surgical-sales/buildProviderIntelligenceTimeline";

export type ProviderIntelligenceSourceDisplayType =
  | "field_note"
  | "intro_call"
  | "debrief"
  | "observation"
  | "evaluation"
  | "product_case"
  | "general_note";

export const PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS: Record<
  ProviderIntelligenceSourceDisplayType,
  string
> = {
  field_note: "Field Note",
  intro_call: "Intro Call",
  debrief: "Debrief",
  observation: "Observation",
  evaluation: "Evaluation",
  product_case: "Product Case",
  general_note: "General Note",
};

const EVALUATION_ENGAGEMENT_TYPES = new Set([
  "evaluation_planning",
  "evaluation_follow_up",
  "evaluation_discussion",
  "peer_discussion",
]);

const FIELD_NOTE_SOURCE_TYPES = new Set(["ai_capture", "promote"]);

const FIELD_NOTE_SOURCE_LABEL_RE =
  /quick\s*capture|mission\s*board\s*field\s*note|log\s*update|field\s*note|review\s*update/i;

function parseIso(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const d = new Date(text.includes("T") ? text : `${text}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formatIntelligenceSourceDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function engagementById(
  engagements: ProviderEngagementSummary[] | undefined,
  engagementId: string | null | undefined,
): ProviderEngagementSummary | null {
  const id = String(engagementId ?? "").trim();
  if (!id) return null;
  return (engagements ?? []).find((e) => String(e.id) === id) ?? null;
}

function sourceTypeFromEngagementType(
  engagementType: string | null | undefined,
  debriefCompleted?: boolean,
): ProviderIntelligenceSourceDisplayType {
  const type = normalizeEngagementType(String(engagementType ?? ""));
  if (type === "intro_call") return "intro_call";
  if (type === "provider_debrief" || debriefCompleted) return "debrief";
  if (EVALUATION_ENGAGEMENT_TYPES.has(type)) return "evaluation";
  return "general_note";
}

function sourceTypeFromCaseType(caseType: string | null | undefined): ProviderIntelligenceSourceDisplayType {
  const normalized = String(caseType ?? "").trim().toLowerCase();
  if (normalized === "observation") return "observation";
  if (normalized === "product_support") return "product_case";
  return "general_note";
}

/**
 * Resolve how a saved intelligence field should be labeled in the UI.
 * Quick Capture / Review Updates → Field Note even when an intro_call engagement exists on file.
 */
export function resolveIntelligenceSourceDisplay(input: {
  meta?: IntelligenceFieldAttribution | null;
  engagements?: ProviderEngagementSummary[];
  caseType?: string | null;
  providerId?: string;
}): {
  sourceType: ProviderIntelligenceSourceDisplayType;
  sourceTypeLabel: string;
  sourceDate: string | null;
  sourceDateLabel: string;
  sourceRelativeLabel: string;
  href: string | null;
} {
  const meta = input.meta ?? undefined;
  const linkedEngagement = engagementById(input.engagements, meta?.source_engagement_id);
  const sourceDate =
    parseIso(meta?.validated_at) ??
    parseIso(meta?.updated_at) ??
    parseIso(linkedEngagement?.debrief_completed_at) ??
    parseIso(linkedEngagement?.updated_at) ??
    parseIso(linkedEngagement?.scheduled_at ?? linkedEngagement?.engagement_date) ??
    null;

  const fallback = {
    sourceType: "field_note" as const,
    sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS.field_note,
    sourceDate,
    sourceDateLabel: formatIntelligenceSourceDate(sourceDate),
    sourceRelativeLabel: sourceDate ? formatIntelligenceTimelineWhen(sourceDate) : "—",
    href: input.providerId
      ? `/portal/sales/providers/${encodeURIComponent(input.providerId)}?tab=activity`
      : null,
  };

  if (!meta) return fallback;

  if (meta.source_case_id) {
    const sourceType = sourceTypeFromCaseType(input.caseType);
    return {
      sourceType,
      sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS[sourceType],
      sourceDate,
      sourceDateLabel: formatIntelligenceSourceDate(sourceDate),
      sourceRelativeLabel: sourceDate ? formatIntelligenceTimelineWhen(sourceDate) : "—",
      href: `/portal/sales/cases/${encodeURIComponent(meta.source_case_id)}`,
    };
  }

  if (meta.source_type === "observation") {
    return {
      ...fallback,
      sourceType: "observation",
      sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS.observation,
      href: meta.source_case_id
        ? `/portal/sales/cases/${encodeURIComponent(meta.source_case_id)}`
        : fallback.href,
    };
  }

  if (meta.source_type === "case") {
    const sourceType = sourceTypeFromCaseType(input.caseType);
    return {
      ...fallback,
      sourceType,
      sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS[sourceType],
      href: meta.source_case_id
        ? `/portal/sales/cases/${encodeURIComponent(meta.source_case_id)}`
        : fallback.href,
    };
  }

  if (FIELD_NOTE_SOURCE_TYPES.has(meta.source_type)) {
    return fallback;
  }

  if (meta.source_engagement_id && linkedEngagement) {
    const sourceType = sourceTypeFromEngagementType(
      linkedEngagement.engagement_type,
      linkedEngagement.debrief_completed,
    );
    const engagementId = String(linkedEngagement.id);
    const href =
      sourceType === "debrief"
        ? `/portal/sales/engagements/${encodeURIComponent(engagementId)}/debrief`
        : `/portal/sales/engagements/${encodeURIComponent(engagementId)}`;
    return {
      sourceType,
      sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS[sourceType],
      sourceDate,
      sourceDateLabel: formatIntelligenceSourceDate(sourceDate),
      sourceRelativeLabel: sourceDate ? formatIntelligenceTimelineWhen(sourceDate) : "—",
      href,
    };
  }

  if (meta.source_type === "intro_call") {
    return {
      ...fallback,
      sourceType: "intro_call",
      sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS.intro_call,
      href: meta.source_engagement_id
        ? `/portal/sales/engagements/${encodeURIComponent(meta.source_engagement_id)}`
        : fallback.href,
    };
  }

  if (meta.source_type === "engagement") {
    if (linkedEngagement) {
      const sourceType = sourceTypeFromEngagementType(
        linkedEngagement.engagement_type,
        linkedEngagement.debrief_completed,
      );
      return {
        sourceType,
        sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS[sourceType],
        sourceDate,
        sourceDateLabel: formatIntelligenceSourceDate(sourceDate),
        sourceRelativeLabel: sourceDate ? formatIntelligenceTimelineWhen(sourceDate) : "—",
        href: meta.source_engagement_id
          ? `/portal/sales/engagements/${encodeURIComponent(meta.source_engagement_id)}`
          : fallback.href,
      };
    }
    if (FIELD_NOTE_SOURCE_LABEL_RE.test(meta.source_label ?? "")) {
      return fallback;
    }
  }

  const label = String(meta.source_label ?? "").trim();
  if (/debrief/i.test(label) && meta.source_engagement_id) {
    return {
      ...fallback,
      sourceType: "debrief",
      sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS.debrief,
      href: `/portal/sales/engagements/${encodeURIComponent(meta.source_engagement_id)}/debrief`,
    };
  }

  if (/intro\s*call/i.test(label)) {
    return {
      ...fallback,
      sourceType: "intro_call",
      sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS.intro_call,
      href: meta.source_engagement_id
        ? `/portal/sales/engagements/${encodeURIComponent(meta.source_engagement_id)}`
        : fallback.href,
    };
  }

  if (FIELD_NOTE_SOURCE_LABEL_RE.test(label)) {
    return fallback;
  }

  return fallback;
}

export function resolveActivityTimelineSourceDisplay(input: {
  activityType?: string | null;
  activityKind?: string | null;
  category?: string | null;
  engagementType?: string | null;
  caseType?: string | null;
  metadata?: Record<string, unknown> | null;
}): {
  sourceType: ProviderIntelligenceSourceDisplayType;
  sourceTypeLabel: string;
  sourceTitle: string;
} {
  const rawType = String(input.activityType ?? "").trim().toLowerCase();
  const kind = String(input.activityKind ?? "").trim().toLowerCase();

  if (kind === "case_activity" || input.caseType) {
    const caseSource = sourceTypeFromCaseType(input.caseType);
    if (caseSource !== "general_note") {
      return {
        sourceType: caseSource,
        sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS[caseSource],
        sourceTitle:
          caseSource === "observation" ? "Observation note" : "Product case note",
      };
    }
  }

  if (input.engagementType) {
    const sourceType = sourceTypeFromEngagementType(input.engagementType);
    if (sourceType !== "general_note") {
      return {
        sourceType,
        sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS[sourceType],
        sourceTitle: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS[sourceType],
      };
    }
  }

  if (
    rawType === "ai_note_capture" ||
    rawType === "note_added" ||
    rawType === "clinical_discovery_updated" ||
    input.category === "discovery"
  ) {
    const launchSurface = String(input.metadata?.launch_surface ?? "").trim();
    const sourceTitle =
      launchSurface === "mission_board"
        ? "Mission Board field note"
        : rawType === "clinical_discovery_updated" || input.category === "discovery"
          ? "Review update"
          : "Quick Capture";
    return {
      sourceType: "field_note",
      sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS.field_note,
      sourceTitle,
    };
  }

  if (rawType === "provider_updated" || rawType === "outcome_update") {
    return {
      sourceType: "general_note",
      sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS.general_note,
      sourceTitle: "Provider update",
    };
  }

  return {
    sourceType: "field_note",
    sourceTypeLabel: PROVIDER_INTELLIGENCE_SOURCE_DISPLAY_LABELS.field_note,
    sourceTitle: "Field note",
  };
}
