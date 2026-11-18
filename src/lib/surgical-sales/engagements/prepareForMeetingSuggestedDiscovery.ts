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
  INTRO_CALL_DISCOVERY_AVOID_PATTERN,
  INTRO_CALL_DISCOVERY_BY_PRODUCT,
  INTRO_CALL_DISCOVERY_BY_PROVIDER_STAGE,
  INTRO_CALL_DISCOVERY_BY_SPECIALTY,
  INTRO_CALL_DISCOVERY_BY_SPECIALTY_GENERIC,
  INTRO_CALL_DISCOVERY_CORE,
  INTRO_CALL_DISCOVERY_STAGE_DISCOVERY,
  INTRO_CALL_OBSERVATION_QUALIFICATION_DISCOVERY,
} from "@/lib/surgical-sales/engagements/introCallPreparationContent";
import { PREP_CONTEXT_DISCOVERY } from "@/lib/surgical-sales/engagements/engagementPreparationContextContent";
import type { EngagementPreparationContextState } from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import type { DominantPrepGenerationFlags } from "@/lib/surgical-sales/engagements/engagementDominantPrepMode";
import {
  resolveEffectiveSpecialtyKeyForPrep,
  resolvePrepGenerationFlags,
} from "@/lib/surgical-sales/engagements/engagementDominantPrepMode";
import type { PreparationSpecializationTier } from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";
import {
  isIntroCallProductPrepEnabled,
  resolveIntroCallProductPrepBundle,
} from "@/lib/surgical-sales/engagements/introCallProductContext";
import {
  buildIntroCallOfficialPreCallPlan,
  shouldUseIntroCallOfficialTemplates,
} from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import {
  isPreCallPlanProductLine,
  type PreCallPlanProductLine,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";

export const MAX_SUGGESTED_DISCOVERY_QUESTIONS = 5;

export type PrepareSuggestedDiscovery = {
  questions: string[];
  context_note: string | null;
};

const SALESY_PATTERN =
  /excited to|thrilled|best-in-class|industry-leading|partner with you|leverage our|game.?changer|cutting.?edge solution/i;

type SpecialtyKey = "general_surgery" | "wound_care" | "orthopedics" | "default";

type DiscoveryContext = {
  engagementType: EngagementType | null;
  typeLabel: string;
  specialtyKey: SpecialtyKey;
  providerSpecialty?: string | null;
  productLine: PreCallPlanProductLine | "";
  productLabel: string | null;
  opportunityStage: SalesStage | null;
  providerStage: ProviderRelationshipStage | null;
  knownIntelligence: PrepareKnownIntelligence;
  prepContextState?: EngagementPreparationContextState;
  prepSpecializationTier?: PreparationSpecializationTier;
  intentionalProductFocus?: boolean;
  dominantPrep?: DominantPrepGenerationFlags;
};

const PRODUCT_SPECIALTY_QUESTIONS: Record<
  PreCallPlanProductLine,
  Partial<Record<SpecialtyKey | "default", string[]>>
> = {
  ACSIS: {
    general_surgery: [
      "What fixation workflow are you currently using for lap ventral cases?",
      "Which hernia procedures create the most friction in the OR today?",
      "What would need to improve to justify evaluating an alternative closure approach?",
      "How do you split inguinal vs ventral volume month to month?",
      "Where do tacks or sutures add the most time or bleeding risk?",
    ],
    default: [
      "What mesh and fixation sequence do you standardize on today?",
      "Which case types would you consider for a workflow trial first?",
      "What metrics would prove OR time neutrality to you?",
    ],
  },
  BioTissue: {
    wound_care: [
      "How are biologics currently selected for wound closure?",
      "What limits clinic or OR efficiency most today?",
      "What NPWT or dressing rules must any graft satisfy?",
      "What heal-rate or photo documentation does your committee require?",
      "What would need to improve to justify evaluating an alternative biologic?",
    ],
    default: [
      "How do you stage advanced wounds before escalating to biologics?",
      "Who owns graft selection — you, nursing, or a committee?",
      "What payer mix drives product restrictions in your practice?",
    ],
  },
  Merakris: {
    wound_care: [
      "How are skin substitutes currently selected for chronic wounds?",
      "What limits clinic or procedure-room efficiency most today?",
      "What NPWT or dressing rules must any graft satisfy?",
      "What heal-rate or photo documentation does your committee require?",
      "What would need to improve to justify evaluating Merakris?",
    ],
    default: [
      "How do you stage advanced wounds before escalating to a skin substitute?",
      "Who owns graft selection — you, nursing, or a committee?",
      "What payer mix drives product restrictions in your practice?",
    ],
  },
  TelaBio: {
    general_surgery: [
      "How do you reinforce fascial closure in robotic ventral cases today?",
      "Which steps feel redundant compared to your open hernia routine?",
      "What would need to improve to justify evaluating a reinforcement change?",
      "Who influences mesh and reinforcement decisions besides you?",
    ],
    default: [
      "Where does fascial closure add the most time in your cases?",
      "What recurrence or seroma signals change your reinforcement approach?",
    ],
  },
  "Skeletal Dynamics": {
    orthopedics: [
      "What fixation workflow are you currently using for distal extremity trauma?",
      "Which procedures create the most tray or instrument friction today?",
      "What would need to improve to justify evaluating alternative plates or screws?",
      "What does purchasing need to see in a sterile-field comparison?",
      "Who drives night-call tray preference — fellows, PAs, or attendings?",
    ],
    default: [
      "Which extremity cases are highest volume for you monthly?",
      "What screw density or profile concerns come up in osteopenic bone?",
      "What evaluation case count feels realistic before a preference card change?",
    ],
  },
  Endolumik: {
    general_surgery: [
      "How do you confirm sizing and device placement in robotic cases today?",
      "Which steps create the most staff training burden in the OR?",
      "What would need to improve to justify evaluating a sizing workflow change?",
      "Who must attend an in-service before you trial a new confirmation method?",
    ],
    default: [
      "What case types are in scope for an evaluation block?",
      "What documentation do you want captured vs discussed only post-case?",
    ],
  },
};

const SPECIALTY_DEFAULT_QUESTIONS: Record<SpecialtyKey, string[]> = {
  general_surgery: [
    "What hernia or abdominal wall workflow are you standardizing on today?",
    "Which procedures create the most friction in the OR this quarter?",
    "What would need to improve to justify evaluating alternatives?",
  ],
  wound_care: [
    "How are advanced dressings and biologics chosen for your highest-acuity wounds?",
    "What limits throughput in clinic or the procedure room most today?",
    "What evidence bar must be cleared before a committee trial?",
  ],
  orthopedics: [
    "What fixation workflow are you currently using for your highest-volume extremity cases?",
    "Which trays or instruments slow turnover between cases?",
    "What would need to improve to justify evaluating alternative fixation?",
  ],
  default: [
    "What clinical workflow are you optimizing right now?",
    "Which steps create the most friction for your team today?",
    "What would need to improve to justify a controlled evaluation?",
  ],
};

const ENGAGEMENT_TYPE_QUESTIONS: Partial<Record<EngagementType, string[]>> = {
  intro_call: [],
  observation_request: [
    "What case profile is ideal for an observation — size, approach, and backup if cancel?",
    "Who should attend the post-case debrief besides you?",
  ],
  product_demo: [
    "What hands-on outcomes must the demo prove for your staff?",
    "What decision criteria move you from demo to evaluation?",
  ],
  office_visit_360: [
    "Which products or techniques should be on the table for the hands-on portion?",
    "What would make the visit worth your time before we leave?",
  ],
  or_visit: [
    "Which trays are opened today and why — preference vs habit?",
    "What should we observe vs stay quiet on in the room?",
  ],
  in_service_training: [
    "What training gaps matter most for your staff right now?",
    "Who will own follow-up cases after the in-service?",
  ],
  evaluation_planning: [
    "How many cases are in scope and what success metrics will you track?",
    "What supply chain or preference card steps still need alignment?",
  ],
  evaluation_follow_up: [
    "What's working in the evaluation cases so far — and what's blocking the next?",
    "What would change your mind about continuing vs pausing?",
  ],
  follow_up: [
    "What's changed in your workflow since we last spoke?",
    "What still needs closure from our last touchpoint?",
  ],
  post_case_follow_up: [
    "How did the recent case compare to what you expected post-procedure?",
    "What would you do differently on the next similar case?",
  ],
};

const STAGE_QUESTIONS: Partial<Record<SalesStage, string[]>> = {
  discovery: [],
  clinical_validation: [
    "What case selection criteria matter for validation — and what documentation is required?",
  ],
  evaluation_planned: [
    "What evaluation design, case count, and timeline are you targeting?",
  ],
  evaluation_active: [
    "Which evaluation cases are on the schedule — and what's blocking the next?",
  ],
};

const PROVIDER_STAGE_QUESTIONS: Partial<Record<ProviderRelationshipStage, string[]>> = {
  early_discovery: [
    "What monthly volume should we anchor planning on for this specialty?",
    "What would make a first observation or demo worth scheduling?",
  ],
  dormant: ["What's changed in your practice since we last connected?"],
  established_customer: ["What's different in your workflow vs when we last aligned on goals?"],
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

function ensureQuestion(text: string): string {
  let q = text.replace(/\s+/g, " ").trim();
  if (SALESY_PATTERN.test(q)) {
    q = q.replace(SALESY_PATTERN, "").replace(/\s+/g, " ").trim();
  }
  if (!q.endsWith("?")) q = `${q}?`;
  if (q.length > 120) {
    q = `${q.slice(0, 117).replace(/[,;]\s*[^,?]*$/, "")}?`;
  }
  return q;
}

function normalizeForDedupe(q: string): string {
  return q.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

function isSimilar(a: string, b: string): boolean {
  const na = normalizeForDedupe(a);
  const nb = normalizeForDedupe(b);
  if (na === nb) return true;
  if (na.length > 20 && nb.length > 20 && (na.includes(nb.slice(0, 24)) || nb.includes(na.slice(0, 24)))) {
    return true;
  }
  return false;
}

function pushUnique(out: string[], candidate: string, max: number): void {
  if (out.length >= max) return;
  const q = ensureQuestion(candidate);
  if (!q || q.length < 12) return;
  if (out.some((existing) => isSimilar(existing, q))) return;
  out.push(q);
}

function productSpecialtyPool(ctx: DiscoveryContext): string[] {
  const { productLine, specialtyKey } = ctx;
  if (productLine) {
    const byProduct = PRODUCT_SPECIALTY_QUESTIONS[productLine];
    const specific = byProduct?.[specialtyKey] ?? byProduct?.default;
    if (specific?.length) return [...specific];
  }
  return [...(SPECIALTY_DEFAULT_QUESTIONS[ctx.specialtyKey] ?? SPECIALTY_DEFAULT_QUESTIONS.default)];
}

function introCallIntelligenceQuestions(
  intel: PrepareKnownIntelligence,
  productAligned: boolean,
): string[] {
  const out: string[] = [];
  for (const b of intel.bullets) {
    if (b.key === "competitor_usage" || b.key === "competitive_products") {
      const vendor = b.value
        .replace(/^competitive:\s*/i, "")
        .split(/[·;|,]/)[0]
        ?.trim()
        .slice(0, 40);
      if (vendor) {
        out.push(
          productAligned
            ? `Where does ${vendor} still fit your closure workflow — and where does it lag operationally?`
            : `Where does ${vendor} still fit your procedural workflow — and where does it lag operationally?`,
        );
      }
    }
    if (b.key === "evaluation_openness" && b.value.length > 8 && productAligned) {
      out.push(`Given your stated openness (${b.value.slice(0, 60).trim()}), what would trigger a formal evaluation?`);
    }
    if (b.key === "or_team_dynamics" && b.value.length > 12) {
      out.push("Who on the OR team must sign off before observation or workflow changes stick?");
    }
    if (b.key === "access_notes" && b.value.length > 12) {
      out.push(`What is the realistic path to schedule observation with your team (${b.value.slice(0, 50).trim()})?`);
    }
    if (b.key === "procedural_preferences" && b.value.length > 10) {
      out.push(
        productAligned
          ? `How does your preference for ${b.value.slice(0, 55).trim()} affect fixation or case selection?`
          : `How does your preference for ${b.value.slice(0, 55).trim()} affect case selection and OR workflow?`,
      );
    }
  }
  return out;
}

function intelligenceQuestions(intel: PrepareKnownIntelligence): string[] {
  const out: string[] = [];
  for (const b of intel.bullets) {
    if (b.key === "competitive_products" && b.value.length > 8) {
      out.push(`What still works well with ${b.value.slice(0, 40).trim()} — and where does it fall short?`);
    }
    if (b.key === "evaluation_openness" && /cautious|committee|purchasing/i.test(b.value)) {
      out.push("What does purchasing or committee need to see before a trial moves forward?");
    }
    if (b.key === "or_team_dynamics" && b.value.length > 12) {
      out.push("Who on the OR team must sign off before workflow or tray changes stick?");
    }
    if (b.key === "access_notes" && /coordinator|rn|gate/i.test(b.value)) {
      out.push("What's the best path to get cases or observations on the calendar with your team?");
    }
  }
  return out;
}

function pushIntroCallQuestion(out: string[], candidate: string, max: number): void {
  if (INTRO_CALL_DISCOVERY_AVOID_PATTERN.test(candidate) || SALESY_PATTERN.test(candidate)) {
    return;
  }
  pushUnique(out, candidate, max);
}

function buildIntroCallDiscoveryQuestions(ctx: DiscoveryContext): string[] {
  const flags = resolvePrepGenerationFlags({
    dominantPrep: ctx.dominantPrep,
    prepMode: ctx.dominantPrep?.prep_mode,
    productLine: ctx.productLine,
    providerSpecialty: ctx.specialtyKey,
    prepContextState: ctx.prepContextState,
    prepSpecializationTier: ctx.prepSpecializationTier,
    intentionalProductFocus: ctx.intentionalProductFocus,
    engagementType: ctx.engagementType ?? "intro_call",
  });
  const prepState = flags.prep_context_state;
  const activeProduct = flags.product_line;
  const effectiveKey = flags.effective_specialty_key as SpecialtyKey;
  const productAligned = flags.use_product_bundle;

  if (
    shouldUseIntroCallOfficialTemplates({
      engagementType: "intro_call",
      prepContextState: prepState,
      intentionalProductFocus: ctx.intentionalProductFocus,
      productLine: ctx.productLine,
    })
  ) {
    return [
      ...buildIntroCallOfficialPreCallPlan({
        productLine: ctx.productLine,
        intentionalProductFocus: ctx.intentionalProductFocus,
        prepSpecializationTier: ctx.prepSpecializationTier,
        providerSpecialty: ctx.providerSpecialty,
      }).probes,
    ];
  }

  const max = MAX_SUGGESTED_DISCOVERY_QUESTIONS;
  const questions: string[] = [];

  if (productAligned && activeProduct) {
    const productBundle = resolveIntroCallProductPrepBundle({
      specialtyKey: effectiveKey,
      productLine: activeProduct,
    });
    for (const q of productBundle.procedureDiscoveryQuestions) {
      pushIntroCallQuestion(questions, q, max);
    }
    if (flags.include_prep_context_extras) {
      for (const q of PREP_CONTEXT_DISCOVERY[prepState] ?? []) {
        pushIntroCallQuestion(questions, q, max);
      }
    }
    for (const q of introCallIntelligenceQuestions(ctx.knownIntelligence, true)) {
      pushIntroCallQuestion(questions, q, max);
    }
    return questions.slice(0, max);
  }

  if (flags.include_generic_discovery_core) {
    for (const q of INTRO_CALL_DISCOVERY_CORE) {
      pushIntroCallQuestion(questions, q, max);
    }
  }

  if (flags.include_specialty_generic_pool) {
    const specialtyPool = INTRO_CALL_DISCOVERY_BY_SPECIALTY_GENERIC[effectiveKey];
    for (const q of specialtyPool.slice(0, 4)) {
      pushIntroCallQuestion(questions, q, max);
    }
  }

  if (flags.prep_mode === "observation_qualification") {
    for (const q of INTRO_CALL_OBSERVATION_QUALIFICATION_DISCOVERY) {
      pushIntroCallQuestion(questions, q, max);
    }
  }

  if (flags.include_generic_discovery_core) {
    for (const q of PREP_CONTEXT_DISCOVERY.discovery ?? []) {
      pushIntroCallQuestion(questions, q, max);
    }
  }

  if (flags.include_generic_discovery_core && ctx.opportunityStage === "discovery") {
    for (const q of INTRO_CALL_DISCOVERY_STAGE_DISCOVERY) {
      pushIntroCallQuestion(questions, q, max);
    }
  }

  const includeProviderStageQuestions =
    productAligned ||
    flags.prep_mode === "evaluation_preparation" ||
    flags.prep_mode === "live_case_support";
  if (includeProviderStageQuestions) {
    const stageQuestions =
      ctx.providerStage &&
      ctx.providerStage in INTRO_CALL_DISCOVERY_BY_PROVIDER_STAGE
        ? INTRO_CALL_DISCOVERY_BY_PROVIDER_STAGE[
            ctx.providerStage as keyof typeof INTRO_CALL_DISCOVERY_BY_PROVIDER_STAGE
          ]
        : undefined;
    if (stageQuestions) {
      for (const q of stageQuestions) {
        pushIntroCallQuestion(questions, q, max);
      }
    }
  }

  for (const q of introCallIntelligenceQuestions(ctx.knownIntelligence, productAligned)) {
    pushIntroCallQuestion(questions, q, max);
  }

  return questions.slice(0, max);
}

function buildContextNote(ctx: DiscoveryContext): string | null {
  const parts: string[] = [];
  if (ctx.prepContextState) {
    const label =
      ctx.prepContextState === "product_exploration"
        ? "Product Exploration"
        : ctx.prepContextState === "evaluation_planning"
          ? "Evaluation Planning"
          : ctx.prepContextState === "observation_support"
            ? "Observation / Support"
            : "Discovery";
    parts.push(label);
  }
  if (ctx.typeLabel) parts.push(ctx.typeLabel);
  if (ctx.productLabel) parts.push(ctx.productLabel);
  if (ctx.specialtyKey !== "default") {
    const label =
      ctx.specialtyKey === "general_surgery"
        ? "General Surgery"
        : ctx.specialtyKey === "wound_care"
          ? "Wound Care"
          : "Orthopedics";
    parts.push(label);
  }
  if (ctx.providerStage) parts.push(PROVIDER_RELATIONSHIP_STAGE_LABELS[ctx.providerStage]);
  if (ctx.opportunityStage) parts.push(salesStageLabel(ctx.opportunityStage));
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Draft field for applying discovery suggestions in the wizard */
export function discoveryQuestionsWorkflowFieldKey(isOfficeVisit: boolean): "pre_observation_probes" | "sim_lab_focus" {
  return isOfficeVisit ? "sim_lab_focus" : "pre_observation_probes";
}

/** Textarea value — bullet lines, editable by rep */
export function formatDiscoveryQuestionsForField(questions: string[]): string {
  return questions.map((q) => `• ${q.trim()}`).join("\n");
}

export function buildPrepareSuggestedDiscovery(input: {
  engagementType: string;
  providerSpecialty?: string | null;
  productLine?: string | null;
  opportunityStage?: string | null;
  providerRelationshipStage?: string | null;
  knownIntelligence: PrepareKnownIntelligence;
  prepContextState?: EngagementPreparationContextState;
  prepSpecializationTier?: PreparationSpecializationTier;
  intentionalProductFocus?: boolean;
  dominantPrep?: DominantPrepGenerationFlags;
}): PrepareSuggestedDiscovery {
  const productLine = input.dominantPrep?.product_line ?? resolveProductLine(input.productLine);
  const specialtyKey = input.dominantPrep
    ? (input.dominantPrep.effective_specialty_key as SpecialtyKey)
    : (resolveEffectiveSpecialtyKeyForPrep({
        productLine,
        providerSpecialty: input.providerSpecialty,
        intentionalProductFocus: input.intentionalProductFocus,
      }) as SpecialtyKey);
  const ctx: DiscoveryContext = {
    engagementType: normalizeEngagementType(input.engagementType) || null,
    typeLabel: formatEngagementType(input.engagementType),
    specialtyKey,
    providerSpecialty: input.providerSpecialty,
    productLine,
    productLabel: resolveProductLine(input.productLine) || trimOrNull(input.productLine?.split(/[,;|]/)[0]),
    opportunityStage: normalizeSalesStage(input.opportunityStage),
    providerStage: normalizeProviderRelationshipStage(input.providerRelationshipStage),
    knownIntelligence: input.knownIntelligence,
    prepContextState: input.prepContextState,
    prepSpecializationTier: input.prepSpecializationTier ?? input.dominantPrep?.product_prep_tier,
    intentionalProductFocus: input.intentionalProductFocus,
    dominantPrep: input.dominantPrep,
  };

  const max = MAX_SUGGESTED_DISCOVERY_QUESTIONS;
  const questions: string[] = [];

  if (ctx.engagementType === "intro_call") {
    questions.push(...buildIntroCallDiscoveryQuestions(ctx));
  } else {
    for (const q of productSpecialtyPool(ctx)) {
      pushUnique(questions, q, max);
    }

    if (ctx.engagementType) {
      for (const q of ENGAGEMENT_TYPE_QUESTIONS[ctx.engagementType] ?? []) {
        pushUnique(questions, q, max);
      }
    }

    if (ctx.opportunityStage) {
      const stagePool =
        ctx.opportunityStage === "discovery"
          ? [
              "What clinical priorities rank above supply changes this quarter?",
              "How satisfied are you with current vendors on your highest-volume procedures?",
            ]
          : (STAGE_QUESTIONS[ctx.opportunityStage] ?? []);
      for (const q of stagePool) {
        pushUnique(questions, q, max);
      }
    }
  }

  if (ctx.engagementType !== "intro_call") {
    if (ctx.providerStage) {
      for (const q of PROVIDER_STAGE_QUESTIONS[ctx.providerStage] ?? []) {
        pushUnique(questions, q, max);
      }
    }

    for (const q of intelligenceQuestions(ctx.knownIntelligence)) {
      pushUnique(questions, q, max);
    }
  }

  if (questions.length === 0) {
    for (const q of SPECIALTY_DEFAULT_QUESTIONS.default) {
      pushUnique(questions, q, max);
    }
  }

  return {
    questions: questions.slice(0, max),
    context_note: buildContextNote(ctx),
  };
}
