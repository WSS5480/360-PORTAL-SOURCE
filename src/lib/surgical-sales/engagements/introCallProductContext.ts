import {
  introCallSpecialtyKey,
  INTRO_CALL_DISCOVERY_BY_PRODUCT,
  INTRO_CALL_TALKING_BY_PRODUCT,
  type IntroCallSpecialtyKey,
} from "@/lib/surgical-sales/engagements/introCallPreparationContent";
import { resolveIntroCallProductLine } from "@/lib/surgical-sales/engagements/introCallProductAlignment";
import type { PreparationSpecializationTier } from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";
import type { PreCallPlanProductLine } from "@/lib/surgical-sales/preCallPlanTemplateTypes";

/**
 * True when product-specific rule output is allowed.
 * Intentional product focus (wizard selector) unlocks at medium+; inferred context requires high tier.
 */
export function isIntroCallProductPrepEnabled(
  productLine: PreCallPlanProductLine | "",
  prepSpecializationTier?: PreparationSpecializationTier,
  intentionalProductFocus = false,
): boolean {
  if (!productLine || !intentionalProductFocus) return false;
  if (prepSpecializationTier === undefined) return true;
  return prepSpecializationTier === "medium" || prepSpecializationTier === "high";
}

export function resolveIntroCallProductPrepEnabled(input: {
  productLine?: string | null;
  opportunityProductLine?: string | null;
}): boolean {
  return Boolean(resolveIntroCallProductLine(input.productLine, input.opportunityProductLine));
}

export type IntroCallProductPrepBundle = {
  mode: "specialty" | "product";
  productLine: PreCallPlanProductLine | "";
  specialtyKey: IntroCallSpecialtyKey;
  /** Lead workflow guidance — e.g. "Understand fixation workflow and closure inefficiencies." */
  workflowFocus: string;
  procedureDiscoveryQuestions: readonly string[];
  evaluationTalkingPoints: readonly string[];
  workflowTalkingPoints: readonly string[];
};

const SPECIALTY_WORKFLOW_FOCUS: Record<IntroCallSpecialtyKey, string> = {
  general_surgery: "Understand reconstructive workflow variability.",
  wound_care: "Understand advanced wound treatment workflow variability.",
  orthopedics: "Understand extremity procedural workflow variability.",
  default: "Understand procedural workflow variability.",
};

const PRODUCT_PROCEDURE_DISCOVERY: Record<
  PreCallPlanProductLine,
  Partial<Record<IntroCallSpecialtyKey | "default", readonly string[]>>
> = {
  ACSIS: {
    general_surgery: [
      "What fixation workflow are you currently using for lap ventral cases?",
      "Which hernia procedures create the most friction in the OR today?",
      "Where do percutaneous tacks or sutures add time or bleeding risk in ventral closure?",
      "What would need to improve to justify evaluating an alternative closure approach?",
    ],
    default: [
      "What mesh and fixation sequence do you standardize on today?",
      "Which case types would you consider for a workflow trial first?",
    ],
  },
  BioTissue: {
    wound_care: [
      "How are biologics currently selected for wound closure?",
      "What limits clinic or OR efficiency most today?",
      "When do you escalate from standard dressings to biologics — and who triggers that decision?",
      "What would need to improve to justify evaluating an alternative biologic?",
    ],
    default: [
      "How do you stage advanced wounds before escalating to biologics?",
      "Who owns graft selection — you, nursing, or a committee?",
    ],
  },
  Merakris: {
    wound_care: [
      "How are skin substitutes currently selected for chronic wounds?",
      "What limits clinic or procedure-room efficiency most today?",
      "When do you escalate from dressings or NPWT to a graft — and who triggers that decision?",
      "What would need to improve to justify evaluating Merakris?",
    ],
    default: [
      "How do you stage advanced wounds before escalating to a skin substitute?",
      "Who owns graft selection — you, nursing, or a committee?",
    ],
  },
  TelaBio: {
    general_surgery: [
      "How do you reinforce fascial closure in robotic ventral cases today?",
      "Which steps feel redundant compared to your open hernia routine?",
      "What would need to improve to justify evaluating a reinforcement change?",
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
    ],
    default: [
      "Which extremity cases are highest volume for you monthly?",
      "What evaluation case count feels realistic before a preference card change?",
    ],
  },
  Endolumik: {
    general_surgery: [
      "How do you confirm sizing and device placement in robotic cases today?",
      "Where does bougie calibration or foregut workflow create coordination friction?",
      "Which steps create the most staff training burden in the OR?",
      "What would need to improve to justify evaluating a sizing workflow change?",
    ],
    default: [
      "What case types are in scope for an evaluation block?",
      "What documentation do you want captured vs discussed only post-case?",
    ],
  },
};

const PRODUCT_EVALUATION_TALKING: Record<PreCallPlanProductLine, readonly string[]> = {
  ACSIS: [
    "Fixation workflow and closure inefficiencies in ventral cases",
    "Committee or purchasing path before a limited evaluation",
    "Evaluation case profile — lap ventral and incisional hernia",
    "OR time neutrality criteria before a closure workflow trial",
  ],
  BioTissue: [
    "Biologic selection and application workflow in advanced wounds",
    "Evaluation readiness — NPWT rules and committee documentation",
    "Clinic throughput during graft application",
    "Heal-rate or photo evidence the committee expects before trial",
  ],
  Merakris: [
    "Skin-substitute selection and application workflow in chronic wounds",
    "Evaluation readiness — NPWT rules and committee documentation",
    "Clinic throughput during graft application",
    "Heal-rate or photo evidence the committee expects before trial",
  ],
  TelaBio: [
    "Fascial reinforcement workflow in robotic ventral cases",
    "Evaluation fit vs open hernia closure routine",
    "Seroma or recurrence signals that change reinforcement choice",
    "Robotic case types appropriate for a reinforcement evaluation",
  ],
  "Skeletal Dynamics": [
    "Distal extremity fixation workflow and tray friction",
    "Sterile-field comparison purchasing expects before evaluation",
    "Evaluation case count realistic before preference card change",
    "Night-call vs attending tray influence on trial cases",
  ],
  Endolumik: [
    "Bougie calibration and foregut workflow in robotic cases",
    "Sizing and confirmation steps that extend dock time",
    "Staff coordination required before a sizing workflow evaluation",
    "Robotic case types in scope for an evaluation block",
  ],
};

const PRODUCT_WORKFLOW_FOCUS: Record<PreCallPlanProductLine, string> = {
  ACSIS: "Understand fixation workflow and closure inefficiencies.",
  BioTissue: "Understand biologic selection and advanced wound application workflow.",
  Merakris: "Understand skin-substitute selection and application workflow.",
  TelaBio: "Understand fascial reinforcement workflow in robotic ventral cases.",
  "Skeletal Dynamics": "Understand distal extremity fixation workflow and tray friction.",
  Endolumik: "Understand bougie calibration and foregut workflow.",
};

function procedureDiscoveryForProduct(
  productLine: PreCallPlanProductLine,
  specialtyKey: IntroCallSpecialtyKey,
): readonly string[] {
  const byProduct = PRODUCT_PROCEDURE_DISCOVERY[productLine];
  const specific = byProduct[specialtyKey] ?? byProduct.default ?? [];
  const fromContent = INTRO_CALL_DISCOVERY_BY_PRODUCT[productLine] ?? [];
  const merged: string[] = [];
  for (const q of [...specific, ...fromContent]) {
    if (!merged.includes(q)) merged.push(q);
  }
  return merged;
}

function workflowTalkingForProduct(
  productLine: PreCallPlanProductLine,
): readonly string[] {
  return INTRO_CALL_TALKING_BY_PRODUCT[productLine] ?? [];
}

/** Goal phrasing derived from workflow focus (neutral clause, no leading verb). */
export function introCallWorkflowFocusForGoal(focus: string): string {
  return focus
    .replace(/^Understand\s+/i, "")
    .replace(/^Identify\s+/i, "")
    .replace(/\.\s*$/, "")
    .trim();
}

export function resolveIntroCallProductPrepBundle(input: {
  providerSpecialty?: string | null;
  specialtyKey?: IntroCallSpecialtyKey;
  productLine?: string | null;
  opportunityProductLine?: string | null;
}): IntroCallProductPrepBundle {
  const specialtyKey = input.specialtyKey ?? introCallSpecialtyKey(input.providerSpecialty);
  const productLine = resolveIntroCallProductLine(input.productLine, input.opportunityProductLine);

  if (!productLine) {
    return {
      mode: "specialty",
      productLine: "",
      specialtyKey,
      workflowFocus: SPECIALTY_WORKFLOW_FOCUS[specialtyKey],
      procedureDiscoveryQuestions: [],
      evaluationTalkingPoints: [],
      workflowTalkingPoints: [],
    };
  }

  return {
    mode: "product",
    productLine,
    specialtyKey,
    workflowFocus: PRODUCT_WORKFLOW_FOCUS[productLine],
    procedureDiscoveryQuestions: procedureDiscoveryForProduct(productLine, specialtyKey),
    evaluationTalkingPoints: PRODUCT_EVALUATION_TALKING[productLine],
    workflowTalkingPoints: workflowTalkingForProduct(productLine),
  };
}
