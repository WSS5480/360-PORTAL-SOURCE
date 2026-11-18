/**
 * Procedure workflow understanding — maturity model (not observation-only).
 */

import { parseIntelligenceCaptureValue } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import type { DiscoveryFieldStatusLabel } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import {
  WORKFLOW_MATURITY_OPTIONS,
  WORKFLOW_MATURITY_VALUES,
  WORKFLOW_UNDERSTANDING_QUESTION,
  type WorkflowMaturityValue,
} from "@/lib/surgical-sales/workflowUnderstandingConstants";

export {
  WORKFLOW_MATURITY_OPTIONS,
  WORKFLOW_MATURITY_VALUES,
  WORKFLOW_UNDERSTANDING_QUESTION,
  type WorkflowMaturityValue,
};

/** Local lifecycle labels — avoids circular import with discoveryIntelligenceSignalStatus. */
const F = {
  unknown: "Still learning",
  captured: "Captured",
  validated: "Confirmed on file",
} as const satisfies Record<string, DiscoveryFieldStatusLabel>;

const WORKFLOW_FIELD_KEYS = [
  "provider_procedure_focus",
  "provider_technique_preferences",
  "provider_workflow_pain_points",
  "provider_technique_detail",
] as const;

const LEGACY_CHOICE_ALIASES: Record<string, WorkflowMaturityValue> = {
  fully_observed: "observed_in_field",
  partially_observed: "partially_understood",
  not_observed: "unknown",
  discussed_only: "discussed_only",
  partially_understood: "partially_understood",
  observed_in_field: "observed_in_field",
  fully_validated: "fully_validated",
  unknown: "unknown",
};

const TEXT_INFERENCE: Array<{ value: WorkflowMaturityValue; patterns: RegExp[] }> = [
  {
    value: "fully_validated",
    patterns: [
      /\bfully (?:understand|validated|mapped)\b/i,
      /\bworkflow (?:and )?product fit\b/i,
      /\brepeatable understanding\b/i,
      /\boperational fit confirmed\b/i,
    ],
  },
  {
    value: "observed_in_field",
    patterns: [
      /\bobserved in field\b/i,
      /\bsaw the (?:or|setup|room)\b/i,
      /\bor setup\b/i,
      /\btray prep\b/i,
      /\bwalked the or\b/i,
      /\bdirectly (?:saw|observed|watched)\b/i,
      /\bfully observed\b/i,
    ],
  },
  {
    value: "partially_understood",
    patterns: [
      /\bpartially understood\b/i,
      /\bsome workflow visibility\b/i,
      /\bgaps still\b/i,
      /\bpartial(?:ly)? observed\b/i,
      /\bmix of\b.*\b(?:open|lap|robotic)\b/i,
    ],
  },
  {
    value: "discussed_only",
    patterns: [
      /\bdiscussed (?:their|the|our)\b/i,
      /\bwe discussed\b/i,
      /\bverbal understanding\b/i,
      /\btalked through\b/i,
      /\bintro call\b/i,
      /\bno (?:direct )?visualization\b/i,
    ],
  },
];

export function isWorkflowMaturityValue(value: string): value is WorkflowMaturityValue {
  return (WORKFLOW_MATURITY_VALUES as readonly string[]).includes(value);
}

export function normalizeWorkflowMaturityChoice(choice: string): WorkflowMaturityValue {
  const key = choice.trim().toLowerCase().replace(/\s+/g, "_");
  if (isWorkflowMaturityValue(key)) return key;
  return LEGACY_CHOICE_ALIASES[key] ?? "unknown";
}

export function workflowMaturityLabel(value: WorkflowMaturityValue): string {
  return WORKFLOW_MATURITY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function workflowMaturityDescription(value: WorkflowMaturityValue): string {
  switch (value) {
    case "discussed_only":
      return "Verbal understanding — no direct visualization yet";
    case "partially_understood":
      return "Some workflow visibility — gaps still exist";
    case "observed_in_field":
      return "Workflow directly seen during observation or case";
    case "fully_validated":
      return "High workflow confidence — operational fit confirmed";
    case "unknown":
    default:
      return "Workflow understanding not yet captured";
  }
}

export function formatWorkflowMaturityPersistValue(
  choice: string,
  notes = "",
  metadata?: Record<string, string>,
): string {
  const maturity = normalizeWorkflowMaturityChoice(choice);
  const metaNotes = metadata?.workflow_notes?.trim() ?? "";
  const combinedNotes = [notes.trim(), metaNotes].filter(Boolean).join(" · ");
  const label = workflowMaturityDescription(maturity);
  if (combinedNotes) return `${maturity}|${label} — ${combinedNotes}`;
  return `${maturity}|${label}`;
}

export function inferWorkflowMaturityFromText(text: string): WorkflowMaturityValue | null {
  const blob = text.trim();
  if (!blob) return null;
  for (const { value, patterns } of TEXT_INFERENCE) {
    if (patterns.some((p) => p.test(blob))) return value;
  }
  return null;
}

function parseMaturityFromStored(dbKey: string, raw: string): WorkflowMaturityValue | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const head = trimmed.split("|")[0]?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
  if (isWorkflowMaturityValue(head)) return head;
  if (LEGACY_CHOICE_ALIASES[head]) return LEGACY_CHOICE_ALIASES[head];

  const parsed = parseIntelligenceCaptureValue(dbKey, trimmed);
  if (parsed.token && isWorkflowMaturityValue(parsed.token)) return parsed.token;

  return inferWorkflowMaturityFromText(trimmed);
}

export function resolveWorkflowMaturityFromContact(
  contact: Record<string, unknown>,
): WorkflowMaturityValue | null {
  for (const dbKey of WORKFLOW_FIELD_KEYS) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (!raw) continue;
    const maturity = parseMaturityFromStored(dbKey, raw);
    if (maturity && maturity !== "unknown") return maturity;
  }
  for (const dbKey of WORKFLOW_FIELD_KEYS) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (!raw) continue;
    const maturity = parseMaturityFromStored(dbKey, raw);
    if (maturity) return maturity;
  }
  return null;
}

export function workflowMaturityToLifecycleStatus(
  maturity: WorkflowMaturityValue,
  contact: Record<string, unknown>,
  primaryDbKey = "provider_procedure_focus",
): DiscoveryFieldStatusLabel {
  if (maturity === "unknown") return F.unknown;

  const validated = isIntelligenceFieldValidatedOnFile(primaryDbKey, contact);
  if (maturity === "fully_validated") {
    return validated ? F.validated : F.captured;
  }
  if (maturity === "observed_in_field") {
    return validated ? F.validated : F.captured;
  }
  return F.captured;
}

export function resolveWorkflowVisibilityStatus(contact: Record<string, unknown>): DiscoveryFieldStatusLabel {
  const maturity = resolveWorkflowMaturityFromContact(contact);
  if (maturity) {
    return workflowMaturityToLifecycleStatus(maturity, contact);
  }

  const anySignal = WORKFLOW_FIELD_KEYS.some((k) =>
    fieldHasIntelligenceSignal(k, contact[k] as string | null | undefined),
  );
  if (!anySignal) return F.unknown;

  const primaryValidated = isIntelligenceFieldValidatedOnFile("provider_procedure_focus", contact);
  if (primaryValidated) return F.validated;

  return F.captured;
}

export type WorkflowMaturitySuggestion = {
  suggested: WorkflowMaturityValue;
  reason: string;
};

/** Engagement-context automation — suggest maturity upgrades (non-blocking). */
export function suggestWorkflowMaturityFromEngagementContext(input: {
  engagementType?: string | null;
  engagementStatus?: string | null;
  narrative?: string | null;
}): WorkflowMaturitySuggestion | null {
  const type = String(input.engagementType ?? "").toLowerCase();
  const status = String(input.engagementStatus ?? "").toLowerCase();
  const narrative = String(input.narrative ?? "");
  const fromText = inferWorkflowMaturityFromText(narrative);

  if (
    (type.includes("observation") || type.includes("observe")) &&
    (status === "completed" || /\bdebrief\b/i.test(narrative))
  ) {
    return {
      suggested: fromText && fromText !== "discussed_only" ? fromText : "observed_in_field",
      reason: "Observation completed — consider upgrading to Observed in field",
    };
  }

  if (
    type.includes("case") ||
    /\b(case day|product case|case completed|successful case)\b/i.test(narrative)
  ) {
    return {
      suggested: fromText === "fully_validated" ? fromText : "fully_validated",
      reason: "Successful product case — consider Fully validated",
    };
  }

  if (
    type.includes("intro") ||
    type.includes("discovery") ||
    type.includes("follow_up") ||
    type.includes("follow-up") ||
    /\bintro call\b/i.test(narrative) ||
    /\bdiscussed\b/i.test(narrative)
  ) {
    const suggested =
      fromText === "partially_understood" || fromText === "observed_in_field"
        ? fromText
        : fromText === "fully_validated"
          ? fromText
          : "discussed_only";
    return {
      suggested,
      reason: "Touch included workflow discussion — Discussed only or Partially understood may fit",
    };
  }

  if (fromText && fromText !== "unknown") {
    return {
      suggested: fromText,
      reason: `Debrief language suggests ${workflowMaturityLabel(fromText).toLowerCase()}`,
    };
  }

  return null;
}
