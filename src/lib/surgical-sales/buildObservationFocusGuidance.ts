import {
  OBSERVATION_FOCUS_CHIP_OPTIONS,
  type ObservationFocusChip,
} from "@/lib/surgical-sales/observationCaseFocusChips";

export type ObservationFocusGuidanceItem = {
  label: ObservationFocusChip;
};

type PriorCaseRow = Record<string, unknown>;

type FocusRule = {
  label: ObservationFocusChip;
  caseFields: string[];
  providerFields: string[];
  priorCaseFields: string[];
  textPatterns: RegExp[];
};

const FOCUS_RULES: FocusRule[] = [
  {
    label: "Current products used",
    caseFields: ["live_observation_product_fit"],
    providerFields: ["provider_current_vendors", "provider_procedure_focus"],
    priorCaseFields: ["live_observation_product_fit"],
    textPatterns: [/\b(product|vendor|tray|implant|acsis|instrument)\b/i],
  },
  {
    label: "Competitor products used",
    caseFields: ["live_observation_competitors"],
    providerFields: ["provider_competitive_products"],
    priorCaseFields: ["live_observation_competitors"],
    textPatterns: [/\b(competitor|rival|comp\s+rep)\b/i],
  },
  {
    label: "Provider pain points",
    caseFields: ["live_observation_clinical_pain_points", "live_observation_surgeon_reactions"],
    providerFields: ["provider_clinical_frustrations"],
    priorCaseFields: ["live_observation_clinical_pain_points", "live_observation_surgeon_reactions"],
    textPatterns: [/\b(frustrat|pain point|difficult|visuali|struggl|concern)\b/i],
  },
  {
    label: "Staff pain points",
    caseFields: ["live_observation_staff_process"],
    providerFields: ["provider_staff_frustrations"],
    priorCaseFields: ["live_observation_staff_process"],
    textPatterns: [/\b(staff|nurse|tech|circulator|scrub)\b.*\b(frustrat|concern|issue)\b/i],
  },
  {
    label: "Workflow bottlenecks",
    caseFields: ["live_observation_workflow"],
    providerFields: ["provider_workflow_pain_points"],
    priorCaseFields: ["live_observation_workflow"],
    textPatterns: [/\b(workflow|turnover|delay|setup|bottleneck|friction)\b/i],
  },
  {
    label: "Product fit opportunities",
    caseFields: ["live_observation_product_fit"],
    providerFields: ["provider_future_opportunity_signals", "provider_product_interests"],
    priorCaseFields: ["live_observation_product_fit"],
    textPatterns: [/\b(evaluat|trial|demo|fit|opportunit|interest)\b/i],
  },
];

const DEFAULT_GUIDANCE: ObservationFocusChip[] = [...OBSERVATION_FOCUS_CHIP_OPTIONS];

function linesFromField(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function fieldHasContent(values: unknown[]): boolean {
  return values.some((value) => linesFromField(value).length > 0);
}

function textMatches(corpus: string, patterns: RegExp[]): boolean {
  const trimmed = corpus.trim();
  if (!trimmed) return false;
  return patterns.some((pattern) => pattern.test(trimmed));
}

function collectCorpus(input: {
  rule: FocusRule;
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: PriorCaseRow[];
  noteBodies: string[];
  debriefText: string;
}): string {
  const chunks: string[] = [
    ...input.rule.caseFields.flatMap((key) => linesFromField(input.caseRow[key])),
    ...input.rule.providerFields.flatMap((key) => linesFromField(input.providerContact?.[key])),
    ...(input.priorCases ?? []).flatMap((prior) =>
      input.rule.priorCaseFields.flatMap((key) => linesFromField(prior[key])),
    ),
    ...input.noteBodies,
    ...linesFromField(input.debriefText),
  ];
  return chunks.join("\n");
}

export function buildObservationFocusGuidance(input: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: PriorCaseRow[];
  activities?: Array<{ activity_type?: string; body?: string }>;
}): ObservationFocusGuidanceItem[] {
  const noteBodies = (input.activities ?? [])
    .filter((activity) => String(activity.activity_type ?? "").trim().toLowerCase() === "note")
    .map((activity) => String(activity.body ?? "").trim())
    .filter(Boolean);

  const debriefText = String(input.caseRow.debrief_key_findings ?? "");
  const matched = new Set<ObservationFocusChip>();

  for (const rule of FOCUS_RULES) {
    const hasStored = fieldHasContent([
      ...rule.caseFields.map((key) => input.caseRow[key]),
      ...rule.providerFields.map((key) => input.providerContact?.[key]),
      ...(input.priorCases ?? []).flatMap((prior) => rule.priorCaseFields.map((key) => prior[key])),
    ]);

    const corpus = collectCorpus({
      rule,
      caseRow: input.caseRow,
      providerContact: input.providerContact,
      priorCases: input.priorCases,
      noteBodies,
      debriefText,
    });

    if (hasStored || textMatches(corpus, rule.textPatterns)) {
      matched.add(rule.label);
    }
  }

  const ordered = OBSERVATION_FOCUS_CHIP_OPTIONS.filter((label) => matched.has(label)).map((label) => ({
    label,
  }));

  if (ordered.length > 0) return ordered.slice(0, 6);

  return DEFAULT_GUIDANCE.map((label) => ({ label }));
}
