import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import {
  processObservationNoteCapture,
  type ObservationNoteCaptureResult,
} from "@/lib/surgical-sales/processObservationNoteCapture";
import {
  processProductSupportNoteCapture,
  type ProductSupportNoteCaptureResult,
} from "@/lib/surgical-sales/processProductSupportNoteCapture";

export async function processCaseNoteCapture(input: {
  caseId: string;
  caseRow: Record<string, unknown>;
  noteId: string;
  noteBody: string;
  legacyCaseActivityId?: string | null;
  captureMode?: "voice" | "quick" | null;
  capturedByUserId?: string | null;
}): Promise<ObservationNoteCaptureResult | ProductSupportNoteCaptureResult | null> {
  const caseType = String(input.caseRow.case_type ?? "").trim().toLowerCase();

  if (isSurgicalObservationCase(caseType)) {
    return processObservationNoteCapture(input);
  }

  if (caseType === "product_support") {
    return processProductSupportNoteCapture(input);
  }

  return null;
}
