import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";

export type SurgicalCaseDetailVariant = "observation" | "product_support";

/** Routes case detail overview/execute by stored case_type. */
export function resolveSurgicalCaseDetailVariant(
  caseType: string | null | undefined,
): SurgicalCaseDetailVariant {
  return isSurgicalObservationCase(caseType) ? "observation" : "product_support";
}

export function surgicalCaseDetailVariantIsObservation(
  variant: SurgicalCaseDetailVariant,
): variant is "observation" {
  return variant === "observation";
}

export function surgicalCaseDetailVariantIsProductSupport(
  variant: SurgicalCaseDetailVariant,
): variant is "product_support" {
  return variant === "product_support";
}
