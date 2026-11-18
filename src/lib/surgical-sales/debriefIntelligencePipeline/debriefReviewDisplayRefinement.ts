/**
 * Rep-facing display refinements for debrief review outcomes — evidence-backed
 * headlines without changing extraction storage.
 */

import type { IntelligenceBriefOutcome } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { INTELLIGENCE_BRIEF_PRODUCT_STATUS } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import { isPlausiblePersonName, isContactNameParsingArtifact } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import {
  canonicalProcedureLabel,
  techniqueModalityLabelFromText,
} from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";

const DAY_LABELS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bmonday/i, label: "Monday" },
  { pattern: /\btuesday/i, label: "Tuesday" },
  { pattern: /\bwednesday/i, label: "Wednesday" },
  { pattern: /\bthursday/i, label: "Thursday" },
  { pattern: /\bfriday/i, label: "Friday" },
];

const DAY_ORDER = DAY_LABELS.map(({ label }) => label);

function daysFromSchedulingText(text: string): string[] {
  return DAY_LABELS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
}

function isSchedulingPreferenceLine(line: string): boolean {
  return /^workflow priority:/i.test(line.trim());
}

export function mergeSchedulingPreferenceLines(lines: string[]): string | null {
  const schedulingLines = lines.filter(isSchedulingPreferenceLine);
  if (schedulingLines.length === 0) return null;

  const days = new Set<string>();
  let hasMorning = false;
  for (const line of schedulingLines) {
    for (const day of daysFromSchedulingText(line)) days.add(day);
    if (/\bmorning/i.test(line)) hasMorning = true;
  }
  if (days.size === 0) return schedulingLines[0] ?? null;

  const orderedDays = DAY_ORDER.filter((day) => days.has(day));
  const dayPhrase =
    orderedDays.length === 1
      ? `${orderedDays[0]}s`
      : `${orderedDays.slice(0, -1).join("/")}/${orderedDays[orderedDays.length - 1]}s`;
  return hasMorning
    ? `Workflow priority: ${dayPhrase} mornings preferred for scheduling`
    : `Workflow priority: ${dayPhrase} preferred for scheduling`;
}

export function dedupeSchedulingWorkflowPrimaryLines(lines: string[]): string[] {
  const nonScheduling = lines.filter((line) => !isSchedulingPreferenceLine(line));
  const merged = mergeSchedulingPreferenceLines(lines);
  if (!merged) return lines;
  return [...nonScheduling, merged];
}

export function formatSchedulingPreferenceFromEvidence(evidence: string): string | null {
  const text = evidence.trim();
  if (!text || !/\bschedul/i.test(text)) return null;

  const days = DAY_LABELS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
  if (days.length === 0) return null;

  const dayPhrase =
    days.length === 1
      ? `${days[0]}s`
      : `${days.slice(0, -1).join("/")}/${days[days.length - 1]}s`;
  const morning = /\bmorning/i.test(text);
  return morning
    ? `Workflow priority: ${dayPhrase} mornings preferred for scheduling`
    : `Workflow priority: ${dayPhrase} preferred for scheduling`;
}

export function refineWorkflowPrimaryLine(primaryLine: string, evidence: string): string {
  const line = primaryLine.trim();
  const blob = `${line} ${evidence}`.trim();
  if (/easiest scheduling|scheduling times|preferred scheduling/i.test(line)) {
    return formatSchedulingPreferenceFromEvidence(blob) ?? line;
  }
  const schedulingPreference = formatSchedulingPreferenceFromEvidence(blob);
  if (
    schedulingPreference &&
    /\b(?:tuesday|thursday|monday|wednesday|friday)\b/i.test(blob) &&
    /\b(?:morning|easiest|preferred)\b/i.test(blob)
  ) {
    return schedulingPreference;
  }
  return line;
}

export function refineClinicalPrimaryLine(primaryLine: string, evidence: string): string {
  const raw = primaryLine.trim();
  const line = raw.includes(" · ")
    ? raw
        .split(" · ")
        .map((part, index) =>
          index === 0 ? enrichClinicalProcedureFocusWithModality(part.trim(), evidence) : part.trim(),
        )
        .join(" · ")
    : enrichClinicalProcedureFocusWithModality(raw, evidence);

  if (!/technique \/ modality preference noted|modality preference noted/i.test(line)) {
    return line;
  }
  const technique = techniqueModalityLabelFromText(evidence);
  if (!technique) return line;
  return `${technique} · Technique / Modality`;
}

function evidenceSupportsModalityForProcedure(
  technique: string,
  procedureFocus: string,
  evidence: string,
): boolean {
  const blob = evidence.trim();
  if (!blob) return false;

  const sentences = blob.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim());
  const techniquePattern = new RegExp(`\\b${technique}\\b`, "i");
  const procedureTokens = procedureFocus
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 3 && !/^(?:robotic|laparoscopic|open|repair|procedure)$/i.test(token));

  for (const sentence of sentences) {
    if (!techniquePattern.test(sentence)) continue;

    if (/\breconstruction\b/i.test(procedureFocus)) {
      if (
        /\brobotic\b[^.!?]{0,56}\b(?:abdominal\s+wall\s+)?reconstruction\b/i.test(sentence) &&
        procedureTokens.some((token) => sentence.toLowerCase().includes(token))
      ) {
        return true;
      }
      continue;
    }

    if (/\bhernia\b/i.test(procedureFocus)) {
      if (
        /\brobotic\b[^.!?]{0,56}\bhernia\b|\bhernia\b[^.!?]{0,56}\brobotic\b/i.test(sentence) &&
        procedureTokens.some((token) => sentence.toLowerCase().includes(token))
      ) {
        return true;
      }
      continue;
    }
  }

  return false;
}

export function enrichClinicalProcedureFocusWithModality(
  procedureFocus: string,
  evidence: string,
): string {
  const line = procedureFocus.trim();
  const evidenceBlob = evidence.trim();
  const techniqueBlob = `${line} ${evidenceBlob}`.trim();
  if (!line || /\b(?:robotic|laparoscopic|minimally invasive|open)\b/i.test(line)) {
    return canonicalProcedureLabel(line);
  }
  const technique = techniqueModalityLabelFromText(techniqueBlob);
  if (
    !technique ||
    !/\b(?:hernia|repair|reconstruction|procedure|case|fusion|fracture)\b/i.test(line) ||
    !evidenceSupportsModalityForProcedure(technique, line, evidenceBlob)
  ) {
    return canonicalProcedureLabel(line);
  }
  const merged = `${technique} ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
  return canonicalProcedureLabel(merged);
}

export function executiveProcedureFocusTakeaway(displayValue: string): string | null {
  const value = displayValue.trim();
  if (!value || /^(?:procedure focus|clinical focus)$/i.test(value)) return null;
  const label = canonicalProcedureLabel(value);
  if (!label) return null;
  return `${label} focus noted`;
}

export function isProductUsageOutcome(outcome: IntelligenceBriefOutcome): boolean {
  if (outcome.kind !== "product_intelligence") return false;

  const impact = `${outcome.productImpactLine ?? ""} ${outcome.summaryLine ?? ""}`.trim();
  if (/^Product interest:/i.test(outcome.summaryLine)) return false;
  if (/^Product interest:/i.test(impact)) return false;
  if (/^Current product:|^Competitor product:|^Current product identified:/i.test(impact)) {
    return true;
  }
  if (/^Current product identified:/i.test(outcome.summaryLine)) return true;

  const status = outcome.productEvidenceStatus ?? outcome.statusLine ?? "";
  if (
    status === INTELLIGENCE_BRIEF_PRODUCT_STATUS.validated ||
    status === INTELLIGENCE_BRIEF_PRODUCT_STATUS.needsConfirmation
  ) {
    return true;
  }

  return false;
}

export function isProductInterestOutcome(outcome: IntelligenceBriefOutcome): boolean {
  return outcome.kind === "product_intelligence" && !isProductUsageOutcome(outcome);
}

export function executiveContactTakeaway(outcome: IntelligenceBriefOutcome): string | null {
  if (outcome.kind !== "contact") return null;

  const name = (outcome.primaryLine ?? outcome.summaryLine).trim();
  const role = (outcome.subtitle ?? "").trim();
  const firstToken = name.split(/\s+/)[0] ?? "";
  if (!firstToken || !isPlausiblePersonName(name) || isContactNameParsingArtifact(name)) return null;

  if (/schedul/i.test(role)) {
    return `${firstToken} identified as scheduling coordinator`;
  }
  if (role) {
    return `${firstToken} identified (${role})`;
  }
  return `${firstToken} identified as contact`;
}
