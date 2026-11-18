import { normalizeSalesStage, salesStageLabel, type SalesStage } from "@/lib/sales/stages";
import {
  ENGAGEMENT_TYPE_LABELS,
  formatEngagementType,
  normalizeEngagementType,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import {
  INTRO_CALL_WHY_BROAD_DISCOVERY,
  INTRO_CALL_WHY_THIS_MATTERS,
} from "@/lib/surgical-sales/engagements/introCallPreparationContent";
import { isBroadWorkflowDiscoveryPrep } from "@/lib/surgical-sales/engagements/engagementPrepMode";
import type { EngagementPreparationContextState } from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import type { DominantPrepGenerationFlags } from "@/lib/surgical-sales/engagements/engagementDominantPrepMode";
import { resolveEffectiveSpecialtyKeyForPrep } from "@/lib/surgical-sales/engagements/engagementDominantPrepMode";
import type { PreparationSpecializationTier } from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";
import { isIntroCallProductPrepEnabled } from "@/lib/surgical-sales/engagements/introCallProductContext";
import {
  buildIntroCallOfficialPreCallPlan,
  shouldUseIntroCallOfficialTemplates,
} from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import { buildIntroCallPathwaySuggestedGoal } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import {
  isPreCallPlanProductLine,
  type PreCallPlanProductLine,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";

export type PrepareSuggestedGoal = {
  goal: string;
  why: string;
};

type SpecialtyKey = "general_surgery" | "wound_care" | "orthopedics" | "default";

type SmartGoalContext = {
  engagementType: EngagementType | null;
  typeLabel: string;
  specialtyKey: SpecialtyKey;
  specialtyLabel: string | null;
  productLine: PreCallPlanProductLine | "";
  productLabel: string | null;
  stage: SalesStage | null;
  stageLabel: string | null;
  horizonDays: number;
  knownIntelligence: PrepareKnownIntelligence;
  prepContextState?: EngagementPreparationContextState;
  prepSpecializationTier?: PreparationSpecializationTier;
  intentionalProductFocus?: boolean;
  dominantPrep?: DominantPrepGenerationFlags;
};

const VAGUE_GOAL_PATTERNS =
  /establish relationship|product\/procedure fit|advance the engagement|identify product interest|create hands-on product experience|confirm next step(?! within)|build rapport|align on|openness to evaluating|limited workflow review|document monthly.*appropriate within/i;

/** One procedural domain — never stack unrelated specialties or procedure families. */
const PRODUCT_PROCEDURAL_DOMAIN: Record<PreCallPlanProductLine, string> = {
  ACSIS: "lap ventral and incisional hernia workflows",
  TelaBio: "robotic ventral reinforcement workflows",
  Endolumik: "robotic sizing and confirmation workflows",
  BioTissue: "advanced wound biologic workflows",
  Merakris: "advanced wound skin-substitute workflows",
  "Skeletal Dynamics": "distal extremity fixation workflows",
};

const SPECIALTY_PROCEDURAL_DOMAIN: Record<SpecialtyKey, string> = {
  general_surgery: "the provider's highest-volume surgical workflows",
  wound_care: "advanced wound care workflows",
  orthopedics: "distal extremity fixation workflows",
  default: "the provider's highest-volume procedural workflows",
};

function introCallProductAligned(ctx: SmartGoalContext): boolean {
  if (ctx.dominantPrep && !ctx.dominantPrep.use_product_bundle) return false;
  return isIntroCallProductPrepEnabled(
    ctx.productLine,
    ctx.prepSpecializationTier,
    Boolean(ctx.intentionalProductFocus),
  );
}

function usesBroadWorkflowDiscovery(ctx: SmartGoalContext): boolean {
  if (ctx.dominantPrep) return isBroadWorkflowDiscoveryPrep(ctx.dominantPrep);
  return !introCallProductAligned(ctx);
}

function usesExplicitSpecialtyWorkflow(ctx: SmartGoalContext): boolean {
  return Boolean(ctx.dominantPrep?.include_specialty_generic_pool);
}

function allowsEvaluationStageLanguage(ctx: SmartGoalContext): boolean {
  const mode = ctx.dominantPrep?.prep_mode;
  return (
    mode === "evaluation_preparation" ||
    mode === "live_case_support" ||
    Boolean(ctx.dominantPrep?.include_commercialization_signals)
  );
}

/** Single procedural domain for this prep context (max one). */
export function singleProceduralDomain(ctx: SmartGoalContext): string {
  if (introCallProductAligned(ctx) && ctx.productLine) {
    return PRODUCT_PROCEDURAL_DOMAIN[ctx.productLine] ?? SPECIALTY_PROCEDURAL_DOMAIN[ctx.specialtyKey];
  }
  return SPECIALTY_PROCEDURAL_DOMAIN[ctx.specialtyKey];
}

/** One product anchor when product prep is active (max one). */
function singleProductAnchor(ctx: SmartGoalContext): string | null {
  if (!introCallProductAligned(ctx)) return null;
  return ctx.productLabel || ctx.productLine || null;
}

function horizonSuffix(days: number): string {
  return `within the next ${days} days`;
}

/** One interaction purpose in a single rep-voice sentence. */
function composeFocusedObjective(clause: string, domain: string, days: number): string {
  const trimmed = clause.trim().replace(/\.\s*$/, "");
  const domainPhrase = domain.startsWith("the ") ? domain : domain;
  return `${trimmed} for ${domainPhrase} ${horizonSuffix(days)}.`;
}

function buildIntroCallBroadDiscoveryGoal(ctx: SmartGoalContext): string {
  const domain = SPECIALTY_PROCEDURAL_DOMAIN.default;
  return composeFocusedObjective(
    "Determine whether OR observation access is realistic",
    domain,
    ctx.horizonDays,
  );
}

function buildIntroCallEvaluationPlanningGoal(ctx: SmartGoalContext): string {
  const domain = singleProceduralDomain(ctx);
  const product = singleProductAnchor(ctx);
  const clause = product
    ? `Define the first ${product} evaluation case profile`
    : "Define the first evaluation case profile";
  return composeFocusedObjective(clause, domain, ctx.horizonDays);
}

function buildIntroCallObservationSupportGoal(ctx: SmartGoalContext): string {
  const domain = singleProceduralDomain(ctx);
  return composeFocusedObjective("Confirm active-case OR support logistics", domain, ctx.horizonDays);
}

function buildIntroCallWhyThisMatters(ctx: SmartGoalContext): string {
  if (usesBroadWorkflowDiscovery(ctx)) {
    return INTRO_CALL_WHY_BROAD_DISCOVERY;
  }

  const prepState =
    ctx.dominantPrep?.prep_context_state ??
    ctx.prepContextState ??
    (ctx.productLine ? "product_exploration" : "discovery");

  if (prepState === "evaluation_planning") {
    return "This interaction should lock the evaluation case profile and OR support plan before the first trial case.";
  }
  if (prepState === "observation_support") {
    return "This interaction should align OR execution expectations and surface adoption barriers before more field time.";
  }
  if (prepState === "product_exploration" && ctx.productLine) {
    return "This interaction should confirm whether the selected product fits the target workflow before pursuing observation or evaluation.";
  }

  const stage = ctx.stage;
  if (stage === "evaluation_active" || stage === "evaluation_planned") {
    return "This interaction should confirm whether OR observation on the active evaluation pathway is still realistic.";
  }

  if (introCallProductAligned(ctx)) {
    switch (ctx.specialtyKey) {
      case "general_surgery":
        return "This interaction should confirm whether future OR observation on the target surgical workflow is realistic.";
      case "wound_care":
        return "This interaction should confirm whether clinic or procedure-room observation on the target wound workflow is realistic.";
      case "orthopedics":
        return "This interaction should confirm whether sterile-field observation on the target extremity workflow is realistic.";
      default:
        return INTRO_CALL_WHY_THIS_MATTERS;
    }
  }

  return INTRO_CALL_WHY_THIS_MATTERS;
}

function buildIntroCallSmartGoal(ctx: SmartGoalContext): string {
  const prepState =
    ctx.dominantPrep?.prep_context_state ??
    ctx.prepContextState ??
    (introCallProductAligned(ctx) ? "product_exploration" : "discovery");

  if (!ctx.dominantPrep) {
    if (prepState === "evaluation_planning" && introCallProductAligned(ctx)) {
      return buildIntroCallEvaluationPlanningGoal(ctx);
    }
    if (prepState === "observation_support" && introCallProductAligned(ctx)) {
      return buildIntroCallObservationSupportGoal(ctx);
    }
  }

  if (prepState === "evaluation_planning" && ctx.dominantPrep?.include_commercialization_signals) {
    return buildIntroCallEvaluationPlanningGoal(ctx);
  }
  if (prepState === "observation_support" && ctx.dominantPrep?.include_observation_goals) {
    return buildIntroCallObservationSupportGoal(ctx);
  }

  if (
    shouldUseIntroCallOfficialTemplates({
      engagementType: "intro_call",
      prepContextState: prepState,
      intentionalProductFocus: ctx.intentionalProductFocus,
      productLine: ctx.productLine,
    })
  ) {
    return buildIntroCallOfficialPreCallPlan({
      productLine: ctx.productLine,
      intentionalProductFocus: ctx.intentionalProductFocus,
      prepSpecializationTier: ctx.prepSpecializationTier,
      providerSpecialty: ctx.specialtyLabel,
    }).smartObjective;
  }

  if (usesBroadWorkflowDiscovery(ctx)) {
    return buildIntroCallBroadDiscoveryGoal(ctx);
  }

  const domain = singleProceduralDomain(ctx);
  const days = ctx.horizonDays;
  const competitor = competitorSnippet(ctx.knownIntelligence);
  const stage = ctx.stage;

  if (allowsEvaluationStageLanguage(ctx) && (stage === "evaluation_active" || stage === "evaluation_planned")) {
    return composeFocusedObjective("Determine whether OR observation remains realistic", domain, days);
  }

  if (competitor) {
    return composeFocusedObjective(
      `Determine whether current workflow habits versus ${competitor} support future OR observation`,
      domain,
      days,
    );
  }

  const product = singleProductAnchor(ctx);
  if (product && introCallProductAligned(ctx)) {
    return composeFocusedObjective(
      `Determine whether ${product} aligns with procedural workflow`,
      domain,
      days,
    );
  }

  if (usesExplicitSpecialtyWorkflow(ctx)) {
    if (ctx.specialtyKey === "wound_care") {
      return composeFocusedObjective(
        "Determine whether clinic or committee observation access is realistic",
        domain,
        days,
      );
    }
    return composeFocusedObjective("Determine whether OR observation is realistic", domain, days);
  }

  if (introCallProductAligned(ctx)) {
    return composeFocusedObjective(
      `Determine whether the selected product focus aligns with procedural workflow`,
      domain,
      days,
    );
  }

  return buildIntroCallBroadDiscoveryGoal(ctx);
}

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function normalizeSpecialtyKey(specialty: string | null | undefined): SpecialtyKey {
  const s = String(specialty ?? "").toLowerCase();
  if (/wound|dfu|limb preservation/i.test(s)) return "wound_care";
  if (/orthop|foot|ankle|hand|extremity|fixation|trauma/i.test(s)) return "orthopedics";
  if (/general|surgery|hernia|robotic|bariatric|tapp/i.test(s)) return "general_surgery";
  return "default";
}

function resolveProductLine(raw: string | null | undefined): PreCallPlanProductLine | "" {
  const first = String(raw ?? "")
    .split(/[,;|]/)[0]
    ?.trim();
  return isPreCallPlanProductLine(first) ? first : "";
}

function horizonDaysForStage(stage: SalesStage | null): number {
  if (!stage) return 45;
  switch (stage) {
    case "discovery":
      return 60;
    case "clinical_validation":
      return 45;
    case "evaluation_planned":
      return 45;
    case "evaluation_active":
      return 30;
    case "outcome_review":
      return 30;
    case "preference_card_progress":
      return 30;
    case "adoption_expanding":
      return 45;
    case "won":
      return 30;
    default:
      return 45;
  }
}

function workflowPhrase(ctx: SmartGoalContext): string {
  const { productLine, productLabel } = ctx;
  if (productLine === "ACSIS") return "ACSIS fixation workflow";
  if (productLine === "BioTissue") return "BioTissue advanced wound application workflow";
  if (productLine === "Merakris") return "Merakris skin-substitute application workflow";
  if (productLine === "TelaBio") return "TelaBio reinforcement workflow";
  if (productLine === "Skeletal Dynamics") return "Skeletal Dynamics extremity fixation workflow";
  if (productLine === "Endolumik") return "Endolumik sizing workflow";
  if (productLabel) return `${productLabel} evaluation workflow`;
  return "the proposed product workflow";
}

function competitorSnippet(intel: PrepareKnownIntelligence): string | null {
  for (const b of intel.bullets) {
    if (b.key === "competitor_usage") {
      const v = b.value
        .replace(/^competitive:\s*/i, "")
        .replace(/^current:\s*/i, "")
        .split(/[·;|,]/)[0]
        ?.trim()
        .slice(0, 48);
      return v || null;
    }
  }
  return null;
}

function buildGoalForType(ctx: SmartGoalContext): string {
  const type = ctx.engagementType;
  const days = ctx.horizonDays;
  const domain = singleProceduralDomain(ctx);
  const workflow = workflowPhrase(ctx);
  const product = ctx.productLabel ?? ctx.productLine ?? "target product";

  if (!type) {
    return composeFocusedObjective(
      "Define one measurable outcome for this touchpoint",
      ctx.typeLabel || "the engagement",
      days,
    );
  }

  switch (type) {
    case "intro_call":
      return buildIntroCallSmartGoal(ctx);

    case "observation_request":
      return composeFocusedObjective("Secure approval for one OR observation", domain, days);

    case "product_demo":
      return composeFocusedObjective(`Run a focused demo of ${product}`, domain, days);

    case "office_visit_360":
      return composeFocusedObjective("Complete one hands-on workflow session", domain, days);

    case "follow_up":
      return composeFocusedObjective("Confirm outcomes from the prior touchpoint", domain, days);

    case "post_case_follow_up":
      return composeFocusedObjective("Document clinical outcome from the recent case", domain, days);

    case "or_visit":
      return composeFocusedObjective("Validate workflow fit in live cases", domain, days);

    case "in_service_training":
      return composeFocusedObjective("Close one documented training gap", domain, days);

    case "reactivation":
      return composeFocusedObjective("Agree on one re-entry step", domain, days);

    case "evaluation_planning":
      return composeFocusedObjective(`Define evaluation design for ${workflow}`, domain, days);

    case "evaluation_follow_up":
      return composeFocusedObjective(`Review progress on active evaluation cases for ${workflow}`, domain, days);

    case "preference_card_discussion":
      return composeFocusedObjective(`Align preference card line changes for ${product}`, domain, days);

    default:
      return composeFocusedObjective(
        `Identify one appropriate pilot or evaluation case for ${workflow}`,
        domain,
        days,
      );
  }
}

function refineGoalForStage(goal: string, ctx: SmartGoalContext): string {
  const stage = ctx.stage;
  if (!stage || ctx.engagementType === "intro_call") return goal;

  const domain = singleProceduralDomain(ctx);
  const days = ctx.horizonDays;

  if (stage === "evaluation_planned" && !/evaluation case|pilot|first case/i.test(goal)) {
    return composeFocusedObjective(
      `Identify one appropriate pilot or evaluation case for ${workflowPhrase(ctx)}`,
      domain,
      days,
    );
  }
  if (stage === "evaluation_active" && /relationship/i.test(goal)) {
    return composeFocusedObjective(
      `Review mid-evaluation feedback on ${workflowPhrase(ctx)}`,
      domain,
      days,
    );
  }
  if (stage === "discovery" && ctx.engagementType === "product_demo") {
    return composeFocusedObjective(`Run a focused demo of ${workflowPhrase(ctx)}`, domain, days);
  }
  return goal;
}

/** Strategic context for reps — one concise sentence, not meta/explain-the-engine copy */
function buildWhyThisMatters(ctx: SmartGoalContext): string {
  const type = ctx.engagementType;
  const stage = ctx.stage;
  const typeLabel = ctx.typeLabel || "interaction";

  if (!type) {
    return `This ${typeLabel} should produce one clear field outcome with a dated next step — not a general conversation.`;
  }

  switch (type) {
    case "intro_call":
      return buildIntroCallWhyThisMatters(ctx);

    case "product_demo":
      if (stage === "evaluation_active") {
        return "This product demo should address friction in active evaluation cases and confirm criteria for the next case.";
      }
      return "This product demo should validate procedural fit before pursuing formal evaluation.";

    case "observation_request":
      return "This observation should confirm real OR workflow friction and whether a limited evaluation is worth the scheduling effort.";

    case "office_visit_360":
      return "This office visit should prove hands-on workflow fit and earn a committed next step — not end as a general product tour.";

    case "follow_up":
      return "This follow-up should close open items from the last touchpoint and lock one dated next action.";

    case "post_case_follow_up":
      return "This follow-up should capture how the case performed clinically and whether another case or committee step is justified.";

    case "or_visit":
      return "This OR visit should validate tray and technique habits in live cases and surface one change the surgeon would trial.";

    case "in_service_training":
      return "This in-service should close a named training gap and secure a champion for the next independent case.";

    case "reactivation":
      return "This call should confirm what changed in the practice and whether a low-friction re-entry step still makes sense.";

    case "evaluation_planning":
      return "This session should lock evaluation design — case count, metrics, and supply path — before the first trial case.";

    case "evaluation_follow_up":
      return "This touchpoint should remove blockers on active evaluation cases and confirm the next case remains scheduled.";

    case "preference_card_discussion":
      return "This discussion should align specific preference card changes, approvers, and a realistic go-live date.";

    default:
      return `This ${ENGAGEMENT_TYPE_LABELS[type] ?? typeLabel} should advance a defined field outcome with a clear next step.`;
  }
}

function isSmartEnough(goal: string): boolean {
  const g = goal.trim();
  if (g.length < 40) return false;
  if (VAGUE_GOAL_PATTERNS.test(g)) return false;
  if (/, *(identify|confirm|map|document|establish|define|validate) /i.test(g)) return false;
  const hasMeasurable = /\d+ days|one OR|one pilot|one evaluation|one case/i.test(g);
  const hasConcrete = /determine|secure|identify|validate|document|complete|define|review|align|confirm|run/i.test(
    g,
  );
  const hasDomain = /workflow|fixation|observation|evaluation|hernia|wound|biologic|demo|case/i.test(g);
  return hasMeasurable && hasConcrete && hasDomain;
}

export function buildPrepareSuggestedGoal(input: {
  engagementType: string;
  providerSpecialty?: string | null;
  opportunityStage: string | null;
  productLine: string | null;
  knownIntelligence: PrepareKnownIntelligence;
  engagement?: Record<string, unknown>;
  prepContextState?: EngagementPreparationContextState;
  prepSpecializationTier?: PreparationSpecializationTier;
  intentionalProductFocus?: boolean;
  dominantPrep?: DominantPrepGenerationFlags;
}): PrepareSuggestedGoal {
  const normalizedType = normalizeEngagementType(input.engagementType);
  if (normalizedType === "intro_call") {
    return buildIntroCallPathwaySuggestedGoal();
  }
  const typeLabel = formatEngagementType(input.engagementType);
  const stage = normalizeSalesStage(input.opportunityStage);
  const stageLabel = stage ? salesStageLabel(stage) : null;
  const productLine = input.dominantPrep?.product_line ?? resolveProductLine(input.productLine);
  const productLabel = productLine || trimOrNull(input.productLine?.split(/[,;|]/)[0]);
  const specialtyLabel = trimOrNull(input.providerSpecialty);
  const specialtyKey = input.dominantPrep
    ? (input.dominantPrep.effective_specialty_key as SpecialtyKey)
    : (resolveEffectiveSpecialtyKeyForPrep({
        productLine,
        providerSpecialty: input.providerSpecialty,
        intentionalProductFocus: input.intentionalProductFocus,
      }) as SpecialtyKey);

  const ctx: SmartGoalContext = {
    engagementType: normalizedType || null,
    typeLabel,
    specialtyKey,
    specialtyLabel,
    productLine,
    productLabel,
    stage,
    stageLabel,
    horizonDays: horizonDaysForStage(stage),
    knownIntelligence: input.knownIntelligence,
    prepContextState: input.dominantPrep?.prep_context_state ?? input.prepContextState,
    prepSpecializationTier: input.prepSpecializationTier ?? input.dominantPrep?.product_prep_tier,
    intentionalProductFocus: input.intentionalProductFocus ?? input.dominantPrep?.intentional_product_focus,
    dominantPrep: input.dominantPrep,
  };

  let goal = refineGoalForStage(buildGoalForType(ctx), ctx);

  if (!isSmartEnough(goal)) {
    goal = usesBroadWorkflowDiscovery(ctx)
      ? buildIntroCallBroadDiscoveryGoal(ctx)
      : composeFocusedObjective(
          `Identify one appropriate pilot or evaluation case for ${workflowPhrase(ctx)}`,
          singleProceduralDomain(ctx),
          ctx.horizonDays,
        );
  }

  return {
    goal,
    why: buildWhyThisMatters(ctx),
  };
}
