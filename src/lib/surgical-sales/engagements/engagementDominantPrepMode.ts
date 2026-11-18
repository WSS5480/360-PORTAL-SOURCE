/**
 * @deprecated Prefer `engagementPrepMode` — retained for import stability.
 */
export {
  buildEngagementPrepModeView as buildDominantPrepModeView,
  dominantSpecialtyKeyForProduct,
  resolveEffectiveSpecialtyKeyForPrep,
  resolvePrepGenerationFlags,
  resolveDefaultWizardPrepMode,
  resolveSuggestedEngagementPrepMode,
  type EngagementPrepGenerationFlags as DominantPrepGenerationFlags,
  type EngagementPrepModeView as DominantPrepModeView,
} from "@/lib/surgical-sales/engagements/engagementPrepMode";

/** @deprecated Use EngagementPrepMode */
export type DominantPrepMode =
  | "workflow_discovery"
  | "product_workflow"
  | "product_evaluation"
  | "product_observation";

export type DominantPrepModeInput =
  import("@/lib/surgical-sales/engagements/engagementPrepMode").EngagementPrepModeInput;

export type DominantPrepUiFlags =
  import("@/lib/surgical-sales/engagements/engagementPrepMode").EngagementPrepModeUiFlags;
