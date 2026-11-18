/**
 * Structured Provider Intelligence capture — compact storage in existing text columns.
 *
 * Encoding:
 * - segmented / select: single token (e.g. `warm`, `restricted`)
 * - chips: comma-separated tokens (e.g. `laparoscopic,robotic`)
 * - *_plus_notes: `{tokens}|{notes}` where tokens use chip encoding
 * - Legacy freeform values without a matching token are shown in the notes area on edit.
 */

import { INTELLIGENCE_DISCOVERY_LABELS } from "@/lib/surgical-sales/providerIntelligenceDiscoveryLabels";
import { sanitizeOperationalDisplayText } from "@/lib/surgical-sales/operationalIntelligenceDisplay";

export type IntelligenceCaptureOption = { value: string; label: string };

/** Merge chip/option lists without duplicate `value` keys (React list keys). */
export function dedupeIntelligenceCaptureOptions(
  options: readonly IntelligenceCaptureOption[],
): IntelligenceCaptureOption[] {
  const byValue = new Map<string, IntelligenceCaptureOption>();
  for (const opt of options) {
    byValue.set(opt.value, opt);
  }
  return [...byValue.values()];
}

export type IntelligenceCaptureInput =
  | "select"
  | "segmented"
  | "chips"
  | "segmented_plus_notes"
  | "chips_plus_notes"
  | "compact_text"
  | "textarea";

export type IntelligenceCaptureSpec = {
  input: IntelligenceCaptureInput;
  options?: IntelligenceCaptureOption[];
  suggestedChips?: IntelligenceCaptureOption[];
  /** Rep-facing label above quick-pick chips (not a form field name). */
  suggestedChipsLabel?: string;
  /** Tactical helper under chip quick picks. */
  suggestedChipsHelper?: string;
  notesLabel?: string;
  notesPlaceholder?: string;
  compactPlaceholder?: string;
  /** Treat these token values as empty for completion scoring */
  emptyTokens?: string[];
};

const EMPTY_DEFAULT = ["unknown", ""];

/** Segmented/chip option when the rep has not captured a signal yet (stored token stays `unknown`). */
export const INTELLIGENCE_CAPTURE_UNSET_OPTION: IntelligenceCaptureOption = {
  value: "unknown",
  label: INTELLIGENCE_DISCOVERY_LABELS.notCapturedYet,
};

export const PREFERRED_MODALITY_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "open", label: "Open" },
  { value: "laparoscopic", label: "Laparoscopic" },
  { value: "robotic", label: "Robotic" },
  { value: "hybrid", label: "Hybrid" },
  { value: "single_port", label: "Single-port" },
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
];

export const OBSERVATION_ACCESS_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "easy", label: "Allowed" },
  { value: "restricted", label: "Restricted" },
  { value: "credentialing_required", label: "Not until credentialed" },
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
];

/** Discovery Mapping drawer — rep validation picks (no “not captured” chip). */
export const OBSERVATION_ACCESS_DISCOVERY_MAPPING_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "easy", label: "Allowed" },
  { value: "restricted", label: "Restricted" },
  { value: "credentialing_required", label: "Only after credentialing" },
  { value: "still_learning", label: "Still learning" },
];

export function operationalStatusForObservationAccessChoice(value: string): "cleared" | "in_progress" {
  if (value === "easy") return "cleared";
  return "in_progress";
}

export const OBSERVATION_CADENCE_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "per_case", label: "Per case" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "ad_hoc", label: "Ad hoc only" },
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
];

/** Stored when rep confirms no OR blockers (mutually exclusive with constraint chips). */
export const OR_ACCESS_CONSTRAINT_NONE_TOKEN = "none";

const OR_ACCESS_CONSTRAINT_CHIP_VALUES = new Set(
  [
    "committee",
    "credentialing",
    "rep_limit",
    "teaching_only",
    "trial_block",
    "scheduler",
  ] as const,
);

const OR_ACCESS_CONSTRAINT_CHIPS: IntelligenceCaptureOption[] = [
  { value: OR_ACCESS_CONSTRAINT_NONE_TOKEN, label: "No major gates mentioned" },
  { value: "committee", label: "Committee approval" },
  { value: "credentialing", label: "Credentialing gate" },
  { value: "rep_limit", label: "Rep count limit" },
  { value: "teaching_only", label: "Teaching cases only" },
  { value: "trial_block", label: "Trial product blocked" },
  { value: "scheduler", label: "Scheduler must approve" },
];

/** Toggle chips for `provider_observation_access_path` (None vs blockers; path chips independent). */
export function toggleProviderObservationAccessPathChips(
  selected: readonly string[],
  toggledValue: string,
): string[] {
  const set = new Set(selected);
  if (toggledValue === OR_ACCESS_CONSTRAINT_NONE_TOKEN) {
    if (set.has(OR_ACCESS_CONSTRAINT_NONE_TOKEN)) {
      set.delete(OR_ACCESS_CONSTRAINT_NONE_TOKEN);
      return [...set];
    }
    for (const v of OR_ACCESS_CONSTRAINT_CHIP_VALUES) set.delete(v);
    set.add(OR_ACCESS_CONSTRAINT_NONE_TOKEN);
    return [...set];
  }
  set.delete(OR_ACCESS_CONSTRAINT_NONE_TOKEN);
  if (set.has(toggledValue)) set.delete(toggledValue);
  else set.add(toggledValue);
  return [...set];
}

const BEST_DAYS_CASE_CHIPS: IntelligenceCaptureOption[] = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "elective", label: "Elective block" },
  { value: "high_volume", label: "High-volume day" },
  { value: "teaching", label: "Teaching case" },
  { value: "robotic", label: "Robotic case" },
];

export const RELATIONSHIP_WARMTH_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "cold", label: "Cold" },
  { value: "neutral", label: "Neutral" },
  { value: "warm", label: "Warm" },
  { value: "advocate", label: "Advocate" },
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
];

export const CASE_VOLUME_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "very_high", label: "Very high" },
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
];

export const EVALUATION_OPENNESS_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "closed", label: "Closed" },
  { value: "cautious", label: "Cautious" },
  { value: "open", label: "Open" },
  { value: "trial_ready", label: "Trial-ready" },
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
];

export const CHAMPION_POTENTIAL_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
];

export const DECISION_MAKER_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "yes", label: "Decision maker" },
  { value: "influencer", label: "Influencer only" },
  { value: "no", label: "Not a DM" },
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
];

export const FOLLOW_UP_APPROACH_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "email", label: "Email-first" },
  { value: "in_person", label: "In person" },
  { value: "coordinator", label: "Via coordinator" },
  { value: "ehr_portal", label: "EHR / portal" },
  { value: "mixed", label: "Mixed" },
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
];

export const STRATEGIC_OBJECTIVE_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "land_trial", label: "Land trial" },
  { value: "expand_share", label: "Expand share" },
  { value: "maintain", label: "Maintain" },
  { value: "explore", label: "Explore fit" },
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
];

export const CONTACT_CHANNEL_OPTIONS: IntelligenceCaptureOption[] = [
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "text", label: "Text" },
  { value: "in_person", label: "In person" },
];

export const INFLUENCE_LEVEL_OPTIONS: IntelligenceCaptureOption[] = [
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const CREDENTIALING_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "cleared", label: "Cleared" },
  { value: "in_progress", label: "In progress" },
  { value: "required", label: "Gate before access" },
  { value: "blocked", label: "Not available for access" },
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
];

export const RESPONSIVENESS_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "fast", label: "Fast" },
  { value: "same_day", label: "Same day" },
  { value: "slow", label: "Slow" },
  { value: "inconsistent", label: "Inconsistent" },
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
];

export const SUPPORT_EXPECTATIONS_OPTIONS: IntelligenceCaptureOption[] = [
  { value: "high_touch", label: "High touch" },
  { value: "standard", label: "Standard" },
  { value: "minimal", label: "Minimal" },
  { value: "rep_led", label: "Rep-led" },
  INTELLIGENCE_CAPTURE_UNSET_OPTION,
];

const WORKFLOW_PAIN_CHIPS: IntelligenceCaptureOption[] = [
  { value: "turnover", label: "Turnover" },
  { value: "staffing", label: "Staffing" },
  { value: "supply", label: "Supply" },
  { value: "scheduling", label: "Scheduling" },
  { value: "documentation", label: "Documentation" },
  { value: "training", label: "Training gap" },
];

const TECHNIQUE_DETAIL_CHIPS: IntelligenceCaptureOption[] = [
  { value: "standard_lap", label: "Standard lap" },
  { value: "reduced_port", label: "Reduced port" },
  { value: "hand_assisted", label: "Hand assisted" },
  { value: "retrograde", label: "Retrograde" },
  { value: "custom_tray", label: "Custom tray" },
];

const DISSATISFACTION_CHIPS: IntelligenceCaptureOption[] = [
  { value: "price", label: "Price" },
  { value: "outcomes", label: "Outcomes" },
  { value: "service", label: "Service" },
  { value: "supply", label: "Supply" },
  { value: "training", label: "Training" },
  { value: "access", label: "Access" },
];

const IDEAL_CASE_CHIPS: IntelligenceCaptureOption[] = [
  { value: "high_volume", label: "High volume" },
  { value: "complex", label: "Complex" },
  { value: "teaching", label: "Teaching" },
  { value: "trial_friendly", label: "Trial friendly" },
  { value: "robotic", label: "Robotic" },
  { value: "open", label: "Open" },
];

/** Access routes only — constraint gates live in OR_ACCESS_CONSTRAINT_CHIPS. */
const ACCESS_PATH_CHIPS: IntelligenceCaptureOption[] = [
  { value: "coordinator", label: "OR coordinator" },
  { value: "surgeon_direct", label: "Surgeon direct" },
];

const VALIDATION_QUESTION_CHIPS: IntelligenceCaptureOption[] = [
  { value: "workflow_fit", label: "Workflow fit" },
  { value: "fixation", label: "Fixation approach" },
  { value: "competitor_gap", label: "Competitor gap" },
  { value: "economic_driver", label: "Economic driver" },
  { value: "champion_path", label: "Champion path" },
];

const PROCEDURE_FOCUS_CHIPS: IntelligenceCaptureOption[] = [
  { value: "hernia", label: "Hernia" },
  { value: "bariatric", label: "Bariatric" },
  { value: "colorectal", label: "Colorectal" },
  { value: "general_mis", label: "General MIS" },
  { value: "wound", label: "Wound" },
  { value: "orthopedics", label: "Orthopedics" },
  { value: "spine", label: "Spine" },
  { value: "thoracic", label: "Thoracic" },
];

const PRODUCT_INTEREST_CHIPS: IntelligenceCaptureOption[] = [
  { value: "acsis", label: "ACSIS" },
  { value: "biotissue", label: "BioTissue" },
  { value: "derm", label: "Derm" },
  { value: "wound_care", label: "Wound care" },
  { value: "orthopedics", label: "Orthopedics" },
];

const VENDOR_CHIPS: IntelligenceCaptureOption[] = [
  { value: "ethicon", label: "Ethicon" },
  { value: "medtronic", label: "Medtronic" },
  { value: "stryker", label: "Stryker" },
  { value: "arthrex", label: "Arthrex" },
  { value: "covidien", label: "Covidien / Medtronic" },
  { value: "local_preference", label: "Hospital preference" },
];

const COMPETITOR_CHIPS: IntelligenceCaptureOption[] = [
  { value: "ethicon", label: "Ethicon" },
  { value: "medtronic", label: "Medtronic" },
  { value: "stryker", label: "Stryker" },
  { value: "arthrex", label: "Arthrex" },
  { value: "covidien", label: "Covidien" },
];

const PREFERENCE_CARD_CHIPS: IntelligenceCaptureOption[] = [
  { value: "standardized", label: "Standardized card" },
  { value: "rep_driven", label: "Rep-driven" },
  { value: "committee", label: "Committee review" },
  { value: "price_sensitive", label: "Price sensitive" },
  { value: "surgeon_led", label: "Surgeon preference-led" },
];

export const PROVIDER_INTELLIGENCE_CAPTURE_SPECS: Record<string, IntelligenceCaptureSpec> = {
  provider_procedure_focus: {
    input: "chips_plus_notes",
    suggestedChips: PROCEDURE_FOCUS_CHIPS,
    notesLabel: "Procedure notes",
    notesPlaceholder: "Subspecialty nuance or priority procedures",
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_case_volume_estimate: {
    input: "segmented",
    options: CASE_VOLUME_OPTIONS,
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_technique_preferences: {
    input: "chips",
    suggestedChips: PREFERRED_MODALITY_OPTIONS.filter((o) => o.value !== "unknown"),
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_technique_detail: {
    input: "chips_plus_notes",
    suggestedChips: TECHNIQUE_DETAIL_CHIPS,
    notesLabel: "Technique notes",
    notesPlaceholder: "Docking, approach, or instrument detail",
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_workflow_pain_points: {
    input: "chips_plus_notes",
    suggestedChips: WORKFLOW_PAIN_CHIPS,
    notesLabel: "Pain point notes",
    notesPlaceholder: "Where friction shows up in clinic or OR",
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_or_team_dynamics: {
    input: "textarea",
    notesPlaceholder: "PA flow, turnover, who runs the room",
  },
  provider_credentialing_status: {
    input: "segmented",
    options: CREDENTIALING_OPTIONS,
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_support_expectations: {
    input: "segmented",
    options: SUPPORT_EXPECTATIONS_OPTIONS,
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_responsiveness: {
    input: "segmented",
    options: RESPONSIVENESS_OPTIONS,
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_dissatisfaction_areas: {
    input: "chips_plus_notes",
    suggestedChips: DISSATISFACTION_CHIPS,
    notesLabel: "Dissatisfaction notes",
    notesPlaceholder: "Specific products, vendors, or workflows",
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_observation_feasibility: {
    input: "segmented",
    options: OBSERVATION_ACCESS_OPTIONS,
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_observation_credentialing_needed: {
    input: "segmented",
    options: CREDENTIALING_OPTIONS,
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_ideal_observation_cases: {
    input: "chips_plus_notes",
    suggestedChips: dedupeIntelligenceCaptureOptions([...IDEAL_CASE_CHIPS, ...PROCEDURE_FOCUS_CHIPS]),
    notesLabel: "Procedure notes",
    notesPlaceholder: "Specific procedures or case types to prioritize",
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_observation_access_path: {
    input: "chips_plus_notes",
    suggestedChipsLabel: "Barriers you've heard about",
    suggestedChipsHelper:
      "Tap gates mentioned in conversation — committees, credentialing, scheduler rules, rep limits.",
    suggestedChips: dedupeIntelligenceCaptureOptions([
      ...OR_ACCESS_CONSTRAINT_CHIPS,
      ...ACCESS_PATH_CHIPS,
    ]),
    notesLabel: "What you heard in the field",
    notesPlaceholder: "Who must approve, turnaround time, or political friction",
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_observation_coordinator_contact: {
    input: "compact_text",
    compactPlaceholder: "Name, role, email, or phone",
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_observation_cadence_preference: {
    input: "segmented",
    options: OBSERVATION_CADENCE_OPTIONS,
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_observation_best_days_case_types: {
    input: "chips_plus_notes",
    suggestedChips: BEST_DAYS_CASE_CHIPS,
    notesLabel: "Scheduling notes",
    notesPlaceholder: "Best days, rooms, or case types",
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_first_observation_questions: {
    input: "chips_plus_notes",
    suggestedChips: VALIDATION_QUESTION_CHIPS,
    notesLabel: "Additional questions",
    notesPlaceholder: "Hypotheses to confirm on observation",
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_evaluation_openness: {
    input: "segmented",
    options: EVALUATION_OPENNESS_OPTIONS,
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_preference_card_signals: {
    input: "chips_plus_notes",
    suggestedChips: PREFERENCE_CARD_CHIPS,
    notesLabel: "Barrier notes",
    notesPlaceholder: "Committee, SKU, or approval path",
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_current_vendors: {
    input: "chips_plus_notes",
    suggestedChipsLabel: "Vendors seen in cases",
    suggestedChipsHelper:
      "Tap vendors mentioned during discussion or already seen in cases.",
    suggestedChips: VENDOR_CHIPS,
    notesLabel: "What you noticed in the room",
    notesPlaceholder: "Who covers cases, how reps get in, what blocks another vendor",
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_competitive_products: {
    input: "chips",
    suggestedChips: COMPETITOR_CHIPS,
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_communication_style: {
    input: "segmented_plus_notes",
    options: RELATIONSHIP_WARMTH_OPTIONS,
    notesLabel: "Communication notes",
    notesPlaceholder: "Pace, detail level, or preferences",
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_follow_up_approach: {
    input: "segmented",
    options: FOLLOW_UP_APPROACH_OPTIONS,
    emptyTokens: EMPTY_DEFAULT,
  },
  influence_level: {
    input: "segmented",
    options: INFLUENCE_LEVEL_OPTIONS,
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_decision_maker_status: {
    input: "segmented",
    options: DECISION_MAKER_OPTIONS,
    emptyTokens: EMPTY_DEFAULT,
  },
  provider_champion_potential: {
    input: "segmented",
    options: CHAMPION_POTENTIAL_OPTIONS,
    emptyTokens: EMPTY_DEFAULT,
  },
};

export function intelligenceCaptureSpecForKey(dbKey: string): IntelligenceCaptureSpec | null {
  return PROVIDER_INTELLIGENCE_CAPTURE_SPECS[dbKey] ?? null;
}

export type ParsedIntelligenceCapture = {
  token: string | null;
  tokens: string[];
  notes: string;
  legacyText: string | null;
};

function optionValues(spec: IntelligenceCaptureSpec): Set<string> {
  const vals = new Set<string>();
  for (const o of spec.options ?? []) vals.add(o.value);
  for (const o of spec.suggestedChips ?? []) vals.add(o.value);
  return vals;
}

function splitStored(raw: string): { head: string; notes: string } {
  const pipe = raw.indexOf("|");
  if (pipe < 0) return { head: raw.trim(), notes: "" };
  return { head: raw.slice(0, pipe).trim(), notes: raw.slice(pipe + 1).trim() };
}

function parseChipTokens(head: string, allowed: Set<string>): { tokens: string[]; leftover: string } {
  const parts = head
    .split(/[,;]+/)
    .map((p) => p.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
  const tokens: string[] = [];
  const unknown: string[] = [];
  for (const part of parts) {
    if (allowed.has(part)) tokens.push(part);
    else unknown.push(part);
  }
  const leftover = unknown.length > 0 ? unknown.join(", ") : "";
  return { tokens, leftover };
}

export function parseIntelligenceCaptureValue(dbKey: string, raw: string | null | undefined): ParsedIntelligenceCapture {
  const spec = intelligenceCaptureSpecForKey(dbKey);
  const trimmed = String(raw ?? "").trim();
  if (!spec || !trimmed) {
    return { token: null, tokens: [], notes: "", legacyText: trimmed || null };
  }

  const allowed = optionValues(spec);
  const { head, notes: pipeNotes } = splitStored(trimmed);

  if (spec.input === "segmented" || spec.input === "select") {
    const token = allowed.has(head) ? head : null;
    return {
      token,
      tokens: token ? [token] : [],
      notes: pipeNotes,
      legacyText: token ? null : trimmed,
    };
  }

  if (spec.input === "chips") {
    const { tokens, leftover } = parseChipTokens(head, allowed);
    const mergedNotes = [pipeNotes, leftover].filter(Boolean).join(leftover && pipeNotes ? " · " : "");
    if (tokens.length === 0 && !mergedNotes) {
      return { token: null, tokens: [], notes: "", legacyText: trimmed };
    }
    return { token: null, tokens, notes: mergedNotes, legacyText: null };
  }

  if (spec.input === "segmented_plus_notes") {
    const token = allowed.has(head) ? head : null;
    const legacyNotes = [pipeNotes, token ? "" : head].filter(Boolean).join(" ").trim();
    return {
      token,
      tokens: token ? [token] : [],
      notes: token ? pipeNotes : legacyNotes,
      legacyText: token ? null : trimmed,
    };
  }

  if (spec.input === "chips_plus_notes") {
    const { tokens, leftover } = parseChipTokens(head, allowed);
    const mergedNotes = [pipeNotes, leftover].filter(Boolean).join(leftover && pipeNotes ? " · " : "");
    if (tokens.length === 0 && !mergedNotes) {
      return { token: null, tokens: [], notes: "", legacyText: trimmed };
    }
    return { token: null, tokens, notes: mergedNotes, legacyText: null };
  }

  return { token: null, tokens: [], notes: trimmed, legacyText: null };
}

export function serializeIntelligenceCaptureValue(
  dbKey: string,
  parsed: Pick<ParsedIntelligenceCapture, "token" | "tokens" | "notes">,
): string {
  const spec = intelligenceCaptureSpecForKey(dbKey);
  if (!spec) return String(parsed.notes ?? "").trim();

  const notes = String(parsed.notes ?? "").trim();
  const emptySet = new Set(spec.emptyTokens ?? EMPTY_DEFAULT);

  if (spec.input === "segmented" || spec.input === "select") {
    const token = parsed.token?.trim() || "";
    if (!token || emptySet.has(token)) return "";
    return token;
  }

  if (spec.input === "chips") {
    const tokens = parsed.tokens.filter((t) => t && !emptySet.has(t));
    if (tokens.length === 0) return "";
    return tokens.join(",");
  }

  if (spec.input === "segmented_plus_notes") {
    const token = parsed.token?.trim() || "";
    if (!token || emptySet.has(token)) return notes;
    return notes ? `${token}|${notes}` : token;
  }

  if (spec.input === "chips_plus_notes") {
    const tokens = parsed.tokens.filter((t) => t && !emptySet.has(t));
    if (tokens.length === 0) return notes;
    const head = tokens.join(",");
    return notes ? `${head}|${notes}` : head;
  }

  return notes;
}

export function labelForIntelligenceToken(
  dbKey: string,
  token: string,
): string {
  const spec = intelligenceCaptureSpecForKey(dbKey);
  if (!spec) return token;
  const hit =
    spec.options?.find((o) => o.value === token) ??
    spec.suggestedChips?.find((o) => o.value === token);
  return hit?.label ?? token.replace(/_/g, " ");
}

/** Short chip for collapsed section cards (tokens only — no notes). */
export function formatIntelligenceCaptureSummaryChip(
  dbKey: string,
  raw: unknown,
): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const spec = intelligenceCaptureSpecForKey(dbKey);
  if (!spec) {
    return trimmed.length > 36 ? `${trimmed.slice(0, 33)}…` : trimmed;
  }

  const parsed = parseIntelligenceCaptureValue(dbKey, trimmed);
  if (parsed.legacyText && !parsed.token && parsed.tokens.length === 0) {
    const text = parsed.legacyText;
    return text.length > 36 ? `${text.slice(0, 33)}…` : text;
  }

  const parts: string[] = [];
  if (parsed.token) parts.push(labelForIntelligenceToken(dbKey, parsed.token));
  for (const t of parsed.tokens) {
    const label = labelForIntelligenceToken(dbKey, t);
    if (!parts.includes(label)) parts.push(label);
    if (parts.length >= 2) break;
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Human-readable line for summaries and snapshots */
export function formatIntelligenceCaptureDisplay(dbKey: string, raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const spec = intelligenceCaptureSpecForKey(dbKey);
  if (!spec) return sanitizeOperationalDisplayText(trimmed);

  const parsed = parseIntelligenceCaptureValue(dbKey, trimmed);
  if (parsed.legacyText && !parsed.token && parsed.tokens.length === 0) {
    return parsed.legacyText;
  }

  const parts: string[] = [];
  if (parsed.token) parts.push(labelForIntelligenceToken(dbKey, parsed.token));
  for (const t of parsed.tokens) {
    const label = labelForIntelligenceToken(dbKey, t);
    if (!parts.includes(label)) parts.push(label);
  }
  if (parsed.notes) parts.push(parsed.notes);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function intelligenceCaptureHasSignal(dbKey: string, raw: string | null | undefined): boolean {
  const spec = intelligenceCaptureSpecForKey(dbKey);
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return false;
  if (!spec) return true;

  const parsed = parseIntelligenceCaptureValue(dbKey, trimmed);
  const emptySet = new Set(spec.emptyTokens ?? EMPTY_DEFAULT);

  if (parsed.legacyText && !parsed.token && parsed.tokens.length === 0 && !parsed.notes) {
    return true;
  }
  if (parsed.token && !emptySet.has(parsed.token)) return true;
  if (parsed.tokens.some((t) => !emptySet.has(t))) return true;
  if (parsed.notes.trim().length >= 3) return true;
  return false;
}
