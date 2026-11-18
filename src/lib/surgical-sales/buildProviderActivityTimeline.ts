/**
 * Provider Timeline — raw source activity history (not extracted intelligence).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { extractRawDebriefFromStoredNotes } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefRawNotes";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  formatIntelligenceSourceDate,
  resolveActivityTimelineSourceDisplay,
} from "@/lib/surgical-sales/resolveIntelligenceSourceDisplay";
import { formatIntelligenceTimelineWhen } from "@/lib/surgical-sales/buildProviderIntelligenceTimeline";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export type ProviderActivityTimelineItem = {
  id: string;
  occurredAt: string;
  whenLabel: string;
  sourceDateLabel: string;
  sourceTypeLabel: string;
  sourceTitle: string;
  preview: string;
  fullNote: string | null;
  createdBy: string | null;
  href: string | null;
};

const PREVIEW_LIMIT = 180;

const SKIP_PROVIDER_ACTIVITY_TYPES = new Set([
  "provider_created",
  "engagement_created",
  "engagement_updated",
  "engagement_completed",
  "engagement_converted_to_case",
  "engagement_prepared",
  "case_created_from_engagement",
  "pre_call_plan_created",
  "pre_call_plan_updated",
  "pre_call_plan_completed",
  "planning_section_completed",
  "provider_intelligence_promoted",
]);

const SKIP_CASE_ACTIVITY_TYPES = new Set([
  "case_updated",
  "document_uploaded",
  "document_deleted",
  "product_updated",
]);

function parseIso(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const d = new Date(text.includes("T") ? text : `${text}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function previewText(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  return scanLine(trimmed, PREVIEW_LIMIT);
}

function pushItem(
  out: ProviderActivityTimelineItem[],
  seen: Set<string>,
  item: ProviderActivityTimelineItem,
): void {
  const key = `${item.sourceTypeLabel}|${item.occurredAt}|${item.preview.slice(0, 80)}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(item);
}

function mapLegacyActivityEntry(input: {
  entry: Record<string, unknown>;
  providerId: string;
  cases?: Array<Record<string, unknown>>;
}): ProviderActivityTimelineItem | null {
  const at = parseIso(input.entry.at ?? input.entry.created_at);
  if (!at) return null;

  const kind = String(input.entry.kind ?? "").trim();
  const rawType = String(input.entry.activity_type ?? "").trim().toLowerCase();
  if (SKIP_PROVIDER_ACTIVITY_TYPES.has(rawType)) return null;
  if (kind === "case_activity" && SKIP_CASE_ACTIVITY_TYPES.has(rawType)) return null;
  if (kind === "opportunity_activity") return null;

  const body = String(input.entry.body ?? input.entry.question_label ?? "").trim();
  const title = String(input.entry.title ?? "").trim();
  const noteText = body || title;
  if (!noteText) return null;

  const caseId = String(input.entry.case_id ?? "").trim();
  const caseRow = caseId
    ? (input.cases ?? []).find((row) => String(row.id) === caseId)
    : undefined;
  const caseType = caseRow ? String(caseRow.case_type ?? "") : null;
  const metaJson =
    input.entry.metadata_json && typeof input.entry.metadata_json === "object"
      ? (input.entry.metadata_json as Record<string, unknown>)
      : null;

  const source = resolveActivityTimelineSourceDisplay({
    activityType: rawType,
    activityKind: kind,
    category: String(input.entry.category ?? ""),
    caseType,
    metadata: metaJson,
  });

  const href = input.entry.href ? String(input.entry.href) : null;
  const actor = String(input.entry.actor_display_name ?? "").trim() || null;

  return {
    id: `${kind || "activity"}-${String(input.entry.id ?? at)}`,
    occurredAt: at,
    whenLabel: formatIntelligenceTimelineWhen(at),
    sourceDateLabel: formatIntelligenceSourceDate(at),
    sourceTypeLabel: source.sourceTypeLabel,
    sourceTitle: source.sourceTitle,
    preview: previewText(noteText),
    fullNote: noteText,
    createdBy: actor,
    href,
  };
}

function mapEngagementNoteItem(input: {
  engagement: ProviderEngagementSummary;
  providerId: string;
}): ProviderActivityTimelineItem | null {
  const notes = extractRawDebriefFromStoredNotes(input.engagement.notes);
  if (!notes) return null;

  const engagementType = normalizeEngagementType(String(input.engagement.engagement_type ?? ""));
  const source = resolveActivityTimelineSourceDisplay({ engagementType });
  if (source.sourceType === "general_note") return null;

  const at =
    parseIso(input.engagement.debrief_completed_at) ??
    parseIso(input.engagement.updated_at) ??
    parseIso(input.engagement.scheduled_at ?? input.engagement.engagement_date);
  if (!at) return null;

  const engagementId = String(input.engagement.id ?? "").trim();
  const href =
    source.sourceType === "debrief"
      ? `/portal/sales/engagements/${encodeURIComponent(engagementId)}/debrief`
      : `/portal/sales/engagements/${encodeURIComponent(engagementId)}`;

  return {
    id: `engagement-note-${engagementId}`,
    occurredAt: at,
    whenLabel: formatIntelligenceTimelineWhen(at),
    sourceDateLabel: formatIntelligenceSourceDate(at),
    sourceTypeLabel: source.sourceTypeLabel,
    sourceTitle: input.engagement.engagement_type_label || source.sourceTitle,
    preview: previewText(notes),
    fullNote: notes,
    createdBy: null,
    href,
  };
}

function mapNestedCaseActivity(input: {
  activity: Record<string, unknown>;
  caseRow: Record<string, unknown>;
}): ProviderActivityTimelineItem | null {
  const rawType = String(input.activity.activity_type ?? "").trim().toLowerCase();
  if (SKIP_CASE_ACTIVITY_TYPES.has(rawType)) return null;
  if (rawType !== "note" && rawType !== "ai_note_capture" && rawType !== "clinical_discovery_insight_from_case") {
    return null;
  }

  const body = String(input.activity.body ?? "").trim();
  const metaJson =
    input.activity.metadata_json && typeof input.activity.metadata_json === "object"
      ? (input.activity.metadata_json as Record<string, unknown>)
      : null;
  const question = String(metaJson?.question_label ?? "").trim();
  const noteText = body || question;
  if (!noteText) return null;

  const at = parseIso(input.activity.created_at);
  if (!at) return null;

  const caseId = String(input.caseRow.id ?? "").trim();
  const caseType = String(input.caseRow.case_type ?? "");
  const source = resolveActivityTimelineSourceDisplay({
    activityType: rawType,
    activityKind: "case_activity",
    caseType,
  });

  return {
    id: `case-activity-${String(input.activity.id ?? at)}`,
    occurredAt: at,
    whenLabel: formatIntelligenceTimelineWhen(at),
    sourceDateLabel: formatIntelligenceSourceDate(at),
    sourceTypeLabel: source.sourceTypeLabel,
    sourceTitle: source.sourceTitle,
    preview: previewText(noteText),
    fullNote: noteText,
    createdBy: null,
    href: caseId ? `/portal/sales/cases/${encodeURIComponent(caseId)}` : null,
  };
}

export function buildProviderActivityTimeline(input: {
  providerId: string;
  activityTimeline?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
}): ProviderActivityTimelineItem[] {
  const items: ProviderActivityTimelineItem[] = [];
  const seen = new Set<string>();

  for (const entry of input.activityTimeline ?? []) {
    const mapped = mapLegacyActivityEntry({
      entry,
      providerId: input.providerId,
      cases: input.cases,
    });
    if (mapped) pushItem(items, seen, mapped);
  }

  for (const engagement of input.engagements ?? []) {
    const mapped = mapEngagementNoteItem({ engagement, providerId: input.providerId });
    if (mapped) pushItem(items, seen, mapped);
  }

  for (const caseRow of input.cases ?? []) {
    const activities = Array.isArray(caseRow.activities) ? caseRow.activities : [];
    for (const activity of activities as Array<Record<string, unknown>>) {
      const mapped = mapNestedCaseActivity({ activity, caseRow });
      if (mapped) pushItem(items, seen, mapped);
    }

    const caseNotes = String(caseRow.notes ?? "").trim();
    const caseType = String(caseRow.case_type ?? "");
    if (caseNotes && String(caseType).trim().toLowerCase() === "observation") {
      const at = parseIso(caseRow.updated_at) ?? parseIso(caseRow.created_at);
      if (at) {
        pushItem(items, seen, {
          id: `case-notes-${String(caseRow.id ?? at)}`,
          occurredAt: at,
          whenLabel: formatIntelligenceTimelineWhen(at),
          sourceDateLabel: formatIntelligenceSourceDate(at),
          sourceTypeLabel: "Observation",
          sourceTitle: String(caseRow.case_number ?? "Observation case"),
          preview: previewText(caseNotes),
          fullNote: caseNotes,
          createdBy: null,
          href: `/portal/sales/cases/${encodeURIComponent(String(caseRow.id))}`,
        });
      }
    }
  }

  items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  return items;
}
