/**
 * Intelligence capture categories — rep-facing mission areas (not CRM field buckets).
 *
 * Categories unlock with the provider's sales pathway stage. Reps pick what they
 * learned; questions live inside each category.
 */

import type { StageMappingQuestion } from "@/lib/surgical-sales/buildStageMappingSession";
import { hasProviderObservationApprovalOnFile } from "@/lib/surgical-sales/providerObservationApproval";
import {
  SALES_PATHWAY_STAGE_RANK,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";
import { PROVIDER_PROFILE_CAPTURE_INTELLIGENCE_UI } from "@/lib/surgical-sales/providerProfileIntelligenceCaptureCopy";

/** Example finding themes reps capture in Procedure Workflow (post-observation). */
export const PROCEDURE_WORKFLOW_EXAMPLE_FINDINGS = [
  "Room setup",
  "Instrument flow",
  "Staff interactions",
  "Case sequence",
  "Surgeon preferences",
  "OR bottlenecks",
  "Turnover issues",
] as const;

/**
 * Downstream uses for workflow intelligence (observation summaries, debrief planning,
 * product fit, adoption strategy) — not surfaced during Discovery.
 */
export const PROCEDURE_WORKFLOW_FUTURE_USES = [
  "observation_summaries",
  "debrief_planning",
  "product_fit_analysis",
  "adoption_strategy_recommendations",
] as const;

export const INTELLIGENCE_CAPTURE_CATEGORY_IDS = [
  "observation_access",
  "access_pathway",
  "credentialing_facility",
  "key_people_influence",
  "clinical_focus",
  "opportunity_signals",
  "procedure_workflow",
  "clinical_challenges",
  "product_fit_evaluation",
  "adoption_strategy",
] as const;

export type IntelligenceCaptureCategoryId = (typeof INTELLIGENCE_CAPTURE_CATEGORY_IDS)[number];

/** Earliest pathway stage where a category appears in the capture dashboard. */
export type IntelligenceCaptureCategoryUnlockStage = Extract<
  SalesPathwayStageId,
  "discovery" | "observe" | "debrief"
>;

export type IntelligenceCaptureCategoryDef = {
  id: IntelligenceCaptureCategoryId;
  name: string;
  description: string;
  unlockAt: IntelligenceCaptureCategoryUnlockStage;
  signalIds: readonly StageMappingSignalId[];
  /** Hidden during Discovery and until observation permission is on file. */
  requiresObservationApproval?: boolean;
  exampleFindings?: readonly string[];
};

export const INTELLIGENCE_CAPTURE_CATEGORY_DEFS: IntelligenceCaptureCategoryDef[] = [
  {
    id: "observation_access",
    name: "Observation Access",
    description: "Whether observation is approved, blocked, or still being discussed.",
    unlockAt: "discovery",
    signalIds: ["observation_approval"],
  },
  {
    id: "access_pathway",
    name: "Access Pathway",
    description: "Who controls scheduling and when observation can happen.",
    unlockAt: "discovery",
    signalIds: ["scheduling_owner", "observation_logistics"],
  },
  {
    id: "credentialing_facility",
    name: "Credentialing & Facility Requirements",
    description: "Vendor credentials, facility approval, and access blockers.",
    unlockAt: "discovery",
    signalIds: ["facility_vendor_pathway"],
  },
  {
    id: "key_people_influence",
    name: "Key People & Influence",
    description: "Champions, blockers, and who can move access or adoption forward.",
    unlockAt: "discovery",
    signalIds: ["clinical_champion"],
  },
  {
    id: "clinical_focus",
    name: "Clinical Focus",
    description: "Procedure mix, specialty focus, and outcomes the provider cares about.",
    unlockAt: "discovery",
    signalIds: ["workflow_visibility", "opportunity_outcome_priorities"],
  },
  {
    id: "opportunity_signals",
    name: "Commercial Landscape",
    description: "Products in use, competitors, gaps, and future expansion hints.",
    unlockAt: "discovery",
    signalIds: [
      "opportunity_future_signals",
      "opportunity_clinical_frustrations",
      "opportunity_product_gaps",
      "opportunity_products_in_use",
    ],
  },
  {
    id: "procedure_workflow",
    name: "Procedure Workflow",
    description: "Capture how cases actually run — setup, flow, staff coordination, and OR friction.",
    unlockAt: "observe",
    requiresObservationApproval: true,
    exampleFindings: PROCEDURE_WORKFLOW_EXAMPLE_FINDINGS,
    signalIds: ["opportunity_workflow_inefficiencies"],
  },
  {
    id: "clinical_challenges",
    name: "Clinical Challenges",
    description: "Staff frustrations, clinical pain points, and unmet needs from the field.",
    unlockAt: "observe",
    signalIds: ["opportunity_staff_frustrations"],
  },
  {
    id: "product_fit_evaluation",
    name: "Product Fit Evaluation",
    description: "How well our product aligns with what you saw and heard in the OR.",
    unlockAt: "observe",
    signalIds: ["product_alignment"],
  },
  {
    id: "adoption_strategy",
    name: "Adoption Strategy",
    description: "Case opportunity sizing, champion path, and next steps toward commitment.",
    unlockAt: "debrief",
    signalIds: ["case_opportunity"],
  },
];

const CATEGORY_BY_ID = Object.fromEntries(
  INTELLIGENCE_CAPTURE_CATEGORY_DEFS.map((def) => [def.id, def]),
) as Record<IntelligenceCaptureCategoryId, IntelligenceCaptureCategoryDef>;

const SIGNAL_TO_CATEGORY = new Map<StageMappingSignalId, IntelligenceCaptureCategoryId>();
for (const def of INTELLIGENCE_CAPTURE_CATEGORY_DEFS) {
  for (const signalId of def.signalIds) {
    SIGNAL_TO_CATEGORY.set(signalId, def.id);
  }
}

export const INTELLIGENCE_CAPTURE_DASHBOARD_UI = {
  kicker: "Field intelligence",
  title: PROVIDER_PROFILE_CAPTURE_INTELLIGENCE_UI.title,
  subtitle: PROVIDER_PROFILE_CAPTURE_INTELLIGENCE_UI.subtitle,
  findingsLabel: "findings",
  openLabel: "to explore",
  lastUpdatedLabel: "Updated",
  neverUpdated: "Not captured yet",
  backToCategories: "All areas",
  emptyCategory: "Nothing to capture in this area right now.",
} as const;

export function intelligenceCaptureCategoryDef(
  categoryId: IntelligenceCaptureCategoryId,
): IntelligenceCaptureCategoryDef {
  return CATEGORY_BY_ID[categoryId];
}

export function intelligenceCaptureCategoryForSignal(
  signalId: StageMappingSignalId,
): IntelligenceCaptureCategoryId | null {
  return SIGNAL_TO_CATEGORY.get(signalId) ?? null;
}

function isIntelligenceCaptureCategoryVisible(
  def: IntelligenceCaptureCategoryDef,
  pathwayStageId: SalesPathwayStageId,
  contact?: Record<string, unknown>,
): boolean {
  if (SALES_PATHWAY_STAGE_RANK[pathwayStageId] < SALES_PATHWAY_STAGE_RANK[def.unlockAt]) {
    return false;
  }
  if (def.requiresObservationApproval) {
    if (pathwayStageId === "discovery") return false;
    if (!hasProviderObservationApprovalOnFile(contact ?? {})) return false;
  }
  return true;
}

/** Categories visible for pathway stage and observation gates (no future-stage preview). */
export function intelligenceCaptureCategoriesForPathwayStage(
  pathwayStageId: SalesPathwayStageId,
  contact?: Record<string, unknown>,
): IntelligenceCaptureCategoryDef[] {
  return INTELLIGENCE_CAPTURE_CATEGORY_DEFS.filter((def) =>
    isIntelligenceCaptureCategoryVisible(def, pathwayStageId, contact),
  );
}

export function isIntelligenceCaptureCategoryUnlocked(
  categoryId: IntelligenceCaptureCategoryId,
  pathwayStageId: SalesPathwayStageId,
  contact?: Record<string, unknown>,
): boolean {
  const def = CATEGORY_BY_ID[categoryId];
  return isIntelligenceCaptureCategoryVisible(def, pathwayStageId, contact);
}

export type IntelligenceCaptureCategorySlice = {
  open: StageMappingQuestion[];
  laterStage: StageMappingQuestion[];
  confirmed: StageMappingQuestion[];
};

export type IntelligenceCaptureCategoryGroups = Record<
  IntelligenceCaptureCategoryId,
  IntelligenceCaptureCategorySlice
>;

export function groupStageMappingQuestionsByCaptureCategory(
  questions: StageMappingQuestion[],
  pathwayStageId: SalesPathwayStageId,
  contact?: Record<string, unknown>,
): IntelligenceCaptureCategoryGroups {
  const visibleCategories = intelligenceCaptureCategoriesForPathwayStage(pathwayStageId, contact);
  const groups = {} as IntelligenceCaptureCategoryGroups;
  for (const id of INTELLIGENCE_CAPTURE_CATEGORY_IDS) {
    groups[id] = { open: [], laterStage: [], confirmed: [] };
  }

  const visibleIds = new Set(visibleCategories.map((c) => c.id));

  for (const question of questions) {
    const categoryId = intelligenceCaptureCategoryForSignal(
      question.signalId as StageMappingSignalId,
    );
    if (!categoryId || !visibleIds.has(categoryId)) continue;

    const slice = groups[categoryId];
    if (question.visibilityBucket === "confirmed") {
      slice.confirmed.push(question);
      continue;
    }
    if (question.visibilityBucket === "hidden") continue;
    if (question.visibilityBucket === "later_stage") {
      slice.laterStage.push(question);
      continue;
    }
    slice.open.push(question);
  }

  return groups;
}
