import type {
  DebriefIntelligenceBrief,
  IntelligenceBriefClinicalItem,
  IntelligenceBriefProductItem,
  IntelligenceBriefWorkflowItem,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import {
  clinicalBriefPrimaryLine,
  clinicalInsightGroupIdFromLabel,
  isGenericClinicalFactText,
  normalizeClinicalIntelligenceFromFact,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { formatProductInterestHeadline } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductInterestDisplay";
import {
  formatSchedulingPreferenceFromEvidence,
  refineWorkflowPrimaryLine,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDisplayRefinement";
import { splitCompoundProcedureLabels } from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import type { UniversalSurgicalFactRow } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

const CLINICAL_OVERLAY_CONCEPTS = new Set([
  "procedure_volume_trend",
  "procedure_focus",
  "technology_preference",
]);

const DEBRIEF_SOURCE_TYPES = new Set([
  "intro_call",
  "debrief_note",
  "debrief_validation",
  "office_visit",
  "discovery_note",
]);

const WORKFLOW_CONCEPTS = new Set([
  "visualization_or_access_issue",
  "workflow_or_timing_issue",
  "placement_or_positioning_issue",
  "staff_workflow",
  "inventory_availability_issue",
  "alternative_used",
  "unavailable_item",
  "requested_item",
  "sizing_or_fit_issue",
  "product_performance_issue",
  "training_or_familiarity_issue",
  "support_needed",
  "access_pathway",
  "provider_sentiment",
  "next_action",
  "contact_role",
  "credentialing_requirement",
]);

/** Flatten debrief-scoped UF runs for review mapping and brief enrichment. */
export function flattenDebriefUniversalFacts(runs: UniversalFactExtractionRun[]): UniversalSurgicalFactRow[] {
  return runs
    .filter((run) => DEBRIEF_SOURCE_TYPES.has(run.declared_source_type))
    .flatMap((run) => run.facts)
    .filter(
      (fact) =>
        !fact.suppressed &&
        !fact.negated &&
        !fact.uncertain &&
        fact.assertion_level !== "rejected",
    );
}

/** Include hedged facts for authoritative review field projection. */
export function flattenDebriefUniversalFactsForReview(
  runs: UniversalFactExtractionRun[],
): UniversalSurgicalFactRow[] {
  return runs
    .filter((run) => DEBRIEF_SOURCE_TYPES.has(run.declared_source_type))
    .flatMap((run) => run.facts)
    .filter(
      (fact) =>
        !fact.suppressed &&
        !fact.negated &&
        fact.assertion_level !== "rejected",
    );
}

export function clinicalOverlayFromFact(
  fact: UniversalSurgicalFactRow,
): Pick<
  IntelligenceBriefClinicalItem,
  "primaryLine" | "categoryLabel" | "categoryId" | "displayValue" | "procedureFocus" | "sourceText" | "evidenceQuotes"
> | null {
  const overlays = expandClinicalOverlaysFromFact(fact);
  return overlays[0] ?? null;
}

export function expandClinicalOverlaysFromFact(
  fact: UniversalSurgicalFactRow,
): Array<
  Pick<
    IntelligenceBriefClinicalItem,
    "primaryLine" | "categoryLabel" | "categoryId" | "displayValue" | "procedureFocus" | "sourceText" | "evidenceQuotes"
  >
> {
  const concept = String(fact.concept);
  if (!CLINICAL_OVERLAY_CONCEPTS.has(concept)) {
    return [];
  }

  let categoryLabel = "Clinical Trend";
  if (concept === "technology_preference") categoryLabel = "Technique / Modality";
  if (concept === "procedure_focus") categoryLabel = "Procedure Focus";

  const rawValue = fact.normalized_label?.trim() || fact.evidence_text?.trim() || concept;
  const evidence = fact.evidence_text?.trim() || fact.normalized_label?.trim() || "";

  const normalized = normalizeClinicalIntelligenceFromFact({
    value: rawValue,
    evidence,
    attribute: categoryLabel,
  });

  if (normalized) {
    const procedureParts =
      normalized.categoryId === "clinical_trend"
        ? splitCompoundProcedureLabels(rawValue).filter((procedureFocus) =>
            procedureFocus.toLowerCase() !== normalized.procedureFocus.toLowerCase()
              ? /ventral|hernia|abdominal wall|reconstruction|robotic|laparoscopic/i.test(procedureFocus)
              : true,
          )
        : [normalized.procedureFocus];
    const effectiveProcedureParts = procedureParts.length > 0 ? procedureParts : [normalized.procedureFocus];

    return effectiveProcedureParts.map((procedureFocus) => {
      const row = { ...normalized, procedureFocus };
      return {
        primaryLine: clinicalBriefPrimaryLine(row),
        categoryLabel: row.categoryLabel,
        categoryId: row.categoryId,
        displayValue: row.displayValue,
        procedureFocus: row.procedureFocus,
        sourceText: fact.evidence_text?.trim() || null,
        evidenceQuotes: [evidence].filter(Boolean),
      };
    });
  }

  const displayValue = rawValue;
  if (isGenericClinicalFactText(displayValue)) return [];
  const procedureParts = splitCompoundProcedureLabels(displayValue);
  const specificProcedureParts = procedureParts.filter((procedureFocus) => !isGenericClinicalFactText(procedureFocus));
  return specificProcedureParts.map((procedureFocus) => ({
    primaryLine: `${procedureFocus} · ${categoryLabel}`,
    categoryLabel,
    categoryId: "procedure_focus" as const,
    displayValue: categoryLabel,
    procedureFocus,
    sourceText: fact.evidence_text?.trim() || null,
    evidenceQuotes: [evidence].filter(Boolean),
  }));
}

export function productOverlayFromFact(
  fact: UniversalSurgicalFactRow,
): Pick<IntelligenceBriefProductItem, "productName" | "impactLine" | "evidenceQuotes"> | null {
  if (!["current_product", "competitor_product", "product_interest"].includes(String(fact.concept))) return null;
  const normalizedLabel = fact.normalized_label?.trim() || "";
  const productName =
    fact.product_mentioned?.trim() ||
    normalizedLabel.replace(/^(?:competitor product|current product|product interest):\s*/i, "").trim() ||
    (String(fact.concept) === "product_interest" ? "Product interest" : "Product");
  const impactLine =
    String(fact.concept) === "competitor_product"
      ? `Competitor product: ${productName}`
      : String(fact.concept) === "current_product"
        ? `Current product: ${productName}`
        : String(fact.concept) === "product_interest"
          ? /^Product interest:/i.test(normalizedLabel)
            ? formatProductInterestHeadline(normalizedLabel, fact.evidence_text?.trim())
            : /comparison|clinical[- ]data|published outcomes|evidence request|desire for published/i.test(
                  normalizedLabel,
                )
              ? formatProductInterestHeadline(
                  normalizedLabel.startsWith("Product interest:")
                    ? normalizedLabel
                    : `Product interest: ${normalizedLabel}`,
                  fact.evidence_text?.trim(),
                )
              : formatProductInterestHeadline(
                  `Product interest: ${normalizedLabel || fact.evidence_text?.trim() || productName}`,
                  fact.evidence_text?.trim(),
                )
          : `Current product identified: ${productName}`;

  return {
    productName,
    impactLine,
    evidenceQuotes: [fact.evidence_text?.trim() || fact.normalized_label?.trim() || ""].filter(Boolean),
  };
}

export function workflowOverlayFromFact(
  fact: UniversalSurgicalFactRow,
): Pick<IntelligenceBriefWorkflowItem, "primaryLine" | "evidenceQuotes"> | null {
  if (!WORKFLOW_CONCEPTS.has(String(fact.concept))) return null;
  const concept = String(fact.concept);
  const evidence = fact.evidence_text?.trim() || "";
  const rawLine = fact.normalized_label?.trim() || fact.evidence_text?.trim();
  const visualizationOrAccessLine =
    concept === "visualization_or_access_issue" && /\baccess\b/i.test(evidence) && /\bdeep|deeper|anatomy|tight|tighter\b/i.test(evidence)
      ? "Access difficulty noted in deep anatomy"
      : concept === "visualization_or_access_issue" && /\breposition/i.test(evidence)
        ? "Repositioning was needed to maintain access or visualization"
        : null;
  const commercialDispositionLine = (() => {
    if (concept !== "provider_sentiment" || !rawLine) return null;
    if (/not actively looking|comfortable with (?:the )?products|isn['’]?t actively looking/i.test(rawLine)) {
      return "Commercial signal: Not actively looking to change products";
    }
    if (
      /observation before product evaluation|observe before eval|observ(?:e|ing)\s+a case.{0,80}\bbefore\b/i.test(
        rawLine,
      )
    ) {
      return "Commercial signal: Observation before product evaluation";
    }
    if (/^commercial disposition:/i.test(rawLine)) {
      return `Commercial signal: ${rawLine.replace(/^commercial disposition:\s*/i, "").trim()}`;
    }
    return null;
  })();
  const relationshipMomentumLine =
    rawLine && /receptive|open|continued?|continuing|relationship|conversation/i.test(rawLine)
      ? "Relationship-building stage: Open to continued discussion"
      : "Relationship-building stage noted";
  const line =
    visualizationOrAccessLine ??
    (concept === "provider_sentiment"
      ? commercialDispositionLine ?? relationshipMomentumLine
      : refineWorkflowPrimaryLine(rawLine ?? "", evidence));
  if (!line) return null;
  return {
    primaryLine: line,
    evidenceQuotes: [evidence || line],
  };
}

function normalizeProductName(name: string): string {
  return name.trim().toLowerCase();
}

function overlayClinicalInsights(
  dipItems: IntelligenceBriefClinicalItem[],
  facts: UniversalSurgicalFactRow[],
): IntelligenceBriefClinicalItem[] {
  const overlays = facts
    .map((fact) => ({ fact, overlay: clinicalOverlayFromFact(fact) }))
    .filter((entry): entry is { fact: UniversalSurgicalFactRow; overlay: NonNullable<ReturnType<typeof clinicalOverlayFromFact>> } =>
      Boolean(entry.overlay),
    );

  if (overlays.length === 0) return dipItems;

  const usedOverlay = new Set<number>();

  const mapped =
    dipItems.length === 0
      ? []
      : dipItems.map((dip) => {
          const matchIndex = overlays.findIndex(({ overlay }, index) => {
            if (usedOverlay.has(index)) return false;
            return (
              overlay.categoryId === dip.categoryId ||
              overlay.categoryLabel.toLowerCase() === dip.categoryLabel.toLowerCase() ||
              clinicalInsightGroupIdFromLabel(overlay.categoryLabel) ===
                clinicalInsightGroupIdFromLabel(dip.categoryLabel)
            );
          });

          const fallbackIndex = overlays.findIndex((_, index) => !usedOverlay.has(index));
          const overlayIndex = matchIndex >= 0 ? matchIndex : fallbackIndex;
          if (overlayIndex < 0) return dip;

          usedOverlay.add(overlayIndex);
          const { overlay } = overlays[overlayIndex]!;

          return {
            ...dip,
            primaryLine: overlay.primaryLine,
            categoryLabel: overlay.categoryLabel,
            categoryId: overlay.categoryId,
            displayValue: overlay.displayValue,
            procedureFocus: overlay.procedureFocus,
            sourceText: overlay.sourceText,
            evidenceQuotes: overlay.evidenceQuotes.length ? overlay.evidenceQuotes : dip.evidenceQuotes,
          };
        });

  const appended: IntelligenceBriefClinicalItem[] = overlays
    .filter((_, index) => !usedOverlay.has(index))
    .map(({ fact, overlay }, index) => ({
      kind: "clinical_insight" as const,
      id: `uf-brief-clinical-${fact.id ?? index}`,
      cardId: `uf:${fact.id ?? index}`,
      primaryLine: overlay.primaryLine,
      categoryLabel: overlay.categoryLabel,
      categoryId: overlay.categoryId,
      displayValue: overlay.displayValue,
      procedureFocus: overlay.procedureFocus,
      sourceText: overlay.sourceText,
      evidenceQuotes: overlay.evidenceQuotes,
      linkedFieldUpdateIds: [],
      confirmActionType: "add_clinical_focus",
      dismissActionType: "ignore",
    }));

  return [...mapped, ...appended];
}

function overlayProductIntelligence(
  dipItems: IntelligenceBriefProductItem[],
  facts: UniversalSurgicalFactRow[],
): IntelligenceBriefProductItem[] {
  if (dipItems.length === 0) return dipItems;

  const overlays = facts
    .map((fact) => productOverlayFromFact(fact))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (overlays.length === 0) return dipItems;

  const usedOverlay = new Set<number>();

  return dipItems.map((dip) => {
    const matchIndex = overlays.findIndex((overlay, index) => {
      if (usedOverlay.has(index)) return false;
      return normalizeProductName(overlay.productName) === normalizeProductName(dip.productName);
    });

    const fallbackIndex = overlays.findIndex((_, index) => !usedOverlay.has(index));
    const overlayIndex = matchIndex >= 0 ? matchIndex : fallbackIndex;
    if (overlayIndex < 0) return dip;

    usedOverlay.add(overlayIndex);
    const overlay = overlays[overlayIndex];

    return {
      ...dip,
      productName: overlay.productName,
      impactLine: overlay.impactLine,
      evidenceQuotes: overlay.evidenceQuotes.length ? overlay.evidenceQuotes : dip.evidenceQuotes,
    };
  });
}

function overlayWorkflowInsights(
  dipItems: IntelligenceBriefWorkflowItem[],
  facts: UniversalSurgicalFactRow[],
): IntelligenceBriefWorkflowItem[] {
  if (dipItems.length === 0) return dipItems;

  const overlays = facts
    .map((fact) => workflowOverlayFromFact(fact))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (overlays.length === 0) return dipItems;

  const usedOverlay = new Set<number>();

  return dipItems.map((dip) => {
    const fallbackIndex = overlays.findIndex((_, index) => !usedOverlay.has(index));
    if (fallbackIndex < 0) return dip;

    usedOverlay.add(fallbackIndex);
    const overlay = overlays[fallbackIndex];

    return {
      ...dip,
      primaryLine: overlay.primaryLine,
      evidenceQuotes: overlay.evidenceQuotes.length ? overlay.evidenceQuotes : dip.evidenceQuotes,
    };
  });
}

/**
 * Overlay UF clinical read copy onto DIP-assembled debrief brief.
 * Preserves DIP card ids + linked field updates so review save routing still works.
 * @deprecated When UF_EXTRACTION_REVIEW_PRIMARY=1 — use composeDebriefReviewDisplay instead.
 */
export function enrichDebriefIntelligenceBriefWithUniversalFacts(input: {
  brief: DebriefIntelligenceBrief;
  debriefRuns?: UniversalFactExtractionRun[] | null;
}): DebriefIntelligenceBrief {
  const facts = flattenDebriefUniversalFacts(input.debriefRuns ?? []);
  if (facts.length === 0) return input.brief;

  return {
    ...input.brief,
    clinicalInsights: overlayClinicalInsights(input.brief.clinicalInsights, facts),
    productIntelligence: overlayProductIntelligence(input.brief.productIntelligence, facts),
    workflowInsights: overlayWorkflowInsights(input.brief.workflowInsights, facts),
  };
}

/** Map persisted debrief capture envelope to a single extraction run for brief enrichment. */
export function debriefCaptureToExtractionRun(input: {
  declared_source_type: UniversalFactExtractionRun["declared_source_type"];
  capture_id: string | null;
  facts: UniversalSurgicalFactRow[];
  created_at?: string;
}): UniversalFactExtractionRun | null {
  if (!input.facts.length) return null;
  return {
    capture_id: input.capture_id ?? "debrief-capture",
    declared_source_type: input.declared_source_type,
    extraction_model: "universal-surgical-rules-v1",
    created_at: input.created_at ?? new Date().toISOString(),
    operational_note_id: null,
    facts: input.facts,
  };
}
