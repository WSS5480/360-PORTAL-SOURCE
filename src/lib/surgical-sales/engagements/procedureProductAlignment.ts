/**
 * Soft procedure → product alignment signals for debrief product assessment.
 * Boosts candidate ranking only — never auto-recommends a product.
 */

import type { DebriefProductKnowledgeId } from "@/lib/surgical-sales/engagements/debriefProductKnowledge/debriefProductKnowledgeTypes";
import type { ProviderDebriefPlanProductId } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";

const ACSIS_PROCEDURE_PATTERN =
  /\b(?:ventral|incisional|abdominal\s+wall|hernia(?:\s+repair)?|fascial\s+closure)\b/i;

const ENDOLUMIK_PROCEDURE_PATTERN =
  /\b(?:bariatric|foregut|sleeve(?:\s+gastrectomy)?|gastric\s+bypass|gastrectomy|bougie)\b/i;

export function procedureAlignsWithDebriefProduct(
  procedureLabel: string | null | undefined,
  productId: DebriefProductKnowledgeId | ProviderDebriefPlanProductId,
): boolean {
  const label = String(procedureLabel ?? "").trim();
  if (!label) return false;

  switch (productId) {
    case "ACSIS":
      return ACSIS_PROCEDURE_PATTERN.test(label);
    case "Endolumik":
      return ENDOLUMIK_PROCEDURE_PATTERN.test(label);
    default:
      return false;
  }
}

export function procedureAlignmentRationale(
  procedureLabel: string | null | undefined,
  productId: ProviderDebriefPlanProductId,
): string | null {
  if (!procedureAlignsWithDebriefProduct(procedureLabel, productId)) return null;

  if (productId === "ACSIS") {
    return `Procedure focus (${procedureLabel}) aligns with ventral or incisional hernia workflows where ${productId} may be relevant.`;
  }
  if (productId === "Endolumik") {
    return `Procedure focus (${procedureLabel}) aligns with foregut or bariatric workflows where ${productId} may be relevant.`;
  }

  return null;
}
