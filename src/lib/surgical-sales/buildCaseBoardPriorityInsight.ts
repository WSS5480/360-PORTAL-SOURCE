import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import { countDelimitedObjectiveLines } from "@/lib/surgical-sales/observationObjectives";
import { observationQuickFindingsFromCaseRow } from "@/lib/surgical-sales/observationQuickFindings";
import { productSupportCaseOutcomeLabel } from "@/lib/surgical-sales/productSupportCaseOutcome";

export const CASE_BOARD_PRIORITY_INSIGHT_EMPTY = "No significant intelligence captured yet.";
export const CASE_BOARD_PRIORITY_INSIGHT_EMPTY_SOURCE = "No qualifying case intelligence";

export type CaseBoardPriorityInsightResult = {
  insight: string;
  sourceLabel: string;
  sourceField: string | null;
};

const ADMIN_INSIGHT_PATTERN =
  /\b(scheduling owner|scheduling coordination|credentialing|access pathway|access process|vendor access|observation access|observation approved|who owns scheduling|coordinator contact|case access readiness)\b/i;

const GENERIC_TOPIC_LABELS = new Set(
  [
    "Observation access process",
    "Observation approval",
    "Preferred procedures",
    "Technique preferences",
    "Competitor usage",
    "Scheduling owner",
    "Credentialing path",
    "Observation credentialing rules",
    "Observable procedures",
    "Workflow friction points",
    "Evaluation openness",
    "Dock and tray preferences",
    "Case access readiness",
    "Open questions for this case",
    "Facility vendor pathway",
    "Observation timing and logistics",
    "Procedure workflow visibility",
    "Product fit alignment",
    "Clinical champion",
  ].map((label) => label.toLowerCase()),
);

type WatchItem = {
  id: string;
  label: string;
  status: "planned" | "observed";
};

type CaseBoardInsightInput = Record<string, unknown> & {
  case_type?: string | null;
  product_name?: string | null;
  latest_note_body?: string | null;
  follow_up_needed?: boolean | null;
  case_support_outcome?: string | null;
};

function parseWatchItems(raw: unknown): WatchItem[] {
  if (!Array.isArray(raw)) return [];
  const items: WatchItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const label = String(row.label ?? "").trim();
    const id = String(row.id ?? "").trim();
    if (!label || !id) continue;
    const statusRaw = String(row.status ?? "planned");
    items.push({
      id,
      label,
      status: statusRaw === "observed" ? "observed" : "planned",
    });
  }
  return items;
}

function firstLine(raw: unknown): string {
  return (
    String(raw ?? "")
      .split(/\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}

function splitLines(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\n|,|;/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isBlockedInsight(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 160) return true;
  if (ADMIN_INSIGHT_PATTERN.test(trimmed)) return true;
  if (GENERIC_TOPIC_LABELS.has(trimmed.toLowerCase())) return true;
  if (/^[\w\s/-]+:\s/.test(trimmed)) return true;
  return false;
}

function normalizeInsight(text: string): string | null {
  const trimmed = text.trim();
  if (isBlockedInsight(trimmed)) return null;
  return trimmed;
}

function sourcedInsight(
  insight: string | null,
  sourceLabel: string,
  sourceField: string,
): CaseBoardPriorityInsightResult | null {
  if (!insight) return null;
  return { insight, sourceLabel, sourceField };
}

function emptyInsightResult(): CaseBoardPriorityInsightResult {
  return {
    insight: CASE_BOARD_PRIORITY_INSIGHT_EMPTY,
    sourceLabel: CASE_BOARD_PRIORITY_INSIGHT_EMPTY_SOURCE,
    sourceField: null,
  };
}

function insightFromWatchItemLabel(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (/fixation/i.test(lower)) return "Fixation concerns identified";
  if (/visualization/i.test(lower)) return "Visualization challenge mentioned";
  if (/workflow fit/i.test(lower)) return "Need to validate workflow observations";
  if (/product gap|product usage|current product/i.test(lower)) return "Product usage signal captured";
  if (/competitor/i.test(lower)) return "Competitive usage signal captured";
  if (/staff workflow|workflow friction/i.test(lower)) return "Staff workflow friction noted";

  return normalizeInsight(trimmed);
}

function observationQuickFindingInsight(caseRow: Record<string, unknown>): CaseBoardPriorityInsightResult | null {
  const findings = observationQuickFindingsFromCaseRow(caseRow);
  const keyInsight = normalizeInsight(firstLine(findings.key_finding_note));
  if (keyInsight) return sourcedInsight(keyInsight, "Observation key finding", "debrief_key_findings");

  if (findings.workflow_friction === "Yes") {
    return sourcedInsight(
      "Workflow friction observed on case day",
      "Quick finding: workflow friction",
      "live_observation_staff_process",
    );
  }
  if (findings.competitor_seen === "Yes") {
    return sourcedInsight(
      "Competitive product observed in the room",
      "Quick finding: competitor observed",
      "live_observation_competitors",
    );
  }
  if (findings.product_interest === "Strong") {
    return sourcedInsight(
      "Strong product interest surfaced",
      "Quick finding: product interest",
      "observation_quick_finding_product_interest",
    );
  }
  if (findings.product_interest === "Mentioned") {
    return sourcedInsight(
      "Product interest mentioned during observation",
      "Quick finding: product interest",
      "observation_quick_finding_product_interest",
    );
  }
  if (findings.workflow_fit === "Weak") {
    return sourcedInsight(
      "Workflow fit concerns identified",
      "Quick finding: workflow fit",
      "live_observation_product_fit",
    );
  }
  if (findings.workflow_fit === "Possible" || findings.workflow_fit === "Strong") {
    return sourcedInsight(
      "Workflow fit signal captured",
      "Quick finding: workflow fit",
      "live_observation_product_fit",
    );
  }

  return null;
}

function observationObjectiveInsight(caseRow: Record<string, unknown>): CaseBoardPriorityInsightResult | null {
  for (const line of splitLines(caseRow.observation_signals_to_validate)) {
    const insight = normalizeInsight(line);
    if (insight) return sourcedInsight(insight, "Signals to validate", "observation_signals_to_validate");
  }

  for (const line of splitLines(caseRow.observation_key_questions)) {
    const insight = normalizeInsight(line);
    if (insight) return sourcedInsight(insight, "Observation key question", "observation_key_questions");
  }

  const goalInsight = normalizeInsight(firstLine(caseRow.observation_goal));
  if (goalInsight) return sourcedInsight(goalInsight, "Observation objective", "observation_goal");

  return null;
}

function observationValidationInsight(caseRow: Record<string, unknown>): CaseBoardPriorityInsightResult | null {
  const items = parseWatchItems(caseRow.observation_validation_targets);
  for (const item of items.filter((entry) => entry.status === "observed")) {
    const insight = insightFromWatchItemLabel(item.label);
    if (insight) return sourcedInsight(insight, "Observed validation target", "observation_validation_targets");
  }
  for (const item of items.filter((entry) => entry.status === "planned")) {
    const insight = insightFromWatchItemLabel(item.label);
    if (insight) return sourcedInsight(insight, "Planned validation target", "observation_validation_targets");
  }
  return null;
}

function observationNotesInsight(caseRow: Record<string, unknown>): CaseBoardPriorityInsightResult | null {
  const latestNote = String(caseRow.latest_note_body ?? "").trim();
  if (latestNote) {
    const lower = latestNote.toLowerCase();
    const sourceLabel = "Latest dictation";
    const sourceField = "latest_note_body";

    const product = latestNote.match(/\b([A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){0,3}\s+Mesh)\b/)?.[1];
    if (/\binterested\b[^.!?]{0,100}\bschedul(?:e|ing)\b[^.!?]{0,100}\bevaluation\b/i.test(latestNote)) {
      return sourcedInsight("Evaluation scheduling interest captured", sourceLabel, sourceField);
    }
    if (/\bconform(?:s|ed)?\b[^.!?]{0,120}\b(?:larger|large)\s+defects?\b/i.test(latestNote)) {
      return sourcedInsight("Product fit concern: conformability on larger defects", sourceLabel, sourceField);
    }
    if (product && /\b(?:using|used)\b/i.test(latestNote)) {
      return sourcedInsight(`${product} used during observation`, sourceLabel, sourceField);
    }
    if (/\b(?:workflow friction|workflow delay|delays?|fixation|visuali[sz]ation|product interest|evaluation|competitor|mesh)\b/i.test(lower)) {
      const sentence = latestNote
        .split(/(?<=[.!?])\s+/)
        .map((part) => part.trim())
        .find((part) => normalizeInsight(part));
      return sourcedInsight(normalizeInsight(sentence ?? ""), sourceLabel, sourceField);
    }
  }

  return sourcedInsight(normalizeInsight(firstLine(caseRow.notes)), "Case notes", "notes");
}

export function deriveObservationCaseBoardPriorityInsightResult(
  caseRow: CaseBoardInsightInput,
): CaseBoardPriorityInsightResult {
  const candidates = [
    observationQuickFindingInsight(caseRow),
    observationNotesInsight(caseRow),
    observationValidationInsight(caseRow),
    observationObjectiveInsight(caseRow),
  ];

  for (const candidate of candidates) {
    if (candidate) return candidate;
  }

  const hasObjectives =
    countDelimitedObjectiveLines(String(caseRow.observation_goal ?? "")) > 0 ||
    countDelimitedObjectiveLines(String(caseRow.observation_key_questions ?? "")) > 0 ||
    countDelimitedObjectiveLines(String(caseRow.observation_signals_to_validate ?? "")) > 0 ||
    parseWatchItems(caseRow.observation_validation_targets).length > 0;

  if (hasObjectives) {
    return {
      insight: "Observation objectives captured — review before case day",
      sourceLabel: "Observation objectives",
      sourceField: "observation_goal",
    };
  }

  return emptyInsightResult();
}

export function deriveObservationCaseBoardPriorityInsight(caseRow: CaseBoardInsightInput): string {
  return deriveObservationCaseBoardPriorityInsightResult(caseRow).insight;
}

function productSupportNeedsInsight(
  caseRow: CaseBoardInsightInput,
  productName: string,
): CaseBoardPriorityInsightResult | null {
  const needs = firstLine(caseRow.case_product_needs);
  if (!needs) return null;

  if (/staff training/i.test(needs)) {
    return sourcedInsight("Staff training requested", "Product support needs", "case_product_needs");
  }

  if (/\bfirst\b/i.test(needs)) {
    const product = productName.trim() || "product";
    const shortProduct = product.split(/\s+/)[0] ?? product;
    return sourcedInsight(`First ${shortProduct} case`, "Product support needs", "case_product_needs");
  }

  return sourcedInsight(normalizeInsight(needs), "Product support needs", "case_product_needs");
}

function productSupportOutcomeInsight(caseRow: CaseBoardInsightInput): CaseBoardPriorityInsightResult | null {
  const outcome = productSupportCaseOutcomeLabel(String(caseRow.case_support_outcome ?? ""));
  if (!outcome) return null;
  if (/follow-up needed/i.test(outcome)) {
    return sourcedInsight("Follow-up needed", "Product support outcome", "case_support_outcome");
  }
  if (/issue occurred/i.test(outcome)) {
    return sourcedInsight("Issue occurred on case day", "Product support outcome", "case_support_outcome");
  }
  if (/product not used/i.test(outcome)) {
    return sourcedInsight("Product was not used on case day", "Product support outcome", "case_support_outcome");
  }
  return sourcedInsight(normalizeInsight(outcome), "Product support outcome", "case_support_outcome");
}

export function deriveProductSupportCaseBoardPriorityInsightResult(
  caseRow: CaseBoardInsightInput,
): CaseBoardPriorityInsightResult {
  const productName = String(caseRow.product_name ?? "").trim();

  const candidates = [
    productSupportNeedsInsight(caseRow, productName),
    Boolean(caseRow.follow_up_needed)
      ? sourcedInsight("Follow-up needed", "Follow-up flag", "follow_up_needed")
      : null,
    productSupportOutcomeInsight(caseRow),
    sourcedInsight(
      normalizeInsight(firstLine(caseRow.case_operational_risks)),
      "Operational risks",
      "case_operational_risks",
    ),
    sourcedInsight(normalizeInsight(firstLine(caseRow.notes)), "Case notes", "notes"),
    productName && /\bfirst\b/i.test(String(caseRow.notes ?? ""))
      ? sourcedInsight(`First ${productName.split(/\s+/)[0] ?? productName} case`, "Case notes", "notes")
      : null,
  ];

  for (const candidate of candidates) {
    if (candidate) return candidate;
  }

  return emptyInsightResult();
}

export function deriveProductSupportCaseBoardPriorityInsight(caseRow: CaseBoardInsightInput): string {
  return deriveProductSupportCaseBoardPriorityInsightResult(caseRow).insight;
}

export function deriveCaseBoardPriorityInsightResult(caseRow: CaseBoardInsightInput): CaseBoardPriorityInsightResult {
  if (isSurgicalObservationCase(caseRow.case_type)) {
    return deriveObservationCaseBoardPriorityInsightResult(caseRow);
  }
  if (String(caseRow.case_type ?? "").trim().toLowerCase() === "product_support") {
    return deriveProductSupportCaseBoardPriorityInsightResult(caseRow);
  }

  const generic = normalizeInsight(firstLine(caseRow.notes));
  return sourcedInsight(generic, "Case notes", "notes") ?? emptyInsightResult();
}

export function deriveCaseBoardPriorityInsight(caseRow: CaseBoardInsightInput): string {
  return deriveCaseBoardPriorityInsightResult(caseRow).insight;
}
