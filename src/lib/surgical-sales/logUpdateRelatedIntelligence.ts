import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { fieldLabelForDbKey } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_SECTION_LABELS } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { removeResolvedIntelligenceGaps } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceGapReconciliation";

export type LogUpdateGapId =
  | "credentialing_turnaround"
  | "vendor_credentialing_status"
  | "best_days"
  | "observation_cadence"
  | "evaluation_readiness"
  | "scheduling_owner";

export type LogUpdatePartiallyConfirmedItem = {
  label: string;
  reason: string;
  domain?: string;
  confidence?: string;
  target?: string;
};

export type LogUpdateSuggestedAction = {
  action: string;
  owner_type: string;
  priority: string;
};

export type LogUpdateDoNotUpdateItem = {
  item: string;
  reason: string;
};

export type LogUpdateIntelligenceReview = {
  summary?: string | null;
  confirmedUpdates: string[];
  partiallyConfirmed: LogUpdatePartiallyConfirmedItem[];
  stillWorthConfirming: string[];
  relatedOperationalAreas: string[];
  suggestedNextActions?: LogUpdateSuggestedAction[];
  doNotUpdate?: LogUpdateDoNotUpdateItem[];
};

type GapCatalogEntry = {
  id: LogUpdateGapId;
  label: string;
  sectionId: ProviderIntelligenceSectionId;
  satisfied: (text: string, existing?: Record<string, string>) => boolean;
};

function fieldIsPopulated(value: string): boolean {
  const t = value.trim();
  return t.length > 0 && t.toLowerCase() !== "unknown";
}

export const LOG_UPDATE_GAP_CATALOG: GapCatalogEntry[] = [
  {
    id: "credentialing_turnaround",
    label: "Credentialing turnaround time",
    sectionId: "observation_readiness",
    satisfied: (t) =>
      /\b(turnaround|lead\s*time|timeline|how\s+long|weeks?\s+to|days?\s+to).{0,40}\bcredential/i.test(t) ||
      /\bcredential.{0,40}\b(turnaround|timeline|how\s+long)/i.test(t),
  },
  {
    id: "vendor_credentialing_status",
    label: "Vendor credentialing status confirmed",
    sectionId: "or_environment",
    satisfied: (t, existing) =>
      fieldIsPopulated(String(existing?.provider_credentialing_status ?? "")) ||
      /\b(cleared|credentialed|approved\s+for|on\s+file)\b/i.test(t) ||
      (/\b(pending|in\s+progress|waiting|submitted|under\s+review)\b/i.test(t) &&
        /\b(credential|vendor\s+clearance)\b/i.test(t)),
  },
  {
    id: "best_days",
    label: "Best days or case posting window",
    sectionId: "observation_readiness",
    satisfied: (t) =>
      /\b(best\s+days?|posting\s+window|case\s+posting|when\s+cases?\s+post|schedule\s+window|OR\s+days?)/i.test(
        t,
      ) || /\b(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?)\b/i.test(t),
  },
  {
    id: "observation_cadence",
    label: "Observation cadence",
    sectionId: "observation_readiness",
    satisfied: (t) =>
      /\b(cadence|how\s+often|frequency|rhythm|every\s+week|monthly\s+observation)/i.test(t),
  },
  {
    id: "evaluation_readiness",
    label: "Evaluation readiness confirmed",
    sectionId: "commercial_signals",
    satisfied: (t, existing) =>
      fieldIsPopulated(String(existing?.provider_evaluation_openness ?? "")) ||
      /\b(will\s+run\s+a\s+trial|ready\s+to\s+evaluate|evaluation\s+approved|trial\s+approved)\b/i.test(t),
  },
  {
    id: "scheduling_owner",
    label: "Scheduling owner / coordinator named",
    sectionId: "observation_readiness",
    satisfied: (t, existing) =>
      fieldIsPopulated(String(existing?.provider_observation_coordinator_contact ?? "")) ||
      (/\b(coordinator|scheduler)\b/i.test(t) &&
        (/\b(named|contact\s+is|handles\s+scheduling|approv(e|al|es)\s+observation)\b/i.test(t) ||
          /\b(coordinator|scheduler)\s+(is\s+)?[A-Z][a-z]{2,}\b/.test(t))),
  },
];

const GAP_BY_ID = new Map(LOG_UPDATE_GAP_CATALOG.map((g) => [g.id, g]));

const SECTION_FOR_DB_KEY: Record<string, ProviderIntelligenceSectionId> = {
  provider_observation_access_path: "observation_readiness",
  provider_observation_coordinator_contact: "observation_readiness",
  provider_observation_feasibility: "observation_readiness",
  provider_observation_credentialing_needed: "observation_readiness",
  provider_observation_best_days_case_types: "observation_readiness",
  provider_credentialing_status: "or_environment",
  provider_procedure_focus: "clinical_workflow",
  provider_technique_preferences: "clinical_workflow",
  provider_case_volume_estimate: "clinical_workflow",
  provider_workflow_pain_points: "clinical_workflow",
  provider_or_team_dynamics: "or_environment",
  provider_current_vendors: "or_environment",
  provider_decision_maker_status: "relationship_intelligence",
  provider_preference_card_signals: "commercial_signals",
  provider_evaluation_openness: "commercial_signals",
  provider_communication_style: "relationship_intelligence",
  provider_responsiveness: "relationship_intelligence",
  provider_follow_up_approach: "relationship_intelligence",
};

type PartialRule = {
  gapId: LogUpdateGapId;
  when: (ctx: InferenceContext) => boolean;
  reason: (ctx: InferenceContext) => string;
};

type InferenceContext = {
  text: string;
  existing: Record<string, string>;
  updatedDbKeys: Set<string>;
  gapConfirmed: Set<LogUpdateGapId>;
};

function gapConfirmed(ctx: InferenceContext, id: LogUpdateGapId): boolean {
  return ctx.gapConfirmed.has(id);
}

const PARTIAL_RULES: PartialRule[] = [
  {
    gapId: "vendor_credentialing_status",
    when: (ctx) =>
      !gapConfirmed(ctx, "vendor_credentialing_status") &&
      (ctx.updatedDbKeys.has("provider_observation_access_path") ||
        ctx.updatedDbKeys.has("provider_observation_credentialing_needed") ||
        ctx.updatedDbKeys.has("provider_credentialing_status") ||
        (ctx.updatedDbKeys.has("provider_observation_feasibility") &&
          /\b(credential|after\s+credential|pending|complete)\b/i.test(ctx.text))),
    reason: () => "Access or observation pathway references credentialing — status not fully confirmed yet.",
  },
  {
    gapId: "credentialing_turnaround",
    when: (ctx) =>
      !gapConfirmed(ctx, "credentialing_turnaround") &&
      (ctx.updatedDbKeys.has("provider_credentialing_status") ||
        /\b(credential|vendor\s+clearance)\b/i.test(ctx.text)),
    reason: () => "Credentialing is in play — turnaround timing was not specified.",
  },
  {
    gapId: "scheduling_owner",
    when: (ctx) =>
      !gapConfirmed(ctx, "scheduling_owner") &&
      (ctx.updatedDbKeys.has("provider_observation_access_path") ||
        /\b(coordinator|scheduler)\b/i.test(ctx.text) ||
        (ctx.updatedDbKeys.has("provider_observation_coordinator_contact") &&
          !/\b([A-Z][a-z]{2,}|maria|john|dr\.)\b/i.test(ctx.text))),
    reason: () => "Scheduling role mentioned — specific owner or contact not fully captured.",
  },
  {
    gapId: "best_days",
    when: (ctx) =>
      !gapConfirmed(ctx, "best_days") &&
      (ctx.updatedDbKeys.has("provider_procedure_focus") ||
        ctx.updatedDbKeys.has("provider_technique_preferences") ||
        ctx.updatedDbKeys.has("provider_case_volume_estimate")),
    reason: () => "Clinical workflow signal captured — best OR days or posting window still open.",
  },
  {
    gapId: "observation_cadence",
    when: (ctx) =>
      !gapConfirmed(ctx, "observation_cadence") &&
      (ctx.updatedDbKeys.has("provider_observation_access_path") ||
        ctx.updatedDbKeys.has("provider_observation_feasibility") ||
        ctx.updatedDbKeys.has("provider_observation_best_days_case_types")),
    reason: () => "Observation logistics partially mapped — cadence not stated.",
  },
  {
    gapId: "evaluation_readiness",
    when: (ctx) =>
      !gapConfirmed(ctx, "evaluation_readiness") &&
      (ctx.updatedDbKeys.has("provider_decision_maker_status") ||
        ctx.updatedDbKeys.has("provider_preference_card_signals")),
    reason: () => "Buying process signal captured — trial or evaluation readiness not explicit.",
  },
  {
    gapId: "credentialing_turnaround",
    when: (ctx) =>
      !gapConfirmed(ctx, "credentialing_turnaround") &&
      ctx.updatedDbKeys.has("provider_observation_feasibility") &&
      /\b(only\s+after|pending|waiting|in\s+progress)\b/i.test(ctx.text),
    reason: () => "Observation is conditional — credentialing timeline still worth confirming.",
  },
];

function relatedAreasFromContext(ctx: InferenceContext): string[] {
  const areas = new Set<string>();
  for (const dbKey of ctx.updatedDbKeys) {
    const section = SECTION_FOR_DB_KEY[dbKey];
    if (section) areas.add(PROVIDER_INTELLIGENCE_SECTION_LABELS[section]);
  }
  for (const gap of LOG_UPDATE_GAP_CATALOG) {
    if (ctx.gapConfirmed.has(gap.id)) {
      areas.add(PROVIDER_INTELLIGENCE_SECTION_LABELS[gap.sectionId]);
    }
  }
  return [...areas];
}

export function buildLogUpdateIntelligenceReview(
  text: string,
  fieldUpdates: LogUpdateRoutedFieldUpdate[],
  existingFields?: Record<string, string>,
): LogUpdateIntelligenceReview {
  const existing = existingFields ?? {};
  const trimmed = text.trim();
  const acceptedUpdates = fieldUpdates.filter((u) => u.accepted);
  const updatedDbKeys = new Set(acceptedUpdates.map((u) => u.dbKey));

  const gapConfirmed = new Set<LogUpdateGapId>();
  for (const gap of LOG_UPDATE_GAP_CATALOG) {
    if (gap.satisfied(trimmed, existing)) gapConfirmed.add(gap.id);
  }

  if (
    updatedDbKeys.has("provider_observation_coordinator_contact") ||
    (/\b(coordinator|scheduler)\b/i.test(trimmed) &&
      updatedDbKeys.has("provider_observation_access_path"))
  ) {
    gapConfirmed.add("scheduling_owner");
  }

  if (updatedDbKeys.has("provider_credentialing_status")) {
    gapConfirmed.add("vendor_credentialing_status");
  }

  if (updatedDbKeys.has("provider_observation_best_days_case_types")) {
    gapConfirmed.add("best_days");
  }

  const ctx: InferenceContext = { text: trimmed, existing, updatedDbKeys, gapConfirmed };

  const confirmedFromFields = acceptedUpdates.map((u) => u.label);
  const confirmedFromGaps = LOG_UPDATE_GAP_CATALOG.filter(
    (g) => gapConfirmed.has(g.id) && !confirmedFromFields.some((l) => l.toLowerCase().includes(g.label.toLowerCase().slice(0, 12))),
  ).map((g) => g.label);

  const confirmedUpdates = [...confirmedFromFields, ...confirmedFromGaps];

  const partiallyConfirmed: LogUpdatePartiallyConfirmedItem[] = [];
  const partialGapIds = new Set<LogUpdateGapId>();

  for (const rule of PARTIAL_RULES) {
    if (!rule.when(ctx) || partialGapIds.has(rule.gapId) || gapConfirmed.has(rule.gapId)) continue;
    const gap = GAP_BY_ID.get(rule.gapId);
    if (!gap) continue;
    partialGapIds.add(rule.gapId);
    partiallyConfirmed.push({ label: gap.label, reason: rule.reason(ctx) });
  }

  const addPartial = (gapId: LogUpdateGapId, reason: string) => {
    if (gapConfirmed.has(gapId) || partialGapIds.has(gapId)) return;
    const gap = GAP_BY_ID.get(gapId);
    if (!gap) return;
    partialGapIds.add(gapId);
    partiallyConfirmed.push({ label: gap.label, reason });
  };

  if (/\b(coordinator|scheduler)\b/i.test(trimmed)) {
    addPartial(
      "scheduling_owner",
      "Scheduling role mentioned — specific owner or contact not fully captured.",
    );
  }
  if (
    ctx.updatedDbKeys.has("provider_observation_credentialing_needed") ||
    (ctx.updatedDbKeys.has("provider_observation_feasibility") && /\bcredential/i.test(trimmed))
  ) {
    addPartial(
      "vendor_credentialing_status",
      "Credentialing gates the pathway — clearance status not fully confirmed yet.",
    );
  }

  // Contradiction guard: a gap proposed as resolved by this review's field
  // updates (accepted or not) must not also render as "still to confirm".
  const stillWorthConfirming = removeResolvedIntelligenceGaps(
    LOG_UPDATE_GAP_CATALOG.filter(
      (g) => !gapConfirmed.has(g.id) && !partialGapIds.has(g.id),
    ).map((g) => g.label),
    {
      fieldUpdates: fieldUpdates.map((u) => ({ dbKey: u.dbKey, proposedValue: u.proposedValue })),
    },
  );

  const relatedOperationalAreas = relatedAreasFromContext(ctx);

  return {
    confirmedUpdates,
    partiallyConfirmed,
    stillWorthConfirming,
    relatedOperationalAreas,
  };
}

/** @deprecated Use buildLogUpdateIntelligenceReview().stillWorthConfirming */
export function stillWorthConfirmingFromLogUpdate(
  text: string,
  existingFields?: Record<string, string>,
  fieldUpdates: LogUpdateRoutedFieldUpdate[] = [],
): string[] {
  return buildLogUpdateIntelligenceReview(text, fieldUpdates, existingFields).stillWorthConfirming;
}

export function operationalAreaLabelForDbKey(dbKey: string): string | null {
  const section = SECTION_FOR_DB_KEY[dbKey];
  return section ? PROVIDER_INTELLIGENCE_SECTION_LABELS[section] : fieldLabelForDbKey(dbKey);
}
