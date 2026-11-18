import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import {
  INTRO_CALL_OBSERVATION_GOALS_BY_SPECIALTY_GENERIC,
  INTRO_CALL_OBSERVATION_GOALS_BY_SPECIALTY_PRODUCT,
  introCallSpecialtyKey,
  type IntroCallSpecialtyKey,
} from "@/lib/surgical-sales/engagements/introCallPreparationContent";
import { PREP_CONTEXT_OBSERVATION_GOALS } from "@/lib/surgical-sales/engagements/engagementPreparationContextContent";
import type { EngagementPreparationContextState } from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import type { PreparationSpecializationTier } from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";
import { isIntroCallProductPrepEnabled } from "@/lib/surgical-sales/engagements/introCallProductContext";
import { resolveIntroCallProductLine } from "@/lib/surgical-sales/engagements/introCallProductAlignment";
import type { PreCallPlanProductLine } from "@/lib/surgical-sales/preCallPlanTemplateTypes";

export type IntroCallFutureObservationGoals = {
  items: string[];
  context_note: string | null;
};

const CORE_GOALS = [
  "Identify procedures most suitable for observation",
  "Confirm the surgeon is open to observation on their cases",
  "Capture preferred observation cadence (in-room, key steps only, debrief)",
  "Identify timeline for possible evaluation or case support after observation",
  "Document what the surgeon wants noticed during observation",
  "Learn where workflow friction shows up in their highest-volume cases",
] as const;

const BY_PRODUCT: Partial<Record<PreCallPlanProductLine, string[]>> = {
  ACSIS: [
    "Focus observation candidacy on lap ventral and incisional cases with clear fixation steps",
  ],
  BioTissue: [
    "Align observation timing with graft application workflow in clinic or procedure room",
  ],
  TelaBio: [
    "Prioritize robotic ventral cases where fascial reinforcement steps are visible",
  ],
  "Skeletal Dynamics": [
    "Target trauma-call cases where tray and fixation steps can be observed safely",
  ],
  Endolumik: [
    "Prioritize robotic cases where sizing and confirmation steps can be observed",
  ],
};

function normalizeForDedupe(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
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
  const t = candidate.replace(/\s+/g, " ").trim();
  if (!t || t.length < 12) return;
  if (out.some((existing) => isSimilar(existing, t))) return;
  out.push(t);
}

function intelligenceGoals(intel: PrepareKnownIntelligence): string[] {
  const out: string[] = [];
  for (const b of intel.bullets) {
    if ((b.key === "or_team_dynamics" || b.key === "access_notes") && b.value.length > 12) {
      out.push(`Observation access — factor in: ${b.value.slice(0, 90).trim()}`);
    }
    if (b.key === "evaluation_openness" && b.value.length > 8) {
      out.push(`Evaluation openness noted — plan observation before formal evaluation: ${b.value.slice(0, 70).trim()}`);
    }
  }
  return out;
}

const MAX_ITEMS = 7;

export function buildIntroCallFutureObservationGoals(input: {
  providerSpecialty?: string | null;
  productLine?: string | null;
  knownIntelligence: PrepareKnownIntelligence;
  prepContextState?: EngagementPreparationContextState;
  prepSpecializationTier?: PreparationSpecializationTier;
  intentionalProductFocus?: boolean;
}): IntroCallFutureObservationGoals {
  const specialtyKey = introCallSpecialtyKey(input.providerSpecialty);
  const productLine = resolveIntroCallProductLine(input.productLine);
  const prepState = input.prepContextState ?? (productLine ? "product_exploration" : "discovery");
  const tier = input.prepSpecializationTier ?? (productLine ? "high" : "low");
  const productAligned = isIntroCallProductPrepEnabled(
    productLine,
    tier,
    Boolean(input.intentionalProductFocus),
  );
  const items: string[] = [];

  for (const g of CORE_GOALS) {
    pushUnique(items, g, MAX_ITEMS);
  }

  for (const g of PREP_CONTEXT_OBSERVATION_GOALS[prepState] ?? []) {
    pushUnique(items, g, MAX_ITEMS);
  }

  const specialtyGoals = productAligned
    ? INTRO_CALL_OBSERVATION_GOALS_BY_SPECIALTY_PRODUCT[specialtyKey]
    : INTRO_CALL_OBSERVATION_GOALS_BY_SPECIALTY_GENERIC[specialtyKey];
  for (const g of specialtyGoals) {
    pushUnique(items, g, MAX_ITEMS);
  }

  if (productAligned && productLine && BY_PRODUCT[productLine]) {
    for (const g of BY_PRODUCT[productLine]!) {
      pushUnique(items, g, MAX_ITEMS);
    }
  }

  for (const g of intelligenceGoals(input.knownIntelligence)) {
    pushUnique(items, g, MAX_ITEMS);
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
  if (specialtyKey === "general_surgery") contextParts.push("General Surgery");
  else if (specialtyKey === "wound_care") contextParts.push("Wound Care");
  else if (specialtyKey === "orthopedics") contextParts.push("Orthopedics");

  return {
    items: items.slice(0, MAX_ITEMS),
    context_note: contextParts.length > 1 ? contextParts.join(" · ") : "Plan ahead for OR observation",
  };
}

export function formatFutureObservationGoalsForField(items: string[]): string {
  return items.map((item) => `• ${item.trim()}`).join("\n");
}
