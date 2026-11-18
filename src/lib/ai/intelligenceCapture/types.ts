import { z } from "zod";
import type { ActivityRelatedEntity } from "@/lib/activity/activityEvent";

/**
 * POST /api/ai/intelligence-capture
 *
 * Extract-only: returns reviewable suggestions. Does not persist notes, tasks,
 * or ActivityEvents. Images are processed in memory for OCR/extraction only.
 */

export const INTELLIGENCE_CAPTURE_SOURCES = ["photo", "upload", "dictation", "typed"] as const;
export type IntelligenceCaptureSource = (typeof INTELLIGENCE_CAPTURE_SOURCES)[number];

export const INTELLIGENCE_CAPTURE_DESTINATION_TYPES = [
  "provider",
  "case",
  "opportunity",
  "organization",
  "task",
  "product",
] as const;
export type IntelligenceCaptureDestinationType = (typeof INTELLIGENCE_CAPTURE_DESTINATION_TYPES)[number];

export const IntelligenceCaptureContextSchema = z.object({
  providerId: z.string().uuid().optional(),
  caseId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  productIds: z.array(z.string().uuid()).max(24).optional(),
  /** Optional display hints for mock / AI prompts (not persisted). */
  providerLabel: z.string().max(200).optional(),
  caseLabel: z.string().max(200).optional(),
  organizationLabel: z.string().max(200).optional(),
  opportunityLabel: z.string().max(200).optional(),
});

export type IntelligenceCaptureContext = z.infer<typeof IntelligenceCaptureContextSchema>;

export const IntelligenceCaptureRequestSchema = z
  .object({
    text: z.string().max(16000).optional(),
    imageBase64: z.string().max(12_000_000).optional(),
    imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).optional(),
    captureSource: z.enum(INTELLIGENCE_CAPTURE_SOURCES),
    context: IntelligenceCaptureContextSchema.optional(),
  })
  .refine((b) => Boolean(b.text?.trim()) || Boolean(b.imageBase64), {
    message: "Provide text or an image.",
    path: ["text"],
  })
  .refine((b) => !b.imageBase64 || b.imageMimeType, {
    message: "imageMimeType is required when imageBase64 is provided.",
    path: ["imageMimeType"],
  });

export type IntelligenceCaptureRequest = z.infer<typeof IntelligenceCaptureRequestSchema>;

export type IntelligenceCaptureSuggestion = {
  id: string;
  destinationType: IntelligenceCaptureDestinationType;
  noteType: string;
  title: string;
  summary: string;
  confidence: number;
  relatedEntities: ActivityRelatedEntity[];
  suggestedFields: Record<string, unknown>;
  /** Always true for AI-generated suggestions — user must accept before save. */
  requiresReview: true;
};

export type IntelligenceCaptureResponseBody = {
  phiDetected: boolean;
  phiWarning: string | null;
  extractedText: string;
  suggestions: IntelligenceCaptureSuggestion[];
};

export type IntelligenceCaptureSuccessResponse = {
  ok: true;
} & IntelligenceCaptureResponseBody;

export type IntelligenceCaptureErrorResponse = {
  ok: false;
  error: string | Record<string, unknown>;
};
