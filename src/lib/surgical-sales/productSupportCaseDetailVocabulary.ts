export const PRODUCT_SUPPORT_CAPTURE_OBSERVATION_LABEL = "Add note";

export const PRODUCT_SUPPORT_CAPTURE_OBSERVATION_PRIMARY_LABEL = "Start Dictation";

export const PRODUCT_SUPPORT_WORKSPACE_TABS = [
  { id: "briefing", label: "Briefing" },
  { id: "field_notes", label: "Field Notes" },
  { id: "products", label: "Products" },
  { id: "documents", label: "Documents" },
  { id: "intelligence", label: "Intelligence" },
  { id: "follow_up", label: "Follow-Up" },
] as const;

export type ProductSupportWorkspaceTabId = (typeof PRODUCT_SUPPORT_WORKSPACE_TABS)[number]["id"];

export const PRODUCT_SUPPORT_DETAIL_SECTION_LABELS = {
  todaysMission: "Today's mission",
  whatWeKnow: "What we already know",
  watchForToday: "Watch for today",
  trendingSignals: "Trending signals",
  quickActions: "Quick actions",
  caseSnapshot: "Case snapshot",
  fieldNotes: "Field Notes",
  plannedProducts: "Planned products",
  actualProductsUsed: "Actual products used",
  caseDocuments: "Case documents",
  followUp: "Follow-up",
  evidenceSources: "Evidence sources",
  /** @deprecated */
  captureObservation: "Capture Observation",
  /** @deprecated */
  observationTimeline: "Observation Timeline",
  /** @deprecated */
  caseOutcome: "Case Outcome",
  /** @deprecated */
  relatedProductFits: "Related Product Fits",
} as const;

export const PRODUCT_SUPPORT_BRIEFING_LEADS = {
  mission: "Focus for this support case.",
  known: "Key takeaways from prior support cases, observations, and debriefs.",
  watch: "Previously noted issues from intelligence — look for whether they show up today.",
  trending: "Signals we're seeing across recent notes.",
  quickActions: "Jump into what you need.",
  snapshot: "At-a-glance case details.",
} as const;

export const PRODUCT_SUPPORT_FIELD_NOTES_LEAD =
  "Speak or type what happened — notes save to this case in chronological order.";

export const PRODUCT_SUPPORT_LIVE_NOTES_PHI_REMINDER = "No PHI: do not enter patient identifiers.";

export const PRODUCT_SUPPORT_CAPTURE_HINT = "Saved notes appear in the timeline below.";

export const PRODUCT_SUPPORT_CAPTURE_LEAD =
  "Speak or type what happened — notes save to this case automatically.";

export const PRODUCT_SUPPORT_CAPTURE_MODE_LABELS = {
  voiceNote: "Voice Note",
  quickNote: "Quick Note",
} as const;

/** @deprecated Legacy section labels for unwired components */
export const PRODUCT_SUPPORT_LEGACY_SECTION_LABELS = {
  captureObservation: "Capture Observation",
  observationTimeline: "Observation Timeline",
  caseOutcome: "Case Outcome",
  relatedProductFits: "Related Product Fits",
} as const;
