/**
 * Debrief review — rep-facing display labels (no enums, ontology tokens, or parser keys).
 */

import type {
  DebriefIntelligenceUpdateItem,
  DebriefReviewConfidenceTier,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { DebriefInsightGroupId } from "@/lib/surgical-sales/debriefReviewStreamlined";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import { OBSERVATION_ACCESS_DISCOVERY_MAPPING_OPTIONS } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  normalizeWorkflowMaturityChoice,
  workflowMaturityDescription,
} from "@/lib/surgical-sales/workflowUnderstandingMaturity";
import { intelligenceCaptureSpecForKey } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  buildPreservedNamedEntitySummary,
  extractPrimaryNamedPerson,
} from "@/lib/surgical-sales/namedEntityPreservation";

export type DebriefReviewConfidenceDisplay =
  | "Provider-confirmed"
  | "Observed directly"
  | "Operationally inferred"
  | "Early signal"
  | "Partial"
  | "Unknown";

export type DebriefPathwaySignalClass =
  | "access_readiness"
  | "observation_scheduling"
  | "access_credentialing_dependency"
  | "early_clinical_interest"
  | "workflow_understanding"
  | "decision_support"
  | "general";

const TOKEN_LABEL_BY_VALUE = new Map<string, string>();
for (const opt of OBSERVATION_ACCESS_DISCOVERY_MAPPING_OPTIONS) {
  TOKEN_LABEL_BY_VALUE.set(opt.value, opt.label);
}

const SNAKE_TOKEN_RE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;

const INTERNAL_VALUE_RE =
  /^(discussed_only|partially_understood|observed_in_field|fully_validated|credentialing_required|still_learning|unknown|easy|restricted|approved|yes|no|blocked)$/i;

function humanizeSnakeToken(token: string): string {
  const key = token.trim().toLowerCase();
  if (TOKEN_LABEL_BY_VALUE.has(key)) return TOKEN_LABEL_BY_VALUE.get(key)!;
  if (INTERNAL_VALUE_RE.test(key)) {
    return workflowMaturityDescription(normalizeWorkflowMaturityChoice(key));
  }
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Strip `token|notes` and other stored encodings from values shown in debrief review. */
export function stripStoredIntelligenceEncoding(raw: string): string {
  let text = String(raw ?? "").trim();
  if (!text) return "";

  const pipeIdx = text.indexOf("|");
  if (pipeIdx > 0) {
    const head = text.slice(0, pipeIdx).trim();
    const tail = text.slice(pipeIdx + 1).trim();
    const headDisplay = humanizeSnakeToken(head);
    if (tail && !INTERNAL_VALUE_RE.test(head)) {
      return tail;
    }
    if (head === "discussed_only") {
      return "Clinical value discussed conceptually — not yet validated in live procedures.";
    }
    if (head === "partially_understood") {
      return workflowMaturityDescription(normalizeWorkflowMaturityChoice(head));
    }
    return tail || headDisplay;
  }

  if (INTERNAL_VALUE_RE.test(text)) {
    return workflowMaturityDescription(normalizeWorkflowMaturityChoice(text));
  }

  text = text.replace(SNAKE_TOKEN_RE, (match) => {
    if (match.includes("|")) return match;
    if (INTERNAL_VALUE_RE.test(match)) return humanizeSnakeToken(match);
    const specMatch = TOKEN_LABEL_BY_VALUE.get(match.toLowerCase());
    return specMatch ?? match;
  });

  return text.replace(/\s{2,}/g, " ").trim();
}

export function formatDebriefFieldValueForDisplay(
  dbKey: string,
  raw: string,
  options?: { maxLen?: number },
): string {
  const spec = intelligenceCaptureSpecForKey(dbKey);
  let text = stripStoredIntelligenceEncoding(raw);
  if (!text) return "";

  if (spec?.options) {
    for (const opt of spec.options) {
      const re = new RegExp(`\\b${opt.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      text = text.replace(re, opt.label);
    }
  }

  text = text
    .replace(/\bpartial lead\b/gi, "")
    .replace(/\boperational intelligence captured:?\s*/gi, "")
    .replace(/\bwhat happened:\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (/^(?:provider office|shared scheduling between office and hospital|facility)$/i.test(text)) {
    return "";
  }

  if (/scheduling|coordinator_contact|scheduling_contact/i.test(dbKey)) {
    const preserved = buildPreservedNamedEntitySummary(raw);
    if (preserved) return preserved;
  }

  const max = options?.maxLen ?? 280;
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

export function classifyDebriefPathwaySignal(input: {
  groupId?: DebriefInsightGroupId | null;
  item?: DebriefIntelligenceUpdateItem | null;
  pathwayStageId?: string | null;
}): DebriefPathwaySignalClass {
  const groupId = input.groupId ?? null;
  const signal = input.item?.discoverySignalId ?? null;
  const dbKey = input.item?.field.dbKey ?? "";

  if (
    groupId === "access_intelligence" ||
    signal === "observation_approval" ||
    signal === "facility_vendor_pathway"
  ) {
    return "access_readiness";
  }
  if (
    groupId === "people_contacts" ||
    signal === "scheduling_owner" ||
    signal === "observation_logistics" ||
    /scheduling|coordinator_contact|scheduling_contact/i.test(dbKey)
  ) {
    return "observation_scheduling";
  }
  if (/credential|platform|access_path/i.test(dbKey)) {
    return "access_credentialing_dependency";
  }
  if (
    groupId === "product_fit_signals" ||
    groupId === "competitive_intelligence" ||
    signal === "product_alignment" ||
    /preference_card|competitive|acsis/i.test(`${dbKey} ${input.item?.proposedValue ?? ""}`)
  ) {
    const stage = String(input.pathwayStageId ?? "") as SalesPathwayStageId;
    if (stage === "discovery" || stage === "observe" || stage === "debrief") {
      return "early_clinical_interest";
    }
    return "early_clinical_interest";
  }
  if (groupId === "workflow_intelligence" || signal === "workflow_visibility") {
    return "workflow_understanding";
  }
  if (groupId === "relationship_intelligence") {
    return "decision_support";
  }
  return "general";
}

export function debriefReviewConfidenceDisplay(
  item: DebriefIntelligenceUpdateItem,
  pathwayClass: DebriefPathwaySignalClass,
): DebriefReviewConfidenceDisplay {
  if (item.field.accepted && item.confidenceTier === "high_confidence") {
    return "Provider-confirmed";
  }
  if (item.confidenceTier === "high_confidence") return "Provider-confirmed";
  if (pathwayClass === "early_clinical_interest") return "Early signal";
  if (/\bobserved|saw\b/i.test(`${item.proposedValue} ${item.sourceQuote ?? ""}`)) {
    return "Observed directly";
  }
  if (item.confidenceTier === "ambiguous") return "Operationally inferred";
  if (item.confidenceTier === "needs_review") return "Partial";
  return "Unknown";
}

export function debriefCardOperationalImpact(input: {
  pathwayClass: DebriefPathwaySignalClass;
  groupId?: DebriefInsightGroupId | null;
}): string {
  switch (input.pathwayClass) {
    case "access_readiness":
      return "Updates whether observation access is realistically available";
    case "observation_scheduling":
      return "Helps identify next observation scheduling path";
    case "access_credentialing_dependency":
      return "Clarifies vendor credentialing dependency before OR days";
    case "early_clinical_interest":
      return "Flags interest only — does not unlock product evaluation yet";
    case "workflow_understanding":
      return "Sharpens procedure workflow picture for observation planning";
    case "decision_support":
      return "Maps who influences access and evaluation decisions";
    default:
      if (input.groupId === "clinical_focus") return "Informs whether case volume justifies pursuit";
      return "Adds operational context to the provider profile";
  }
}

export function debriefCardTitle(input: {
  item: DebriefIntelligenceUpdateItem;
  pathwayClass: DebriefPathwaySignalClass;
  groupId?: DebriefInsightGroupId | null;
}): string {
  const blob = `${input.item.proposedValue} ${input.item.extractedStatement} ${input.item.intelligenceFieldLabel}`;
  const entity = extractPrimaryNamedPerson(blob);

  if (
    input.pathwayClass === "observation_scheduling" ||
    input.groupId === "people_contacts" ||
    (input.groupId === "access_intelligence" && entity)
  ) {
    if (entity) return entity.name;
    return "Scheduling coordination discussed";
  }
  if (input.pathwayClass === "early_clinical_interest" || /\bACSIS\b/i.test(blob)) {
    return "Early clinical interest surfaced.";
  }
  if (input.pathwayClass === "access_readiness") {
    return "Observation access signal captured.";
  }
  if (input.pathwayClass === "access_credentialing_dependency") {
    return "Credentialing dependency noted.";
  }
  if (input.pathwayClass === "workflow_understanding") {
    return "Procedure workflow insight captured.";
  }
  if (input.pathwayClass === "decision_support") {
    return "Decision influence signal captured.";
  }

  const label = stripStoredIntelligenceEncoding(input.item.intelligenceFieldLabel);
  if (!label) return "Operational signal captured.";
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}.`;
}

export function debriefCardBody(input: {
  item: DebriefIntelligenceUpdateItem;
  pathwayClass: DebriefPathwaySignalClass;
}): string {
  const blob = `${input.item.proposedValue} ${input.item.extractedStatement}`;
  const entity = extractPrimaryNamedPerson(blob);

  if (input.pathwayClass === "observation_scheduling" || entity) {
    const preserved = buildPreservedNamedEntitySummary(blob);
    if (preserved) return preserved;
  }
  if (input.pathwayClass === "early_clinical_interest" || /\bACSIS\b/i.test(blob)) {
    return "ACSIS was discussed conceptually, but fit has not been validated through live observation or surgeon-reviewed case notes.";
  }
  if (input.pathwayClass === "access_readiness") {
    const line = formatDebriefFieldValueForDisplay(
      input.item.field.dbKey,
      input.item.proposedValue || input.item.extractedStatement,
      { maxLen: 200 },
    );
    return line || "Observation access was discussed; approval still needs validation on file.";
  }
  if (input.pathwayClass === "access_credentialing_dependency") {
    return (
      formatDebriefFieldValueForDisplay(input.item.field.dbKey, input.item.proposedValue, {
        maxLen: 200,
      }) || "Vendor or facility credentialing steps still need confirmation."
    );
  }

  const line = formatDebriefFieldValueForDisplay(
    input.item.field.dbKey,
    input.item.proposedValue || input.item.extractedStatement,
    { maxLen: 220 },
  );
  return line || "Captured from this debrief — confirm before applying.";
}

export function debriefCardStillNeeded(input: {
  item: DebriefIntelligenceUpdateItem;
  pathwayClass: DebriefPathwaySignalClass;
  groupNeeds?: string[];
}): string[] {
  const needs: string[] = [];
  const seen = new Set<string>();

  const add = (line: string) => {
    const cleaned = stripStoredIntelligenceEncoding(line).replace(/\.$/, "").trim();
    if (!cleaned || cleaned.length < 6) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    needs.push(cleaned);
  };

  for (const n of input.groupNeeds ?? []) add(n);

  if (input.pathwayClass === "observation_scheduling") {
    add("Confirm whether office or hospital controls final scheduling approval");
    add("Capture Karen contact information");
  }
  if (input.pathwayClass === "early_clinical_interest") {
    add("Observe relevant cases");
    add("Validate workflow pain points");
    add("Review observations with surgeon before product evaluation");
  }
  if (input.pathwayClass === "access_readiness") {
    add("Validate observation approval on file");
  }
  if (input.pathwayClass === "access_credentialing_dependency") {
    add("Confirm credentialing path and timeline");
  }

  const stillMatch = String(input.item.proposedValue ?? "").match(/Still needed:\s*([^.]+)/i);
  if (stillMatch?.[1]) {
    stillMatch[1]
      .split(/[;•]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach(add);
  }

  return needs.slice(0, 4);
}

export type DebriefOperationalSummaryCounts = {
  signalsCount: number;
  validationCount: number;
  dependenciesCount: number;
};

export function formatDebriefOperationalSummary(counts: DebriefOperationalSummaryCounts): {
  headline: string;
  detailLine: string;
} {
  const s = counts.signalsCount;
  const v = counts.validationCount;
  const d = counts.dependenciesCount;
  const signalWord = s === 1 ? "signal" : "signals";
  const validationPhrase = v === 1 ? "requires validation" : "require validation";
  const dependencyPhrase =
    d === 1 ? "workflow dependency detected" : "workflow dependencies detected";

  return {
    headline: "Fast operator review",
    detailLine: `${s} operational ${signalWord} identified · ${v} ${validationPhrase} · ${d} ${dependencyPhrase}`,
  };
}

export function isEarlyProductIntelligenceField(field: {
  dbKey: string;
  id: string;
  label: string;
}): boolean {
  const db = field.dbKey.toLowerCase();
  const label = field.label.toLowerCase();
  if (/preference_card|competitive_product|acsis|product_fit|evaluation_openness/i.test(db)) {
    return true;
  }
  if (field.id.startsWith("ai-partial-") && /product|acsis|preference|competitive/i.test(label)) {
    return true;
  }
  return false;
}

export function shouldBlockEarlyProductFieldAcceptance(pathwayStageId?: string | null): boolean {
  const stage = String(pathwayStageId ?? "").trim();
  return stage === "discovery" || stage === "observe";
}
