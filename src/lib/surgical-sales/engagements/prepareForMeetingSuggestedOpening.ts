import { normalizeSalesStage, salesStageLabel, type SalesStage } from "@/lib/sales/stages";
import {
  formatEngagementType,
  normalizeEngagementType,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import {
  PROVIDER_RELATIONSHIP_STAGE_LABELS,
  type ProviderRelationshipStage,
} from "@/lib/surgical-sales/providerRelationshipStage";
import {
  INTRO_CALL_OPENING_ALTERNATE,
  INTRO_CALL_OPENING_ALTERNATE_GENERIC,
  INTRO_CALL_OPENING_AVOID_PATTERN,
  INTRO_CALL_OPENING_EVALUATION_STAGE,
  INTRO_CALL_OPENING_PRIMARY,
  INTRO_CALL_OPENING_PRIMARY_GENERIC,
  INTRO_CALL_OPENING_PRODUCT_PRIMARY,
  type IntroCallSpecialtyKey,
} from "@/lib/surgical-sales/engagements/introCallPreparationContent";
import type { EngagementPreparationContextState } from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import type { PreparationSpecializationTier } from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";
import { isIntroCallProductPrepEnabled } from "@/lib/surgical-sales/engagements/introCallProductContext";
import {
  buildIntroCallOfficialPreCallPlan,
  shouldUseIntroCallOfficialTemplates,
} from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import {
  isPreCallPlanProductLine,
  type PreCallPlanProductLine,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";

export type PrepareSuggestedOpening = {
  /** Primary suggestion — rep can edit after applying */
  statement: string;
  /** Optional alternate opener (same intent, different phrasing) */
  alternate: string | null;
  context_note: string | null;
};

const SALESY_PATTERN =
  /excited to|thrilled|best-in-class|industry-leading|partner with you|leverage our|game.?changer|cutting.?edge solution/i;

const INTRO_RELATIONSHIP_LEAD_AVOID =
  /early in the relationship|introduce myself properly|Given our ongoing work together/i;

type SpecialtyKey = "general_surgery" | "wound_care" | "orthopedics" | "default";

type OpeningContext = {
  engagementType: EngagementType | null;
  typeLabel: string;
  specialtyKey: SpecialtyKey;
  providerSpecialty?: string | null;
  productLine: PreCallPlanProductLine | "";
  productLabel: string | null;
  opportunityStage: SalesStage | null;
  providerStage: ProviderRelationshipStage | null;
  relationshipStrength: string | null;
  knownIntelligence: PrepareKnownIntelligence;
  prepContextState?: EngagementPreparationContextState;
  prepSpecializationTier?: PreparationSpecializationTier;
  intentionalProductFocus?: boolean;
};

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function normalizeSpecialtyKey(specialty: string | null | undefined): SpecialtyKey {
  const s = String(specialty ?? "").trim().toLowerCase();
  if (/wound|dfu|limb preservation/i.test(s)) return "wound_care";
  if (/orthop|foot|ankle|hand|extremity|fixation|trauma/i.test(s)) return "orthopedics";
  if (/general|surgery|hernia|robotic|bariatric|tapp/i.test(s)) return "general_surgery";
  return "default";
}

function normalizeProviderRelationshipStage(raw: string | null | undefined): ProviderRelationshipStage | null {
  const key = String(raw ?? "").trim() as ProviderRelationshipStage;
  return key && key in PROVIDER_RELATIONSHIP_STAGE_LABELS ? key : null;
}

function resolveProductLine(raw: string | null | undefined): PreCallPlanProductLine | "" {
  const first = String(raw ?? "")
    .split(/[,;|]/)[0]
    ?.trim();
  return isPreCallPlanProductLine(first) ? first : "";
}

function workflowTopic(ctx: OpeningContext): string {
  const { specialtyKey, productLine } = ctx;
  if (specialtyKey === "general_surgery") {
    if (!productLine) return "your reconstructive case workflow and OR sequence";
    if (productLine === "ACSIS") return "your current hernia workflow and fixation steps";
    if (productLine === "TelaBio") return "fascial closure reinforcement in your cases";
    if (productLine === "Endolumik") return "sizing and confirmation in robotic cases";
    return "your ventral and incisional hernia workflow";
  }
  if (specialtyKey === "wound_care") {
    if (productLine === "BioTissue") return "how you're managing advanced wounds and biologic dressings";
    if (productLine === "Merakris") return "how you're selecting and applying skin substitutes";
    return "your advanced wound care workflow and dressing choices";
  }
  if (specialtyKey === "orthopedics") {
    if (productLine === "Skeletal Dynamics") return "distal extremity fixation and tray workflow";
    return "extremity fixation and OR tray workflow";
  }
  if (ctx.productLabel) return `how you're handling ${ctx.productLabel} in practice today`;
  return "your current clinical workflow";
}

function relationshipLeadIn(ctx: OpeningContext): string {
  const stage = ctx.providerStage;
  const strength = String(ctx.relationshipStrength ?? "").toLowerCase();

  if (stage === "dormant" || stage === "archived") {
    return "It's been a while since we connected — ";
  }
  if (stage === "early_discovery") {
    return "I know we're still early in the relationship — ";
  }
  if (stage === "established_customer" || stage === "active_relationship") {
    return "Given our ongoing work together — ";
  }
  if (strength === "weak" || strength === "unknown") {
    return "Wanted to introduce myself properly and ";
  }
  if (strength === "strong") {
    return "";
  }
  return "";
}

function introCallIntelligenceTweak(statement: string, intel: PrepareKnownIntelligence): string {
  for (const b of intel.bullets) {
    if (b.key === "procedural_preferences" && b.value.length > 12) {
      const pref = b.value.slice(0, 55).trim();
      if (!statement.toLowerCase().includes(pref.slice(0, 18).toLowerCase())) {
        return `${statement.replace(/\.$/, "")} — I noted your focus on ${pref}.`;
      }
    }
    if (b.key === "communication" && /direct|brief|data|minimal/i.test(b.value) && statement.length > 110) {
      const first = statement.split("—")[0]?.trim() || statement;
      return first.endsWith(".") ? first : `${first}.`;
    }
  }
  return statement;
}

function buildIntroCallOpening(ctx: OpeningContext): { statement: string; alternate: string | null } {
  const sk: IntroCallSpecialtyKey = ctx.specialtyKey;
  const stage = ctx.opportunityStage;
  const prepState = ctx.prepContextState ?? (ctx.productLine ? "product_exploration" : "discovery");
  const productAligned = isIntroCallProductPrepEnabled(
    ctx.productLine,
    ctx.prepSpecializationTier,
    Boolean(ctx.intentionalProductFocus),
  );

  if (prepState === "evaluation_planning") {
    return {
      statement:
        "Wanted to align on evaluation case profile, workflow conversion steps, and OR support logistics before we schedule the first case.",
      alternate: INTRO_CALL_OPENING_EVALUATION_STAGE,
    };
  }

  if (prepState === "observation_support") {
    return {
      statement:
        "Checking in on the active case path — wanted to confirm support logistics, in-room expectations, and what we need before debrief.",
      alternate: null,
    };
  }

  if (stage === "evaluation_active" || stage === "evaluation_planned") {
    return {
      statement: INTRO_CALL_OPENING_EVALUATION_STAGE,
      alternate: INTRO_CALL_OPENING_ALTERNATE[sk],
    };
  }

  if (
    shouldUseIntroCallOfficialTemplates({
      engagementType: "intro_call",
      prepContextState: prepState,
      intentionalProductFocus: ctx.intentionalProductFocus,
      productLine: ctx.productLine,
    })
  ) {
    const official = buildIntroCallOfficialPreCallPlan({
      productLine: ctx.productLine,
      intentionalProductFocus: ctx.intentionalProductFocus,
      prepSpecializationTier: ctx.prepSpecializationTier,
      providerSpecialty: ctx.providerSpecialty,
    });
    let statement = official.impactOpening;
    if (ctx.providerStage === "dormant" || ctx.providerStage === "archived") {
      statement = `It's been a while since we connected — ${statement.charAt(0).toLowerCase()}${statement.slice(1)}`;
    }
    statement = introCallIntelligenceTweak(statement, ctx.knownIntelligence);
    return { statement, alternate: null };
  }

  let statement =
    (productAligned && ctx.productLine && INTRO_CALL_OPENING_PRODUCT_PRIMARY[ctx.productLine]) ||
    (productAligned ? INTRO_CALL_OPENING_PRIMARY[sk] : INTRO_CALL_OPENING_PRIMARY_GENERIC[sk]);
  let alternate: string | null = productAligned
    ? INTRO_CALL_OPENING_ALTERNATE[sk]
    : INTRO_CALL_OPENING_ALTERNATE_GENERIC[sk];

  if (ctx.providerStage === "dormant" || ctx.providerStage === "archived") {
    statement = `It's been a while since we connected — ${statement.charAt(0).toLowerCase()}${statement.slice(1)}`;
  }

  statement = introCallIntelligenceTweak(statement, ctx.knownIntelligence);

  if (alternate && alternate === statement) {
    alternate = null;
  }

  return { statement, alternate };
}

function buildPrimaryStatement(ctx: OpeningContext): string {
  const topic = workflowTopic(ctx);
  const lead = relationshipLeadIn(ctx);
  const type = ctx.engagementType;

  if (!type) {
    return `${lead}wanted to understand ${topic} before we get into specifics.`.replace(/\s+/g, " ").trim();
  }

  switch (type) {
    case "intro_call":
      return buildIntroCallOpening(ctx).statement;

    case "observation_request":
      return `${lead}hoping to align on what you'd want us to focus on during an OR observation — case selection, key steps, and debrief expectations.`
        .replace(/\s+/g, " ")
        .trim();

    case "product_demo":
      return `${lead}wanted to see how you're handling ${topic} today and what a focused demo should cover for your team.`
        .replace(/\s+/g, " ")
        .trim();

    case "office_visit_360":
      return `${lead}looking forward to the visit — wanted to confirm what you want from the hands-on portion and which products matter most.`
        .replace(/\s+/g, " ")
        .trim();

    case "follow_up":
      return `Quick follow-up on our last touchpoint — wanted to close the loop on ${topic} and hear what's changed since we spoke.`;

    case "post_case_follow_up":
      return `Wanted to hear how the recent case went and whether ${topic} matched what you expected post-procedure.`;

    case "or_visit":
      return `${lead}planning to be in the OR — wanted to confirm which cases are on the schedule and what you'd like us to observe.`
        .replace(/\s+/g, " ")
        .trim();

    case "in_service_training":
      return `${lead}wanted to confirm which training gaps matter most for your staff before we run the in-service.`
        .replace(/\s+/g, " ")
        .trim();

    case "reactivation":
      return `${lead}wanted to reconnect on ${topic} and see if a low-friction next step still makes sense on your end.`
        .replace(/\s+/g, " ")
        .trim();

    case "evaluation_planning":
      return `${lead}wanted to walk through how you're thinking about evaluating ${topic} — metrics, case count, and timeline.`
        .replace(/\s+/g, " ")
        .trim();

    case "evaluation_follow_up":
      return `Checking in on the evaluation — wanted to hear what's working with ${topic} and what's getting in the way of the next case.`;

    case "preference_card_discussion":
      return `${lead}wanted to review the preference card changes you're considering and who still needs to weigh in.`
        .replace(/\s+/g, " ")
        .trim();

    default:
      return `${lead}wanted to understand ${topic} and what would make this conversation useful for you.`
        .replace(/\s+/g, " ")
        .trim();
  }
}

function buildAlternateStatement(ctx: OpeningContext, primary: string): string | null {
  const type = ctx.engagementType;
  const topic = workflowTopic(ctx);

  if (type === "intro_call") {
    return buildIntroCallOpening(ctx).alternate;
  }
  if (type === "observation_request") {
    return `Before we lock an observation date — wanted to confirm case type and what you want captured in the debrief.`;
  }
  if (type === "product_demo") {
    return `Wanted to tailor the demo around ${topic} — not a generic walk-through.`;
  }
  if (primary.length > 120) {
    return `Wanted to keep this practical — ${topic}, and what a sensible next step looks like.`;
  }
  return null;
}

function refineForOpportunityStage(statement: string, ctx: OpeningContext): string {
  const stage = ctx.opportunityStage;
  if (!stage) return statement;
  if (stage === "evaluation_active" && !/evaluation|case/i.test(statement)) {
    return `Checking in on the evaluation — ${statement.charAt(0).toLowerCase()}${statement.slice(1)}`;
  }
  if (stage === "discovery" && /Given our ongoing/i.test(statement)) {
    return statement.replace(/Given our ongoing work together — /i, "");
  }
  return statement;
}

function intelligenceTweak(statement: string, intel: PrepareKnownIntelligence): string {
  for (const b of intel.bullets) {
    if (b.key === "procedural_preferences" && b.value.length > 12) {
      const pref = b.value.slice(0, 60).trim();
      if (!statement.includes(pref.slice(0, 20))) {
        return `${statement.replace(/\.$/, "")} — I noted your preference for ${pref}.`;
      }
    }
    if (b.key === "communication" && /direct|brief|data/i.test(b.value)) {
      if (statement.length > 100) {
        const short = statement.split("—")[0]?.trim() || statement;
        return short.endsWith(".") ? short : `${short}.`;
      }
    }
  }
  return statement;
}

function sanitizeStatement(text: string, options?: { introCall?: boolean }): string {
  let s = text.replace(/\s+/g, " ").trim();
  if (options?.introCall) {
    if (INTRO_CALL_OPENING_AVOID_PATTERN.test(s) || INTRO_RELATIONSHIP_LEAD_AVOID.test(s)) {
      s = s
        .replace(INTRO_CALL_OPENING_AVOID_PATTERN, "")
        .replace(INTRO_RELATIONSHIP_LEAD_AVOID, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }
  if (SALESY_PATTERN.test(s)) {
    s = s.replace(SALESY_PATTERN, "").replace(/\s+/g, " ").trim();
  }
  if (!s.endsWith(".")) s = `${s}.`;
  if (s.length > 220) {
    const cut = s.slice(0, 217).replace(/[,;]\s*[^,.]*$/, "");
    s = `${cut}.`;
  }
  return s;
}

function buildContextNote(ctx: OpeningContext): string | null {
  const parts: string[] = [];
  if (ctx.typeLabel) parts.push(ctx.typeLabel);
  if (ctx.productLabel) parts.push(ctx.productLabel);
  if (ctx.providerStage) {
    parts.push(PROVIDER_RELATIONSHIP_STAGE_LABELS[ctx.providerStage]);
  }
  if (ctx.opportunityStage) parts.push(salesStageLabel(ctx.opportunityStage));
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Draft field key for applying the opening suggestion in the wizard */
export function openingStatementWorkflowFieldKey(
  engagementType: string,
  lightweightPrep: boolean,
): "engagement_purpose" | "pre_observation_impact_opening_statement" {
  if (lightweightPrep) return "engagement_purpose";
  return "pre_observation_impact_opening_statement";
}

export function buildPrepareSuggestedOpening(input: {
  engagementType: string;
  providerSpecialty?: string | null;
  productLine?: string | null;
  opportunityStage?: string | null;
  providerRelationshipStage?: string | null;
  relationshipStrength?: string | null;
  knownIntelligence: PrepareKnownIntelligence;
  prepContextState?: EngagementPreparationContextState;
  prepSpecializationTier?: PreparationSpecializationTier;
  intentionalProductFocus?: boolean;
}): PrepareSuggestedOpening {
  const normalizedType = normalizeEngagementType(input.engagementType);
  const ctx: OpeningContext = {
    engagementType: normalizedType || null,
    typeLabel: formatEngagementType(input.engagementType),
    specialtyKey: normalizeSpecialtyKey(input.providerSpecialty),
    providerSpecialty: input.providerSpecialty,
    productLine: resolveProductLine(input.productLine),
    productLabel: resolveProductLine(input.productLine) || trimOrNull(input.productLine?.split(/[,;|]/)[0]),
    opportunityStage: normalizeSalesStage(input.opportunityStage),
    providerStage: normalizeProviderRelationshipStage(input.providerRelationshipStage),
    relationshipStrength: trimOrNull(input.relationshipStrength),
    knownIntelligence: input.knownIntelligence,
    prepContextState: input.prepContextState,
    prepSpecializationTier: input.prepSpecializationTier,
    intentionalProductFocus: input.intentionalProductFocus,
  };

  const isIntroCall = ctx.engagementType === "intro_call";
  const introOpening = isIntroCall ? buildIntroCallOpening(ctx) : null;

  let statement = isIntroCall
    ? introOpening!.statement
    : refineForOpportunityStage(intelligenceTweak(buildPrimaryStatement(ctx), ctx.knownIntelligence), ctx);

  statement = sanitizeStatement(statement, { introCall: isIntroCall });

  const alternateRaw = isIntroCall ? introOpening!.alternate : buildAlternateStatement(ctx, statement);
  const alternate = alternateRaw ? sanitizeStatement(alternateRaw, { introCall: isIntroCall }) : null;

  return {
    statement,
    alternate: alternate && alternate !== statement ? alternate : null,
    context_note: buildContextNote(ctx),
  };
}
