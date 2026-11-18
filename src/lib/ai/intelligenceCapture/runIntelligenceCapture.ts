import { enrichExtractResultWithPlanningFields } from "@/lib/surgical-sales/aiNoteCapture/enrichSuggestions";
import { loadProviderPlanningFieldValues } from "@/lib/surgical-sales/aiNoteCapture/loadProviderPlanningFields";
import { mockAiNoteCaptureExtract } from "@/lib/surgical-sales/aiNoteCapture/mockExtract";
import { runAiNoteCaptureExtract } from "@/lib/surgical-sales/aiNoteCapture/openaiExtract";
import {
  captureSourceToInputMode,
  mapExtractResultToIntelligenceCaptureResponse,
  toLegacyCaptureContext,
} from "./mapToContract";
import type { IntelligenceCaptureRequest, IntelligenceCaptureResponseBody } from "./types";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/**
 * Runs AI extraction only. Does not persist images, notes, tasks, or activity events.
 */
export async function runIntelligenceCapture(
  input: IntelligenceCaptureRequest,
): Promise<IntelligenceCaptureResponseBody> {
  const { text, imageBase64, imageMimeType, captureSource, context: ctxIn } = input;
  const ctx = ctxIn ?? {};

  if (imageBase64) {
    const approxBytes = Math.ceil((imageBase64.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      throw new IntelligenceCaptureValidationError("Image too large (max 6 MB).");
    }
  }

  const legacyContext = toLegacyCaptureContext(ctx);
  const inputMode = captureSourceToInputMode(captureSource);

  let existingPlanningFields: Record<string, string> = {};
  if (legacyContext.providerId) {
    existingPlanningFields = await loadProviderPlanningFieldValues(legacyContext.providerId);
  }

  const extractInput = {
    rawText: text?.trim() || "",
    inputMode,
    context: legacyContext,
    existingPlanningFields,
  };

  const useMockOnly = process.env.AI_NOTE_CAPTURE_MOCK_ONLY === "1";
  const mockExtract = () => mockAiNoteCaptureExtract(extractInput);

  let result;
  if (useMockOnly) {
    result = await mockExtract();
  } else {
    try {
      result = await runAiNoteCaptureExtract({
        rawText: extractInput.rawText,
        inputMode,
        context: legacyContext,
        imageBase64: imageBase64 || undefined,
        imageMimeType: imageMimeType || undefined,
      });
    } catch {
      result = await mockExtract();
    }
  }

  const enriched = await enrichExtractResultWithPlanningFields(result, legacyContext);
  return mapExtractResultToIntelligenceCaptureResponse(enriched, ctx);
}

export class IntelligenceCaptureValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntelligenceCaptureValidationError";
  }
}
