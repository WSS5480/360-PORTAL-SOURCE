/**
 * Minimal evidence attribution for commercial strategy brief fields.
 */

import type { DebriefCommercialProductCandidate } from "@/lib/surgical-sales/engagements/buildDebriefCommercialSynthesis";
import type { CommercialReadinessDimensionAssessment } from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import type { DebriefProductKnowledge } from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import {
  catalogVolumeClaimContradicted,
  isCatalogVolumeClaim,
  prefixPlaybookGuardrail,
  type ProductCardCopyContext,
  resolveProductCardCopy,
} from "@/lib/surgical-sales/engagements/resolveProductCardCopy";
import type { ProviderObservationNoteEntry } from "@/lib/surgical-sales/engagements/loadProviderObservationNoteCorpus";

export type EvidenceSourceKind =
  | "observation_note"
  | "case_field"
  | "provider_profile"
  | "plan_learning"
  | "longitudinal_pattern"
  | "framework_dimension"
  | "product_catalog"
  | "coaching_template"
  | "engagement_prep"
  | "intro_call_intel"
  | "prior_provider_debrief"
  | "contact_scheduling";

export type FieldClassification =
  | "evidence_backed"
  | "reasonable_inference"
  | "unsupported_assumption";

export type EvidenceAttribution = {
  kind: EvidenceSourceKind;
  label: string;
  excerpt: string | null;
  observationIndex: number | null;
  caseId: string | null;
  fieldKey: string | null;
  confidence: "high" | "medium" | "low";
};

export type AttributedField<T> = {
  value: T;
  attributions: EvidenceAttribution[];
  classification: FieldClassification;
};

export function buildAttributionsForFrameworkDimension(
  dimension: CommercialReadinessDimensionAssessment,
): EvidenceAttribution[] {
  const attributions: EvidenceAttribution[] = [];

  for (const obs of dimension.supportingObservations) {
    if (!obs.excerpt?.trim()) continue;
    attributions.push({
      kind: "observation_note",
      label: obs.observationIndex
        ? `Observation #${obs.observationIndex}`
        : "Observation note",
      excerpt: obs.excerpt,
      observationIndex: obs.observationIndex,
      caseId: null,
      fieldKey: null,
      confidence: obs.observationIndex ? "high" : "medium",
    });
  }

  for (const excerpt of dimension.evidence) {
    if (!excerpt?.trim()) continue;
    if (attributions.some((item) => item.excerpt === excerpt)) continue;
    attributions.push({
      kind: "framework_dimension",
      label: `${dimension.label} evidence`,
      excerpt,
      observationIndex: null,
      caseId: null,
      fieldKey: dimension.id,
      confidence: "medium",
    });
  }

  if (dimension.reasoning?.trim()) {
    attributions.push({
      kind: "framework_dimension",
      label: `${dimension.label} score (${dimension.score}/100)`,
      excerpt: dimension.reasoning,
      observationIndex: null,
      caseId: null,
      fieldKey: dimension.id,
      confidence: "medium",
    });
  }

  return attributions.slice(0, 6);
}

export function buildAttributionsForProductWhyItMayFit(input: {
  candidate: DebriefCommercialProductCandidate;
  strategyWhy?: string | null;
  productFitReasoning?: string | null;
  observationCorpus?: ProviderObservationNoteEntry[];
}): EvidenceAttribution[] {
  const attributions: EvidenceAttribution[] = [];

  for (const rationale of input.candidate.observationLinkedRationale) {
    if (!rationale?.trim()) continue;
    const corpusMatch = input.observationCorpus?.find((entry) =>
      entry.body.toLowerCase().includes(rationale.slice(0, 40).toLowerCase()),
    );
    attributions.push({
      kind: "plan_learning",
      label: corpusMatch
        ? `Observation #${corpusMatch.observationIndex}`
        : "Observation-linked rationale",
      excerpt: rationale,
      observationIndex: corpusMatch?.observationIndex ?? null,
      caseId: corpusMatch?.caseId ?? null,
      fieldKey: null,
      confidence: corpusMatch ? "high" : "medium",
    });
  }

  if (input.strategyWhy?.trim()) {
    attributions.push({
      kind: "framework_dimension",
      label: "Recommended product angle",
      excerpt: input.strategyWhy,
      observationIndex: null,
      caseId: null,
      fieldKey: "product_fit",
      confidence: "medium",
    });
  }

  if (input.productFitReasoning?.trim() && attributions.length === 0) {
    attributions.push({
      kind: "framework_dimension",
      label: "Product fit assessment",
      excerpt: input.productFitReasoning,
      observationIndex: null,
      caseId: null,
      fieldKey: "product_fit",
      confidence: "medium",
    });
  }

  return attributions.slice(0, 4);
}

export function buildAttributionsForProductGuardrail(input: {
  knowledge: DebriefProductKnowledge | null;
  validationNeeded: string | null | undefined;
  fallbackValidate: string;
  fallbackAvoid: string;
  context: ProductCardCopyContext;
  field: "whatMustBeValidated" | "whatNotToSayYet";
}): { attributions: EvidenceAttribution[]; classification: FieldClassification } {
  const resolved = resolveProductCardCopy({
    avoidWhen: input.field === "whatNotToSayYet" ? input.knowledge?.avoidWhen[0] : null,
    validationNeeded:
      input.field === "whatMustBeValidated" ? input.validationNeeded : null,
    fallbackValidate: input.fallbackValidate,
    fallbackAvoid: input.fallbackAvoid,
    context: input.context,
  });

  const catalogLine =
    input.field === "whatNotToSayYet"
      ? input.knowledge?.avoidWhen[0]?.trim()
      : input.validationNeeded?.trim();

  if (!catalogLine) {
    return {
      attributions: [
        {
          kind: "coaching_template",
          label: "Debrief coaching guardrail",
          excerpt: resolved[input.field === "whatMustBeValidated" ? "whatMustBeValidated" : "whatNotToSayYet"],
          observationIndex: null,
          caseId: null,
          fieldKey: null,
          confidence: "medium",
        },
      ],
      classification: "reasonable_inference",
    };
  }

  if (resolved.suppressedCatalogVolumeClaims.includes(catalogLine)) {
    return {
      attributions: [
        {
          kind: "product_catalog",
          label: "Product playbook (suppressed — contradicted by observation program)",
          excerpt: catalogLine,
          observationIndex: null,
          caseId: null,
          fieldKey: "avoidWhen",
          confidence: "low",
        },
      ],
      classification: "unsupported_assumption",
    };
  }

  const contradicted = catalogVolumeClaimContradicted(catalogLine, input.context);
  const volumeClaim = isCatalogVolumeClaim(catalogLine);

  return {
    attributions: [
      {
        kind: "product_catalog",
        label: volumeClaim
          ? "Product playbook volume guardrail"
          : "Product playbook guardrail",
        excerpt: prefixPlaybookGuardrail(catalogLine),
        observationIndex: null,
        caseId: null,
        fieldKey: "avoidWhen",
        confidence: volumeClaim ? "low" : "medium",
      },
    ],
    classification: contradicted
      ? "unsupported_assumption"
      : volumeClaim
        ? "reasonable_inference"
        : "reasonable_inference",
  };
}

export function classifyProductFieldFromAttributions(
  attributions: EvidenceAttribution[],
  hasObservationEvidence: boolean,
): FieldClassification {
  if (hasObservationEvidence && attributions.some((item) => item.kind === "observation_note" || item.kind === "plan_learning")) {
    return "evidence_backed";
  }
  if (attributions.some((item) => item.kind === "product_catalog" && item.confidence === "low")) {
    return "unsupported_assumption";
  }
  return "reasonable_inference";
}
