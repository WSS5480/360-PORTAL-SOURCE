import type { AiNoteCaptureClassification, AiNoteCaptureDestination } from "./types";

export const AI_NOTE_CAPTURE_HIPAA_WARNING =
  "Do not capture patient names, DOBs, MRNs, faces, labels, charts, consent forms, or other PHI.";

export const AI_NOTE_CAPTURE_DISCARD_IMAGE_NOTICE =
  "Photos are used only for text extraction and are not stored after processing.";

export const AI_NOTE_CLASSIFICATION_LABELS: Record<AiNoteCaptureClassification, string> = {
  workflow_field_suggestion: "Provider profile field",
  provider_intelligence: "Provider understanding",
  case_observation: "Case Note",
  opportunity_signal: "Product fit update",
  organization_intelligence: "Facility notes",
  competitive_intelligence: "Competitive Intelligence",
  follow_up_task: "Task",
  product_usage: "Product Usage",
  resource_or_document_note: "Resource / Document",
  unclassified: "Unclassified",
};

export const AI_NOTE_DESTINATION_LABELS: Record<AiNoteCaptureDestination, string> = {
  provider: "Provider",
  case: "Case",
  opportunity: "Evaluation",
  organization: "Organization",
  task: "Task",
  product: "Product",
  unclassified: "Unclassified",
};

export const AI_NOTE_CAPTURE_ACTIVITY_TYPE = "ai_note_capture";
