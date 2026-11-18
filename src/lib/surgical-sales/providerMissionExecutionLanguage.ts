/**
 * Mission execution language — provider-facing copy only.
 *
 * Philosophy: Known facts · Open questions · Recommended next actions.
 * Never punish. Never grade. Help the rep move forward.
 */

/** Three pillars shown across briefing, pathway, and mission surfaces. */
export const MISSION_EXECUTION_PILLARS = {
  knownFacts: "Known facts",
  openQuestions: "Open questions",
  recommendedNextActions: "Recommended next actions",
} as const;

/** Field context not yet established — not a rep failure. */
export const MISSION_FIELD_CONTEXT_UNKNOWN = "Still learning in the field";

/** Empty capture state on provider overview intelligence lines. */
export const MISSION_INTELLIGENCE_NOT_YET_OBSERVED = "Not yet observed in the field";

/** Background / access intelligence empty confidence. */
export const MISSION_CAPTURE_CONFIDENCE_EMPTY = "Still learning";

export const MISSION_CAPTURE_SOURCE_EMPTY = "Capture on next touch";

/** Intelligence confidence — depth of supporting context, not a grade. */
export const MISSION_INTELLIGENCE_CONFIDENCE_LABELS = {
  low: "Limited field context available",
  medium: "Developing field context",
  high: "Strong field context on file",
} as const;

export type MissionIntelligenceConfidenceLevel = keyof typeof MISSION_INTELLIGENCE_CONFIDENCE_LABELS;

/** Gap completeness — learning state, not missing-data punishment. */
export const MISSION_GAP_COMPLETENESS_LABELS = {
  known: "Known on file",
  partial: "Partially learned",
  missing: "Still being learned",
} as const;

/** Gap priority — execution focus, not failure severity. */
export const MISSION_GAP_PRIORITY_LABELS = {
  high: "Worth confirming soon",
  medium: "Worth confirming",
  low: "Optional context",
} as const;

/** Observation readiness — planning posture, not pass/fail. */
export const MISSION_OBSERVATION_READINESS_LABELS = {
  ready: "Ready to plan",
  conditional: "Plan with open questions",
  not_ready: "Build relationship first",
} as const;

/** Access briefing headlines — milestone posture, not blockers. */
export const MISSION_ACCESS_HEADLINE_LABELS = {
  interested: "Observation interest captured",
  approved: "Observation access confirmed",
  pending: "Permission pending",
  declined: "Observation permission declined",
  unknown: "Observation permission not yet confirmed",
} as const;

export type MissionAccessHeadlineKey = keyof typeof MISSION_ACCESS_HEADLINE_LABELS;

/** Discovery field lifecycle — no "Blocked" punishment label. */
export const MISSION_DISCOVERY_FIELD_STATUS = {
  unknown: "Still learning",
  captured: "Captured",
  validated: "Confirmed on file",
  conditional: "Partially learned",
  declined: "Declined on file",
  notApplicable: "Not needed",
} as const;

/** Execution recommendation phrases — optional intel, never advancement blockers. */
export const MISSION_EXECUTION_OPEN_QUESTIONS: Partial<Record<string, string>> = {
  provider_interest_unknown: "Observation interest not yet established",
  observation_not_approved: "Formal observation approval still open",
  credentialing_platform_unknown: "Credentialing process still being learned",
  credentialing_pathway_unknown: "Credentialing path still being learned",
  scheduler_contact_missing: "Scheduling process still being learned",
  scheduling_workflow_unknown: "Scheduling workflow still being learned",
};

export const MISSION_EXECUTION_OPEN_QUESTIONS_BY_LABEL: Record<string, string> = {
  "Scheduler Contact": "Scheduling process still being learned",
  "Credentialing Pathway": "Credentialing path still being learned",
  "Candidate Case": "Best observation case still being identified",
  "Observation Date": "Target observation timing still open",
};

const PUNISHING_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bmissing scheduler contact\b/gi, "Scheduling process still being learned"],
  [/\bmissing scheduler\b/gi, "Scheduling process still being learned"],
  [/\bclinical understanding missing\b/gi, "Clinical context not yet captured"],
  [/\bclinical missing\b/gi, "Clinical context not yet captured"],
  [/\baccess status:\s*blocked\b/gi, "Observation permission not yet confirmed"],
  [/\bor access blocked\b/gi, "OR access not yet confirmed"],
  [/\baccess pathway blocked\b/gi, "Access details open"],
  [/\baccess barriers?\b/gi, "Access details open"],
  [/\bnot pursuing observation\b/gi, MISSION_ACCESS_HEADLINE_LABELS.declined],
  [/\bpriority learning\b/gi, MISSION_GAP_PRIORITY_LABELS.high],
  [/\bdeployment gaps?\b/gi, "Supporting details"],
  [/\btop gap\b/gi, "Supporting detail"],
  [/\bprimary gap\b/gi, "Focus area"],
  [/\bprofile gap\b/gi, "Optional context available"],
  [/\bclose gaps?\b/gi, "Add context"],
  [/\blow intelligence confidence\b/gi, MISSION_INTELLIGENCE_CONFIDENCE_LABELS.low],
  [/\blow confidence\b/gi, MISSION_INTELLIGENCE_CONFIDENCE_LABELS.low],
  [/\bhigh gaps?\b/gi, "Open questions remain"],
  [/\bintelligence gaps?\b/gi, MISSION_EXECUTION_PILLARS.openQuestions.toLowerCase()],
  [/\bblocked\b/gi, "Not yet confirmed"],
  [/\bmissing\b/gi, "Still being learned"],
  [/\bnot captured\b/gi, "Not yet captured"],
  [/\bnot validated\b/gi, "Not yet confirmed on file"],
  [/\bnot ready\b/gi, MISSION_OBSERVATION_READINESS_LABELS.not_ready],
  [/\bprocedure mix not validated\b/gi, "Procedure mix not yet observed in the field"],
  [/\btechnique preferences not validated\b/gi, "Technique preferences not yet observed"],
  [/\bcredentialing steps not validated\b/gi, "Credentialing path still being learned"],
  [/\bor access not validated\b/gi, "OR access path still being learned"],
];

/** Normalize legacy punitive copy to mission-forward language. */
export function softenMissionExecutionCopy(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  let t = text.trim();
  for (const [pattern, replacement] of PUNISHING_PHRASE_REPLACEMENTS) {
    t = t.replace(pattern, replacement);
  }
  return t.replace(/\s{2,}/g, " ").trim();
}

export function missionIntelligenceConfidenceLabel(
  level: MissionIntelligenceConfidenceLevel,
): string {
  return MISSION_INTELLIGENCE_CONFIDENCE_LABELS[level];
}

export function missionGapCompletenessLabel(
  completeness: keyof typeof MISSION_GAP_COMPLETENESS_LABELS,
): string {
  return MISSION_GAP_COMPLETENESS_LABELS[completeness];
}

export function missionGapPriorityLabel(
  priority: keyof typeof MISSION_GAP_PRIORITY_LABELS,
): string {
  return MISSION_GAP_PRIORITY_LABELS[priority];
}

export function missionExecutionOpenQuestion(
  key: string,
  fallback?: string,
): string {
  return (
    MISSION_EXECUTION_OPEN_QUESTIONS[key as keyof typeof MISSION_EXECUTION_OPEN_QUESTIONS] ??
    MISSION_EXECUTION_OPEN_QUESTIONS_BY_LABEL[key] ??
    softenMissionExecutionCopy(fallback ?? key)
  );
}

/** Contact info on file — learning posture, not failure. */
export const MISSION_CONTACT_INFO_STATUS = {
  onFile: "On file",
  partial: "Partial on file",
  missing: "Contact details still being learned",
} as const;

export function missionContactInfoStatusLabel(
  status: "On file" | "Missing" | "Partial" | keyof typeof MISSION_CONTACT_INFO_STATUS,
): string {
  if (status === "On file" || status === "onFile") return MISSION_CONTACT_INFO_STATUS.onFile;
  if (status === "Partial" || status === "partial") return MISSION_CONTACT_INFO_STATUS.partial;
  return MISSION_CONTACT_INFO_STATUS.missing;
}

/** Relationship map status labels. */
export const MISSION_RELATIONSHIP_STATUS_LABELS = {
  confirmed: "Confirmed on file",
  identified: "Referenced in the field",
  missing: MISSION_INTELLIGENCE_NOT_YET_OBSERVED,
} as const;

/** Commercial access posture labels. */
export const MISSION_ACCESS_STATUS_LABELS = {
  open: "Access open",
  partial: "Partial access",
  blocked: "Access not available on file",
  unknown: "Access details open",
} as const;

export function missionSchedulerReferencedLabel(name?: string | null): string {
  const trimmed = name?.trim();
  if (trimmed) {
    return `${trimmed} referenced — contact details still being learned`;
  }
  return "Scheduler referenced — contact details still being learned";
}

export function missionObservationInterestLabel(
  interested: boolean,
  approved: boolean,
): string {
  if (approved) return "Observation access confirmed";
  if (interested) return "Observation interest captured — approval still open";
  return "Observation interest not yet established";
}
