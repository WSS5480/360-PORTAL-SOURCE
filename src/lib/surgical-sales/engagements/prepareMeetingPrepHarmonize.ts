import { buildPreparationContextView } from "@/lib/surgical-sales/engagements/engagementPreparationContextContent";
import type { EngagementPreparationContextState } from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import {
  isPreCallPlanProductLine,
  type PreCallPlanProductLine,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import type { DominantPrepGenerationFlags } from "@/lib/surgical-sales/engagements/engagementDominantPrepMode";
import { resolvePrepGenerationFlags } from "@/lib/surgical-sales/engagements/engagementDominantPrepMode";
import {
  buildIntroCallOfficialPreCallPlan,
  shouldUseIntroCallOfficialTemplates,
} from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import {
  INTRO_CALL_DISCOVERY_FOCUS_AREAS,
  type IntroCallDiscoveryFocusId,
} from "@/lib/surgical-sales/engagements/introCallDiscoveryFocus";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import type { PrepareRecommendedNextActions } from "@/lib/surgical-sales/engagements/prepareForMeetingRecommendedNextAction";
import type { PrepareRisksBarriers } from "@/lib/surgical-sales/engagements/prepareForMeetingRisksBarriers";
import type { PrepareSuggestedGoal } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedGoal";
import type { PrepareSuggestedTalkingPoints } from "@/lib/surgical-sales/engagements/prepareForMeetingTalkingPoints";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

export type PrepContentTheme =
  | "observation_access"
  | "vendor_credentialing"
  | "workflow_discovery"
  | "competitor"
  | "evaluation_path"
  | "political_relationship"
  | "stall_pipeline"
  | "pricing"
  | "procedure_profile";

const THEME_PATTERNS: Record<PrepContentTheme, RegExp> = {
  observation_access:
    /observation access|or access|in-room boundar|allow industry observation|observation is realistic|observation candidacy|block timing|coordinator approval|between cases/i,
  vendor_credentialing:
    /credentialing|vendor access|vendor presence|rep credentialing|approved for or|scheduler gate|map coordinator/i,
  workflow_discovery:
    /workflow|procedure profile|case mix|fixation|hernia|volume month|standard workflow|procedural standardization|or workflow inefficien/i,
  competitor:
    /competitor|incumbent|versus |vs\.|symbotic|medtronic|ethicon|stryker|on contract|preference card|current vendor/i,
  evaluation_path:
    /evaluation case|evaluation open|trial trigger|pilot case|formal evaluation|clinical validation/i,
  political_relationship:
    /weak relationship|do-not-contact|skeptic|reluctant|loyal|buy-?in|committee|purchasing|stall/i,
  stall_pipeline: /stalled|overdue|on hold|frozen|waiting on|follow-up overdue/i,
  pricing: /pricing|price concern|payer|formulary|value analysis/i,
  procedure_profile: /procedure focus|highest-volume|documented procedure/i,
};

/** In-meeting discovery — belongs in talking points or objectives, not post-meeting actions */
const IN_MEETING_NEXT_ACTIONS = new Set(
  [
    "Document OR workflow and procedural friction points",
    "Qualify observation candidacy (volume + case profile)",
    "Map coordinator and access barriers for OR observation",
  ].map((s) => s.toLowerCase()),
);

const OBSERVATION_ACCESS_TALKING_BLOCK =
  /observation access|or access reality|vendor access path|coordinator|credentialing|block timing|in-room boundar|signals that observation/i;

const WORKFLOW_STATEMENT_BLOCK =
  /^(highest-volume|or workflow inefficien|procedural standardization|whether observation access is realistic|vendor access path|evaluation openness)/i;

function normalizeCompare(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function classifyThemes(text: string): Set<PrepContentTheme> {
  const themes = new Set<PrepContentTheme>();
  const normalized = text.trim();
  if (!normalized) return themes;
  for (const [theme, pattern] of Object.entries(THEME_PATTERNS) as Array<[PrepContentTheme, RegExp]>) {
    if (pattern.test(normalized)) themes.add(theme);
  }
  return themes;
}

function sharesTheme(a: string, b: string): boolean {
  const ta = classifyThemes(a);
  const tb = classifyThemes(b);
  for (const t of ta) {
    if (tb.has(t)) return true;
  }
  return false;
}

function isSimilarLine(a: string, b: string): boolean {
  const na = normalizeCompare(a);
  const nb = normalizeCompare(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length >= nb.length ? na : nb;
  if (shorter.length > 16 && longer.includes(shorter.slice(0, Math.min(24, shorter.length)))) {
    return true;
  }
  return sharesTheme(a, b);
}

function isConversationalProbe(line: string): boolean {
  const t = line.trim();
  if (!t || t.length < 12) return false;
  if (t.endsWith("?")) return true;
  if (/^(which|what|who|where|how|when|why)\b/i.test(t)) return true;
  return false;
}

function introFocusSuccessOutcome(focusId: IntroCallDiscoveryFocusId): string {
  const area = INTRO_CALL_DISCOVERY_FOCUS_AREAS.find((a) => a.id === focusId);
  return area?.success_outcome ?? INTRO_CALL_DISCOVERY_FOCUS_AREAS[0].success_outcome;
}

function pickIntroCallSuccessOutcome(input: {
  prepContextState: EngagementPreparationContextState;
  dominantPrep?: DominantPrepGenerationFlags;
  knownIntelligence: PrepareKnownIntelligence;
  intentionalProductFocus?: boolean;
  productLine?: PreCallPlanProductLine | "" | null;
}): string {
  const resolvedLine: PreCallPlanProductLine | "" =
    input.dominantPrep?.product_line ??
    (isPreCallPlanProductLine(String(input.productLine ?? "").trim()) ? input.productLine! : "");
  const flags = resolvePrepGenerationFlags({
    dominantPrep: input.dominantPrep,
    productLine: resolvedLine,
    prepContextState: input.prepContextState,
    intentionalProductFocus: input.intentionalProductFocus,
    engagementType: "intro_call",
  });

  if (flags.prep_mode === "observation_qualification") {
    return introFocusSuccessOutcome("observation_feasibility");
  }

  const intelBlob = input.knownIntelligence.bullets.map((b) => b.value).join(" ");
  if (/access|coordinator|credential|block|vendor days/i.test(intelBlob)) {
    return introFocusSuccessOutcome("vendor_access");
  }
  if (/competitor|symbotic|medtronic|ethicon|on contract/i.test(intelBlob)) {
    return introFocusSuccessOutcome("evaluation_openness");
  }

  const ctx = buildPreparationContextView(input.prepContextState);
  if (input.prepContextState === "product_exploration" && flags.product_line) {
    return ctx.success_outcomes[0] ?? introFocusSuccessOutcome("procedural_workflow");
  }
  if (input.prepContextState === "evaluation_planning") {
    return ctx.success_outcomes[0] ?? introFocusSuccessOutcome("evaluation_openness");
  }
  if (input.prepContextState === "observation_support") {
    return ctx.success_outcomes[0] ?? introFocusSuccessOutcome("observation_feasibility");
  }

  return introFocusSuccessOutcome("procedural_workflow");
}

function filterTalkingPoints(
  points: string[],
  goal: string,
  risks: PrepareRisksBarriers,
  max: number,
): string[] {
  const riskLabels = risks.risks.map((r) => r.label);
  const hasAccessRisk = risks.risks.some((r) => r.key === "limited_or_access");
  const out: string[] = [];

  for (const raw of points) {
    if (out.length >= max) break;
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line || line.length < 12) continue;
    if (isSimilarLine(line, goal)) continue;
    if (riskLabels.some((r) => isSimilarLine(line, r))) continue;
    if (hasAccessRisk && OBSERVATION_ACCESS_TALKING_BLOCK.test(line)) continue;
    if (WORKFLOW_STATEMENT_BLOCK.test(line) && !line.endsWith("?")) continue;
    if (out.some((existing) => isSimilarLine(existing, line))) continue;
    out.push(line);
  }

  return out;
}

function preferDiscoveryProbes(
  discoveryQuestions: string[],
  talkingPoints: string[],
  goal: string,
  risks: PrepareRisksBarriers,
  max: number,
): string[] {
  const merged: string[] = [];
  for (const q of discoveryQuestions) {
    if (merged.length >= max) break;
    const clean = q.replace(/\s+/g, " ").trim();
    if (!isConversationalProbe(clean)) continue;
    if (isSimilarLine(clean, goal)) continue;
    if (merged.some((m) => isSimilarLine(m, clean))) continue;
    merged.push(clean);
  }
  for (const p of talkingPoints) {
    if (merged.length >= max) break;
    const clean = p.replace(/\s+/g, " ").trim();
    if (!isConversationalProbe(clean)) continue;
    if (merged.some((m) => isSimilarLine(m, clean))) continue;
    merged.push(clean);
  }
  return filterTalkingPoints(merged, goal, risks, max);
}

function filterRisks(risks: PrepareRisksBarriers, goal: string, talkingPoints: string[]): PrepareRisksBarriers {
  const filtered: typeof risks.risks = [];
  const max = 6;

  for (const risk of risks.risks) {
    if (filtered.length >= max) break;
    if (isSimilarLine(risk.label, goal)) continue;
    if (talkingPoints.some((p) => isSimilarLine(p, risk.label))) {
      if (risk.key === "workflow_disruption" && !/skeptic|disruption|reluctant|switching/i.test(risk.label)) {
        continue;
      }
    }
    if (risk.key === "workflow_disruption") {
      const political =
        /skeptic|reluctant|switching|disruption|learning curve|training burden|committee|stall/i.test(
          risk.label,
        );
      if (!political) continue;
    }
    if (filtered.some((r) => r.key === risk.key)) continue;
    filtered.push(risk);
  }

  return { risks: filtered };
}

function filterNextActions(
  actions: PrepareRecommendedNextActions,
  goal: string,
  talkingPoints: string[],
  risks: PrepareRisksBarriers,
): PrepareRecommendedNextActions {
  const filtered: string[] = [];
  const max = 4;

  for (const action of actions.actions) {
    if (filtered.length >= max) break;
    const lower = action.toLowerCase();
    if (IN_MEETING_NEXT_ACTIONS.has(lower)) continue;
    if (isSimilarLine(action, goal)) continue;
    if (talkingPoints.some((p) => isSimilarLine(p, action))) continue;
    if (risks.risks.some((r) => isSimilarLine(r.label, action))) continue;
    if (filtered.some((a) => isSimilarLine(a, action))) continue;
    filtered.push(action);
  }

  if (filtered.length === 0) {
    filtered.push("Create follow-up task with date and owner");
    filtered.push("Capture provider intelligence after meeting");
  }

  return { actions: filtered.slice(0, max), primary_cta: actions.primary_cta };
}

export function harmonizePrepareMeetingPrepSections(input: {
  engagementType: string;
  prepContextState: EngagementPreparationContextState;
  dominantPrep?: DominantPrepGenerationFlags;
  intentionalProductFocus?: boolean;
  productLine?: PreCallPlanProductLine | "" | null;
  knownIntelligence: PrepareKnownIntelligence;
  suggested_goal: PrepareSuggestedGoal;
  discovery_questions?: string[];
  suggested_talking_points: PrepareSuggestedTalkingPoints;
  risks_barriers: PrepareRisksBarriers;
  recommended_next_actions: PrepareRecommendedNextActions;
}): {
  suggested_goal: PrepareSuggestedGoal;
  suggested_talking_points: PrepareSuggestedTalkingPoints;
  risks_barriers: PrepareRisksBarriers;
  recommended_next_actions: PrepareRecommendedNextActions;
} {
  const type = normalizeEngagementType(input.engagementType);
  const maxTalking = input.suggested_talking_points.points.length || 6;

  let goal = input.suggested_goal.goal;
  let why = input.suggested_goal.why;

  if (type === "intro_call") {
    const prepState =
      input.dominantPrep?.prep_context_state ?? input.prepContextState ?? "discovery";
    if (
      shouldUseIntroCallOfficialTemplates({
        engagementType: "intro_call",
        prepContextState: prepState,
        intentionalProductFocus: input.intentionalProductFocus,
        productLine: input.productLine,
      })
    ) {
      goal = buildIntroCallOfficialPreCallPlan({
        productLine: input.productLine,
        intentionalProductFocus: input.intentionalProductFocus,
        prepSpecializationTier: input.dominantPrep?.product_prep_tier,
        providerSpecialty: input.dominantPrep?.effective_specialty_key,
      }).smartObjective;
    } else {
      goal = pickIntroCallSuccessOutcome({
        prepContextState: input.prepContextState,
        dominantPrep: input.dominantPrep,
        knownIntelligence: input.knownIntelligence,
        intentionalProductFocus: input.intentionalProductFocus,
        productLine: input.productLine,
      });
    }
    const ctx = buildPreparationContextView(input.prepContextState);
    why = ctx.success_outcomes_lead;
  }

  let talkingPoints = input.suggested_talking_points.points;
  if (type === "intro_call" && input.discovery_questions?.length) {
    talkingPoints = preferDiscoveryProbes(
      input.discovery_questions,
      input.suggested_talking_points.points,
      goal,
      input.risks_barriers,
      maxTalking,
    );
  } else {
    talkingPoints = filterTalkingPoints(
      talkingPoints,
      goal,
      input.risks_barriers,
      maxTalking,
    );
  }

  const risks = filterRisks(input.risks_barriers, goal, talkingPoints);
  const next = filterNextActions(input.recommended_next_actions, goal, talkingPoints, risks);

  return {
    suggested_goal: { goal, why },
    suggested_talking_points: {
      points: talkingPoints,
      context_label: input.suggested_talking_points.context_label,
    },
    risks_barriers: risks,
    recommended_next_actions: next,
  };
}
