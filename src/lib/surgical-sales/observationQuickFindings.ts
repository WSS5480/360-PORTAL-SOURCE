export type ObservationQuickFindingKey =
  | "workflow_fit"
  | "product_interest"
  | "competitor_seen"
  | "workflow_friction"
  | "follow_up_needed";

export type WorkflowFitFinding = "Unknown" | "Weak" | "Possible" | "Strong";
export type ProductInterestFinding = "None" | "Mentioned" | "Strong";
export type CompetitorFinding = "None" | "Unknown" | "Yes";
export type WorkflowFrictionFinding = "No" | "Yes" | "Unknown";
export type FollowUpFinding = "No" | "Yes";

export type ObservationQuickFindingValue =
  | WorkflowFitFinding
  | ProductInterestFinding
  | CompetitorFinding
  | WorkflowFrictionFinding
  | FollowUpFinding
  | null;

export type ObservationQuickFindingsDraft = {
  workflow_fit: WorkflowFitFinding | null;
  product_interest: ProductInterestFinding | null;
  competitor_seen: CompetitorFinding | null;
  workflow_friction: WorkflowFrictionFinding | null;
  follow_up_needed: FollowUpFinding | null;
  key_finding_note: string;
};

type QuickFindingFieldConfig =
  | {
      key: Exclude<ObservationQuickFindingKey, "follow_up_needed">;
      label: string;
      caseField: string;
      kind: "text_enum";
      options: readonly string[];
    }
  | {
      key: "follow_up_needed";
      label: string;
      caseField: "follow_up_needed";
      kind: "boolean_enum";
      options: readonly FollowUpFinding[];
    };

export const OBSERVATION_QUICK_FINDING_FIELDS: QuickFindingFieldConfig[] = [
  {
    key: "workflow_fit",
    label: "Workflow fit",
    caseField: "live_observation_product_fit",
    kind: "text_enum",
    options: ["Unknown", "Weak", "Possible", "Strong"],
  },
  {
    key: "product_interest",
    label: "Product interest",
    caseField: "observation_quick_finding_product_interest",
    kind: "text_enum",
    options: ["None", "Mentioned", "Strong"],
  },
  {
    key: "competitor_seen",
    label: "Competitive product observed",
    caseField: "live_observation_competitors",
    kind: "text_enum",
    options: ["None", "Unknown", "Yes"],
  },
  {
    key: "workflow_friction",
    label: "Workflow friction observed",
    caseField: "live_observation_staff_process",
    kind: "text_enum",
    options: ["No", "Yes", "Unknown"],
  },
  {
    key: "follow_up_needed",
    label: "Follow-up needed",
    caseField: "follow_up_needed",
    kind: "boolean_enum",
    options: ["No", "Yes"],
  },
];

export const OBSERVATION_KEY_FINDING_NOTE_FIELD = "debrief_key_findings" as const;

function normalizeEnum<T extends string>(value: unknown, options: readonly T[]): T | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const match = options.find((option) => option.toLowerCase() === raw.toLowerCase());
  return match ?? null;
}

function readLegacyYesNo(value: unknown): "yes" | "no" | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "yes" || raw === "y" || raw === "true") return "yes";
  if (raw === "no" || raw === "n" || raw === "false") return "no";
  return null;
}

function readWorkflowFit(value: unknown): WorkflowFitFinding | null {
  const direct = normalizeEnum(value, ["Unknown", "Weak", "Possible", "Strong"] as const);
  if (direct) return direct;
  const legacy = readLegacyYesNo(value);
  if (legacy === "yes") return "Strong";
  if (legacy === "no") return "Weak";
  return null;
}

function readProductInterest(
  value: unknown,
  legacyBoolean: unknown,
): ProductInterestFinding | null {
  const direct = normalizeEnum(value, ["None", "Mentioned", "Strong"] as const);
  if (direct) return direct;
  if (legacyBoolean === true) return "Mentioned";
  if (legacyBoolean === false) return "None";
  return null;
}

function readCompetitor(value: unknown): CompetitorFinding | null {
  const direct = normalizeEnum(value, ["None", "Unknown", "Yes"] as const);
  if (direct) return direct;
  const legacy = readLegacyYesNo(value);
  if (legacy === "yes") return "Yes";
  if (legacy === "no") return "None";
  return null;
}

function readWorkflowFriction(value: unknown): WorkflowFrictionFinding | null {
  const direct = normalizeEnum(value, ["No", "Yes", "Unknown"] as const);
  if (direct) return direct;
  const legacy = readLegacyYesNo(value);
  if (legacy === "yes") return "Yes";
  if (legacy === "no") return "No";
  return null;
}

function readFollowUp(value: unknown): FollowUpFinding | null {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return null;
}

export function observationQuickFindingsFromCaseRow(caseRow: Record<string, unknown>): ObservationQuickFindingsDraft {
  return {
    workflow_fit: readWorkflowFit(caseRow.live_observation_product_fit),
    product_interest: readProductInterest(
      caseRow.observation_quick_finding_product_interest,
      caseRow.debrief_product_opportunity_identified,
    ),
    competitor_seen: readCompetitor(caseRow.live_observation_competitors),
    workflow_friction: readWorkflowFriction(caseRow.live_observation_staff_process),
    follow_up_needed: readFollowUp(caseRow.follow_up_needed),
    key_finding_note: String(caseRow.debrief_key_findings ?? ""),
  };
}

export function observationQuickFindingsPatch(
  key: ObservationQuickFindingKey,
  value: ObservationQuickFindingValue,
): Record<string, unknown> {
  const field = OBSERVATION_QUICK_FINDING_FIELDS.find((entry) => entry.key === key);
  if (!field) return {};

  if (field.kind === "boolean_enum") {
    if (value === null) return { follow_up_needed: false };
    return { follow_up_needed: value === "Yes" };
  }

  const patch: Record<string, unknown> = {
    [field.caseField]: value == null ? null : String(value),
  };

  if (key === "product_interest") {
    patch.debrief_product_opportunity_identified =
      value === "Mentioned" || value === "Strong";
  }

  return patch;
}

export function observationKeyFindingNotePatch(note: string): Record<string, unknown> {
  const trimmed = note.trim();
  return { [OBSERVATION_KEY_FINDING_NOTE_FIELD]: trimmed || null };
}

export function observationQuickFindingsHasContent(draft: ObservationQuickFindingsDraft): boolean {
  return (
    draft.workflow_fit != null ||
    draft.product_interest != null ||
    draft.competitor_seen != null ||
    draft.workflow_friction != null ||
    draft.follow_up_needed != null ||
    draft.key_finding_note.trim().length > 0
  );
}
