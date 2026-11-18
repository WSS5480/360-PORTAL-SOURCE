/**
 * Gates static product-catalog copy so volume claims are not shown when observation context contradicts them.
 */

import { procedureAlignsWithDebriefProduct } from "@/lib/surgical-sales/engagements/procedureProductAlignment";
import type { DebriefProductKnowledgeId } from "@/lib/surgical-sales/engagements/debriefProductKnowledge/debriefProductKnowledgeTypes";
import type { ProviderDebriefPlanProductId } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";

const VOLUME_CLAIM_PATTERN =
  /\b(?:minimal|low|limited|not enough|insufficient)\b.*\b(?:volume|cases?)\b/i;
const PROCEDURE_VOLUME_CLAIM_PATTERN =
  /\b(?:minimal|low|limited)\b.*\b(?:ventral|incisional|hernia|bariatric|foregut)\b/i;

export type ProductCardCopyContext = {
  procedureLabel: string | null;
  completedObservationCount: number;
  productId?: DebriefProductKnowledgeId | ProviderDebriefPlanProductId | string | null;
};

export type ResolvedProductCardCopy = {
  whatMustBeValidated: string;
  whatNotToSayYet: string;
  suppressedCatalogVolumeClaims: string[];
};

function knownAlignmentProductId(
  productId: string,
): DebriefProductKnowledgeId | ProviderDebriefPlanProductId | null {
  if (productId === "ACSIS" || productId === "Endolumik") return productId;
  return null;
}

export function isCatalogVolumeClaim(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return (
    VOLUME_CLAIM_PATTERN.test(trimmed) || PROCEDURE_VOLUME_CLAIM_PATTERN.test(trimmed)
  );
}

export function catalogVolumeClaimContradicted(
  line: string,
  context: ProductCardCopyContext,
): boolean {
  if (!isCatalogVolumeClaim(line)) return false;

  const productId = String(context.productId ?? "").trim();
  const alignmentProductId = knownAlignmentProductId(productId);
  const procedure = context.procedureLabel?.trim() || null;
  const obsCount = Math.max(0, context.completedObservationCount);

  if (
    alignmentProductId &&
    procedure &&
    procedureAlignsWithDebriefProduct(procedure, alignmentProductId) &&
    obsCount >= 1
  ) {
    return true;
  }

  if (obsCount >= 2 && VOLUME_CLAIM_PATTERN.test(line)) {
    return true;
  }

  return false;
}

export function prefixPlaybookGuardrail(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return trimmed;
  if (/^playbook guardrail/i.test(trimmed)) return trimmed;
  return `Playbook guardrail (confirm before using): ${trimmed}`;
}

export function resolveProductCardCopy(input: {
  avoidWhen: string | null | undefined;
  validationNeeded: string | null | undefined;
  fallbackValidate: string;
  fallbackAvoid: string;
  context: ProductCardCopyContext;
}): ResolvedProductCardCopy {
  const avoidLine = input.avoidWhen?.trim() || null;
  const validateLine = input.validationNeeded?.trim() || null;
  const suppressed: string[] = [];

  let whatNotToSayYet = input.fallbackAvoid;
  if (avoidLine) {
    if (catalogVolumeClaimContradicted(avoidLine, input.context)) {
      suppressed.push(avoidLine);
    } else {
      whatNotToSayYet = prefixPlaybookGuardrail(avoidLine);
    }
  }

  let whatMustBeValidated = input.fallbackValidate;
  if (validateLine) {
    if (catalogVolumeClaimContradicted(validateLine, input.context)) {
      suppressed.push(validateLine);
    } else if (isCatalogVolumeClaim(validateLine)) {
      whatMustBeValidated = prefixPlaybookGuardrail(validateLine);
    } else {
      whatMustBeValidated = validateLine;
    }
  }

  return {
    whatMustBeValidated,
    whatNotToSayYet,
    suppressedCatalogVolumeClaims: suppressed,
  };
}
