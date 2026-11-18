/**
 * Evaluation pipeline stages (stored in sales_opportunities.stage).
 * Legacy stage slugs are mapped via LEGACY_OPPORTUNITY_STAGE_MAP — never delete old DB values
 * without running the compatibility migration; runtime normalization handles stragglers.
 */

export const SALES_STAGES = [
  "discovery",
  "clinical_validation",
  "evaluation_planned",
  "evaluation_active",
  "outcome_review",
  "preference_card_progress",
  "adoption_expanding",
  "won",
  "lost",
] as const;

export type SalesStage = (typeof SALES_STAGES)[number];

/** Active pipeline (excludes terminal won/lost). */
export const OPEN_SALES_STAGES = [
  "discovery",
  "clinical_validation",
  "evaluation_planned",
  "evaluation_active",
  "outcome_review",
  "preference_card_progress",
  "adoption_expanding",
] as const;

export type OpenSalesStage = (typeof OPEN_SALES_STAGES)[number];

/** Ordered progression for funnel, board columns, and progress UI (excludes lost). */
export const SALES_PIPELINE_FLOW: SalesStage[] = [
  "discovery",
  "clinical_validation",
  "evaluation_planned",
  "evaluation_active",
  "outcome_review",
  "preference_card_progress",
  "adoption_expanding",
  "won",
];

/** All stages in display order (includes lost). */
export const SALES_FUNNEL_STAGE_ORDER: SalesStage[] = [...SALES_STAGES];

/**
 * Maps historical stage slugs → canonical stage (v1 CRM + v2 surgical workflow).
 * Add-only; do not remove keys so old rows and cached payloads still resolve.
 */
export const LEGACY_OPPORTUNITY_STAGE_MAP: Record<string, SalesStage> = {
  new_lead: "discovery",
  demo_scheduled: "evaluation_planned",
  trial_running: "evaluation_active",
  contract_review: "outcome_review",
  closed_won: "won",
  case_observations: "clinical_validation",
  validate_clinical_needs: "clinical_validation",
  secure_trial_evaluation_cases: "evaluation_active",
  present_data_tell_story: "outcome_review",
  won_update_pref_card: "preference_card_progress",
  closed_lost: "lost",
};

const UNKNOWN_STAGE_STYLE = {
  bg: "rgba(100, 116, 139, 0.12)",
  fg: "#475569",
  border: "rgba(100, 116, 139, 0.35)",
} as const;

export const SALES_STAGE_LABEL: Record<SalesStage, string> = {
  discovery: "Discovery",
  clinical_validation: "Clinical Validation",
  evaluation_planned: "Evaluation Planned",
  evaluation_active: "Evaluation Active",
  outcome_review: "Outcome Review",
  preference_card_progress: "Preference Card Progress",
  adoption_expanding: "Adoption Expanding",
  won: "Won",
  lost: "Lost",
};

export const SALES_STAGE_STYLE: Record<SalesStage, { bg: string; fg: string; border: string }> = {
  discovery: { bg: "rgba(14, 165, 233, 0.12)", fg: "#0369a1", border: "rgba(14, 165, 233, 0.35)" },
  clinical_validation: { bg: "rgba(59, 130, 246, 0.12)", fg: "#1d4ed8", border: "rgba(59, 130, 246, 0.35)" },
  evaluation_planned: { bg: "rgba(99, 102, 241, 0.12)", fg: "#4338ca", border: "rgba(99, 102, 241, 0.35)" },
  evaluation_active: {
    bg: "rgba(245, 158, 11, 0.14)",
    fg: "#b45309",
    border: "rgba(245, 158, 11, 0.4)",
  },
  outcome_review: { bg: "rgba(139, 92, 246, 0.12)", fg: "#5b21b6", border: "rgba(139, 92, 246, 0.35)" },
  preference_card_progress: { bg: "rgba(6, 118, 71, 0.12)", fg: "var(--success)", border: "rgba(6, 118, 71, 0.4)" },
  adoption_expanding: { bg: "rgba(16, 185, 129, 0.12)", fg: "#047857", border: "rgba(16, 185, 129, 0.35)" },
  won: { bg: "rgba(6, 118, 71, 0.16)", fg: "var(--success)", border: "rgba(6, 118, 71, 0.45)" },
  lost: { bg: "rgba(180, 35, 24, 0.08)", fg: "var(--danger)", border: "rgba(180, 35, 24, 0.25)" },
};

/** Default win probability by stage (hygiene / list UI). */
export const SALES_STAGE_PROBABILITY: Record<SalesStage, number> = {
  discovery: 10,
  clinical_validation: 20,
  evaluation_planned: 35,
  evaluation_active: 50,
  outcome_review: 65,
  preference_card_progress: 80,
  adoption_expanding: 90,
  won: 100,
  lost: 0,
};

export function normalizeSalesStage(raw: string | null | undefined): SalesStage | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if ((SALES_STAGES as readonly string[]).includes(s)) return s as SalesStage;
  return LEGACY_OPPORTUNITY_STAGE_MAP[s] ?? null;
}

export function parseSalesStage(raw: string | null | undefined): SalesStage | null {
  return normalizeSalesStage(raw);
}

export function isOpenSalesStage(s: string | null | undefined): s is OpenSalesStage {
  const n = normalizeSalesStage(s);
  return !!n && (OPEN_SALES_STAGES as readonly string[]).includes(n);
}

export function isWonStage(s: string | null | undefined): boolean {
  return normalizeSalesStage(s) === "won";
}

export function isLostStage(s: string | null | undefined): boolean {
  return normalizeSalesStage(s) === "lost";
}

export function isClosedStage(s: string | null | undefined): boolean {
  const n = normalizeSalesStage(s);
  return n === "won" || n === "lost";
}

/** Won or post-win adoption stages (includes legacy slugs via normalize). */
export function isAdoptionSuccessStage(s: string | null | undefined): boolean {
  const n = normalizeSalesStage(s);
  return n === "won" || n === "preference_card_progress" || n === "adoption_expanding";
}

export function parseSalesStageOrDefault(raw: string | null | undefined): SalesStage {
  return normalizeSalesStage(raw) ?? "discovery";
}

/** User-facing label; unknown legacy/unmapped values are title-cased, not dropped. */
export function salesStageLabel(raw: string | null | undefined): string {
  const canonical = normalizeSalesStage(raw);
  if (canonical) return SALES_STAGE_LABEL[canonical];
  const key = String(raw ?? "").trim();
  if (!key) return "—";
  if (LEGACY_OPPORTUNITY_STAGE_MAP[key]) {
    return SALES_STAGE_LABEL[LEGACY_OPPORTUNITY_STAGE_MAP[key]!];
  }
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function salesStageStyle(raw: string | null | undefined): { bg: string; fg: string; border: string } {
  const canonical = normalizeSalesStage(raw);
  if (canonical) return SALES_STAGE_STYLE[canonical];
  return UNKNOWN_STAGE_STYLE;
}

export function pipelineStageIndex(raw: string | null | undefined): number {
  const n = normalizeSalesStage(raw);
  if (!n) return -1;
  return SALES_PIPELINE_FLOW.indexOf(n);
}

export function pipelineStageAfter(raw: string | null | undefined): SalesStage | null {
  if (isLostStage(raw)) return null;
  const n = normalizeSalesStage(raw);
  if (!n) return null;
  const idx = SALES_PIPELINE_FLOW.indexOf(n);
  if (idx < 0 || idx >= SALES_PIPELINE_FLOW.length - 1) return null;
  return SALES_PIPELINE_FLOW[idx + 1] ?? null;
}
