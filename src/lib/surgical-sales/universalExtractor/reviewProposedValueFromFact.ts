import type { UniversalSurgicalFactRow } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { resolveIntelligenceCategoryForFact } from "@/lib/surgical-sales/universalExtractor/resolveIntelligenceCategoryForFact";
import {
  isIncompleteSentenceFragment,
  isLowQualityIntelligenceText,
} from "@/lib/surgical-sales/operationalIntelligenceDisplay";

const INTERNAL_LABEL_RE =
  /^(?:commercial disposition:|relationship:|workflow priority:|observation access interest|next step recommended)\b/i;

function repFacingLabel(raw: string): string {
  return raw
    .replace(/^commercial disposition:\s*/i, "")
    .replace(/^relationship:\s*/i, "")
    .replace(/^workflow priority:\s*/i, "")
    .replace(/^observation access interest$/i, "Interested in observation access")
    .replace(/^next step recommended$/i, "")
    .trim();
}

/** Prefer dictation evidence over internal UF labels for profile field updates. */
export function reviewProposedValueFromFact(fact: UniversalSurgicalFactRow): string | null {
  const evidence = fact.evidence_text?.trim() || "";
  const label = fact.normalized_label?.trim() || "";
  const synthesized = repFacingLabel(label);

  if (
    label &&
    !INTERNAL_LABEL_RE.test(label) &&
    label.length >= 12 &&
    !isIncompleteSentenceFragment(label) &&
    !isLowQualityIntelligenceText(label)
  ) {
    return label;
  }

  if (INTERNAL_LABEL_RE.test(label) && synthesized.length >= 12 && !isIncompleteSentenceFragment(synthesized)) {
    return synthesized.endsWith(".") ? synthesized : `${synthesized}.`;
  }

  if (
    evidence.length >= 24 &&
    (!label || INTERNAL_LABEL_RE.test(label) || label.length < evidence.length * 0.55)
  ) {
    if (!isIncompleteSentenceFragment(evidence) && !isLowQualityIntelligenceText(evidence)) {
      return evidence.length > 400 ? `${evidence.slice(0, 397)}…` : evidence;
    }
    if (synthesized.length >= 12 && !isIncompleteSentenceFragment(synthesized)) {
      return synthesized.endsWith(".") ? synthesized : `${synthesized}.`;
    }
  }

  const chosen = label || evidence || null;
  if (!chosen) return null;
  if (isIncompleteSentenceFragment(chosen) || isLowQualityIntelligenceText(chosen)) {
    if (synthesized.length >= 12 && !isIncompleteSentenceFragment(synthesized)) {
      return synthesized.endsWith(".") ? synthesized : `${synthesized}.`;
    }
    return null;
  }
  return chosen;
}

function isRelationshipOnlySentiment(fact: UniversalSurgicalFactRow): boolean {
  return (
    String(fact.concept) === "provider_sentiment" &&
    resolveIntelligenceCategoryForFact({
      concept: fact.concept,
      normalized_label: fact.normalized_label,
      evidence_text: fact.evidence_text,
    }) === "relationship_signal"
  );
}

/**
 * Soft provider-sentiment signals (relationship rapport, commercial disposition)
 * are routed into dedicated CRM fields by the review projection, so they should
 * NOT also surface as raw chips on the Intelligence page.
 */
function isSoftSentimentSignal(fact: UniversalSurgicalFactRow): boolean {
  if (String(fact.concept) !== "provider_sentiment") return false;
  const category = resolveIntelligenceCategoryForFact({
    concept: fact.concept,
    normalized_label: fact.normalized_label,
    evidence_text: fact.evidence_text,
  });
  return category === "relationship_signal" || category === "commercial_disposition";
}

/** Hook for concept-specific Intelligence-page display suppression. */
export function shouldSkipUniversalFactFieldProjection(fact: UniversalSurgicalFactRow): boolean {
  return isSoftSentimentSignal(fact);
}

export function shouldSkipUniversalFactWorkflowCard(fact: UniversalSurgicalFactRow): boolean {
  const concept = String(fact.concept);
  if (concept === "provider_sentiment") {
    return isRelationshipOnlySentiment(fact);
  }
  if (INTERNAL_LABEL_RE.test(fact.normalized_label?.trim() ?? "")) {
    const category = resolveIntelligenceCategoryForFact({
      concept: fact.concept,
      normalized_label: fact.normalized_label,
      evidence_text: fact.evidence_text,
    });
    if (category !== "commercial_disposition") return false;
    // Status-quo commercial posture must remain reviewable ("not actively looking").
    if (
      /not actively looking|comfortable with (?:the )?products|isn['’]?t actively looking/i.test(
        `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`,
      )
    ) {
      return false;
    }
    return true;
  }
  return false;
}
