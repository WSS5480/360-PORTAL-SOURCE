/** Product focus keys for hardcoded Intro Call templates. */
export type IntroCallProductFocus =
  | "generic"
  | "acsis"
  | "biotissue"
  | "merakris"
  | "endolumik"
  | "telabio"
  | "skeletalDynamics";

/** Hardcoded Intro Call pre-call strategy — no runtime product positioning generation. */
export type IntroCallPrepTemplate = {
  id: IntroCallProductFocus;
  /** Display label for preview badges */
  productLabel: string;
  smartObjective: string;
  impactOpeningStatement: string;
  probesInformationToGather: readonly string[];
  toolsResources: string;
  valueHypothesis: string;
  plannedCloseNextStep: string;
  observationGoals: readonly string[];
  suggestedFollowUp: readonly string[];
  additionalNotesPlaceholder: string;
};
