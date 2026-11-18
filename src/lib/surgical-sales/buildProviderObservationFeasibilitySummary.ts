/**
 * Observation feasibility — strategic summary for provider overview.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { learningGapForField } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  isIntelligenceSectionVisibleForCommercialStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  formatIntelligenceCaptureSummaryChip,
  labelForIntelligenceToken,
  parseIntelligenceCaptureValue,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { OR_ACCESS_CONSTRAINT_NONE_TOKEN } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  providerOperationalConsequenceForField,
  type IntelligenceGapOperationalConsequence,
} from "@/lib/surgical-sales/providerOperationalImpact";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { buildCredentialingPathwayOverviewState } from "@/lib/surgical-sales/facilityCredentialingIntelligence";

import {
  PROVIDER_OVERVIEW_OBS_FEASIBILITY_TITLE,
  PROVIDER_OVERVIEW_OBS_FEASIBILITY_TITLE as PROVIDER_OBSERVATION_FEASIBILITY_TITLE,
  PROVIDER_OVERVIEW_OBS_INPUT_LABELS,
  PROVIDER_OVERVIEW_OBS_READINESS_KICKER,
  PROVIDER_OVERVIEW_OBS_VALIDATION_FIELD_LABELS,
} from "@/lib/surgical-sales/providerOverviewVocabulary";

export { PROVIDER_OBSERVATION_FEASIBILITY_TITLE };

export type ObservationFeasibilityVerdictId =
  | "likely_feasible"
  | "feasible_with_restrictions"
  | "too_early"
  | "blockers_identified";

export type ObservationFeasibilityInputStatus = "known" | "unknown" | "restrictive" | "clear";

export type ObservationFeasibilityInputId =
  | "observation_allowed"
  | "credentialing_status"
  | "coordinator_identified"
  | "or_restrictions"
  | "case_types"
  | "scheduling_cadence";

export type ObservationFeasibilityInputRow = {
  id: ObservationFeasibilityInputId;
  label: string;
  status: ObservationFeasibilityInputStatus;
  value: string | null;
  dbKey: string;
};

export type ObservationFeasibilityValidationItem = {
  label: string;
  dbKey: string;
};

export type ObservationReadinessRequirementStatus = "validated" | "blocking" | "unknown";

export type ObservationReadinessRequirement = {
  label: string;
  value: string | null;
  dbKey: string;
  status: ObservationReadinessRequirementStatus;
  /** Set for blocking / open requirements — why the gap matters operationally. */
  operationalConsequence?: IntelligenceGapOperationalConsequence;
  operationalImpact: string | null;
};

function openRequirementConsequence(dbKey: string): {
  operationalConsequence: IntelligenceGapOperationalConsequence;
  operationalImpact: string;
} {
  const operationalConsequence = providerOperationalConsequenceForField(dbKey);
  return { operationalConsequence, operationalImpact: operationalConsequence.summary };
}

export type ObservationReadinessScheduleAnswer = "yes" | "caution" | "no";

export type ProviderObservationFeasibilitySummary = {
  title: string;
  kicker: string;
  verdictId: ObservationFeasibilityVerdictId;
  verdictLabel: string;
  verdictScan: string;
  /** Concise operational read for reps — left column. */
  operationalInterpretation: string;
  tone: "success" | "warn" | "neutral" | "blocked";
  validatedRequirements: ObservationReadinessRequirement[];
  blockingUnknowns: ObservationReadinessRequirement[];
  nextValidations: ObservationReadinessRequirement[];
  safeToSchedule: {
    answer: ObservationReadinessScheduleAnswer;
    label: string;
    scan: string;
  };
  beforeBookingConfirm: string[];
  inputs: ObservationFeasibilityInputRow[];
  validationHeading: string;
  validationItems: ObservationFeasibilityValidationItem[];
  sectionId: ProviderIntelligenceSectionId;
  showPanel: boolean;
};

const VERDICT_LABELS: Record<ObservationFeasibilityVerdictId, string> = {
  likely_feasible: "OR entry: Clear",
  feasible_with_restrictions: "OR entry: Gated",
  too_early: "OR entry: Still learning",
  blockers_identified: "OR entry: Gates to confirm",
};

const VERDICT_SCAN: Record<ObservationFeasibilityVerdictId, string> = {
  likely_feasible: "Schedule observation when posting window confirmed.",
  feasible_with_restrictions: "Confirm credentialing and access gates before OR day.",
  too_early: "Capture OR access allowance before field allocation.",
  blockers_identified: "Confirm gates before OR scheduling.",
};

const OPERATIONAL_INTERPRETATION: Record<ObservationFeasibilityVerdictId, string> = {
  likely_feasible: VERDICT_SCAN.likely_feasible,
  feasible_with_restrictions: VERDICT_SCAN.feasible_with_restrictions,
  too_early: VERDICT_SCAN.too_early,
  blockers_identified: VERDICT_SCAN.blockers_identified,
};

const BLOCKING_INPUT_IDS = new Set<ObservationFeasibilityInputId>([
  "observation_allowed",
  "coordinator_identified",
  "or_restrictions",
]);

const CRITICAL_VALIDATION_DB_KEYS = new Set([
  "provider_observation_feasibility",
  "provider_observation_access_path",
  "provider_observation_coordinator_contact",
]);

const BLOCKER_ACCESS_CHIPS = new Set([
  "committee",
  "credentialing",
  "rep_limit",
  "teaching_only",
  "trial_block",
]);

const SCHEDULING_VALIDATION_FIELDS: { dbKey: string; label: string }[] = [
  {
    dbKey: "provider_observation_coordinator_contact",
    label: PROVIDER_OVERVIEW_OBS_VALIDATION_FIELD_LABELS.provider_observation_coordinator_contact,
  },
  {
    dbKey: "provider_observation_cadence_preference",
    label: PROVIDER_OVERVIEW_OBS_VALIDATION_FIELD_LABELS.provider_observation_cadence_preference,
  },
  {
    dbKey: "provider_observation_best_days_case_types",
    label: PROVIDER_OVERVIEW_OBS_VALIDATION_FIELD_LABELS.provider_observation_best_days_case_types,
  },
  {
    dbKey: "provider_ideal_observation_cases",
    label: PROVIDER_OVERVIEW_OBS_VALIDATION_FIELD_LABELS.provider_ideal_observation_cases,
  },
  {
    dbKey: "provider_observation_credentialing_needed",
    label: PROVIDER_OVERVIEW_OBS_VALIDATION_FIELD_LABELS.provider_observation_credentialing_needed,
  },
  {
    dbKey: "provider_observation_access_path",
    label: PROVIDER_OVERVIEW_OBS_VALIDATION_FIELD_LABELS.provider_observation_access_path,
  },
  {
    dbKey: "provider_observation_feasibility",
    label: PROVIDER_OVERVIEW_OBS_VALIDATION_FIELD_LABELS.provider_observation_feasibility,
  },
];

function fieldText(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function fieldToken(contact: Record<string, unknown>, dbKey: string): string | null {
  const raw = fieldText(contact, dbKey);
  if (!raw) return null;
  const parsed = parseIntelligenceCaptureValue(dbKey, raw);
  return parsed.token ?? parsed.tokens[0] ?? null;
}

function fieldTokens(contact: Record<string, unknown>, dbKey: string): string[] {
  const raw = fieldText(contact, dbKey);
  if (!raw) return [];
  const parsed = parseIntelligenceCaptureValue(dbKey, raw);
  const tokens = [...parsed.tokens];
  if (parsed.token && !tokens.includes(parsed.token)) tokens.unshift(parsed.token);
  return tokens;
}

function hasFieldSignal(contact: Record<string, unknown>, dbKey: string): boolean {
  return fieldHasIntelligenceSignal(dbKey, fieldText(contact, dbKey));
}

function chipOrNull(contact: Record<string, unknown>, dbKey: string): string | null {
  return formatIntelligenceCaptureSummaryChip(dbKey, fieldText(contact, dbKey));
}

function buildObservationAllowedRow(contact: Record<string, unknown>): ObservationFeasibilityInputRow {
  const dbKey = "provider_observation_feasibility";
  const token = fieldToken(contact, dbKey);
  const chip = chipOrNull(contact, dbKey);

  if (!hasFieldSignal(contact, dbKey)) {
    return {
      id: "observation_allowed",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.observationAllowed,
      status: "unknown",
      value: null,
      dbKey,
    };
  }

  if (token === "easy") {
    return {
      id: "observation_allowed",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.observationAllowed,
      status: "clear",
      value: chip ?? "Allowed",
      dbKey,
    };
  }

  if (token === "credentialing_required") {
    return {
      id: "observation_allowed",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.observationAllowed,
      status: "restrictive",
      value: chip ?? "Not until credentialed",
      dbKey,
    };
  }

  if (token === "restricted" || /\b(not allowed|no observation)\b/i.test(fieldText(contact, dbKey))) {
    return {
      id: "observation_allowed",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.observationAllowed,
      status: "restrictive",
      value: chip ?? "Restricted",
      dbKey,
    };
  }

  return {
    id: "observation_allowed",
    label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.observationAllowed,
    status: "known",
    value: chip,
    dbKey,
  };
}

function buildCredentialingRow(contact: Record<string, unknown>): ObservationFeasibilityInputRow {
  const obsKey = "provider_observation_credentialing_needed";
  const vendorKey = "provider_credentialing_status";
  const overview = buildCredentialingPathwayOverviewState(contact);

  if (overview.hasStructuredIntel) {
    return {
      id: "credentialing_status",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.credentialingPathway,
      status: overview.promoteToBlocker ? "restrictive" : "known",
      value: overview.line.replace(/^Credentialing:\s*/, ""),
      dbKey: vendorKey,
    };
  }

  const obsToken = fieldToken(contact, obsKey);
  const vendorToken = fieldToken(contact, vendorKey);
  const hasObs = hasFieldSignal(contact, obsKey);
  const hasVendor = hasFieldSignal(contact, vendorKey);

  if (!hasObs && !hasVendor) {
    return {
      id: "credentialing_status",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.credentialingPathway,
      status: overview.promoteToBlocker ? "restrictive" : "unknown",
      value: overview.line,
      dbKey: obsKey,
    };
  }

  const token = hasObs ? obsToken : vendorToken;
  const dbKey = hasObs ? obsKey : vendorKey;
  const chip = chipOrNull(contact, dbKey) ?? (hasObs ? chipOrNull(contact, vendorKey) : null);

  if (token === "cleared") {
    return { id: "credentialing_status", label: "Credentialing status", status: "clear", value: chip, dbKey };
  }
  if (token === "blocked") {
    return {
      id: "credentialing_status",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.credentialingPathway,
      status: "restrictive",
      value: chip ?? "Not available for access",
      dbKey,
    };
  }
  if (token === "required" || token === "in_progress") {
    return {
      id: "credentialing_status",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.credentialingPathway,
      status: "restrictive",
      value: chip,
      dbKey,
    };
  }

  return {
    id: "credentialing_status",
    label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.credentialingPathway,
    status: "known",
    value: chip,
    dbKey,
  };
}

function buildCoordinatorRow(contact: Record<string, unknown>): ObservationFeasibilityInputRow {
  const dbKey = "provider_observation_coordinator_contact";
  if (!hasFieldSignal(contact, dbKey)) {
    return {
      id: "coordinator_identified",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.schedulingAuthority,
      status: "unknown",
      value: null,
      dbKey,
    };
  }
  const value = scanLine(fieldText(contact, dbKey), 40);
  return {
    id: "coordinator_identified",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.schedulingAuthority,
    status: "clear",
    value,
    dbKey,
  };
}

function buildOrRestrictionsRow(contact: Record<string, unknown>): ObservationFeasibilityInputRow {
  const dbKey = "provider_observation_access_path";
  if (!hasFieldSignal(contact, dbKey)) {
    return {
      id: "or_restrictions",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.orAccessGates,
      status: "unknown",
      value: null,
      dbKey,
    };
  }

  const tokens = fieldTokens(contact, dbKey);
  const blockers = tokens.filter((t) => BLOCKER_ACCESS_CHIPS.has(t));
  const hasNone = tokens.includes(OR_ACCESS_CONSTRAINT_NONE_TOKEN);
  const chip = chipOrNull(contact, dbKey);
  const text = fieldText(contact, dbKey);
  const textBlocker = /\b(committee|denied|restricted|gate|not allowed)\b/i.test(text);

  if (blockers.length > 0 || (textBlocker && !hasNone)) {
    const labels = blockers.map((t) => labelForIntelligenceToken(dbKey, t));
    return {
      id: "or_restrictions",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.orAccessGates,
      status: "restrictive",
      value: labels.length > 0 ? labels.join(", ") : chip,
      dbKey,
    };
  }

  if (hasNone && blockers.length === 0) {
    return {
      id: "or_restrictions",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.orAccessGates,
      status: "clear",
      value: chip ?? "None documented",
      dbKey,
    };
  }

  return {
    id: "or_restrictions",
    label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.orAccessGates,
    status: "known",
    value: chip,
    dbKey,
  };
}

function buildCaseTypesRow(contact: Record<string, unknown>): ObservationFeasibilityInputRow {
  const dbKey = "provider_ideal_observation_cases";
  if (!hasFieldSignal(contact, dbKey)) {
    return {
      id: "case_types",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.targetCaseTypes,
      status: "unknown",
      value: null,
      dbKey,
    };
  }
  return {
    id: "case_types",
    label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.targetCaseTypes,
    status: "known",
    value: chipOrNull(contact, dbKey),
    dbKey,
  };
}

function buildSchedulingCadenceRow(contact: Record<string, unknown>): ObservationFeasibilityInputRow {
  const dbKey = "provider_observation_cadence_preference";
  if (!hasFieldSignal(contact, dbKey)) {
    return {
      id: "scheduling_cadence",
      label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.schedulingRhythm,
      status: "unknown",
      value: null,
      dbKey,
    };
  }
  return {
    id: "scheduling_cadence",
    label: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.schedulingRhythm,
    status: "known",
    value: chipOrNull(contact, dbKey),
    dbKey,
  };
}

function countCapturedInputs(rows: ObservationFeasibilityInputRow[]): number {
  return rows.filter((r) => r.status !== "unknown").length;
}

function resolveVerdict(
  rows: ObservationFeasibilityInputRow[],
  contact: Record<string, unknown>,
): ObservationFeasibilityVerdictId {
  const allowed = rows.find((r) => r.id === "observation_allowed")!;
  const credentialing = rows.find((r) => r.id === "credentialing_status")!;
  const coordinator = rows.find((r) => r.id === "coordinator_identified")!;
  const restrictions = rows.find((r) => r.id === "or_restrictions")!;
  const cases = rows.find((r) => r.id === "case_types")!;
  const cadence = rows.find((r) => r.id === "scheduling_cadence")!;

  const allowanceBlocked =
    allowed.status === "restrictive" &&
    (allowed.value?.toLowerCase().includes("restrict") ||
      allowed.value?.toLowerCase().includes("not until") ||
      /\bnot allowed\b/i.test(fieldText(contact, "provider_observation_feasibility")));

  const credBlocked =
    fieldToken(contact, "provider_observation_credentialing_needed") === "blocked" ||
    fieldToken(contact, "provider_credentialing_status") === "blocked" ||
    credentialing.status === "restrictive";
  const orBlocked = restrictions.status === "restrictive" && !restrictions.value?.toLowerCase().includes("none");

  if (allowanceBlocked || credBlocked || orBlocked) {
    return "blockers_identified";
  }

  const captured = countCapturedInputs(rows);
  if (allowed.status === "unknown" && captured < 2) {
    return "too_early";
  }

  if (allowed.status === "unknown") {
    return "too_early";
  }

  const schedulingReady =
    coordinator.status !== "unknown" &&
    cadence.status !== "unknown" &&
    cases.status !== "unknown";

  const gatesClear =
    allowed.status === "clear" &&
    credentialing.status !== "restrictive" &&
    restrictions.status !== "restrictive";

  if (gatesClear && schedulingReady) {
    return "likely_feasible";
  }

  if (allowed.status === "clear" || allowed.status === "known") {
    if (allowed.status === "clear" && coordinator.status === "clear" && restrictions.status !== "restrictive") {
      return "likely_feasible";
    }
    return "feasible_with_restrictions";
  }

  if (allowed.status === "restrictive") {
    return "feasible_with_restrictions";
  }

  return "too_early";
}

function verdictTone(verdictId: ObservationFeasibilityVerdictId): ProviderObservationFeasibilitySummary["tone"] {
  switch (verdictId) {
    case "likely_feasible":
      return "success";
    case "feasible_with_restrictions":
      return "warn";
    case "blockers_identified":
      return "blocked";
    default:
      return "neutral";
  }
}

function buildValidationItems(
  contact: Record<string, unknown>,
  verdictId: ObservationFeasibilityVerdictId,
): ObservationFeasibilityValidationItem[] {
  const sectionId: ProviderIntelligenceSectionId = "observation_readiness";
  const items: ObservationFeasibilityValidationItem[] = [];

  for (const { dbKey, label } of SCHEDULING_VALIDATION_FIELDS) {
    const gap = learningGapForField(dbKey, sectionId, contact);
    if (gap) {
      items.push({ label, dbKey });
      continue;
    }
    if (!hasFieldSignal(contact, dbKey)) {
      items.push({ label, dbKey });
    }
  }

  if (verdictId === "blockers_identified") {
    const allowance = fieldText(contact, "provider_observation_feasibility");
    if (/\b(restrict|not allowed)\b/i.test(allowance)) {
      items.unshift({ label: "Confirm whether observation is permitted", dbKey: "provider_observation_feasibility" });
    }
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.dbKey)) return false;
    seen.add(item.dbKey);
    return true;
  }).slice(0, 6);
}

function inputToRequirement(row: ObservationFeasibilityInputRow): ObservationReadinessRequirement {
  if (row.status === "clear" || (row.status === "known" && row.value)) {
    return {
      label: row.label,
      value: row.value,
      dbKey: row.dbKey,
      status: "validated",
      operationalImpact: null,
    };
  }
  if (row.status === "restrictive") {
    const { operationalConsequence, operationalImpact } = openRequirementConsequence(row.dbKey);
    return {
      label: row.label,
      value: row.value ?? "Restricted",
      dbKey: row.dbKey,
      status: "blocking",
      operationalConsequence,
      operationalImpact,
    };
  }
  const { operationalConsequence, operationalImpact } = openRequirementConsequence(row.dbKey);
  return {
    label: row.label,
    value: null,
    dbKey: row.dbKey,
    status: "unknown",
    operationalConsequence,
    operationalImpact,
  };
}

function supplementValidatedFromContact(
  contact: Record<string, unknown>,
  validatedRequirements: ObservationReadinessRequirement[],
): ObservationReadinessRequirement[] {
  const seen = new Set(validatedRequirements.map((r) => r.dbKey));
  const supplemented = [...validatedRequirements];

  for (const { dbKey, label } of SCHEDULING_VALIDATION_FIELDS) {
    if (seen.has(dbKey) || !hasFieldSignal(contact, dbKey)) continue;
    supplemented.push({
      label,
      value: chipOrNull(contact, dbKey),
      dbKey,
      status: "validated",
      operationalImpact: null,
    });
    seen.add(dbKey);
  }

  return supplemented;
}

function partitionReadinessRequirements(
  contact: Record<string, unknown>,
  inputs: ObservationFeasibilityInputRow[],
  validationItems: ObservationFeasibilityValidationItem[],
): {
  validatedRequirements: ObservationReadinessRequirement[];
  blockingUnknowns: ObservationReadinessRequirement[];
  nextValidations: ObservationReadinessRequirement[];
} {
  const validatedRequirements: ObservationReadinessRequirement[] = [];
  const blockingUnknowns: ObservationReadinessRequirement[] = [];

  for (const row of inputs) {
    const req = inputToRequirement(row);
    if (req.status === "validated") {
      validatedRequirements.push(req);
    } else if (req.status === "blocking") {
      blockingUnknowns.push(req);
    } else if (req.status === "unknown" && BLOCKING_INPUT_IDS.has(row.id)) {
      blockingUnknowns.push(req);
    }
  }

  const validatedWithCapture = supplementValidatedFromContact(contact, validatedRequirements);
  const validatedDbKeys = new Set(validatedWithCapture.map((r) => r.dbKey));

  const nextValidations: ObservationReadinessRequirement[] = validationItems
    .filter((item) => !validatedDbKeys.has(item.dbKey))
    .map((item) => {
      const status = CRITICAL_VALIDATION_DB_KEYS.has(item.dbKey) ? "blocking" : "unknown";
      const { operationalConsequence, operationalImpact } = openRequirementConsequence(item.dbKey);
      return {
        label: item.label,
        value: null,
        dbKey: item.dbKey,
        status,
        operationalConsequence,
        operationalImpact,
      };
    });

  for (const row of inputs) {
    if (row.status !== "unknown") continue;
    if (BLOCKING_INPUT_IDS.has(row.id)) continue;
    if (validatedDbKeys.has(row.dbKey)) continue;
    const req = inputToRequirement(row);
    if (!nextValidations.some((v) => v.dbKey === req.dbKey)) {
      nextValidations.push(req);
    }
  }

  return {
    validatedRequirements: validatedWithCapture,
    blockingUnknowns,
    nextValidations,
  };
}

function buildSafeToSchedule(
  verdictId: ObservationFeasibilityVerdictId,
  blockingCount: number,
): ProviderObservationFeasibilitySummary["safeToSchedule"] {
  switch (verdictId) {
    case "likely_feasible":
      return {
        answer: "yes",
        label: "Yes",
        scan: "Core OR access and scheduling signals support booking an observation day.",
      };
    case "feasible_with_restrictions":
      return {
        answer: "caution",
        label: "Not yet — confirm first",
        scan: "Possible with restrictions; complete validations before locking OR time.",
      };
    case "blockers_identified":
      return {
        answer: "no",
        label: "No",
        scan:
          blockingCount > 0
            ? "Operational gates must clear before scheduling observation."
            : "Confirm documented gates before OR scheduling.",
      };
    default:
      return {
        answer: "no",
        label: "Not yet",
        scan: "Capture allowance and access pathway before scheduling.",
      };
  }
}

function buildBeforeBookingConfirm(
  blockingUnknowns: ObservationReadinessRequirement[],
  nextValidations: ObservationReadinessRequirement[],
  verdictId: ObservationFeasibilityVerdictId,
): string[] {
  const lines: string[] = [];

  for (const item of blockingUnknowns) {
    lines.push(item.value ? `${item.label}: ${item.value}` : item.label);
  }

  for (const item of nextValidations) {
    if (lines.length >= 6) break;
    if (!lines.some((l) => l.toLowerCase().includes(item.label.toLowerCase()))) {
      lines.push(item.label);
    }
  }

  if (lines.length === 0 && verdictId === "likely_feasible") {
    lines.push("Confirm posted case window and coordinator handoff for the booked day.");
  }

  if (lines.length === 0 && verdictId === "feasible_with_restrictions") {
    lines.push("Confirm credentialing clearance and posting window before travel.");
  }

  return lines.slice(0, 6);
}

export function buildProviderObservationFeasibilitySummary(input: {
  contact: Record<string, unknown>;
  commercialStage: ProviderCommercialWorkflowStage;
  /** When set, omit validation rows already covered by open-intelligence priorities. */
  suppressValidationDbKeys?: Set<string>;
}): ProviderObservationFeasibilitySummary {
  const sectionId: ProviderIntelligenceSectionId = "observation_readiness";
  const showPanel = isIntelligenceSectionVisibleForCommercialStage(sectionId, input.commercialStage);

  const inputs: ObservationFeasibilityInputRow[] = [
    buildObservationAllowedRow(input.contact),
    buildCredentialingRow(input.contact),
    buildCoordinatorRow(input.contact),
    buildOrRestrictionsRow(input.contact),
    buildCaseTypesRow(input.contact),
    buildSchedulingCadenceRow(input.contact),
  ];

  const verdictId = resolveVerdict(inputs, input.contact);
  let validationItems = buildValidationItems(input.contact, verdictId);
  if (input.suppressValidationDbKeys?.size) {
    validationItems = validationItems.filter((item) => !input.suppressValidationDbKeys!.has(item.dbKey));
  }

  const { validatedRequirements, blockingUnknowns, nextValidations } = partitionReadinessRequirements(
    input.contact,
    inputs,
    validationItems,
  );

  const validatedDbKeys = new Set(validatedRequirements.map((r) => r.dbKey));
  validationItems = validationItems.filter((item) => !validatedDbKeys.has(item.dbKey));

  const beforeBookingConfirm = buildBeforeBookingConfirm(
    blockingUnknowns,
    nextValidations,
    verdictId,
  );

  return {
    title: PROVIDER_OBSERVATION_FEASIBILITY_TITLE,
    kicker: PROVIDER_OVERVIEW_OBS_READINESS_KICKER,
    verdictId,
    verdictLabel: VERDICT_LABELS[verdictId],
    verdictScan: VERDICT_SCAN[verdictId],
    operationalInterpretation: scanLine(OPERATIONAL_INTERPRETATION[verdictId], 120),
    tone: verdictTone(verdictId),
    validatedRequirements,
    blockingUnknowns,
    nextValidations,
    safeToSchedule: buildSafeToSchedule(verdictId, blockingUnknowns.length),
    beforeBookingConfirm,
    inputs,
    validationHeading: "Next required validations",
    validationItems,
    sectionId,
    showPanel,
  };
}
