/**
 * Guardrails — named entities may only surface on intelligence cards when the
 * surrounding evidence supports that category (e.g. Karen in scheduling context
 * must not appear on workflow or opportunity cards).
 */

import { isOpportunityIntelligenceSignalId } from "@/lib/surgical-sales/opportunityIntelligenceSignals";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";
import type { IntelligenceDomain } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import { extractPrimaryNamedPerson } from "@/lib/surgical-sales/namedEntityPreservation";

const PARTIAL_LEAD_LABEL = "[Partial lead]";

const SCHEDULING_CONTEXT_RE =
  /\b(schedul(?:er|ing|es|ed|ing)?|coordinator|office\s+manager|or\s+scheduling|books?\s+cases|case\s+timing|timing|works?\s+with\s+(?:the\s+)?or\s+(?:scheduling\s+)?team|helps?\s+with\s+timing)\b/i;

const PRODUCT_COMMERCIAL_RE =
  /\b(acsis|product\s+fit|trial[- ]?ready|competitive|preference\s+card|evaluat\w*\s+new\s+products?|product\s+gaps?|competitor|vendor|incumbent)\b/i;

const CLINICAL_WORKFLOW_RE =
  /\b(visualization|fixation|workflow\s+pain|frustrat|procedure\s+focus|abdominal\s+wall|robotic\s+hernia|case\s+mix|technique|clinical\s+champion|workflow\s+change)\b/i;

const STAKEHOLDER_COMMERCIAL_RE =
  /\b(clinical\s+champion|decision\s+maker|evaluat\w*\s+new\s+products?|workflow\s+changes?|\bPA\b|physician\s+assistant)\b/i;

const ACCESS_CONTEXT_RE =
  /\b(observation|observe\s+a?\s*case|credentialing|vendor\s+access|facility\s+approval|access\s+pathway)\b/i;

const ACCESS_SCHEDULING_SIGNALS = new Set<StageMappingSignalId>([
  "scheduling_owner",
  "observation_approval",
  "facility_vendor_pathway",
  "observation_logistics",
]);

const PARTIAL_LEAD_PREFIX_RE = /^\[Partial lead\]\s*([A-Z][a-z]+)/i;

const SALES_EXECUTION_SIGNALS = new Set<StageMappingSignalId>([
  "workflow_visibility",
  "product_alignment",
  "case_opportunity",
  "clinical_champion",
]);

export function textHasSchedulingNamedEntityContext(text: string): boolean {
  const blob = String(text ?? "").trim();
  if (!blob) return false;
  return SCHEDULING_CONTEXT_RE.test(blob);
}

export function isSchedulingOnlyNamedEntityEvidence(text: string): boolean {
  const blob = String(text ?? "").trim();
  if (!blob) return false;
  if (!/\b[A-Z][a-z]+\b/.test(blob)) return false;
  if (!textHasSchedulingNamedEntityContext(blob)) return false;
  if (PRODUCT_COMMERCIAL_RE.test(blob)) return false;
  if (CLINICAL_WORKFLOW_RE.test(blob) && !SCHEDULING_CONTEXT_RE.test(blob)) return false;
  return true;
}

export function signalAllowsSchedulingNamedEntities(signalId: StageMappingSignalId): boolean {
  return ACCESS_SCHEDULING_SIGNALS.has(signalId);
}

export function signalAllowsSalesNamedEntities(
  signalId: StageMappingSignalId,
  text: string,
): boolean {
  if (isOpportunityIntelligenceSignalId(signalId) || SALES_EXECUTION_SIGNALS.has(signalId)) {
    if (isSchedulingOnlyNamedEntityEvidence(text)) return false;
    if (signalId === "clinical_champion") {
      return (
        STAKEHOLDER_COMMERCIAL_RE.test(text) ||
        (textHasSchedulingNamedEntityContext(text) && /\bchampion|decision|approv/i.test(text))
      );
    }
    return (
      PRODUCT_COMMERCIAL_RE.test(text) ||
      CLINICAL_WORKFLOW_RE.test(text) ||
      STAKEHOLDER_COMMERCIAL_RE.test(text)
    );
  }
  return false;
}

export function namedEntityEvidenceBelongsToSignal(
  signalId: StageMappingSignalId,
  text: string,
): boolean {
  const blob = String(text ?? "").trim();
  if (!blob) return true;

  const mentionsPerson = /\b[A-Z][a-z]+\b/.test(blob) || blob.includes(PARTIAL_LEAD_LABEL);

  if (isSchedulingOnlyNamedEntityEvidence(blob)) {
    return signalAllowsSchedulingNamedEntities(signalId);
  }

  if (mentionsPerson && textHasSchedulingNamedEntityContext(blob)) {
    if (signalAllowsSchedulingNamedEntities(signalId)) return true;
    if (signalAllowsSalesNamedEntities(signalId, blob)) return true;
    return false;
  }

  if (
    (isOpportunityIntelligenceSignalId(signalId) || SALES_EXECUTION_SIGNALS.has(signalId)) &&
    !signalAllowsSalesNamedEntities(signalId, blob) &&
    mentionsPerson &&
    !signalAllowsSchedulingNamedEntities(signalId)
  ) {
    return false;
  }

  return true;
}

export function suspectedContactForPartialUpdate(input: {
  domain: IntelligenceDomain;
  label: string;
  value: string;
  reasoning: string;
  rawNote: string;
}): string | null {
  const updateBlob = `${input.label} ${input.value} ${input.reasoning}`.trim();

  if (input.domain === "scheduling" || input.domain === "or_access") {
    return (
      extractSuspectedContactFromSchedulingContext(updateBlob) ??
      extractSuspectedContactFromSchedulingContext(input.rawNote)
    );
  }

  if (input.domain === "stakeholders") {
    return extractSuspectedContactFromStakeholderContext(updateBlob);
  }

  return null;
}

export function extractSuspectedContactFromSchedulingContext(text: string): string | null {
  const blob = String(text ?? "").trim();
  if (!blob || !textHasSchedulingNamedEntityContext(blob)) return null;

  const preserved = extractPrimaryNamedPerson(blob);
  if (preserved) return preserved.name;

  const cameUp = blob.match(/\b([A-Z][a-z]+)\s+came up\b/i);
  if (cameUp?.[1] && !/^(He|She|They|We|I|The|OR|PA|As)$/i.test(cameUp[1])) {
    return cameUp[1];
  }

  const lead =
    blob.match(/\b([A-Z][a-z]+)\s+from\s+(?:(?:his|her|their)|the)\s+office\b/i) ??
    blob.match(/\b([A-Z][a-z]+)\s+(?:from\s+(?:his|her)\s+office|handles?\s+most\b)/i) ??
    blob.match(/\b([A-Z][a-z]+)\s+(?:coordinat\w*|help\w*)\s+(?:with\s+)?scheduling\b/i) ??
    blob.match(/\b([A-Z][a-z]+)\s+came up\b/i);
  const name = lead?.[1]?.trim();
  if (!name || /^(He|She|They|We|I|The|OR|PA|As|To|At|In|On|Up)$/i.test(name)) return null;
  return name;
}

function extractSuspectedContactFromStakeholderContext(text: string): string | null {
  const blob = String(text ?? "").trim();
  if (!blob) return null;

  const preserved = extractPrimaryNamedPerson(blob);
  if (preserved?.possibleRole?.toLowerCase().includes("physician assistant")) {
    return preserved.name;
  }

  const lead = blob.match(/\b([A-Z][a-z]+)\s+(?:gets involved|evaluat\w*|champion)\b/i);
  const name = lead?.[1]?.trim();
  if (!name || /^(He|She|They|We|I|The|OR|Karen|As)$/i.test(name)) return null;
  return name;
}

export function partialLeadBelongsToSignal(input: {
  signalId: StageMappingSignalId;
  fieldText: string;
  evidenceText?: string | null;
}): boolean {
  const raw = String(input.fieldText ?? "").trim();
  const leadMatch = raw.match(PARTIAL_LEAD_PREFIX_RE);

  if (leadMatch?.[1] && !signalAllowsSchedulingNamedEntities(input.signalId)) {
    const name = leadMatch[1];
    const narrative = stripPartialLeadPrefix(raw);
    const evidence = String(input.evidenceText ?? "").trim();
    const nameInNarrative =
      narrative.length > 0 &&
      new RegExp(`\\b${name}\\b`, "i").test(narrative) &&
      namedEntityEvidenceBelongsToSignal(input.signalId, narrative);
    const nameInEvidence =
      evidence.length > 0 &&
      new RegExp(`\\b${name}\\b`, "i").test(evidence) &&
      namedEntityEvidenceBelongsToSignal(input.signalId, evidence);

    if (!nameInNarrative && !nameInEvidence) {
      return false;
    }
  }

  const blob = [input.fieldText, input.evidenceText].filter(Boolean).join("\n");
  return namedEntityEvidenceBelongsToSignal(input.signalId, blob);
}

export function stripPartialLeadPrefix(text: string): string {
  const raw = String(text ?? "").trim();
  const inlineName = raw.match(/^\[Partial lead\]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/i)?.[1];
  if (inlineName) return inlineName;

  return raw
    .replace(/^\[Partial lead\][^\n]*\n*/i, "")
    .replace(/\n\nStill needed:[\s\S]*$/i, "")
    .replace(/\n\nSource:[\s\S]*$/i, "")
    .trim();
}
