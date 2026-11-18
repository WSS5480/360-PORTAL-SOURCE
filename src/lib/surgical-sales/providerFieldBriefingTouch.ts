/**
 * Field Briefing — ties tactical prep to a specific upcoming engagement or draft touch type.
 */

import {
  buildEngagementPrepareForMeetingHref,
  formatEngagementWhen,
  isUpcomingEngagementStatus,
  pickNextUpcomingEngagement,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  formatEngagementType,
  normalizeEngagementType,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export const FIELD_BRIEFING_EMPTY_TITLE = "Choose today's touch";
export const FIELD_BRIEFING_EMPTY_BODY =
  "Pick a touch type to tune questions and guardrails — or use pathway defaults below.";

export type FieldBriefingTouchOptionId = "intro_call";

export type FieldBriefingTouchOption = {
  id: FieldBriefingTouchOptionId;
  label: string;
  engagementType: EngagementType;
  description: string;
};

export const FIELD_BRIEFING_TOUCH_OPTIONS: FieldBriefingTouchOption[] = [
  {
    id: "intro_call",
    label: "Intro call",
    engagementType: "intro_call",
    description: "Learn workflow friction, procedure mix, and appetite for a follow-up.",
  },
];

const TOUCH_OBJECTIVE_BY_TYPE: Partial<Record<EngagementType, string>> = {
  intro_call:
    "Learn workflow friction, procedure mix, and how they want to stay in touch — not access paperwork.",
  office_visit_360:
    "Map who schedules observation, how access works, and what clearance is still required.",
  observation_request:
    "Confirm observation is feasible, which case type fits first, and what blocks a date.",
  or_visit: "Support today's case and capture workflow signals that drive the next step.",
  follow_up: "Close one open item from the last touch and lock the next dated step.",
};

const TOUCH_AVOID_BY_TYPE: Partial<Record<EngagementType, readonly string[]>> = {
  intro_call: [
    "Pitching product before workflow is mapped",
    "OR access, credentialing, or vendor-clearance deep-dives",
    "Purchasing, pricing, or economic-buyer framing",
  ],
  office_visit_360: [
    "Clinical technique or preference-card debate with the office",
    "Committing OR dates before access steps are confirmed",
    "Product evaluation before scheduling path is clear",
  ],
  observation_request: [
    "Promising a case day before feasibility is confirmed",
    "Skipping who approves access and who holds the calendar",
    "Broad product pitch instead of case type and timing",
  ],
  or_visit: [
    "Turning case support into a pricing or contract conversation",
    "New access or credentialing asks without a path owner",
    "Leaving without a dated next step",
  ],
  follow_up: [
    "Re-opening solved topics without a new gap",
    "Adding field days without a scheduling owner",
    "Deal-stage or velocity language on a logistics touch",
  ],
};

export type FieldBriefingActiveTouch = {
  kind: "engagement" | "draft";
  touchLabel: string;
  engagementType: string;
  engagementId: string | null;
  engagementTitle: string | null;
  whenLabel: string | null;
  organizationName: string | null;
  isDraft: boolean;
  prepareHref: string | null;
  createEngagementHref: string;
};

export type FieldBriefingTouchContext =
  | { status: "ready"; touch: FieldBriefingActiveTouch }
  | { status: "empty" };

export function fieldBriefingTouchOptionByParam(
  raw: string | null | undefined,
): FieldBriefingTouchOption | null {
  const key = String(raw ?? "").trim().toLowerCase();
  if (!key) return null;
  return (
    FIELD_BRIEFING_TOUCH_OPTIONS.find((o) => o.id === key || o.engagementType === key) ?? null
  );
}

export function buildFieldBriefingNewEngagementHref(input: {
  providerId: string;
  organizationId?: string | null;
  engagementType: string;
  returnTab?: "briefing";
}): string {
  const p = new URLSearchParams({
    provider_id: input.providerId,
    engagement_type: normalizeEngagementType(input.engagementType) || input.engagementType,
  });
  if (input.organizationId?.trim()) {
    p.set("organization_id", input.organizationId.trim());
  }
  return `/portal/sales/engagements/new?${p.toString()}`;
}

export function providerFieldBriefingTabHref(
  providerId: string,
  params?: { touch?: FieldBriefingTouchOptionId; engagementId?: string },
): string {
  const p = new URLSearchParams({ tab: "briefing" });
  if (params?.engagementId?.trim()) {
    p.set("engagement_id", params.engagementId.trim());
  } else if (params?.touch) {
    p.set("touch", params.touch);
  }
  return `/portal/sales/providers/${encodeURIComponent(providerId)}?${p.toString()}`;
}

function touchFromEngagement(
  engagement: ProviderEngagementSummary,
  organizationName: string | null,
  createEngagementHref: string,
): FieldBriefingActiveTouch {
  const type = normalizeEngagementType(engagement.engagement_type) || engagement.engagement_type;
  const touchLabel =
    engagement.engagement_type_label?.trim() || formatEngagementType(type);
  const title = engagement.title?.trim() || null;
  return {
    kind: "engagement",
    touchLabel,
    engagementType: type,
    engagementId: engagement.id,
    engagementTitle: title,
    whenLabel: formatEngagementWhen(engagement),
    organizationName: engagement.organization_name ?? organizationName,
    isDraft: false,
    prepareHref: buildEngagementPrepareForMeetingHref(engagement.id),
    createEngagementHref,
  };
}

function touchFromDraft(
  option: FieldBriefingTouchOption,
  organizationName: string | null,
  createEngagementHref: string,
): FieldBriefingActiveTouch {
  return {
    kind: "draft",
    touchLabel: option.label,
    engagementType: option.engagementType,
    engagementId: null,
    engagementTitle: null,
    whenLabel: null,
    organizationName,
    isDraft: true,
    prepareHref: null,
    createEngagementHref,
  };
}

export function resolveFieldBriefingTouchContext(input: {
  engagements?: ProviderEngagementSummary[];
  engagementIdParam?: string | null;
  touchParam?: string | null;
  providerId: string;
  organizationId?: string | null;
  facilityName?: string | null;
}): FieldBriefingTouchContext {
  const engagements = input.engagements ?? [];
  const defaultCreateHref = buildFieldBriefingNewEngagementHref({
    providerId: input.providerId,
    organizationId: input.organizationId,
    engagementType: "intro_call",
  });

  const engagementId = String(input.engagementIdParam ?? "").trim();
  if (engagementId) {
    const selected = engagements.find((e) => e.id === engagementId);
    if (selected && isUpcomingEngagementStatus(selected.status)) {
      return {
        status: "ready",
        touch: touchFromEngagement(selected, input.facilityName ?? null, defaultCreateHref),
      };
    }
  }

  const upcoming = pickNextUpcomingEngagement(engagements);
  if (upcoming) {
    return {
      status: "ready",
      touch: touchFromEngagement(upcoming, input.facilityName ?? null, defaultCreateHref),
    };
  }

  const option = fieldBriefingTouchOptionByParam(input.touchParam);
  if (option) {
    const createHref = buildFieldBriefingNewEngagementHref({
      providerId: input.providerId,
      organizationId: input.organizationId,
      engagementType: option.engagementType,
    });
    return {
      status: "ready",
      touch: touchFromDraft(option, input.facilityName ?? null, createHref),
    };
  }

  return { status: "empty" };
}

export function fieldBriefingObjectiveForTouch(engagementType: string): string {
  const normalized = normalizeEngagementType(engagementType) || engagementType;
  const touchLead =
    TOUCH_OBJECTIVE_BY_TYPE[normalized as EngagementType] ?? TOUCH_OBJECTIVE_BY_TYPE.intro_call!;
  return scanLine(touchLead, 120);
}

/** One-line touch context — not commercial stage or intelligence summaries. */
export function fieldBriefingTouchContextLine(touch: FieldBriefingActiveTouch): string | null {
  if (touch.isDraft) {
    return scanLine(`Draft prep for ${touch.touchLabel} — schedule when ready.`, 96);
  }
  const parts: string[] = [touch.touchLabel];
  if (touch.engagementTitle) parts.push(touch.engagementTitle);
  if (touch.whenLabel) parts.push(touch.whenLabel);
  return parts.length > 1 ? scanLine(parts.join(" · "), 96) : null;
}

export function fieldBriefingAvoidForTouch(
  engagementType: string,
  contextualLine: string | null,
  limit = 3,
): string[] {
  const normalized = normalizeEngagementType(engagementType) || engagementType;
  const base =
    TOUCH_AVOID_BY_TYPE[normalized as EngagementType] ?? TOUCH_AVOID_BY_TYPE.intro_call!;
  const lines = base.map((line) => scanLine(line, 110));
  if (contextualLine) {
    const trimmed = scanLine(contextualLine, 110);
    if (trimmed && !lines.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      lines.push(trimmed);
    }
  }
  const seen = new Set<string>();
  return lines
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

const TOUCH_SUCCESS_OUTCOMES: Partial<Record<EngagementType, readonly string[]>> = {
  intro_call: [
    "One workflow insight you can repeat back",
    "One next contact or coordinator name",
    "One clear follow-up step with timing",
    "Better understanding of procedure mix or workflow friction",
  ],
  office_visit_360: [
    "Scheduling owner identified",
    "Access process clarified",
    "Credentialing or clearance path understood",
    "Best next touch confirmed",
  ],
  observation_request: [
    "Observation feasibility confirmed",
    "Realistic case type identified",
    "Access requirements understood",
    "Timing or scheduling path clarified",
  ],
  or_visit: [
    "In-room workflow friction or preference noted",
    "Support expectation clarified for case days",
    "Next case or follow-up step with a date",
    "Signal captured to update observation or access plan",
  ],
  follow_up: [
    "Open gap from last touch closed or dated",
    "Next owner and channel for follow-up confirmed",
    "Timeline for observation or evaluation step agreed",
    "No new open items introduced without a path forward",
  ],
};

const DEFAULT_SUCCESS_OUTCOMES = TOUCH_SUCCESS_OUTCOMES.intro_call!;

export function fieldBriefingTouchSuccessOutcomes(engagementType: string): string[] {
  const normalized = normalizeEngagementType(engagementType) || engagementType;
  const lines =
    TOUCH_SUCCESS_OUTCOMES[normalized as EngagementType] ?? DEFAULT_SUCCESS_OUTCOMES;
  return lines.map((line) => scanLine(line, 96));
}
