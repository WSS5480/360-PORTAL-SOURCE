import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import {
  introCallSpecialtyKey,
  type IntroCallSpecialtyKey,
} from "@/lib/surgical-sales/engagements/introCallPreparationContent";
import type { PreCallPlanProductLine } from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import { PREP_CONTEXT_COMMERCIALIZATION } from "@/lib/surgical-sales/engagements/engagementPreparationContextContent";
import type { EngagementPreparationContextState } from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import type { PreparationSpecializationTier } from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";
import { isIntroCallProductPrepEnabled } from "@/lib/surgical-sales/engagements/introCallProductContext";
import { resolveIntroCallProductLine } from "@/lib/surgical-sales/engagements/introCallProductAlignment";
import type { EngagementPrepGenerationFlags } from "@/lib/surgical-sales/engagements/engagementPrepMode";

export type CommercializationPathway = "observable" | "evaluatable" | "adoptable";

export type IntroCallCommercializationSignal = {
  key: string;
  pathway: CommercializationPathway;
  text: string;
};

export type IntroCallCommercializationSignals = {
  title: string;
  signals: IntroCallCommercializationSignal[];
  context_note: string | null;
};

const PATHWAY_LABEL: Record<CommercializationPathway, string> = {
  observable: "Observable",
  evaluatable: "Evaluatable",
  adoptable: "Adoptable",
};

export function commercializationPathwayLabel(pathway: CommercializationPathway): string {
  return PATHWAY_LABEL[pathway];
}

type SignalTemplate = IntroCallCommercializationSignal;

const BASE_SIGNALS: SignalTemplate[] = [
  {
    key: "volume",
    pathway: "observable",
    text: "High procedural volume in target cases — confirm monthly mix on the call",
  },
  {
    key: "or_access",
    pathway: "observable",
    text: "Observation appetite — which case types the surgeon would allow and what to watch for",
  },
  {
    key: "workflow_friction",
    pathway: "evaluatable",
    text: "Workflow dissatisfaction in procedural steps or case throughput",
  },
  {
    key: "eval_openness",
    pathway: "evaluatable",
    text: "Evaluation openness when clinical and operational criteria are met",
  },
  {
    key: "product_fit",
    pathway: "evaluatable",
    text: "Product alignment with the procedures they run most often",
  },
  {
    key: "relationship",
    pathway: "adoptable",
    text: "Relationship responsiveness for follow-up and observation scheduling",
  },
  {
    key: "adoption_path",
    pathway: "adoptable",
    text: "Committee or supply chain posture if evaluation moves forward",
  },
];

const SPECIALTY_SIGNALS_GENERIC: Partial<
  Record<"general_surgery" | "wound_care" | "orthopedics", SignalTemplate>
> = {
  general_surgery: {
    key: "volume",
    pathway: "observable",
    text: "Reconstructive case volume — enough to support future OR observation",
  },
  wound_care: {
    key: "volume",
    pathway: "observable",
    text: "Advanced wound case cadence — clinic and procedure-room observation fit",
  },
  orthopedics: {
    key: "volume",
    pathway: "observable",
    text: "Extremity trauma volume — sterile-field observation feasibility",
  },
};

const SPECIALTY_SIGNALS_PRODUCT: Partial<
  Record<"general_surgery" | "wound_care" | "orthopedics", SignalTemplate>
> = {
  general_surgery: {
    key: "volume",
    pathway: "observable",
    text: "Abdominal wall / hernia case volume — enough to support future OR observation",
  },
  wound_care: {
    key: "volume",
    pathway: "observable",
    text: "Advanced wound case cadence — clinic and procedure-room observation fit",
  },
  orthopedics: {
    key: "volume",
    pathway: "observable",
    text: "Extremity trauma volume — sterile-field observation feasibility",
  },
};

const PRODUCT_SIGNALS: Partial<Record<PreCallPlanProductLine, Partial<SignalTemplate>>> = {
  ACSIS: {
    key: "product_fit",
    pathway: "evaluatable",
    text: "ACSIS fit — ventral/incisional fixation workflow and closure steps",
  },
  BioTissue: {
    key: "product_fit",
    pathway: "evaluatable",
    text: "BioTissue fit — biologic selection rules and NPWT-compatible workflow",
  },
};

const MAX_SIGNALS = 6;

function trimField(provider: Record<string, unknown> | undefined, key: string): string {
  return String(provider?.[key] ?? "").trim();
}

function bulletValue(intel: PrepareKnownIntelligence, key: string): string | null {
  const b = intel.bullets.find((x) => x.key === key);
  return b?.value?.trim() || null;
}

function refineFromIntelligence(
  signals: SignalTemplate[],
  intel: PrepareKnownIntelligence,
  provider: Record<string, unknown> | undefined,
  productAligned: boolean,
): SignalTemplate[] {
  const out = signals.map((s) => ({ ...s }));

  const evalOpen =
    trimField(provider, "provider_evaluation_openness") || bulletValue(intel, "evaluation_openness");
  if (evalOpen) {
    replaceSignal(out, "eval_openness", {
      key: "eval_openness",
      pathway: "evaluatable",
      text: `Evaluation openness on file — validate criteria: ${evalOpen.slice(0, 72)}`,
    });
  }

  const access =
    trimField(provider, "access_notes") || bulletValue(intel, "access_notes");
  const orDynamics = bulletValue(intel, "or_dynamics");
  if (access || orDynamics) {
    const hint = (access || orDynamics)!.slice(0, 70);
    replaceSignal(out, "or_access", {
      key: "or_access",
      pathway: "observable",
      text: `OR access feasibility — confirm path (${hint})`,
    });
  }

  const strength = trimField(provider, "relationship_strength").toLowerCase();
  if (strength === "strong" || strength === "medium") {
    replaceSignal(out, "relationship", {
      key: "relationship",
      pathway: "adoptable",
      text: `Relationship responsiveness (${strength}) — lock dated follow-up on the call`,
    });
  } else if (strength === "weak" || strength === "unknown") {
    replaceSignal(out, "relationship", {
      key: "relationship",
      pathway: "adoptable",
      text: "Relationship responsiveness — gauge appetite for scheduling and callbacks",
    });
  }

  const competitors = bulletValue(intel, "competitor_usage");
  if (competitors && /lag|friction|frustrat|slow|pain|versus/i.test(competitors)) {
    replaceSignal(out, "workflow_friction", {
      key: "workflow_friction",
      pathway: "evaluatable",
      text: productAligned
        ? "Workflow dissatisfaction vs incumbent — validate closure/fixation friction"
        : "Workflow dissatisfaction vs incumbent — validate procedural friction on the call",
    });
  }

  const procedural = bulletValue(intel, "procedural_preferences");
  if (procedural) {
    replaceSignal(out, "volume", {
      key: "volume",
      pathway: "observable",
      text: `Procedure mix documented — validate volume in ${procedural.slice(0, 55)}`,
    });
  }

  if (/committee|purchasing|formulary|cautious/i.test(evalOpen ?? "")) {
    replaceSignal(out, "adoption_path", {
      key: "adoption_path",
      pathway: "adoptable",
      text: "Committee or purchasing gates — clarify evidence before evaluation cases",
    });
  }

  return out;
}

function replaceSignal(out: SignalTemplate[], key: string, next: SignalTemplate): void {
  const i = out.findIndex((s) => s.key === key);
  if (i >= 0) out[i] = next;
}

function mergeTemplates(
  specialtyKey: IntroCallSpecialtyKey,
  tier: PreparationSpecializationTier,
  prepState: EngagementPreparationContextState,
  useSpecialtyOverlay: boolean,
): SignalTemplate[] {
  const merged = BASE_SIGNALS.map((s) => ({ ...s }));
  const specialtyPool = tier === "high" ? SPECIALTY_SIGNALS_PRODUCT : SPECIALTY_SIGNALS_GENERIC;
  const specialtyOverride =
    useSpecialtyOverlay && specialtyKey !== "default" ? specialtyPool[specialtyKey] : undefined;
  if (specialtyOverride) {
    replaceSignal(merged, specialtyOverride.key, { ...specialtyOverride });
  }
  const contextSignal = PREP_CONTEXT_COMMERCIALIZATION[prepState];
  if (contextSignal) {
    replaceSignal(merged, contextSignal.key, { ...contextSignal });
  }
  return merged;
}

export function buildIntroCallCommercializationSignals(input: {
  providerSpecialty?: string | null;
  productLine?: string | null;
  knownIntelligence: PrepareKnownIntelligence;
  provider?: Record<string, unknown>;
  prepContextState?: EngagementPreparationContextState;
  prepSpecializationTier?: PreparationSpecializationTier;
  intentionalProductFocus?: boolean;
  dominantPrep?: EngagementPrepGenerationFlags;
}): IntroCallCommercializationSignals {
  const flags = input.dominantPrep;
  const productLine = flags?.product_line ?? resolveIntroCallProductLine(input.productLine);
  const specialtyKey = flags?.effective_specialty_key ?? introCallSpecialtyKey(input.providerSpecialty);
  const prepState =
    flags?.prep_context_state ?? input.prepContextState ?? (productLine ? "product_exploration" : "discovery");
  const tier = flags?.product_prep_tier ?? input.prepSpecializationTier ?? (productLine ? "high" : "low");
  const productAligned = Boolean(
    flags?.use_product_bundle &&
      isIntroCallProductPrepEnabled(productLine, tier, Boolean(flags?.intentional_product_focus)),
  );
  const useSpecialtyOverlay = Boolean(flags?.include_specialty_generic_pool || productAligned);

  let templates = mergeTemplates(specialtyKey, tier, prepState, useSpecialtyOverlay);
  templates = refineFromIntelligence(
    templates,
    input.knownIntelligence,
    input.provider,
    productAligned,
  );

  if (productLine && productAligned) {
    const patch = PRODUCT_SIGNALS[productLine];
    if (patch?.key && patch.pathway && patch.text) {
      replaceSignal(templates, patch.key, {
        key: patch.key,
        pathway: patch.pathway,
        text: patch.text,
      });
    }
  }

  const priority: string[] = [
    "volume",
    "or_access",
    "workflow_friction",
    "eval_openness",
    "product_fit",
    "relationship",
    "adoption_path",
  ];

  const byKey = new Map(templates.map((t) => [t.key, t]));
  const signals: IntroCallCommercializationSignal[] = [];
  for (const key of priority) {
    const t = byKey.get(key);
    if (t) signals.push(t);
    if (signals.length >= MAX_SIGNALS) break;
  }

  const contextParts: string[] = [
    prepState === "product_exploration"
      ? "Product Exploration"
      : prepState === "evaluation_planning"
        ? "Evaluation Planning"
        : prepState === "observation_support"
          ? "Observation / Support"
          : "Discovery",
  ];
  if (productLine) contextParts.push(productLine);
  if (specialtyKey !== "default") {
    contextParts.push(
      specialtyKey === "general_surgery"
        ? "General Surgery"
        : specialtyKey === "wound_care"
          ? "Wound Care"
          : "Orthopedics",
    );
  }

  return {
    title: "Potential signals to validate during this interaction",
    signals,
    context_note: contextParts.join(" · "),
  };
}
