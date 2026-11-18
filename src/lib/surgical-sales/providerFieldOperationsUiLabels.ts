/**

 * Field operations UI labels — surgical sales provider profile (not generic SaaS / CRM).

 */



/** Provider profile tab bar labels (keys match ProviderTabId) */

export const PROVIDER_FIELD_OPS_TAB_LABELS = {

  overview: "Overview",

  operations: "Operations",

  briefing: "Mission Mode",

  deploy: "Deploy",

  intelligence: "Intelligence",

  engagements: "Engagements",

  cases: "Cases",

  opportunities: "Evaluations",

  activity: "Field activity",

} as const;

/** One-line lead copy under each provider profile tab title. */
export const PROVIDER_FIELD_OPS_TAB_SUBTITLES: Partial<
  Record<keyof typeof PROVIDER_FIELD_OPS_TAB_LABELS, string>
> = {
  overview: "Pathway stage, mission status, and your next field move.",
  engagements: "Scheduled field touches — open an engagement to prepare or run the call.",
  cases: "Chronological learning from observation and coverage work.",
  intelligence: "Validated signals, access pathway, and field learning gaps.",
  activity: "Notes, outreach, and logged field activity.",
  opportunities: "Evaluations and commercial momentum tied to this provider.",
};

/** Shorter tab labels for the mobile scroll strip (full labels stay on desktop). */
export const PROVIDER_FIELD_OPS_TAB_MOBILE_LABELS: Record<
  keyof typeof PROVIDER_FIELD_OPS_TAB_LABELS,
  string
> = {
  overview: "Overview",
  operations: "Ops",
  briefing: "Mission",
  deploy: "Deploy",
  intelligence: "Intelligence",
  engagements: "Engagements",
  cases: "Cases",
  opportunities: "Evaluations",
  activity: "Activity",
} as const;



export const PROVIDER_FIELD_OPS_SECTION = {
  missionOverviewAria: "Sales pathway execution",
  pathwayStage: "Pathway stage",
  whatWeKnow: "What we know",
  nextBestAction: "Next field action",
  nextFieldAction: "Next field action",
  pathwayTimeline: "Pathway timeline",
  recentFieldIntel: "Recent field intel",
  requirementToAdvance: "Requirement to advance",
  advancementSignal: "Readiness",
  observationReadiness: "Readiness",
  observationProgress: "Observation Progress",
  currentEvaluationPath: "Evaluation Path",
  evaluationStatus: "Evaluation Status",
  evaluationPath: "Evaluation Path",
  evaluationNextAction: "Next Action",
  tacticalGap: "Next field move",
  nextRecommendedAction: "Next recommended action",
  requirementProgress: "Requirement progress",
  progress: "Requirement progress",
  visibilityRisk: "Visibility",
  risk: "Visibility",
  accessConfidence: "Access confidence",
  confidence: "Access confidence",
  operationalStatusRail: "Operational status",
  fieldCommand: "Field command",
  fieldPosture: "Field posture",
  nextFieldMove: "Next field move",
  goal: "Goal",
  currentReadiness: "Current readiness",
  status: "Status",
  primaryBlockers: "Needs validation",
  criticalBlockers: "Needs validation",
  facilityOperationalRealities: "Facility operational realities",
  surgeonOperationalRealities: "Surgeon operational realities",
  /** @deprecated Use facilityOperationalRealities */
  facilityAccessRealities: "Facility operational realities",
  /** @deprecated Use surgeonOperationalRealities */
  surgeonWorkflowRealities: "Surgeon operational realities",
  facilityEnvironment: "Facility operational realities",
  providerWorkflow: "Surgeon operational realities",
  operationalRealitiesKicker: "Operational realities",
  facilityContext: "Facility context",
  providerContext: "Provider context",
  facilityContextMeta: "Shared across facility",
  providerContextMeta: "Specific to this provider",
  facilityScopeMeta: "Shared across providers at this facility",
  providerScopeMeta: "Specific to this provider",
  recommendedNextMoves: "Recommended next moves",
  fieldConfidence: "Field confidence",
  visibility: "Visibility",
  stage: "Stage",
  operationalClarity: "Operational clarity",
  readiness: "Readiness",
  workflowVisibility: "Operational clarity",
  tacticalSnapshot: "Tactical snapshot",
  tacticalSnapshotSubtitle: "Synthesized field intelligence",
  suggestedFieldMove: "Suggested field move",
  recommendedFieldMove: "Next field move",
  recommendedFieldStep: "Recommended field step",
  chipGroupBlockers: "Needs validation",
  chipGroupConfirmed: "Confirmed",
  chipGroupUnknown: "Unknown",
  fieldActivity: "Field activity",
  viewAllFieldActivity: "All field activity",
  operationalMemory: "Operational memory",
  deepOperationalIntelligence: "Deep operational intelligence",
  operationalIntelligencePlanning: "Operational intelligence planning",
  operationalIntelligenceAtGlance: "Operational intelligence at a glance",
} as const;

export const PROVIDER_FIELD_OPS_MEMORY_KICKER = {
  lastUpdate: "Last operational update",
  recentLearning: "Recent field learning",
  latestValidated: "Latest validated signal",
  intelligenceFreshness: "Operational intelligence freshness",
} as const;



export const PROVIDER_FIELD_OPS_CTA = {

  scheduleIntroCall: "Schedule intro call",

  addSupportContact: "Add support contact",

  logFieldUpdate: "Log field update",
  logFieldIntel: "Field note",

  startObservation: "Start observation",

  supportCase: "Support case",

  debriefTouchpoint: "Debrief touchpoint",

  openTacticalBriefing: "Open Mission Mode",

  openIntelligenceMap: "Open intelligence map",

  addFieldNote: "Add field note",

  newEngagement: "New engagement",
  startEngagement: "Start engagement",

  captureOperationalIntelligence: "Capture operational intelligence",

  /** @deprecated Use logFieldUpdate */

  logTouchpoint: "Log field update",

  /** @deprecated Use openTacticalBriefing */

  openFieldBriefing: "Open Mission Mode",

  /** @deprecated Use openIntelligenceMap */

  viewOperationalIntelligence: "Open intelligence map",

} as const;


