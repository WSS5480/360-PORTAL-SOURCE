/**
 * Internal audit map: case workflow questions, Pre-Call Plan inputs,
 * provider planning sections, and clinical discovery — for ownership migration planning.
 *
 * Do not rename or remove DB columns from this file alone. Consumers should treat
 * `fieldKey` as the current persisted key. `recommendedFutureOwner` is advisory.
 *
 * Canonical case workflow fields: `observationCaseWorkflowFields.ts`.
 * Provider planning: `providerWizardFields.ts`, `providerProfileFields.ts`.
 *
 * @see observationCaseWorkflowFields.ts
 * @see providerWizardFields.ts
 * @see providerClinicalDiscovery.ts
 * @see providerPlanningCompletion.ts
 * @see db/migrations/20260526_surgical_observation_workflow_fields.sql
 */

import { PROVIDER_CLINICAL_DISCOVERY_FIELDS } from "@/lib/surgical-sales/providerClinicalDiscovery";
import {
  PROVIDER_CREATE_PLANNING_REQUIRED_KEYS,
  PROVIDER_WIZARD_PLANNING_FIELDS,
  PROVIDER_WIZARD_PROCEDURAL_FIELDS,
  PROVIDER_WIZARD_RELATIONSHIP_FIELDS,
} from "@/lib/surgical-sales/providerWizardFields";
import { PROVIDER_PRE_PLANNING_FIELDS } from "@/lib/surgical-sales/providerPrePlanningFieldConfig";
import { PRE_CALL_PLAN_CASE_KEYS, PRE_CALL_PLAN_FIELD_CONFIGS } from "@/lib/surgical-sales/preCallPlanFields";
import { PRE_CALL_PLAN_CASE_DB_COLUMN_KEYS } from "@/lib/surgical-sales/preCallPlanCompat";
import {
  ACTIVE_OBSERVATION_CASE_WORKFLOW_FIELD_KEYS,
  observationCaseWorkflowOwnershipEntries,
} from "@/lib/surgical-sales/observationCaseWorkflowFields";

/** Target entity that should own the field after migration. */
export type WorkflowFieldFutureOwner = "provider" | "case" | "opportunity" | "organization" | "engagement";

/**
 * Where the value is stored today.
 * `case_legacy` = surgical_sales_cases column superseded by provider-level fields.
 */
export type WorkflowFieldStorage =
  | "surgical_sales_cases"
  | "surgical_sales_engagements"
  | "case_legacy"
  | "surgical_sales_contacts"
  | "provider_clinical_discovery_answers"
  | "clinical_discovery_legacy_contact"
  | "sales_opportunities"
  | "surgical_case_notes"
  | "ui_only";

/** Provider planning profile / wizard section id. */
export type ProviderPlanningSectionId =
  | "basics"
  | "procedural"
  | "planning"
  | "clinical_discovery"
  | "relationship";

/** Observation case workflow stage (portal case detail). */
export type ObservationCaseWorkflowStageId =
  | "setup"
  | "pre_call_plan"
  | "live"
  | "debrief"
  | "follow_up"
  | "routing";

export type WorkflowFieldSection =
  | ProviderPlanningSectionId
  | `observation_${ObservationCaseWorkflowStageId}`
  | "engagement_pre_call_plan"
  | "case_create"
  | "case_metadata"
  | "case_promote_ui"
  | "ai_note_capture";

export type WorkflowFieldRequiredRule =
  | "none"
  /** Required when provider onboarding uses save_mode complete. */
  | "provider_onboarding_complete"
  /** Required in validateBasics (name + primary org). */
  | "provider_basics_complete"
  /** Required when creating an observation case (portal client). */
  | "observation_case_create"
  /** UI progress badge only — API accepts null. */
  | "ui_progress_only";

export type WorkflowFieldOwnershipEntry = {
  /** Current persisted or logical key — do not rename without a migration. */
  fieldKey: string;
  /** Primary label shown in current portal UI (or DB comment when no UI). */
  currentLabel: string;
  currentSection: WorkflowFieldSection;
  /** Human-readable section title for docs and tooling. */
  currentSectionLabel: string;
  recommendedFutureOwner: WorkflowFieldFutureOwner;
  whereStoredToday: WorkflowFieldStorage;
  remainsRequired: boolean;
  requiredRule: WorkflowFieldRequiredRule;
  /** Optional notes: legacy columns, alternate labels, validation limits. */
  notes?: string;
};

export const OBSERVATION_CASE_STAGE_LABELS: Record<ObservationCaseWorkflowStageId, string> = {
  setup: "Case Setup",
  pre_call_plan: "Pre-Call Plan",
  live: "Live Observation Notes",
  debrief: "Post-Observation Debrief",
  follow_up: "Follow-Up",
  routing: "Outcome / Opportunity Routing",
};

export const PROVIDER_PLANNING_SECTION_LABELS_MAP: Record<ProviderPlanningSectionId, string> = {
  basics: "Provider basics",
  procedural: "Procedural intelligence",
  planning: "Provider intelligence (deprecated section id)",
  clinical_discovery: "Surgical intelligence notes",
  relationship: "Relationship strategy",
};

const PRE_CALL_PLAN_ENGAGEMENT_LABELS: Record<(typeof PRE_CALL_PLAN_CASE_KEYS)[number], string> = Object.fromEntries(
  PRE_CALL_PLAN_FIELD_CONFIGS.map((f) => [f.key, f.label]),
) as Record<(typeof PRE_CALL_PLAN_CASE_KEYS)[number], string>;

const PROFILE_ONLY_LABEL_BY_KEY = Object.fromEntries(
  PROVIDER_PRE_PLANNING_FIELDS.map((f) => [f.key, f.label]),
) as Record<string, string>;

function providerPlanningEntries(): WorkflowFieldOwnershipEntry[] {
  const entries: WorkflowFieldOwnershipEntry[] = [];

  for (const field of PROVIDER_WIZARD_PLANNING_FIELDS) {
    const required = (PROVIDER_CREATE_PLANNING_REQUIRED_KEYS as readonly string[]).includes(field.key);
    const alt = PROFILE_ONLY_LABEL_BY_KEY[field.key];
    entries.push({
      fieldKey: field.key,
      currentLabel: field.label,
      currentSection: "planning",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.planning,
      recommendedFutureOwner: "provider",
      whereStoredToday: "surgical_sales_contacts",
      remainsRequired: required,
      requiredRule: required ? "provider_onboarding_complete" : "none",
      notes:
        alt && alt !== field.label
          ? `Alternate label in providerProfileFields: "${alt}". Legacy case column: pre_observation_* (case_legacy).`
          : "Supersedes legacy case-level pre_observation_* columns.",
    });
  }

  for (const field of [
    {
      key: "provider_strategic_goal",
      label: PROFILE_ONLY_LABEL_BY_KEY.provider_strategic_goal ?? "Strategic objective",
    },
    {
      key: "provider_pre_observation_additional_notes",
      label: PROFILE_ONLY_LABEL_BY_KEY.provider_pre_observation_additional_notes ?? "Additional planning notes",
    },
  ]) {
    if (entries.some((e) => e.fieldKey === field.key)) continue;
    entries.push({
      fieldKey: field.key,
      currentLabel: field.label,
      currentSection: "planning",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.planning,
      recommendedFutureOwner: "provider",
      whereStoredToday: "surgical_sales_contacts",
      remainsRequired: false,
      requiredRule: "none",
      notes: "Defined in providerProfileFields; no dedicated wizard field yet. API-merge only.",
    });
  }

  return entries;
}

function providerProceduralEntries(): WorkflowFieldOwnershipEntry[] {
  return PROVIDER_WIZARD_PROCEDURAL_FIELDS.map((field) => ({
    fieldKey: field.key,
    currentLabel: field.label,
    currentSection: "procedural" as const,
    currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.procedural,
    recommendedFutureOwner: "provider" as const,
    whereStoredToday: "surgical_sales_contacts" as const,
    remainsRequired: false,
    requiredRule: "none" as const,
  }));
}

function providerRelationshipEntries(): WorkflowFieldOwnershipEntry[] {
  return PROVIDER_WIZARD_RELATIONSHIP_FIELDS.map((field) => ({
    fieldKey: field.key,
    currentLabel: field.label,
    currentSection: "relationship" as const,
    currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.relationship,
    recommendedFutureOwner: "provider" as const,
    whereStoredToday: "surgical_sales_contacts" as const,
    remainsRequired: false,
    requiredRule: "none" as const,
    notes:
      field.key === "influence_level" || field.key === "preferred_contact_method"
        ? 'Value "unknown" counts as empty for section completion.'
        : undefined,
  }));
}

function providerBasicsEntries(): WorkflowFieldOwnershipEntry[] {
  return [
    {
      fieldKey: "first_name",
      currentLabel: "First name",
      currentSection: "basics",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.basics,
      recommendedFutureOwner: "provider",
      whereStoredToday: "surgical_sales_contacts",
      remainsRequired: true,
      requiredRule: "provider_basics_complete",
      notes: "At least one of first_name or last_name required.",
    },
    {
      fieldKey: "last_name",
      currentLabel: "Last name",
      currentSection: "basics",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.basics,
      recommendedFutureOwner: "provider",
      whereStoredToday: "surgical_sales_contacts",
      remainsRequired: true,
      requiredRule: "provider_basics_complete",
      notes: "At least one of first_name or last_name required.",
    },
    {
      fieldKey: "primary_organization_id",
      currentLabel: "Primary organization",
      currentSection: "basics",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.basics,
      recommendedFutureOwner: "organization",
      whereStoredToday: "surgical_sales_contacts",
      remainsRequired: true,
      requiredRule: "provider_basics_complete",
      notes: "Links provider to surgical CRM account (organization).",
    },
    {
      fieldKey: "title",
      currentLabel: "Title",
      currentSection: "basics",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.basics,
      recommendedFutureOwner: "provider",
      whereStoredToday: "surgical_sales_contacts",
      remainsRequired: false,
      requiredRule: "none",
    },
    {
      fieldKey: "role_type",
      currentLabel: "Role type",
      currentSection: "basics",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.basics,
      recommendedFutureOwner: "provider",
      whereStoredToday: "surgical_sales_contacts",
      remainsRequired: false,
      requiredRule: "none",
    },
    {
      fieldKey: "email",
      currentLabel: "Email",
      currentSection: "basics",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.basics,
      recommendedFutureOwner: "provider",
      whereStoredToday: "surgical_sales_contacts",
      remainsRequired: false,
      requiredRule: "none",
    },
    {
      fieldKey: "phone",
      currentLabel: "Phone",
      currentSection: "basics",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.basics,
      recommendedFutureOwner: "provider",
      whereStoredToday: "surgical_sales_contacts",
      remainsRequired: false,
      requiredRule: "none",
    },
    {
      fieldKey: "mobile_phone",
      currentLabel: "Mobile phone",
      currentSection: "basics",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.basics,
      recommendedFutureOwner: "provider",
      whereStoredToday: "surgical_sales_contacts",
      remainsRequired: false,
      requiredRule: "none",
    },
    {
      fieldKey: "specialty",
      currentLabel: "Specialty",
      currentSection: "basics",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.basics,
      recommendedFutureOwner: "provider",
      whereStoredToday: "surgical_sales_contacts",
      remainsRequired: false,
      requiredRule: "none",
    },
  ];
}

function clinicalDiscoveryEntries(): WorkflowFieldOwnershipEntry[] {
  const entries: WorkflowFieldOwnershipEntry[] = [];

  for (const field of PROVIDER_CLINICAL_DISCOVERY_FIELDS) {
    entries.push({
      fieldKey: field.questionKey,
      currentLabel: field.shortLabel,
      currentSection: "clinical_discovery",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.clinical_discovery,
      recommendedFutureOwner: "provider",
      whereStoredToday: "provider_clinical_discovery_answers",
      remainsRequired: false,
      requiredRule: "none",
      notes: `Full question: "${field.question}". Legacy contact column: ${field.legacyContactColumn}. Meaningful response: ≥3 chars, not placeholder (providerClinicalDiscovery).`,
    });
    entries.push({
      fieldKey: `${field.questionKey}_confidence`,
      currentLabel: `${field.shortLabel} — signal strength`,
      currentSection: "clinical_discovery",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.clinical_discovery,
      recommendedFutureOwner: "provider",
      whereStoredToday: "provider_clinical_discovery_answers",
      remainsRequired: false,
      requiredRule: "none",
      notes: "Enum: low | medium | high.",
    });
    entries.push({
      fieldKey: `${field.questionKey}_tags`,
      currentLabel: `${field.shortLabel} — tags`,
      currentSection: "clinical_discovery",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.clinical_discovery,
      recommendedFutureOwner: "provider",
      whereStoredToday: "provider_clinical_discovery_answers",
      remainsRequired: false,
      requiredRule: "none",
    });
    entries.push({
      fieldKey: `${field.questionKey}_sourceNotes`,
      currentLabel: `${field.shortLabel} — source notes`,
      currentSection: "clinical_discovery",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.clinical_discovery,
      recommendedFutureOwner: "provider",
      whereStoredToday: "provider_clinical_discovery_answers",
      remainsRequired: false,
      requiredRule: "none",
    });
    entries.push({
      fieldKey: `${field.questionKey}_sourceCaseId`,
      currentLabel: `${field.shortLabel} — source case`,
      currentSection: "clinical_discovery",
      currentSectionLabel: PROVIDER_PLANNING_SECTION_LABELS_MAP.clinical_discovery,
      recommendedFutureOwner: "case",
      whereStoredToday: "provider_clinical_discovery_answers",
      remainsRequired: false,
      requiredRule: "none",
      notes: "Provenance link when insight originated from a case; answer body remains on provider.",
    });
  }

  return entries;
}

function observationCaseWorkflowEntries(): WorkflowFieldOwnershipEntry[] {
  return observationCaseWorkflowOwnershipEntries();
}

function engagementPreCallPlanEntries(): WorkflowFieldOwnershipEntry[] {
  return PRE_CALL_PLAN_CASE_KEYS.map((key) => ({
    fieldKey: key,
    currentLabel: PRE_CALL_PLAN_ENGAGEMENT_LABELS[key],
    currentSection: "engagement_pre_call_plan" as WorkflowFieldSection,
    currentSectionLabel: "Pre-Call Plan (engagement)",
    recommendedFutureOwner: "engagement" as const,
    whereStoredToday: "surgical_sales_engagements" as const,
    remainsRequired: false,
    requiredRule: "none" as const,
    notes:
      "Interaction-specific planning on surgical_sales_engagements. Legacy case columns may mirror during transition. Not provider intelligence.",
  }));
}

function caseMetadataEntries(): WorkflowFieldOwnershipEntry[] {
  return [
    {
      fieldKey: "case_type",
      currentLabel: "Case type",
      currentSection: "case_create",
      currentSectionLabel: "New case",
      recommendedFutureOwner: "case",
      whereStoredToday: "surgical_sales_cases",
      remainsRequired: true,
      requiredRule: "observation_case_create",
      notes: "observation | product_support",
    },
    {
      fieldKey: "surgeon_contact_id",
      currentLabel: "Provider / surgeon",
      currentSection: "case_create",
      currentSectionLabel: "New case",
      recommendedFutureOwner: "provider",
      whereStoredToday: "surgical_sales_cases",
      remainsRequired: true,
      requiredRule: "observation_case_create",
      notes: "Required for observation cases (portal). Reference to provider contact.",
    },
    {
      fieldKey: "account_id",
      currentLabel: "Organization / account",
      currentSection: "case_metadata",
      currentSectionLabel: "Case metadata",
      recommendedFutureOwner: "organization",
      whereStoredToday: "surgical_sales_cases",
      remainsRequired: false,
      requiredRule: "none",
    },
    {
      fieldKey: "case_date",
      currentLabel: "Case date",
      currentSection: "case_metadata",
      currentSectionLabel: "Case metadata",
      recommendedFutureOwner: "case",
      whereStoredToday: "surgical_sales_cases",
      remainsRequired: false,
      requiredRule: "none",
    },
    {
      fieldKey: "procedure_type",
      currentLabel: "Procedure type",
      currentSection: "case_metadata",
      currentSectionLabel: "Case metadata",
      recommendedFutureOwner: "case",
      whereStoredToday: "surgical_sales_cases",
      remainsRequired: false,
      requiredRule: "none",
    },
    {
      fieldKey: "notes",
      currentLabel: "Case notes",
      currentSection: "observation_live",
      currentSectionLabel: OBSERVATION_CASE_STAGE_LABELS.live,
      recommendedFutureOwner: "case",
      whereStoredToday: "surgical_sales_cases",
      remainsRequired: false,
      requiredRule: "none",
      notes: "General case notes column; distinct from quick bullet notes table.",
    },
    {
      fieldKey: "surgical_case_quick_notes",
      currentLabel: "Quick observation notes",
      currentSection: "observation_live",
      currentSectionLabel: OBSERVATION_CASE_STAGE_LABELS.live,
      recommendedFutureOwner: "case",
      whereStoredToday: "surgical_case_notes",
      remainsRequired: false,
      requiredRule: "none",
      notes: "surgical_case_notes API; counts +1 toward live stage progress when present.",
    },
  ];
}

/** Promote-from-case UI targets (maps case live/debrief text into provider columns). */
function casePromoteUiEntries(): WorkflowFieldOwnershipEntry[] {
  return [
    {
      fieldKey: "promote:technique_preferences",
      currentLabel: "Technique preferences observed",
      currentSection: "case_promote_ui",
      currentSectionLabel: "Update provider intelligence (modal)",
      recommendedFutureOwner: "provider",
      whereStoredToday: "ui_only",
      remainsRequired: false,
      requiredRule: "none",
      notes: "Writes provider_technique_preferences from live_observation_* lines.",
    },
    {
      fieldKey: "promote:product_preferences",
      currentLabel: "Product preferences observed",
      currentSection: "case_promote_ui",
      currentSectionLabel: "Update provider intelligence (modal)",
      recommendedFutureOwner: "provider",
      whereStoredToday: "ui_only",
      remainsRequired: false,
      requiredRule: "none",
      notes: "Writes provider_current_vendors.",
    },
    {
      fieldKey: "promote:competitive_products",
      currentLabel: "Competitive products observed",
      currentSection: "case_promote_ui",
      currentSectionLabel: "Update provider intelligence (modal)",
      recommendedFutureOwner: "provider",
      whereStoredToday: "ui_only",
      remainsRequired: false,
      requiredRule: "none",
      notes: "Writes provider_competitive_products.",
    },
    {
      fieldKey: "promote:or_team_dynamics",
      currentLabel: "OR workflow / team dynamics",
      currentSection: "case_promote_ui",
      currentSectionLabel: "Update provider intelligence (modal)",
      recommendedFutureOwner: "provider",
      whereStoredToday: "ui_only",
      remainsRequired: false,
      requiredRule: "none",
      notes: "Writes provider_or_team_dynamics.",
    },
    {
      fieldKey: "promote:training_needs",
      currentLabel: "Training needs",
      currentSection: "case_promote_ui",
      currentSectionLabel: "Update provider intelligence (modal)",
      recommendedFutureOwner: "provider",
      whereStoredToday: "ui_only",
      remainsRequired: false,
      requiredRule: "none",
      notes: "Writes provider_first_observation_questions (training / enablement prompts).",
    },
    {
      fieldKey: "promote:evaluation_interest",
      currentLabel: "Evaluation interest",
      currentSection: "case_promote_ui",
      currentSectionLabel: "Update provider intelligence (modal)",
      recommendedFutureOwner: "provider",
      whereStoredToday: "ui_only",
      remainsRequired: false,
      requiredRule: "none",
      notes: "Writes provider_evaluation_openness.",
    },
    {
      fieldKey: "promote:relationship_notes",
      currentLabel: "Relationship notes",
      currentSection: "case_promote_ui",
      currentSectionLabel: "Update provider intelligence (modal)",
      recommendedFutureOwner: "provider",
      whereStoredToday: "ui_only",
      remainsRequired: false,
      requiredRule: "none",
      notes: "Writes provider_rep_strategy_notes.",
    },
    {
      fieldKey: "promote:preference_card_signals",
      currentLabel: "Preference card signals",
      currentSection: "case_promote_ui",
      currentSectionLabel: "Update provider intelligence (modal)",
      recommendedFutureOwner: "provider",
      whereStoredToday: "ui_only",
      remainsRequired: false,
      requiredRule: "none",
      notes: "Writes provider_product_interests.",
    },
  ];
}

/**
 * Full inventory of workflow-related fields. Order: provider sections, case workflow, legacy, metadata.
 */
export const WORKFLOW_FIELD_OWNERSHIP_MAP: readonly WorkflowFieldOwnershipEntry[] = [
  ...providerBasicsEntries(),
  ...providerProceduralEntries(),
  ...providerPlanningEntries(),
  ...clinicalDiscoveryEntries(),
  ...providerRelationshipEntries(),
  ...observationCaseWorkflowEntries(),
  ...engagementPreCallPlanEntries(),
  ...caseMetadataEntries(),
  ...casePromoteUiEntries(),
] as const;

const MAP_BY_KEY = new Map(WORKFLOW_FIELD_OWNERSHIP_MAP.map((e) => [e.fieldKey, e]));

export function getWorkflowFieldOwnership(fieldKey: string): WorkflowFieldOwnershipEntry | undefined {
  return MAP_BY_KEY.get(fieldKey);
}

export function workflowFieldsByFutureOwner(
  owner: WorkflowFieldFutureOwner,
): WorkflowFieldOwnershipEntry[] {
  return WORKFLOW_FIELD_OWNERSHIP_MAP.filter((e) => e.recommendedFutureOwner === owner);
}

export function workflowFieldsBySection(section: WorkflowFieldSection): WorkflowFieldOwnershipEntry[] {
  return WORKFLOW_FIELD_OWNERSHIP_MAP.filter((e) => e.currentSection === section);
}

/** Provider create wizard keys required for onboarding (not Pre-Call Plan case fields). */
export const PRE_CALL_PLAN_PROVIDER_WIZARD_REQUIRED_FIELD_KEYS = [...PROVIDER_CREATE_PLANNING_REQUIRED_KEYS] as const;

/** @deprecated Use PRE_CALL_PLAN_PROVIDER_WIZARD_REQUIRED_FIELD_KEYS */
export const PRE_OBSERVATION_PLANNING_REQUIRED_FIELD_KEYS = PRE_CALL_PLAN_PROVIDER_WIZARD_REQUIRED_FIELD_KEYS;

/** Pre-Call Plan case DB columns (legacy `pre_observation_*` names) — do not delete without backfill. */
export const PRE_CALL_PLAN_CASE_DB_FIELD_KEYS = [...PRE_CALL_PLAN_CASE_DB_COLUMN_KEYS] as const;

/** @deprecated Use PRE_CALL_PLAN_CASE_DB_FIELD_KEYS */
export const LEGACY_CASE_PRE_OBSERVATION_FIELD_KEYS = PRE_CALL_PLAN_CASE_DB_FIELD_KEYS;

/** Active observation workflow keys on surgical_sales_cases (excludes legacy pre_observation_*). */
export const ACTIVE_OBSERVATION_CASE_WORKFLOW_KEYS = [...ACTIVE_OBSERVATION_CASE_WORKFLOW_FIELD_KEYS];

export const WORKFLOW_FIELD_OWNERSHIP_SUMMARY = {
  totalFields: WORKFLOW_FIELD_OWNERSHIP_MAP.length,
  byOwner: {
    provider: workflowFieldsByFutureOwner("provider").length,
    case: workflowFieldsByFutureOwner("case").length,
    opportunity: workflowFieldsByFutureOwner("opportunity").length,
    organization: workflowFieldsByFutureOwner("organization").length,
    engagement: workflowFieldsByFutureOwner("engagement").length,
  },
  preCallPlanProviderWizardFields: PROVIDER_WIZARD_PLANNING_FIELDS.length,
  /** @deprecated Use preCallPlanProviderWizardFields */
  preObservationPlanningProviderFields: PROVIDER_WIZARD_PLANNING_FIELDS.length,
  clinicalDiscoveryQuestions: PROVIDER_CLINICAL_DISCOVERY_FIELDS.length,
  preCallPlanCaseDbColumns: PRE_CALL_PLAN_CASE_DB_COLUMN_KEYS.length,
  /** @deprecated Use preCallPlanCaseDbColumns */
  legacyCasePreObservationColumns: PRE_CALL_PLAN_CASE_DB_COLUMN_KEYS.length,
  observationCaseStages: Object.keys(OBSERVATION_CASE_STAGE_LABELS).length,
} as const;
