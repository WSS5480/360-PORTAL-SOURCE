import { buildEngagementScheduleFieldsFromBasics } from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";
import {
  readEngagementScheduleDraft,
  readEngagementTextField,
} from "@/lib/surgical-sales/engagements/buildEngagementRecordView";
import {
  buildStoredTacticalDebriefNotes,
  engagementNotesHaveTacticalDebrief,
} from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { extractRawDebriefFromStoredNotes } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefRawNotes";
import {
  ENGAGEMENT_STATUSES,
  ENGAGEMENT_TYPES,
  formatEngagementType,
  normalizeEngagementType,
  type EngagementStatus,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import { isIntroCallPathwayMission } from "@/lib/surgical-sales/engagements/introCallPathwayMission";

export type EngagementEditDraft = {
  engagementType: string;
  status: string;
  engagementDate: string;
  engagementTime: string;
  locationLabel: string;
  organizationId: string;
  notes: string;
  productFocus: string;
  objective: string;
};

export type EngagementEditPatch = {
  engagement_type?: string;
  status?: string;
  engagement_date: string | null;
  scheduled_at: string | null;
  scheduled_date: string | null;
  pre_call_hospital_name?: string | null;
  organization_id?: string | null;
  notes?: string | null;
  product_focus?: string | null;
  observation_goal?: string | null;
};

export type EngagementEditOrganizationOption = {
  id: string;
  name: string;
};

export function engagementTypeOptionsForEdit(currentType: string): EngagementType[] {
  const normalized = normalizeEngagementType(currentType);
  const options = new Set<string>(ENGAGEMENT_TYPES);
  if (normalized) options.add(normalized);
  return [...options].map((t) => t as EngagementType);
}

function notesContainTacticalDebriefMarker(notes: string): boolean {
  return /---\s*tactical\s+debrief\s+---/i.test(notes) || engagementNotesHaveTacticalDebrief(notes);
}

function stripTacticalDebriefMarker(notes: string): string {
  return notes.replace(/^---\s*tactical\s+debrief\s+---\s*\n*/i, "").trim();
}

export function readEngagementNotesDraft(engagement: Record<string, unknown>): string {
  const stored = readEngagementTextField(engagement, "notes");
  if (!stored) return "";
  if (notesContainTacticalDebriefMarker(stored)) {
    const body = stripTacticalDebriefMarker(stored);
    const extracted = extractRawDebriefFromStoredNotes(body);
    return extracted || body;
  }
  return stored;
}

function readEngagementObjectiveDraft(engagement: Record<string, unknown>): string {
  return (
    readEngagementTextField(engagement, "observation_goal") ||
    readEngagementTextField(engagement, "engagement_purpose")
  );
}

export function readEngagementEditDraft(engagement: Record<string, unknown>): EngagementEditDraft {
  const schedule = readEngagementScheduleDraft(engagement);
  return {
    engagementType: String(engagement.engagement_type ?? ""),
    status: String(engagement.status ?? "planned"),
    engagementDate: schedule.engagement_date,
    engagementTime: schedule.engagement_time,
    locationLabel: readEngagementTextField(engagement, "pre_call_hospital_name"),
    organizationId: String(engagement.organization_id ?? "").trim(),
    notes: readEngagementNotesDraft(engagement),
    productFocus: readEngagementTextField(engagement, "product_focus"),
    objective: readEngagementObjectiveDraft(engagement),
  };
}

export function buildEngagementEditPatch(
  draft: EngagementEditDraft,
  engagement: Record<string, unknown>,
): EngagementEditPatch {
  const schedule = buildEngagementScheduleFieldsFromBasics({
    engagement_date: draft.engagementDate,
    engagement_time: draft.engagementTime,
  });
  const pathwayMission = isIntroCallPathwayMission(String(engagement.engagement_type ?? ""));
  const prevNotes = readEngagementTextField(engagement, "notes");
  const notesTrimmed = draft.notes.trim();
  let notes: string | null = notesTrimmed || null;
  if (prevNotes && notesContainTacticalDebriefMarker(prevNotes)) {
    notes = notesTrimmed
      ? buildStoredTacticalDebriefNotes({ narrative: notesTrimmed })
      : null;
  }

  const status = ENGAGEMENT_STATUSES.includes(draft.status as EngagementStatus)
    ? draft.status
    : String(engagement.status ?? "planned");

  const patch: EngagementEditPatch = {
    engagement_type: draft.engagementType,
    status,
    engagement_date: schedule.engagement_date,
    scheduled_at: schedule.scheduled_at,
    scheduled_date: schedule.engagement_date,
    pre_call_hospital_name: draft.locationLabel.trim() || null,
    organization_id: draft.organizationId.trim() || null,
    notes,
    product_focus: draft.productFocus.trim() || null,
  };

  if (!pathwayMission) {
    patch.observation_goal = draft.objective.trim() || null;
  }

  return patch;
}

export function formatEngagementEditTypeLabel(type: string): string {
  return formatEngagementType(type);
}
