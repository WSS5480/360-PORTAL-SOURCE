import type { ProductSupportNoteAiExtraction } from "@/lib/surgical-sales/processProductSupportNoteCapture";

type ActivityMetadata = Record<string, unknown> | null | undefined;

export function productSupportObservationClassificationLabel(metadata: ActivityMetadata): string | null {
  if (!metadata || typeof metadata !== "object") return null;

  const direct = metadata.observation_classification;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const extraction = metadata.ai_extraction;
  if (!extraction || typeof extraction !== "object") return null;

  const productSupport = (extraction as ProductSupportNoteAiExtraction).productSupport;
  if (productSupport?.classificationLabel) return productSupport.classificationLabel;

  return null;
}
