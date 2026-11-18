import type {
  ObservationNoteEntityType,
  ObservationNoteExtraction,
} from "@/lib/surgical-sales/extractObservationNoteEntities";
import {
  isUsableObservationEntity,
  observationEntityFinding,
} from "@/lib/surgical-sales/observationEntityAccessors";
import { formatCaseIdentityDate } from "@/lib/surgical-sales/buildCaseIdentity";

export type ObservationIntelligenceTimelineEventKind =
  | "intro_call"
  | "access_pathway_captured"
  | "observation_scheduled"
  | "observation_note"
  | "signal_extracted"
  | "discovery_insight"
  | "provider_intelligence"
  | "field_intelligence";

export type ObservationIntelligenceTimelineEvent = {
  id: string;
  kind: ObservationIntelligenceTimelineEventKind;
  title: string;
  detail: string;
  timestamp: string;
  sortKey: number;
};

type ActivityInput = {
  id: string;
  activity_type: string;
  body: string;
  created_at: string;
  metadata_json?: Record<string, unknown> | null;
};

const ACSIS_PATTERN = /\bacs?is\b/i;

export const OBSERVATION_INTELLIGENCE_TIMELINE_TITLES: Record<
  ObservationIntelligenceTimelineEventKind,
  string
> = {
  intro_call: "Intro call completed",
  access_pathway_captured: "Access pathway captured",
  observation_scheduled: "Observation date set",
  observation_note: "Observation note",
  signal_extracted: "Signal extracted",
  discovery_insight: "Discovery insight captured",
  provider_intelligence: "Provider intelligence updated",
  field_intelligence: "Field intelligence captured",
};

const SYSTEM_ACTIVITY_TYPES = new Set([
  "case_created",
  "case_archived",
  "case_restored",
  "document_uploaded",
  "document_deleted",
  "product_updated",
  "billing_update",
  "case_linked_from_engagement",
  "case_created_from_engagement",
  "engagement_created",
  "engagement_updated",
  "engagement_converted_to_case",
  "provider_debrief_planned",
]);

function activityChangedKeys(meta: Record<string, unknown> | undefined): string[] {
  const keys = new Set<string>();
  const prev = meta?.previous_values;
  const next = meta?.new_values;
  const fields = meta?.fields;
  if (prev && typeof prev === "object") Object.keys(prev).forEach((key) => keys.add(key));
  if (next && typeof next === "object") Object.keys(next).forEach((key) => keys.add(key));
  if (Array.isArray(fields)) {
    fields.forEach((field) => {
      if (typeof field === "string" && field.trim()) keys.add(field.trim());
    });
  }
  return [...keys];
}

function readMetaValue(meta: Record<string, unknown> | undefined, key: string): string | null {
  if (!meta) return null;
  const next = meta.new_values;
  if (next && typeof next === "object") {
    const value = String((next as Record<string, unknown>)[key] ?? "").trim();
    if (value) return value;
  }
  return null;
}

function parseAiExtraction(metadata: Record<string, unknown> | null | undefined): ObservationNoteExtraction | null {
  const raw = metadata?.ai_extraction;
  if (!raw || typeof raw !== "object") return null;
  const extraction = raw as ObservationNoteExtraction;
  if (!Array.isArray(extraction.entities)) return null;
  return extraction;
}

function formatSignalExtractedText(_type: ObservationNoteEntityType, finding: string): string {
  const trimmed = finding.trim();
  if (!trimmed) return trimmed;
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

function shouldEmitSignalExtracted(type: ObservationNoteEntityType): boolean {
  return [
    "product_signal",
    "growth_signal",
    "clinical_pain_signal",
    "workflow_friction_signal",
    "competitor_signal",
  ].includes(type);
}

function introCallDetail(activity: ActivityInput): string {
  const body = String(activity.body ?? "").trim();
  if (body) return body.endsWith(".") ? body : `${body}.`;
  const meta = activity.metadata_json ?? undefined;
  const summary = String(meta?.debrief_summary ?? meta?.summary ?? "").trim();
  if (summary) return summary.endsWith(".") ? summary : `${summary}.`;
  return "Intro call debrief captured for this pathway.";
}

function pushEvent(
  target: ObservationIntelligenceTimelineEvent[],
  event: Omit<ObservationIntelligenceTimelineEvent, "sortKey"> & { sortKey?: number },
): void {
  const sortKey = event.sortKey ?? new Date(event.timestamp).getTime();
  target.push({ ...event, sortKey });
}

function eventsFromNote(activity: ActivityInput): ObservationIntelligenceTimelineEvent[] {
  const noteText = String(activity.body ?? "").trim();
  if (!noteText) return [];

  const events: ObservationIntelligenceTimelineEvent[] = [];
  const baseTime = new Date(activity.created_at).getTime();

  pushEvent(events, {
    id: `${activity.id}:note`,
    kind: "observation_note",
    title: OBSERVATION_INTELLIGENCE_TIMELINE_TITLES.observation_note,
    detail: noteText.endsWith(".") ? noteText : `${noteText}.`,
    timestamp: activity.created_at,
  });

  const extraction = parseAiExtraction(activity.metadata_json);
  if (!extraction) return events;

  extraction.entities.forEach((entity, index) => {
    if (!isUsableObservationEntity(entity)) return;
    if (!shouldEmitSignalExtracted(entity.type)) return;
    const detail = formatSignalExtractedText(entity.type, observationEntityFinding(entity));
    if (!detail) return;

    pushEvent(events, {
      id: `${activity.id}:signal:${index}`,
      kind: "signal_extracted",
      title: OBSERVATION_INTELLIGENCE_TIMELINE_TITLES.signal_extracted,
      detail,
      timestamp: new Date(baseTime + index + 1).toISOString(),
      sortKey: baseTime + index + 1,
    });
  });

  return events;
}

function eventsFromCaseUpdated(activity: ActivityInput): ObservationIntelligenceTimelineEvent[] {
  const changed = activityChangedKeys(activity.metadata_json ?? undefined);
  if (changed.length === 0) return [];

  const events: ObservationIntelligenceTimelineEvent[] = [];
  const body = String(activity.body ?? "").trim();

  if (changed.includes("observation_access_pathway")) {
    const pathway = readMetaValue(activity.metadata_json ?? undefined, "observation_access_pathway") ?? body;
    pushEvent(events, {
      id: `${activity.id}:pathway`,
      kind: "access_pathway_captured",
      title: OBSERVATION_INTELLIGENCE_TIMELINE_TITLES.access_pathway_captured,
      detail: pathway
        ? pathway.endsWith(".") ? pathway : `${pathway}.`
        : "Observation access pathway noted from case update.",
      timestamp: activity.created_at,
    });
  }

  if (changed.includes("case_date")) {
    const caseDate = readMetaValue(activity.metadata_json ?? undefined, "case_date");
    const { dateLine } = formatCaseIdentityDate(caseDate);
    pushEvent(events, {
      id: `${activity.id}:scheduled`,
      kind: "observation_scheduled",
      title: OBSERVATION_INTELLIGENCE_TIMELINE_TITLES.observation_scheduled,
      detail:
        dateLine && dateLine !== "Date TBD"
          ? `Observation date set for ${dateLine}.`
          : "Observation date recorded on case.",
      timestamp: activity.created_at,
    });
  }

  const liveKeys = changed.filter((key) => key.startsWith("live_observation_") || key.startsWith("debrief_"));
  if (liveKeys.length > 0 && body) {
    pushEvent(events, {
      id: `${activity.id}:field`,
      kind: "field_intelligence",
      title: OBSERVATION_INTELLIGENCE_TIMELINE_TITLES.field_intelligence,
      detail: body.endsWith(".") ? body : `${body}.`,
      timestamp: activity.created_at,
    });
  }

  return events;
}

function syntheticMilestones(caseRow: Record<string, unknown>): ObservationIntelligenceTimelineEvent[] {
  const events: ObservationIntelligenceTimelineEvent[] = [];
  const timestamp = String(caseRow.updated_at ?? caseRow.created_at ?? "").trim();
  if (!timestamp) return events;

  const pathway = String(caseRow.observation_access_pathway ?? "").trim();
  if (pathway) {
    pushEvent(events, {
      id: "synthetic:pathway",
      kind: "access_pathway_captured",
      title: OBSERVATION_INTELLIGENCE_TIMELINE_TITLES.access_pathway_captured,
      detail: pathway.endsWith(".") ? pathway : `${pathway}.`,
      timestamp,
    });
  }

  const caseDate = String(caseRow.case_date ?? "").trim();
  if (caseDate) {
    const { dateLine } = formatCaseIdentityDate(caseDate);
    pushEvent(events, {
      id: "synthetic:scheduled",
      kind: "observation_scheduled",
      title: OBSERVATION_INTELLIGENCE_TIMELINE_TITLES.observation_scheduled,
      detail: `Observation date set for ${dateLine}.`,
      timestamp,
    });
  }

  return events;
}

export function formatObservationIntelligenceTimelineTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildObservationIntelligenceTimeline(input: {
  activities?: ActivityInput[];
  caseRow?: Record<string, unknown>;
  limit?: number;
}): ObservationIntelligenceTimelineEvent[] {
  const events: ObservationIntelligenceTimelineEvent[] = [];

  for (const activity of input.activities ?? []) {
    const rawType = String(activity.activity_type ?? "").trim().toLowerCase();
    if (SYSTEM_ACTIVITY_TYPES.has(rawType)) continue;

    if (rawType === "note" || rawType === "ai_note_capture") {
      events.push(...eventsFromNote(activity));
      continue;
    }

    if (rawType === "pre_call_plan_completed" || rawType === "engagement_completed") {
      pushEvent(events, {
        id: activity.id,
        kind: "intro_call",
        title: OBSERVATION_INTELLIGENCE_TIMELINE_TITLES.intro_call,
        detail: introCallDetail(activity),
        timestamp: activity.created_at,
      });
      continue;
    }

    if (rawType === "clinical_discovery_insight_from_case") {
      const question = String(activity.metadata_json?.question_label ?? "").trim();
      const body = String(activity.body ?? "").trim();
      const detail = body || question || "Discovery mapping advanced for this provider.";
      pushEvent(events, {
        id: activity.id,
        kind: "discovery_insight",
        title: OBSERVATION_INTELLIGENCE_TIMELINE_TITLES.discovery_insight,
        detail: detail.endsWith(".") ? detail : `${detail}.`,
        timestamp: activity.created_at,
      });
      continue;
    }

    if (rawType === "provider_intelligence_promoted") {
      const body = String(activity.body ?? "").trim();
      pushEvent(events, {
        id: activity.id,
        kind: "provider_intelligence",
        title: OBSERVATION_INTELLIGENCE_TIMELINE_TITLES.provider_intelligence,
        detail: body
          ? body.endsWith(".") ? body : `${body}.`
          : "Provider intelligence advanced from this case.",
        timestamp: activity.created_at,
      });
      continue;
    }

    if (rawType === "case_updated") {
      events.push(...eventsFromCaseUpdated(activity));
      continue;
    }

    if (rawType === "status_change") {
      const nextStatus = readMetaValue(activity.metadata_json ?? undefined, "status");
      if (nextStatus === "scheduled" || nextStatus === "confirmed") {
        pushEvent(events, {
          id: activity.id,
          kind: "observation_scheduled",
          title: OBSERVATION_INTELLIGENCE_TIMELINE_TITLES.observation_scheduled,
          detail: "Case moved to scheduled status.",
          timestamp: activity.created_at,
        });
      }
    }
  }

  if (input.caseRow) {
    const hasPathway = events.some((event) => event.kind === "access_pathway_captured");
    const hasScheduled = events.some((event) => event.kind === "observation_scheduled");
    for (const milestone of syntheticMilestones(input.caseRow)) {
      if (milestone.kind === "access_pathway_captured" && hasPathway) continue;
      if (milestone.kind === "observation_scheduled" && hasScheduled) continue;
      events.push(milestone);
    }
  }

  const sorted = events.sort((a, b) => b.sortKey - a.sortKey);
  return input.limit != null ? sorted.slice(0, input.limit) : sorted;
}
