import type { ProviderPlanningStatus } from "@/lib/surgical-sales/providerPlanning";
import type { ProviderOnboardingRelationshipAnswer } from "@/lib/surgical-sales/providerRelationshipStage";
import type { ClinicalDiscoveryUpsertInput } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import { splitProviderPlanningPatchByLayer } from "@/lib/surgical-sales/intelligenceLayerArchitecture";
import { ORGANIZATION_INTELLIGENCE_DB_KEYS } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { PROVIDER_INTELLIGENCE_PERSISTENT_DB_KEYS } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  applyIntelligenceFieldMetadataToPatch,
  isProviderIntelligenceDbKey,
  type IntelligenceCaptureContext,
  parseProviderIntelligenceFieldMetadata,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  buildProviderPlanningCompletion,
  buildProviderPlanningSections,
  PROVIDER_PLANNING_REQUIRED_FOR_COMPLETE,
} from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  PROVIDER_CREATE_PLANNING_REQUIRED_KEYS,
  PROVIDER_WIZARD_CLINICAL_FIELDS,
  PROVIDER_WIZARD_COMMUNICATION_FIELDS,
  PROVIDER_WIZARD_COMPETITOR_FIELDS,
  PROVIDER_WIZARD_INFLUENCE_FIELDS,
  PROVIDER_WIZARD_PRODUCT_PREFERENCE_FIELDS,
  PROVIDER_WIZARD_RELATIONSHIP_STRATEGY_FIELDS,
  type ProviderCreatePlanningKey,
  type WizardFieldConfig,
} from "@/lib/surgical-sales/providerWizardFields";

export type { ProviderCreatePlanningKey, WizardFieldConfig };
export {
  PROVIDER_CREATE_PLANNING_REQUIRED_KEYS,
  PROVIDER_WIZARD_CLINICAL_FIELDS,
  PROVIDER_WIZARD_COMMUNICATION_FIELDS,
  PROVIDER_WIZARD_COMPETITOR_FIELDS,
  PROVIDER_WIZARD_INFLUENCE_FIELDS,
  PROVIDER_WIZARD_PRODUCT_PREFERENCE_FIELDS,
  PROVIDER_WIZARD_RELATIONSHIP_STRATEGY_FIELDS,
};

export type ProviderWizardStepId =
  | "basics"
  | "clinical_intelligence"
  | "products"
  | "relationship";

/** @deprecated */
export type ProviderWizardStepIdLegacy = "procedural" | "clinical_discovery" | "relationship";

export { PROVIDER_PLANNING_REQUIRED_FOR_COMPLETE };

export type ProviderOnboardingStatus = "draft" | "active";

export const PROVIDER_WIZARD_STEPS: { id: ProviderWizardStepId; label: string; short: string }[] = [
  { id: "basics", label: "Profile", short: "Profile" },
  { id: "clinical_intelligence", label: "Clinical Focus", short: "Clinical Focus" },
  { id: "products", label: "Product Alignment", short: "Product Alignment" },
  { id: "relationship", label: "Operational Intelligence", short: "Operational Intelligence" },
];

export type ProviderCreateWizardPayload = {
  save_mode: "draft" | "complete";
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  role_type?: string;
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  specialty?: string | null;
  primary_organization_id?: string | null;
  additional_organization_ids?: string[];
  provider_crm_status?: string;
  onboarding_relationship?: ProviderOnboardingRelationshipAnswer;
  provider_relationship_stage?: string;
  influence_level?: string;
  relationship_strength?: string;
  preferred_contact_method?: string;
  best_time_to_contact?: string | null;
  fields?: Record<string, string | null>;
};

export type WizardProgress = {
  stepProgress: Record<ProviderWizardStepId, { filled: number; total: number; percent: number }>;
  overallPercent: number;
  planning: {
    filled: number;
    total: number;
    percent: number;
    status: ProviderPlanningStatus;
    complete: boolean;
  };
};

function fieldFilled(row: Record<string, unknown>, key: string): boolean {
  return Boolean(String(row[key] ?? "").trim());
}

export function countCreatePlanningFields(row: Record<string, unknown>): {
  filled: number;
  total: number;
  percent: number;
  complete: boolean;
} {
  const total = PROVIDER_CREATE_PLANNING_REQUIRED_KEYS.length;
  let filled = 0;
  for (const key of PROVIDER_CREATE_PLANNING_REQUIRED_KEYS) {
    if (fieldFilled(row, key)) filled += 1;
  }
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
  return { filled, total, percent, complete: filled >= total && total > 0 };
}

export function deriveCreatePlanningStatus(row: Record<string, unknown>): ProviderPlanningStatus {
  return buildProviderPlanningCompletion(row).status;
}

export function computeWizardProgress(
  row: Record<string, unknown>,
  basics: { hasName: boolean; hasPrimaryOrg: boolean },
): WizardProgress {
  const sections = buildProviderPlanningSections(row);
  const section = (id: string) => sections.find((s) => s.id === id);

  const stepProgress: WizardProgress["stepProgress"] = {
    basics: {
      filled: (basics.hasName ? 1 : 0) + (basics.hasPrimaryOrg ? 1 : 0),
      total: 2,
      percent: basics.hasName && basics.hasPrimaryOrg ? 100 : basics.hasName || basics.hasPrimaryOrg ? 50 : 0,
    },
    clinical_intelligence: {
      filled:
        (section("clinical_workflow")?.filled ?? 0) + (section("or_environment")?.filled ?? 0),
      total:
        (section("clinical_workflow")?.total ?? 0) + (section("or_environment")?.total ?? 0),
      percent: 0,
    },
    products: {
      filled: section("commercial_signals")?.filled ?? 0,
      total: section("commercial_signals")?.total ?? 0,
      percent: 0,
    },
    relationship: {
      filled: section("relationship_intelligence")?.filled ?? 0,
      total: section("relationship_intelligence")?.total ?? 0,
      percent: 0,
    },
  };

  stepProgress.clinical_intelligence.percent =
    stepProgress.clinical_intelligence.total > 0
      ? Math.round(
          (stepProgress.clinical_intelligence.filled / stepProgress.clinical_intelligence.total) * 100,
        )
      : 0;
  stepProgress.products.percent =
    stepProgress.products.total > 0
      ? Math.round((stepProgress.products.filled / stepProgress.products.total) * 100)
      : 0;
  stepProgress.relationship.percent =
    stepProgress.relationship.total > 0
      ? Math.round((stepProgress.relationship.filled / stepProgress.relationship.total) * 100)
      : 0;

  const completion = buildProviderPlanningCompletion(row);

  return {
    stepProgress,
    overallPercent: completion.percent,
    planning: {
      filled: completion.filled,
      total: completion.total,
      percent: completion.percent,
      status: completion.status,
      complete: completion.status === "complete",
    },
  };
}

export function validateBasics(payload: ProviderCreateWizardPayload): string | null {
  const first = String(payload.first_name ?? "").trim();
  const last = String(payload.last_name ?? "").trim();
  if (!first && !last) return "Provider name is required.";
  if (!String(payload.primary_organization_id ?? "").trim()) return "Primary organization is required.";
  return null;
}

export function validateCompleteSubmit(_row: Record<string, unknown>, basics: ProviderCreateWizardPayload): string | null {
  return validateBasics(basics);
}

const WIZARD_TEXT_KEYS = [
  ...PROVIDER_INTELLIGENCE_PERSISTENT_DB_KEYS,
  ...ORGANIZATION_INTELLIGENCE_DB_KEYS,
] as const;

const WIZARD_SELECT_KEYS = [] as const;

function normalizeIntelligenceFieldCompare(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export type MergeProviderWizardFieldsOptions = {
  captureContext?: IntelligenceCaptureContext;
  actor?: { userId: string; userName: string };
  existingMetadata?: ProviderIntelligenceFieldMetadataMap;
  /** Contact row before patch — used to stamp metadata only on values that changed. */
  existingContact?: Record<string, unknown>;
  fieldEvidence?: Record<string, string>;
  fieldSignals?: Record<string, import("@/lib/surgical-sales/propagatedIntelligenceSignal").PropagatedIntelligenceSignal>;
  fieldAccessBlockers?: Record<string, string | null | undefined>;
};

export function mergeProviderWizardFieldsPatch(
  patch: Record<string, unknown>,
  fields: Record<string, string | null | undefined> | undefined,
  metadataOpts?: MergeProviderWizardFieldsOptions,
): ClinicalDiscoveryUpsertInput[] {
  const { persistent: layerFields } = splitProviderPlanningPatchByLayer(fields);
  if (!layerFields || Object.keys(layerFields).length === 0) return [];
  const trimOrNull = (s: string | null | undefined, max: number): string | null => {
    if (s === null || s === undefined) return null;
    const t = String(s).trim();
    if (!t) return null;
    return t.length > max ? t.slice(0, max) : t;
  };

  const contactFields: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(layerFields)) {
    if (v === undefined) continue;
    contactFields[k] = v === null ? "" : String(v);
  }

  for (const key of WIZARD_TEXT_KEYS) {
    if (contactFields[key] === undefined) continue;
    patch[key] = trimOrNull(contactFields[key], 16000);
  }

  for (const key of WIZARD_SELECT_KEYS) {
    if (contactFields[key] === undefined) continue;
    patch[key] = trimOrNull(contactFields[key], 64);
  }

  let planningTouched = false;
  for (const key of PROVIDER_CREATE_PLANNING_REQUIRED_KEYS) {
    if (contactFields[key] !== undefined) planningTouched = true;
  }
  for (const key of WIZARD_TEXT_KEYS) {
    if (contactFields[key] !== undefined) planningTouched = true;
  }
  if (planningTouched) {
    patch.provider_planning_updated_at = new Date().toISOString();
  }

  if (metadataOpts?.actor && metadataOpts.captureContext) {
    const valueChangedKeys = Object.keys(contactFields).filter((k) => {
      if (!isProviderIntelligenceDbKey(k)) return false;
      if (!metadataOpts.existingContact) return true;
      const incoming = normalizeIntelligenceFieldCompare(
        contactFields[k] === "" ? null : contactFields[k],
      );
      const prior = normalizeIntelligenceFieldCompare(metadataOpts.existingContact[k]);
      return incoming !== prior;
    });
    const evidenceKeys = Object.keys(metadataOpts.fieldEvidence ?? {}).filter((k) => {
      if (!isProviderIntelligenceDbKey(k)) return false;
      if (!metadataOpts.fieldEvidence?.[k]?.trim()) return false;
      const fromPatch = contactFields[k];
      const fromExisting = metadataOpts.existingContact?.[k];
      const value =
        fromPatch !== undefined && fromPatch !== ""
          ? fromPatch
          : fromExisting;
      return Boolean(String(value ?? "").trim());
    });
    const signalKeys = Object.keys(metadataOpts.fieldSignals ?? {}).filter((k) => {
      if (!isProviderIntelligenceDbKey(k)) return false;
      return Boolean(metadataOpts.fieldSignals?.[k]);
    });
    for (const k of Object.keys(contactFields)) {
      if (!isProviderIntelligenceDbKey(k)) continue;
      if (!metadataOpts.fieldEvidence?.[k]?.trim()) continue;
      if (!evidenceKeys.includes(k) && String(contactFields[k] ?? "").trim()) {
        evidenceKeys.push(k);
      }
    }
    const blockerKeys = Object.keys(metadataOpts.fieldAccessBlockers ?? {}).filter((k) => {
      if (!isProviderIntelligenceDbKey(k)) return false;
      return Boolean(String(metadataOpts.fieldAccessBlockers?.[k] ?? "").trim());
    });
    const metadataKeys = [...new Set([...valueChangedKeys, ...evidenceKeys, ...signalKeys, ...blockerKeys])];
    if (metadataKeys.length > 0) {
      const fieldValues: Record<string, string | null> = { ...contactFields };
      if (metadataOpts.existingContact) {
        for (const k of metadataKeys) {
          if (fieldValues[k] !== undefined && fieldValues[k] !== "") continue;
          const prior = String(metadataOpts.existingContact[k] ?? "").trim();
          if (prior) fieldValues[k] = prior;
        }
      }
      applyIntelligenceFieldMetadataToPatch(patch, {
        existingMetadata: metadataOpts.existingMetadata ?? {},
        changedKeys: metadataKeys,
        fieldValues,
        captureContext: metadataOpts.captureContext,
        actor: metadataOpts.actor,
        fieldEvidence: metadataOpts.fieldEvidence,
        fieldSignals: metadataOpts.fieldSignals,
        fieldAccessBlockers: metadataOpts.fieldAccessBlockers,
      });
    }
  }

  return [];
}

export function intelligenceMetadataFromContact(
  contact: Record<string, unknown>,
): ProviderIntelligenceFieldMetadataMap {
  return parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata);
}
