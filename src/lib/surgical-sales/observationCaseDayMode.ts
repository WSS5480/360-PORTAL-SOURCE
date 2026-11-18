import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import {
  buildObservationIntelligenceView,
  hasObservationIntelligenceContent,
} from "@/lib/surgical-sales/buildObservationIntelligenceView";
import {
  buildObservationMissionBriefLayout,
  type ObservationMissionBriefLayout,
} from "@/lib/surgical-sales/buildObservationMissionBriefLayout";
import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export const OBSERVATION_CASE_DAY_MODE_TITLE = "Live Observation";

export const OBSERVATION_CASE_DAY_MODE_LEAD =
  "Standing in the OR — capture what matters. Planning stays tucked away until you exit.";

export const OBSERVATION_CASE_DAY_MODE_SECTIONS = {
  todayMission: "Today's Mission",
  intelligenceStillMissing: "Intelligence Still Missing",
  nextThingToWatchFor: "Next Thing To Watch For",
  quickCapture: "Quick Capture Buttons",
  liveCoaching: "Live Observation Coaching",
} as const;

export const OBSERVATION_LIVE_COACHING_COPY = {
  start:
    "Start with workflow and product utilization — note tray setup, product choice, and OR flow as you see them.",
  products:
    "Product utilization is still open — watch the preference card and log anything the team reaches for repeatedly.",
  competitors:
    "Competitor footprint is unknown — note rival trays, reps, or branded products in the field.",
  pain:
    "Pain signals are appearing — connect what you observe to whether workflow or product choice drives it.",
  staff:
    "Staff friction is still unclear — listen for nursing or tech comments during turnover and setup.",
  onTrack:
    "Strong capture so far — stay with the next briefing target and capture exact quotes when you can.",
  allBriefed:
    "Mission targets are covered — keep watching for surprises and log anything that changes your read.",
} as const;

export const OBSERVATION_CASE_DAY_MODE_STORAGE_PREFIX = "observation-case-day-mode:";

export function observationCaseDayModeStorageKey(caseId: string): string {
  return `${OBSERVATION_CASE_DAY_MODE_STORAGE_PREFIX}${caseId}`;
}

export function readObservationCaseDayModeActive(caseId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(observationCaseDayModeStorageKey(caseId)) === "1";
  } catch {
    return false;
  }
}

export function writeObservationCaseDayModeActive(caseId: string, active: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (active) {
      sessionStorage.setItem(observationCaseDayModeStorageKey(caseId), "1");
    } else {
      sessionStorage.removeItem(observationCaseDayModeStorageKey(caseId));
    }
  } catch {
    // ignore storage failures
  }
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isObservationCaseDayEligible(
  caseRow: Record<string, unknown>,
  today: string = utcToday(),
): boolean {
  if (!isSurgicalObservationCase(caseRow.case_type)) return false;
  if (caseRow.archived_at) return false;

  const caseDate = String(caseRow.case_date ?? "").trim();
  if (!caseDate || caseDate !== today) return false;

  const status = String(caseRow.status ?? "").trim().toLowerCase();
  if (["completed", "cancelled", "closed", "billing_review", "invoiced"].includes(status)) {
    return false;
  }

  return true;
}

type LiveCaptureState = {
  hasProduct: boolean;
  hasCompetitor: boolean;
  hasPain: boolean;
  hasWorkflow: boolean;
  hasStaff: boolean;
  hasAnyCapture: boolean;
};

function resolveLiveCaptureState(caseRow: Record<string, unknown>): LiveCaptureState {
  const intelligence = buildObservationIntelligenceView(caseRow);
  const byId = Object.fromEntries(intelligence.categories.map((category) => [category.id, category]));

  const hasProduct =
    (byId.product_fit_signals?.items.length ?? 0) > 0 ||
    Boolean(String(caseRow.live_observation_product_fit ?? "").trim());
  const hasCompetitor =
    (byId.competitor_products?.items.length ?? 0) > 0 ||
    Boolean(String(caseRow.live_observation_competitors ?? "").trim());
  const hasPain =
    (byId.clinical_pain_points?.items.length ?? 0) > 0 ||
    Boolean(String(caseRow.live_observation_clinical_pain_points ?? "").trim());
  const hasWorkflow =
    (byId.workflow_friction?.items.length ?? 0) > 0 ||
    Boolean(String(caseRow.live_observation_workflow ?? "").trim());
  const hasStaff = (byId.staff_observations?.items.length ?? 0) > 0;

  return {
    hasProduct,
    hasCompetitor,
    hasPain,
    hasWorkflow,
    hasStaff,
    hasAnyCapture: hasObservationIntelligenceContent(caseRow),
  };
}

function isStillMissingForText(text: string, capture: LiveCaptureState): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  if (/current product|product utilization|products used|products are/i.test(normalized)) {
    return !capture.hasProduct;
  }
  if (/competitor|rival|vendor tray/i.test(normalized)) {
    return !capture.hasCompetitor;
  }
  if (/staff frustration|frustrates staff|nursing|or team/i.test(normalized)) {
    return !capture.hasStaff && !capture.hasPain;
  }
  if (/workflow|workaround|bottleneck|friction|turnover|setup/i.test(normalized)) {
    return !capture.hasWorkflow;
  }
  if (/frustrates the surgeon|clinical frustration|pain point|dissatisfaction/i.test(normalized)) {
    return !capture.hasPain;
  }
  if (/outcome|priorit/i.test(normalized)) {
    return !capture.hasPain && !capture.hasWorkflow;
  }

  return !capture.hasAnyCapture;
}

function takeUniqueLabels(values: string[], max: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= max) break;
  }
  return result;
}

export function buildObservationIntelligenceStillMissing(input: {
  layout: ObservationMissionBriefLayout;
  caseRow: Record<string, unknown>;
}): string[] {
  const capture = resolveLiveCaptureState(input.caseRow);
  const candidates = [
    ...(input.layout.learningQuestions ?? []),
    ...(input.layout.pillarsById.watch_signals?.items ?? []),
  ];

  return takeUniqueLabels(
    candidates.filter((item) => isStillMissingForText(item, capture)),
    6,
  );
}

export function resolveObservationNextThingToWatchFor(input: {
  layout: ObservationMissionBriefLayout;
  caseRow: Record<string, unknown>;
  intelligenceStillMissing: string[];
}): string | null {
  const capture = resolveLiveCaptureState(input.caseRow);
  const watchSignals =
    input.layout.pillarsById.watch_signals?.items ??
    input.layout.focusAreas ??
    [];

  for (const signal of watchSignals) {
    if (isStillMissingForText(signal, capture)) {
      return signal;
    }
  }

  return input.intelligenceStillMissing[0] ?? watchSignals[0] ?? null;
}

export function buildObservationLiveCoachingPrompt(input: {
  caseRow: Record<string, unknown>;
  intelligenceStillMissing: string[];
  nextThingToWatchFor: string | null;
}): string {
  const capture = resolveLiveCaptureState(input.caseRow);

  if (!capture.hasAnyCapture) {
    return OBSERVATION_LIVE_COACHING_COPY.start;
  }

  if (input.intelligenceStillMissing.length === 0) {
    return OBSERVATION_LIVE_COACHING_COPY.allBriefed;
  }

  const next = String(input.nextThingToWatchFor ?? input.intelligenceStillMissing[0] ?? "")
    .trim()
    .toLowerCase();

  if (/product|utilization|tray|preference card/i.test(next) && !capture.hasProduct) {
    return OBSERVATION_LIVE_COACHING_COPY.products;
  }
  if (/competitor|rival/i.test(next) && !capture.hasCompetitor) {
    return OBSERVATION_LIVE_COACHING_COPY.competitors;
  }
  if (/staff|nursing|tech/i.test(next) && !capture.hasStaff) {
    return OBSERVATION_LIVE_COACHING_COPY.staff;
  }
  if (/frustration|pain|clinical/i.test(next) && !capture.hasPain) {
    return OBSERVATION_LIVE_COACHING_COPY.pain;
  }
  if (capture.hasPain && !capture.hasProduct) {
    return OBSERVATION_LIVE_COACHING_COPY.products;
  }

  return OBSERVATION_LIVE_COACHING_COPY.onTrack;
}

export type ObservationCaseDayModeView = {
  eligible: boolean;
  todayMission: string;
  intelligenceStillMissing: string[];
  nextThingToWatchFor: string | null;
  liveCoachingPrompt: string;
  signalsToWatch: string[];
  providerName: string;
  facilityName: string;
  dateLabel: string;
};

export function buildObservationCaseDayModeView(input: {
  caseRow: Record<string, unknown>;
  identity: CaseIdentity;
  engagement?: Record<string, unknown> | null;
  activities?: Array<{ activity_type?: string }>;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  planning?: ProviderPlanningCompletion | null;
  today?: string;
}): ObservationCaseDayModeView {
  const today = input.today ?? utcToday();
  const eligible = isObservationCaseDayEligible(input.caseRow, today);

  const layout = buildObservationMissionBriefLayout({
    caseRow: input.caseRow,
    identity: input.identity,
    engagement: input.engagement,
    activities: input.activities,
    providerContact: input.providerContact,
    providerIntelligence: input.providerIntelligence,
    planning: input.planning,
    procedureLabel: input.identity.procedureType,
  });

  const watchSignals = layout.pillarsById.watch_signals?.items ?? layout.focusAreas;
  const intelligenceStillMissing = buildObservationIntelligenceStillMissing({
    layout,
    caseRow: input.caseRow,
  });
  const nextThingToWatchFor = resolveObservationNextThingToWatchFor({
    layout,
    caseRow: input.caseRow,
    intelligenceStillMissing,
  });
  const liveCoachingPrompt = buildObservationLiveCoachingPrompt({
    caseRow: input.caseRow,
    intelligenceStillMissing,
    nextThingToWatchFor,
  });

  return {
    eligible,
    todayMission:
      layout.missionObjective || "Assess product fit during this observation.",
    intelligenceStillMissing,
    nextThingToWatchFor,
    liveCoachingPrompt,
    signalsToWatch: watchSignals,
    providerName: input.identity.providerName,
    facilityName: input.identity.facilityName,
    dateLabel: input.identity.dateLineWithTime || input.identity.dateLine,
  };
}
