import { normalizeSalesStage, type SalesStage } from "@/lib/sales/stages";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  resolveEngagementPreparationContextState,
  type EngagementPreparationContextState,
} from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import { hasExplicitPrepProductFocus } from "@/lib/surgical-sales/engagements/introCallProductAlignment";
import { introCallSpecialtyKey, type IntroCallSpecialtyKey } from "@/lib/surgical-sales/engagements/introCallPreparationContent";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";

/** Progressive prep specificity — increases only as context and intelligence accrue. */
export type PreparationSpecializationTier = "low" | "medium" | "high";

const TIER_ORDER: PreparationSpecializationTier[] = ["low", "medium", "high"];

const EVALUATION_STAGES = new Set<SalesStage>([
  "clinical_validation",
  "evaluation_planned",
  "evaluation_active",
]);

const HIGH_VALUE_INTEL_KEYS = new Set([
  "procedural_preferences",
  "competitive_products",
  "competitor_usage",
  "or_team_dynamics",
  "access_notes",
  "evaluation_openness",
  "product_interests",
]);

export type PreparationSpecializationInput = {
  engagementType: string;
  productLine?: string | null;
  opportunityProductLine?: string | null;
  opportunityId?: string | null;
  opportunityStage?: string | null;
  caseId?: string | null;
  providerSpecialty?: string | null;
  providerRelationshipStage?: string | null;
  knownIntelligence?: PrepareKnownIntelligence;
  prepContextState?: EngagementPreparationContextState;
};

export type PreparationSpecializationView = {
  tier: PreparationSpecializationTier;
  tier_label: string;
  tier_index: number;
  headline: string;
  summary: string;
  focus_areas: string[];
  allow_product_specific_prep: boolean;
  show_discovery_focus: boolean;
  show_specialty_guidance: boolean;
  show_high_intensity_guidance: boolean;
};

const TIER_META: Record<
  PreparationSpecializationTier,
  Pick<PreparationSpecializationView, "tier_label" | "headline" | "summary" | "focus_areas">
> = {
  low: {
    tier_label: "Broad workflow discovery",
    headline: "Start broad — workflow discovery",
    summary:
      "Limited context so far. Focus on procedural workflow, access, and evaluation fit before narrowing to specialty or product.",
    focus_areas: [
      "Procedural workflow",
      "OR efficiency",
      "Case complexity",
      "Observation feasibility",
      "Vendor access process",
      "Evaluation openness",
      "Stakeholder mapping",
    ],
  },
  medium: {
    tier_label: "Specialty & procedure guidance",
    headline: "Add specialty and procedure depth",
    summary:
      "Provider or pipeline context is emerging. Layer specialty-specific procedure and workflow guidance on top of discovery themes.",
    focus_areas: [
      "Highest-volume procedure mix",
      "Specialty workflow habits",
      "OR coordination and throughput",
      "Procedure-level observation fit",
      "Stakeholder map for this specialty",
    ],
  },
  high: {
    tier_label: "Product & evaluation prep",
    headline: "Product-specific evaluation and OR support",
    summary:
      "Enough intelligence for product-aligned prep — evaluation logistics, in-case support, and adoption barriers.",
    focus_areas: [
      "Product-specific evaluation prep",
      "OR support guidance",
      "Adoption barriers",
      "Workflow conversion for trial cases",
      "Post-case and expansion path",
    ],
  },
};

const SPECIALTY_FOCUS_EXTRAS: Record<IntroCallSpecialtyKey, string[]> = {
  general_surgery: [
    "Reconstructive and high-volume procedure mix",
    "Lap, open, and robotic workflow share",
  ],
  wound_care: [
    "Clinic vs procedure-room case cadence",
    "Committee and formulary influences",
  ],
  orthopedics: [
    "Trauma-call vs elective extremity flow",
    "Tray and sterile-field constraints",
  ],
  default: ["Site-specific procedural priorities"],
};

function scoreKnownIntelligence(intel: PrepareKnownIntelligence | undefined): number {
  if (!intel) return 0;
  let score = 0;
  for (const bullet of intel.bullets) {
    if (HIGH_VALUE_INTEL_KEYS.has(bullet.key) && String(bullet.value ?? "").trim().length > 8) {
      score += 1;
    }
  }
  if (intel.last_key_insight?.body && intel.last_key_insight.body.trim().length > 12) {
    score += 1;
  }
  return score;
}

export function resolvePreparationSpecializationTier(
  input: PreparationSpecializationInput,
): PreparationSpecializationTier {
  const prepState =
    input.prepContextState ??
    resolveEngagementPreparationContextState({
      engagementType: input.engagementType,
      productLine: input.productLine,
      opportunityProductLine: input.opportunityProductLine,
      opportunityId: input.opportunityId,
      opportunityStage: input.opportunityStage,
      caseId: input.caseId,
      providerRelationshipStage: input.providerRelationshipStage,
    });

  const intelScore = scoreKnownIntelligence(input.knownIntelligence);
  const hasProduct = hasExplicitPrepProductFocus(input.productLine);
  const hasSpecialty = Boolean(String(input.providerSpecialty ?? "").trim());
  const hasOpportunity = Boolean(String(input.opportunityId ?? "").trim());
  const hasCase = Boolean(String(input.caseId ?? "").trim());
  const stage = normalizeSalesStage(input.opportunityStage);

  if (
    prepState === "observation_support" ||
    prepState === "evaluation_planning" ||
    (hasProduct && hasCase) ||
    (hasProduct && intelScore >= 3) ||
    (hasProduct && hasOpportunity && stage && EVALUATION_STAGES.has(stage) && intelScore >= 1)
  ) {
    return "high";
  }

  if (hasSpecialty || intelScore >= 2 || hasOpportunity || (hasProduct && intelScore >= 1)) {
    return "medium";
  }

  if (hasProduct) {
    return "medium";
  }

  return "low";
}

export function buildPreparationSpecializationView(
  input: PreparationSpecializationInput,
): PreparationSpecializationView {
  const tier = resolvePreparationSpecializationTier(input);
  const meta = TIER_META[tier];
  const specialtyKey = introCallSpecialtyKey(input.providerSpecialty);
  const focus_areas =
    tier === "medium"
      ? [...meta.focus_areas, ...(SPECIALTY_FOCUS_EXTRAS[specialtyKey] ?? [])].slice(0, 7)
      : [...meta.focus_areas];

  return {
    tier,
    tier_index: TIER_ORDER.indexOf(tier),
    ...meta,
    focus_areas,
    allow_product_specific_prep: tier === "high",
    show_discovery_focus: tier === "low",
    show_specialty_guidance: tier === "medium" || tier === "high",
    show_high_intensity_guidance: tier === "high",
  };
}

export function isIntroCallStrategicPrepTier(tier: PreparationSpecializationTier): boolean {
  return tier === "medium" || tier === "high";
}
