/**
 * Provider overview — field briefing vocabulary.
 * Rep-facing execution language only; no CRM storage or database framing.
 */

export const PROVIDER_OVERVIEW_BRIEFING_VOCABULARY = {
  fieldBriefing: "Field briefing",
  fieldBriefingKicker: "Pre-call briefing",
  accessStatus: "Access status",
  whatWeKnow: "Known facts",
  openQuestions: "Open questions",
  /** @deprecated Use openQuestions */
  intelligenceGaps: "Open questions",
  keyRelationships: "Key relationships",
  clinicalSignals: "Clinical signals",
  nextMission: "Recommended next action",
  progressDrivers: "Progress drivers",
  /** @deprecated Use openQuestions framing */
  barriers: "Open questions",
  missionControlKicker: "Mission control",
  fieldPosture: "Field posture",
  accessReadiness: "Access status",
  nextBestAction: "Recommended next action",
  supplementaryBriefing: "Supplementary briefing",
  supplementaryBriefingLead:
    "Useful context when you have it — never required to advance the pathway.",
  addFieldContext: "Add field context",
  logFieldIntel: "Field note",
  manageKeyRelationships: "Manage key relationships",
  noKeyRelationshipsYet: "No key relationships identified yet.",
  influencePaths: "Influence paths",
  facilityContext: "Facility context",
  fieldNotes: "Field notes",
  activityIntelKind: "Field learning",
  missionLogKicker: "Mission log",
  recentActivity: "Recent activity",
  preCallBriefingAria: "Pre-call field briefing",
  noSupplementaryBriefingYet: "No supplementary briefing captured yet.",
  captureInfluencePaths: "Capture influence paths in supplementary briefing.",
  referenceKicker: "Reference",
  missionProgress: "Mission progress",
  intelligenceConfidence: "Field context depth",
  executionRecommendations: "Recommended next actions",
  gapsImproveExecution: "Open items help execution — add context when helpful.",
} as const;

/** Labels that must not appear in provider overview user-visible copy. */
export const PROVIDER_OVERVIEW_BANNED_INTERNAL_LABELS = [
  "Access Intelligence",
  "Optional Intelligence",
  "Champion Candidates",
  "Workflow Understanding",
  "Clinical Understanding",
  "Support Contacts",
  "Operational intelligence",
  "not raw CRM",
] as const;

export type ProviderOverviewBriefingVocabularyKey = keyof typeof PROVIDER_OVERVIEW_BRIEFING_VOCABULARY;

export function providerOverviewBriefingLabel(key: ProviderOverviewBriefingVocabularyKey): string {
  return PROVIDER_OVERVIEW_BRIEFING_VOCABULARY[key];
}
