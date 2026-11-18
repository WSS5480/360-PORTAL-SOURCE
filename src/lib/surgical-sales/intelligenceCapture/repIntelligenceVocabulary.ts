/**
 * Rep-facing intelligence vocabulary — user concepts only.
 *
 * Allowed: Categories, Findings, Relationships, Evidence, Progress
 * Hidden behind the scenes: facts, signals, mapping, validation structures
 */

export const REP_INTELLIGENCE_VOCAB = {
  /** Structured follow-up after a free-text finding (never "validate"). */
  addDetails: "Add details",
  addDetailsOptional: "Add details (optional)",
  addDetailsHint: "Optional — a few follow-ups when you have them.",
  confirmDetails: "Confirm details",
  confirm: "Confirm",

  /** Exploration state (never "open questions"). */
  stillExploring: "Still exploring",
  toExplore: "to explore",
  nothingToExplore: "Nothing left to explore here.",
  openItems: "to explore",

  /** Captured knowledge (never "confirmed intelligence"). */
  capturedHere: "Captured here",
  captured: "captured",
  capturedInArea: "Saved in this area.",
  noCapturedYet: "Nothing captured here yet.",

  /** Evidence & relationships */
  evidence: "Evidence",
  relationships: "Relationships",
  supportingEvidence: "Supporting evidence",
  relatedContacts: "Related contacts",

  /** Progress (never confidence scoring chrome) */
  progress: "Progress",
  contextDepth: "Context depth",

  /** Capture flow */
  whatDidYouLearn: "What did you learn?",
  saveFinding: "Save finding",
  recentFindings: "Recent findings",
  captureSubtitle:
    "Select a category, choose how you want to capture it, and we'll organize what you learned.",
  organizeFindingsNote:
    "Your notes become findings in this area — you don't need to know where they go.",

  /** Intelligence tab highlights */
  topHighlight: "Top highlight",
  topOpportunity: "Top opportunity",
  biggestUnknown: "Biggest unknown",
  noCriticalUnknownsFlagged: "No critical unknowns flagged yet.",
  noKeyRelationshipsIdentified: "No key relationships identified yet.",
  nothingHighlightedYet: "Nothing highlighted yet.",
  whyThisMatters: "Why this matters",
  whatWeKnow: "What we know",
  whatWeStillNeed: "What we still need",
  emergingSignals: "Emerging Signals",
  needsMoreEvidence: "Needs More Evidence",
  commercialMeaning: "Commercial Meaning",
  caseIntelligence: "Case Intelligence",
  caseIntelligenceSubtitle: "Evidence from observed and covered cases",
  noEmergingSignalsYet: "No emerging case signals yet.",
  noEvidenceGapsYet: "No evidence gaps flagged.",
  noCommercialMeaningYet: "No commercial meaning captured yet.",
  accessPathway: "Access Pathway",
  relatedFindings: "Related findings",
  evidenceImpactAdded: "Added",
  evidenceImpactConfirmed: "Confirmed in the field",
  fieldEvidence: "Evidence",
  noCapturedKnowledgeYet: "Nothing captured yet.",
  noGapsFlagged: "No critical gaps flagged.",
  noCommercialImplications: "No commercial implications captured yet.",
  accessProgress: "Access progress",
  accessStepsKnown: (known: number, total: number) => `${known} of ${total} access steps known`,

  /** Evidence strength (never "Validated" as system state) */
  heardOnce: "Heard once",
  discussed: "Discussed",
  observed: "Observed",
  confirmedInField: "Confirmed in the field",
  howYouKnow: "How you know",

  /** Status chips on category cards */
  statusEmpty: "Not started",
  statusPartial: "Building",
  statusHealthy: "Solid",
  statusComplete: "Complete",
} as const;

/** Map internal scan/maturity labels to rep-safe progress language when shown. */
export function repSafeProgressLabel(internalLabel: string): string {
  const token = internalLabel.trim().toLowerCase();
  if (!token) return REP_INTELLIGENCE_VOCAB.stillExploring;
  if (token.includes("confirm") || token.includes("valid") || token === "complete") {
    return REP_INTELLIGENCE_VOCAB.captured;
  }
  if (token.includes("partial") || token.includes("potential") || token.includes("open")) {
    return REP_INTELLIGENCE_VOCAB.stillExploring;
  }
  return internalLabel;
}
