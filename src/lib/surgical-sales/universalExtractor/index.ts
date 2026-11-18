export * from "./types";
export {
  runUniversalSurgicalExtraction,
  runRulesUniversalSurgicalExtraction,
  runUniversalSurgicalExtractionAsync,
} from "./runUniversalSurgicalExtraction";
export {
  extractUniversalSurgicalFacts,
  factConcepts,
  factsContainOpportunitySignal,
} from "./extractUniversalSurgicalFacts";
export {
  captureUniversalSurgicalIntelligence,
  attachUniversalCaptureToNoteEnvelope,
  attachUniversalShadowToNoteEnvelope,
  mapCaseContextToUniversalSource,
} from "./runUniversalExtractorShadow";
export {
  mapQuickCaptureToUniversalDeclaredSource,
  resolveQuickCaptureEngagementType,
} from "./mapQuickCaptureToUniversalDeclaredSource";
export type { UniversalCaptureEnvelope, UniversalShadowComparison } from "./runUniversalExtractorShadow";
export {
  persistUniversalSurgicalFacts,
  resolveUniversalFactScope,
  buildUniversalFactRows,
} from "./persistUniversalSurgicalFacts";
export type {
  UniversalFactScope,
  PersistUniversalSurgicalFactsInput,
  PersistUniversalSurgicalFactsResult,
} from "./persistUniversalSurgicalFacts";
export {
  loadUniversalFacts,
  loadUniversalFactsGroupedByCapture,
  loadUniversalFactsByCaptureId,
  groupUniversalFactsByCapture,
  loadUniversalFactsForCase,
  loadUniversalFactsForProvider,
  loadUniversalFactsForOrganization,
  loadUniversalFactsForEncounter,
  loadUniversalFactCapturesForCase,
} from "./loadUniversalSurgicalFacts";
export type {
  UniversalSurgicalFactRow,
  UniversalSurgicalFactCaptureRow,
  UniversalFactExtractionRun,
} from "./loadUniversalSurgicalFacts";
export {
  isUniversalSurgicalFactsEnabled,
  isGptUniversalFactExtractorEnabled,
  isUniversalExtractorShadowEnabled,
  isUniversalExtractorDevRouteEnabled,
  isUniversalExtractionReviewPrimaryEnabled,
} from "./universalExtractorFeatureFlag";
export { enrichDebriefIntelligenceBriefWithUniversalFacts } from "./adaptUniversalFactsToDebriefClinicalBrief";
export { composeDebriefReviewDisplay } from "./composeDebriefReviewDisplay";
export { buildDebriefReviewFromUniversalFacts } from "./buildDebriefReviewFromUniversalFacts";
export { mapUniversalFactsToActionableReviewCards } from "./mapUniversalFactsToActionableReviewCards";
export {
  filterDipReviewCardsToWorkflowOnly,
  filterDipIntelligenceUpdatesToWorkflowOnly,
} from "./filterDipReviewToWorkflowSections";
export { universalCaptureToExtractionRun } from "./universalCaptureToExtractionRun";
export { mergeProductSupportIntelligenceSections } from "./adaptUniversalFactsToProductSupportIntelligence";
export { isUniversalFactsReadModelEnabled } from "./universalFactsReadModelFlag";
export {
  loadUniversalFactsReadModelForCase,
  loadUniversalFactsReadModelForProvider,
} from "./loadUniversalFactsReadModel";
export type { UniversalFactsReadModelPayload } from "./universalFactsReadModelAdapters";
export {
  UNIVERSAL_SOURCE_TYPE_LABELS,
  UNIVERSAL_ASSERTION_PROBE_SOURCE_TYPES,
  UNIVERSAL_DEFAULT_ASSERTION_PROBE_NOTE,
  DEBRIEF_VALIDATION_CONFIRM_SIZING_NOTE,
  DEBRIEF_VALIDATION_REJECT_SIZING_NOTE,
  UNIVERSAL_DEBRIEF_VALIDATION_PROBE_PRESETS,
  UNIVERSAL_SOURCE_TYPE_OPTIONS,
  formatUniversalDeclaredSourceType,
} from "./universalDeclaredSourceTypes";
export {
  buildUniversalConceptTimeline,
  formatConceptTimelineSourceLabel,
  formatUniversalAssertionLevel,
  groupConceptTimelineEventsByAssertion,
  UNIVERSAL_ASSERTION_LEVEL_LABELS,
  UNIVERSAL_ASSERTION_TIMELINE_ORDER,
} from "./buildUniversalConceptTimeline";
export type {
  UniversalConceptTimelineAssertionGroup,
  UniversalConceptTimelineEntry,
  UniversalConceptTimelineEvent,
} from "./buildUniversalConceptTimeline";
export {
  fragmentHasUncertaintyLanguage,
  mergeFragmentUncertaintyWithNote,
  mergeUncertaintyNotes,
  noteQualifiesExtractedFact,
  splitFragmentEvidenceAndUncertainty,
} from "./evidenceUncertaintySeparation";
export type { EvidenceUncertaintySplit } from "./evidenceUncertaintySeparation";
export {
  summarizeUniversalConceptTimelineForDebriefPrepare,
} from "./summarizeUniversalConceptTimelineForDebriefPrepare";
export type {
  DebriefPrepareConceptDigest,
  DebriefPrepareConceptTimelineSummary,
} from "./summarizeUniversalConceptTimelineForDebriefPrepare";
export { buildProviderIntelligenceFromUniversalFacts } from "./buildProviderIntelligenceFromUniversalFacts";
export { adaptUniversalFactsToObservationFieldEvidenceCards } from "./adaptUniversalFactsToFieldEvidenceCards";
export { buildProviderIntelligenceComparisonCurrentView } from "./buildProviderIntelligenceComparisonCurrentView";
export {
  formatProviderIntelligenceComparisonLabel,
  sortProviderIntelligenceComparisonTopics,
  PROVIDER_INTELLIGENCE_COMPARISON_CONCEPT_ORDER,
} from "./providerIntelligenceComparisonTypes";
export type {
  ProviderIntelligenceComparisonSnapshot,
  ProviderIntelligenceComparisonTopicRow,
} from "./providerIntelligenceComparisonTypes";
export {
  filterProviderScopedFactRuns,
  factMatchesProviderScope,
  adaptUniversalFactsToClinicalReferenceSignalGroups,
  adaptUniversalFactsToProductNeedsConfirmation,
  resolveClinicalReferenceSignalGroups,
  resolveProductNeedsConfirmation,
} from "./adaptUniversalFactsToProviderIntelligenceClinicalReads";
export type {
  UniversalFactDisplayRow,
  UniversalFactMergeSource,
} from "./dedupeUniversalFactsForDisplay";
