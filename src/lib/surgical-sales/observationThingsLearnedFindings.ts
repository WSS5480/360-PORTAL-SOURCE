import {
  extractObservationNoteEntities,
  type ObservationNoteEntityType,
  type ObservationNoteExtraction,
} from "@/lib/surgical-sales/extractObservationNoteEntities";
import {
  isUsableObservationEntity,
  observationEntityFinding,
} from "@/lib/surgical-sales/observationEntityAccessors";

export type ObservationThingsLearnedFindingId =
  | "competitor_product"
  | "visualization_challenge"
  | "staff_workflow_issue"
  | "workflow_bottleneck"
  | "product_fit_opportunity"
  | "current_product"
  | "provider_frustration";

export const OBSERVATION_THINGS_LEARNED_FINDING_ORDER: ObservationThingsLearnedFindingId[] = [
  "competitor_product",
  "visualization_challenge",
  "staff_workflow_issue",
  "workflow_bottleneck",
  "product_fit_opportunity",
  "current_product",
  "provider_frustration",
];

export const OBSERVATION_THINGS_LEARNED_FINDING_LABELS: Record<
  ObservationThingsLearnedFindingId,
  string
> = {
  competitor_product: "Competitor product observed",
  visualization_challenge: "Visualization challenge observed",
  staff_workflow_issue: "Staff workflow issue observed",
  workflow_bottleneck: "Workflow bottleneck observed",
  product_fit_opportunity: "Product fit opportunity observed",
  current_product: "Current product observed",
  provider_frustration: "Provider frustration observed",
};

const CASE_FIELD_KEYS = [
  "live_observation_workflow",
  "live_observation_clinical_pain_points",
  "live_observation_product_fit",
  "live_observation_competitors",
  "live_observation_staff_process",
  "live_observation_surgeon_reactions",
  "live_observation_questions",
  "live_observation_follow_up_items",
  "debrief_key_findings",
] as const;

type NoteActivity = {
  activity_type?: string;
  body?: string;
  metadata_json?: Record<string, unknown> | null;
};

function hasStaffContext(text: string): boolean {
  return /\b(nurse|tech|circulator|scrub|or\s+staff|staff)\b/i.test(text);
}

function hasFrustrationContext(text: string): boolean {
  return /\b(frustrat|pushback|resist|complain|annoy)\b/i.test(text);
}

function hasVisualizationContext(text: string): boolean {
  return /\bvisuali[sz]/i.test(text);
}

function hasWorkflowFrictionContext(text: string): boolean {
  return /\b(friction|delay|turnover|setup|bottleneck|workaround|inefficien|extra step)\b/i.test(text);
}

function hasProductFitContext(text: string): boolean {
  return /\b(fit|opportunit|demo|trial|improve|interest|adopt)\b/i.test(text);
}

function hasCurrentProductContext(text: string): boolean {
  return /\b(tray|implant|preference card|current product|on the field|vendor)\b/i.test(text);
}

function hasCompetitorContext(text: string): boolean {
  return /\b(competitor|comp\s+rep|rival)\b/i.test(text);
}

export function mapObservationEntityToFindings(
  type: ObservationNoteEntityType,
  value: string,
): ObservationThingsLearnedFindingId[] {
  switch (type) {
    case "competitor_signal":
      return ["competitor_product"];
    case "clinical_pain_signal":
      return hasVisualizationContext(value) ? ["visualization_challenge"] : [];
    case "staff_signal":
      return hasWorkflowFrictionContext(value) || hasStaffContext(value)
        ? ["staff_workflow_issue"]
        : [];
    case "workflow_friction_signal":
      return hasStaffContext(value) ? ["staff_workflow_issue"] : ["workflow_bottleneck"];
    case "product_signal":
      return hasProductFitContext(value)
        ? ["product_fit_opportunity"]
        : hasCurrentProductContext(value)
          ? ["current_product"]
          : ["product_fit_opportunity"];
    case "growth_signal":
    case "follow_up_signal":
      return ["product_fit_opportunity"];
    case "provider_behavior_signal":
      return hasFrustrationContext(value) ? ["provider_frustration"] : [];
    case "workflow_signal":
      if (hasVisualizationContext(value)) return ["visualization_challenge"];
      if (hasCompetitorContext(value)) return ["competitor_product"];
      if (hasStaffContext(value) && hasWorkflowFrictionContext(value)) return ["staff_workflow_issue"];
      if (hasWorkflowFrictionContext(value)) return ["workflow_bottleneck"];
      if (hasProductFitContext(value)) return ["product_fit_opportunity"];
      if (hasFrustrationContext(value)) return ["provider_frustration"];
      return [];
    default:
      return [];
  }
}

function addFindings(target: Set<ObservationThingsLearnedFindingId>, ids: ObservationThingsLearnedFindingId[]) {
  for (const id of ids) target.add(id);
}

function findingsFromExtraction(
  extraction: ObservationNoteExtraction,
  target: Set<ObservationThingsLearnedFindingId>,
) {
  for (const entity of extraction.entities) {
    addFindings(target, mapObservationEntityToFindings(entity.type, entity.finding ?? entity.value ?? ""));
  }
}

function findingsFromNoteText(text: string, target: Set<ObservationThingsLearnedFindingId>) {
  const trimmed = text.trim();
  if (!trimmed) return;
  findingsFromExtraction(extractObservationNoteEntities(trimmed), target);

  if (hasCompetitorContext(trimmed)) addFindings(target, ["competitor_product"]);
  if (hasVisualizationContext(trimmed)) addFindings(target, ["visualization_challenge"]);
  if (hasStaffContext(trimmed) && hasWorkflowFrictionContext(trimmed)) {
    addFindings(target, ["staff_workflow_issue"]);
  } else if (hasWorkflowFrictionContext(trimmed)) {
    addFindings(target, ["workflow_bottleneck"]);
  }
  if (hasProductFitContext(trimmed)) addFindings(target, ["product_fit_opportunity"]);
  if (hasCurrentProductContext(trimmed)) addFindings(target, ["current_product"]);
  if (hasFrustrationContext(trimmed)) addFindings(target, ["provider_frustration"]);
}

function findingsFromCaseField(
  fieldKey: string,
  raw: string,
  target: Set<ObservationThingsLearnedFindingId>,
) {
  for (const line of raw.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (fieldKey === "live_observation_competitors") addFindings(target, ["competitor_product"]);
    if (fieldKey === "live_observation_clinical_pain_points" && hasVisualizationContext(trimmed)) {
      addFindings(target, ["visualization_challenge"]);
    }
    if (fieldKey === "live_observation_staff_process") addFindings(target, ["staff_workflow_issue"]);
    if (fieldKey === "live_observation_workflow") {
      addFindings(
        target,
        hasStaffContext(trimmed) ? ["staff_workflow_issue"] : ["workflow_bottleneck"],
      );
    }
    if (fieldKey === "live_observation_product_fit") {
      addFindings(target, hasProductFitContext(trimmed) ? ["product_fit_opportunity"] : ["current_product"]);
    }
    if (fieldKey === "live_observation_surgeon_reactions" && hasFrustrationContext(trimmed)) {
      addFindings(target, ["provider_frustration"]);
    }
  }
}

function readStoredExtraction(metadata: Record<string, unknown> | null | undefined): ObservationNoteExtraction | null {
  const raw = metadata?.ai_extraction;
  if (!raw || typeof raw !== "object") return null;
  const entities = Array.isArray((raw as ObservationNoteExtraction).entities)
    ? (raw as ObservationNoteExtraction).entities
    : [];
  if (entities.length === 0) return null;
  return raw as ObservationNoteExtraction;
}

/** Concise field findings — no categories, scores, or framework labels. */
export function collectObservationThingsLearnedFindingIds(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
}): ObservationThingsLearnedFindingId[] {
  const found = new Set<ObservationThingsLearnedFindingId>();

  for (const activity of input.activities ?? []) {
    if (String(activity.activity_type ?? "").trim().toLowerCase() !== "note") continue;

    const stored = readStoredExtraction(activity.metadata_json ?? null);
    if (stored) findingsFromExtraction(stored, found);
    findingsFromNoteText(String(activity.body ?? ""), found);
  }

  for (const key of CASE_FIELD_KEYS) {
    findingsFromCaseField(key, String(input.caseRow[key] ?? ""), found);
  }

  return OBSERVATION_THINGS_LEARNED_FINDING_ORDER.filter((id) => found.has(id));
}

export function buildObservationThingsLearnedLabels(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
}): string[] {
  return collectObservationThingsLearnedFindingIds(input).map(
    (id) => OBSERVATION_THINGS_LEARNED_FINDING_LABELS[id],
  );
}
