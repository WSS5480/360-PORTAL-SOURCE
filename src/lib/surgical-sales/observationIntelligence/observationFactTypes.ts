export const OBSERVATION_FACT_TYPES = [
  "competitor_product",
  "current_product",
  "workflow_issue",
  "provider_frustration",
  "staff_issue",
  "staff_efficiency",
  "visualization_challenge",
  "fixation_challenge",
  "product_interest",
  "product_fit_signal",
  "workflow_delay",
  "room_turnover_issue",
  "training_gap",
  "vendor_barrier",
] as const;

export type ObservationFactType = (typeof OBSERVATION_FACT_TYPES)[number];

export type ObservationFactPolarity = "positive" | "negative" | "neutral" | "uncertain";

export type ObservationFactConfirmationState = "witnessed" | "reported" | "needs_confirmation";

export type ObservationFactValidation = {
  status: "accepted" | "suppressed";
  reason?: string;
};

export type ObservationFact = {
  type: ObservationFactType;
  value: string;
  /** Source sentence from the note. */
  evidence: string;
  /** v2 pilot fields — optional, additive; legacy readers ignore them. */
  polarity?: ObservationFactPolarity;
  confirmation_state?: ObservationFactConfirmationState;
  validation?: ObservationFactValidation;
};

export type ObservationPromotionSkip = {
  db_key: string;
  proposed: string;
  existing_preview: string;
};

export type ObservationFactExtraction = {
  facts: ObservationFact[];
  extractedAt: string;
  model: "facts-v1" | "facts-v1-hybrid" | "facts-v2-ai" | "facts-v2-rules-fallback";
  /** Present ⇒ facts passed validateObservationFacts (v2 pilot pipeline). */
  validation_version?: 1;
  /** Capture latency in ms, for pilot rollout metrics. */
  extraction_ms?: number;
  /** Regex output stored alongside AI output for pilot comparison (flag-on only). */
  legacy_facts?: ObservationFact[];
  /** Provider-promotion patches skipped because the target field already had content. */
  promotion_skips?: ObservationPromotionSkip[];
};

export type StoredObservationNoteIntelligence = {
  facts?: ObservationFact[];
  entities?: unknown[];
  primaryCategory?: string | null;
  extractedAt?: string;
  model?: string;
  /** Present ⇒ stored facts were produced by the v2 validated pipeline. */
  validation_version?: number;
};
