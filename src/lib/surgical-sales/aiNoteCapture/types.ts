import type { CaptureIntelligenceLaunchSurface } from "@/lib/surgical-sales/captureIntelligenceLaunch";
import type { DeclaredSourceType } from "@/lib/surgical-sales/declaredSourceType";
import type { AiNoteCaptureMergeStrategy, AiNoteCaptureWorkflowTarget } from "./workflowTargets";

export const AI_NOTE_CAPTURE_CLASSIFICATIONS = [
  "workflow_field_suggestion",
  "provider_intelligence",
  "case_observation",
  "opportunity_signal",
  "organization_intelligence",
  "competitive_intelligence",
  "follow_up_task",
  "product_usage",
  "resource_or_document_note",
  "unclassified",
] as const;

export type AiNoteCaptureClassification = (typeof AI_NOTE_CAPTURE_CLASSIFICATIONS)[number];

export const AI_NOTE_CAPTURE_DESTINATIONS = [
  "provider",
  "case",
  "opportunity",
  "organization",
  "task",
  "product",
  "unclassified",
] as const;

export type AiNoteCaptureDestination = (typeof AI_NOTE_CAPTURE_DESTINATIONS)[number];

export type AiNoteCaptureInputMode = "photo" | "upload" | "dictate" | "type";

export type AiNoteCaptureContext = {
  caseId?: string;
  caseLabel?: string;
  providerId?: string;
  providerLabel?: string;
  opportunityId?: string;
  opportunityLabel?: string;
  organizationId?: string;
  organizationLabel?: string;
  /** When opened from an engagement — inherited targets, not user-selected. */
  engagementId?: string;
  engagementTypeLabel?: string;
  /** Raw `engagement_type` when capture is scoped to an engagement. */
  engagementType?: string;
  productFocus?: string;
  scopeLocked?: boolean;
  /** Where the flow was opened — drives title, review hints, and default routing. */
  launchSurface?: CaptureIntelligenceLaunchSurface;
  /** Restrict field routing to these provider intelligence keys (debrief / regression). */
  writableFieldKeys?: readonly string[];
  /** Capture source declared by the opening surface; defaults to field_note. */
  declaredSourceType?: DeclaredSourceType;
  /** Optional compose-step overrides (e.g. mission board Dictate & Complete). */
  composeTitle?: string;
  composeSubtitle?: string;
  reviewSaveCta?: string;
};

export type AiNoteCaptureSavedResult = {
  title: string;
  detail?: string;
  sourceText?: string;
};

export type AiNoteCaptureExtractedSuggestion = {
  id: string;
  originalText: string;
  cleanedText: string;
  category: AiNoteCaptureClassification;
  destination: AiNoteCaptureDestination;
  confidence: number;
  reasoningShort: string;
  /** @deprecated use destinationRecordId */
  suggestedRecordId: string | null;
  /** @deprecated use destinationRecordLabel */
  suggestedRecordLabel: string | null;
  destinationRecordId: string | null;
  destinationRecordLabel: string | null;
  needsUserReview: boolean;
  workflowTarget: AiNoteCaptureWorkflowTarget | null;
  existingFieldValue: string | null;
};

export type AiNoteCaptureReviewItem = AiNoteCaptureExtractedSuggestion & {
  status: "pending" | "accepted" | "ignored";
  editedText: string;
  mergeStrategy: AiNoteCaptureMergeStrategy;
};

export type AiNoteCaptureExtractResult = {
  rawExtractedText: string;
  phiDetected: boolean;
  phiWarning: string | null;
  riskyFragments: string[];
  suggestions: AiNoteCaptureExtractedSuggestion[];
  unclassified: AiNoteCaptureExtractedSuggestion[];
};

export type AiNoteCaptureExtractResponse = {
  ok: true;
} & AiNoteCaptureExtractResult;

export type AiNoteCaptureCommitItem = {
  id: string;
  category: AiNoteCaptureClassification;
  destination: AiNoteCaptureDestination;
  targetId: string;
  body: string;
  originalText?: string;
  workflowTarget?: AiNoteCaptureWorkflowTarget | null;
  mergeStrategy?: AiNoteCaptureMergeStrategy;
};

/** Review screen section order (by category). */
export const AI_NOTE_CAPTURE_REVIEW_GROUPS: Array<{
  category: AiNoteCaptureClassification;
  label: string;
}> = [
  { category: "workflow_field_suggestion", label: "Workflow Field Suggestions" },
  { category: "provider_intelligence", label: "Provider Intelligence" },
  { category: "case_observation", label: "Case Observations" },
  { category: "opportunity_signal", label: "Product Fit Signals" },
  { category: "organization_intelligence", label: "Organization Intelligence" },
  { category: "follow_up_task", label: "Tasks" },
  { category: "product_usage", label: "Product Usage" },
  { category: "competitive_intelligence", label: "Competitive Intelligence" },
  { category: "resource_or_document_note", label: "Resources / Documents" },
  { category: "unclassified", label: "Unclassified" },
];
