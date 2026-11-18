/**
 * Intelligence layer routing — maps to the three-scope model in intelligenceScopeModel.ts.
 *
 * Organization + Provider = persistent (durable across engagements).
 * Case = one scheduled case (logistics, live notes, debrief, visit prep on engagements).
 */

import {
  ENGAGEMENT_STRATEGY_PROVIDER_MIRROR_KEYS,
  isEngagementIntelligenceDbKey,
} from "@/lib/surgical-sales/engagementIntelligenceFields";
import {
  dbKeysForIntelligenceScope,
  intelligenceScopeForDbKey,
  INTELLIGENCE_SCOPE_DESCRIPTIONS,
  INTELLIGENCE_SCOPE_LABELS,
  type IntelligenceScope,
} from "@/lib/surgical-sales/intelligenceScopeModel";
import {
  isOrganizationIntelligenceDbKey,
  ORGANIZATION_INTELLIGENCE_FIELD_DEFS,
} from "@/lib/surgical-sales/organizationIntelligenceFields";
import {
  isCasePreCallPlanOnlyKey,
  isDeprecatedProviderPreCallDbKey,
  PROVIDER_INTELLIGENCE_FIELD_DEFS,
} from "@/lib/surgical-sales/providerIntelligenceFields";
import { PRE_CALL_PLAN_FIELD_CONFIGS } from "@/lib/surgical-sales/preCallPlanFields";

const PROVIDER_INTELLIGENCE_PERSISTENT_DB_KEYS = PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey);
const ORGANIZATION_INTELLIGENCE_PERSISTENT_DB_KEYS = ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey);
const ENGAGEMENT_INTERACTION_PLANNING_FIELD_KEYS = PRE_CALL_PLAN_FIELD_CONFIGS.map((f) => f.key);

/** @deprecated Use IntelligenceScope — kept for incremental migration. */
export type IntelligenceLayer = "persistent_provider" | "engagement_specific";

export function intelligenceLayerForDbKey(key: string): IntelligenceLayer | null {
  const scope = intelligenceScopeForDbKey(key);
  if (scope === "case" || isEngagementIntelligenceDbKey(key)) return "engagement_specific";
  if (scope === "organization" || scope === "provider") return "persistent_provider";
  if (isDeprecatedProviderPreCallDbKey(key) || isCasePreCallPlanOnlyKey(key)) return "engagement_specific";
  return null;
}

export const ORGANIZATION_INTELLIGENCE_LAYER_LABEL = INTELLIGENCE_SCOPE_LABELS.organization;
export const PROVIDER_INTELLIGENCE_LAYER_LABEL = INTELLIGENCE_SCOPE_LABELS.provider;
export const CASE_INTELLIGENCE_LAYER_LABEL = INTELLIGENCE_SCOPE_LABELS.case;
/** @deprecated Use CASE_INTELLIGENCE_LAYER_LABEL */
export const ENGAGEMENT_INTELLIGENCE_LAYER_LABEL = CASE_INTELLIGENCE_LAYER_LABEL;

/** @deprecated Use PROVIDER_INTELLIGENCE_LAYER_LABEL */
export const PERSISTENT_PROVIDER_INTELLIGENCE_LAYER_LABEL = PROVIDER_INTELLIGENCE_LAYER_LABEL;
/** @deprecated Use ENGAGEMENT_INTELLIGENCE_LAYER_LABEL */
export const ENGAGEMENT_PREPARATION_LAYER_LABEL = ENGAGEMENT_INTELLIGENCE_LAYER_LABEL;
/** @deprecated Use ENGAGEMENT_INTELLIGENCE_LAYER_LABEL */
export const ENGAGEMENT_SPECIFIC_INTELLIGENCE_LAYER_LABEL = ENGAGEMENT_INTELLIGENCE_LAYER_LABEL;

export const ORGANIZATION_INTELLIGENCE_SCOPE_DESCRIPTION = INTELLIGENCE_SCOPE_DESCRIPTIONS.organization;
export const PROVIDER_INTELLIGENCE_SCOPE_DESCRIPTION = INTELLIGENCE_SCOPE_DESCRIPTIONS.provider;
export const CASE_INTELLIGENCE_SCOPE_DESCRIPTION = INTELLIGENCE_SCOPE_DESCRIPTIONS.case;
/** @deprecated Use CASE_INTELLIGENCE_SCOPE_DESCRIPTION */
export const ENGAGEMENT_INTELLIGENCE_SCOPE_DESCRIPTION = CASE_INTELLIGENCE_SCOPE_DESCRIPTION;

/** @deprecated Use PROVIDER_INTELLIGENCE_SCOPE_DESCRIPTION */
export const PERSISTENT_PROVIDER_INTELLIGENCE_SCOPE_DESCRIPTION = PROVIDER_INTELLIGENCE_SCOPE_DESCRIPTION;
/** @deprecated Use ENGAGEMENT_INTELLIGENCE_SCOPE_DESCRIPTION */
export const ENGAGEMENT_PREPARATION_SCOPE_DESCRIPTION = ENGAGEMENT_INTELLIGENCE_SCOPE_DESCRIPTION;
/** @deprecated Use ENGAGEMENT_INTELLIGENCE_SCOPE_DESCRIPTION */
export const ENGAGEMENT_SPECIFIC_INTELLIGENCE_SCOPE_DESCRIPTION = ENGAGEMENT_INTELLIGENCE_SCOPE_DESCRIPTION;

export const PROVIDER_INTELLIGENCE_EXCLUDES_ENGAGEMENT_STRATEGY =
  "Provider Intelligence stores surgeon-specific facts only. Facility-wide context belongs in Organization / Facility Intelligence; case logistics and visit prep belong in Case Intelligence.";

export const ORGANIZATION_INTELLIGENCE_TOPICS = [
  { id: "vendor_credentialing", label: "Vendor credentialing", sectionIds: [] as const },
  { id: "or_access_rules", label: "OR access rules", sectionIds: [] as const },
  { id: "observation_approval", label: "Observation approval", sectionIds: [] as const },
  { id: "scheduling_pathway", label: "Scheduling pathway", sectionIds: [] as const },
  { id: "purchasing_committee", label: "Purchasing / committee", sectionIds: [] as const },
  { id: "facility_culture", label: "Workflow culture", sectionIds: [] as const },
  { id: "spd_tray_behavior", label: "SPD / tray behavior", sectionIds: [] as const },
  { id: "facility_logistics", label: "Facility logistics", sectionIds: [] as const },
  { id: "room_turnover", label: "Room turnover", sectionIds: [] as const },
] as const;

/** Provider-scoped topic chips for the intelligence tab. */
export const PROVIDER_INTELLIGENCE_TOPICS = [
  {
    id: "workflow_patterns",
    label: "Clinical profile",
    hint: "Procedures, technique, pain points, and case mix.",
    sectionIds: ["clinical_workflow"] as const,
  },
  {
    id: "relationship",
    label: "Relationship",
    hint: "Communication, responsiveness, influence, and follow-up.",
    sectionIds: ["relationship_intelligence"] as const,
  },
  {
    id: "commercial_signals",
    label: "Commercial signals",
    hint: "Evaluation appetite, competitors, and dissatisfaction.",
    sectionIds: ["commercial_signals"] as const,
  },
  {
    id: "observation_with_surgeon",
    label: "Observation with this surgeon",
    hint: "Whether they allow observation, ideal cases, and cadence.",
    sectionIds: ["observation_readiness"] as const,
  },
] as const;

/** @deprecated Use PROVIDER_INTELLIGENCE_TOPICS */
export const PERSISTENT_PROVIDER_INTELLIGENCE_TOPICS = PROVIDER_INTELLIGENCE_TOPICS;

export const ENGAGEMENT_INTELLIGENCE_STRATEGY_TOPICS = [
  { id: "meeting_objectives", label: "Meeting objectives", fieldKeys: ["observation_goal"] as const },
  {
    id: "discovery_hypotheses",
    label: "Discovery hypotheses",
    fieldKeys: ["pre_observation_value_hypothesis"] as const,
  },
  {
    id: "talking_points",
    label: "Talking points",
    fieldKeys: ["pre_observation_impact_opening_statement", "pre_observation_probes"] as const,
  },
  {
    id: "next_visit_priorities",
    label: "Next-visit priorities",
    fieldKeys: ["pre_observation_planned_close"] as const,
  },
  {
    id: "tactical_asks",
    label: "Tactical asks",
    fieldKeys: ["pre_observation_tools_resources", "pre_observation_additional_notes"] as const,
  },
] as const;

/** @deprecated Use ENGAGEMENT_INTELLIGENCE_STRATEGY_TOPICS */
export const ENGAGEMENT_PREPARATION_STRATEGY_TOPICS = ENGAGEMENT_INTELLIGENCE_STRATEGY_TOPICS;
/** @deprecated Use ENGAGEMENT_INTELLIGENCE_STRATEGY_TOPICS */
export const ENGAGEMENT_SPECIFIC_INTELLIGENCE_TOPICS = ENGAGEMENT_INTELLIGENCE_STRATEGY_TOPICS;

export { ENGAGEMENT_STRATEGY_PROVIDER_MIRROR_KEYS };

const ENGAGEMENT_LAYER_DB_KEYS = new Set<string>([
  ...ENGAGEMENT_INTERACTION_PLANNING_FIELD_KEYS,
  ...ENGAGEMENT_STRATEGY_PROVIDER_MIRROR_KEYS,
  "prepare_tactical_asks",
  "prepare_checklist_json",
  "notes",
]);

export function isEngagementStrategyDbKey(key: string): boolean {
  return (
    ENGAGEMENT_LAYER_DB_KEYS.has(key) ||
    isEngagementIntelligenceDbKey(key) ||
    isDeprecatedProviderPreCallDbKey(key) ||
    isCasePreCallPlanOnlyKey(key)
  );
}

export function isPersistentProviderIntelligenceDbKey(key: string): boolean {
  return (PROVIDER_INTELLIGENCE_PERSISTENT_DB_KEYS as readonly string[]).includes(key);
}

export function isOrganizationIntelligencePersistentDbKey(key: string): boolean {
  return isOrganizationIntelligenceDbKey(key);
}

/** Contact columns allowed in provider `planning` PATCH (org + provider persistent; not engagement). */
export const PROVIDER_PLANNING_PATCH_ALLOWED_KEYS = [
  ...ORGANIZATION_INTELLIGENCE_PERSISTENT_DB_KEYS,
  ...PROVIDER_INTELLIGENCE_PERSISTENT_DB_KEYS,
  "influence_level",
  "preferred_contact_method",
] as const;

const ALLOWED_PROVIDER_PLANNING_PATCH_SET = new Set<string>(PROVIDER_PLANNING_PATCH_ALLOWED_KEYS);

export function isAllowedProviderPlanningPatchKey(key: string): boolean {
  return ALLOWED_PROVIDER_PLANNING_PATCH_SET.has(key);
}

export type RejectedPlanningPatchKey = {
  key: string;
  layer: IntelligenceLayer;
  scope: IntelligenceScope | null;
  reason: string;
};

const ENGAGEMENT_STRATEGY_REJECTION_REASON =
  "Case intelligence belongs on the case or linked engagement (Prepare for Meeting), not the provider profile.";

export function splitProviderPlanningPatchByLayer(
  fields: Record<string, string | null | undefined> | undefined,
): {
  persistent: Record<string, string | null>;
  rejected: RejectedPlanningPatchKey[];
} {
  const persistent: Record<string, string | null> = {};
  const rejected: RejectedPlanningPatchKey[] = [];
  if (!fields) return { persistent, rejected };

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (isEngagementStrategyDbKey(key)) {
      rejected.push({
        key,
        layer: "engagement_specific",
        scope: "case",
        reason: ENGAGEMENT_STRATEGY_REJECTION_REASON,
      });
      continue;
    }
    if (!isAllowedProviderPlanningPatchKey(key)) {
      rejected.push({
        key,
        layer: "persistent_provider",
        scope: intelligenceScopeForDbKey(key),
        reason: "Key is not part of persistent organization or provider intelligence.",
      });
      continue;
    }
    persistent[key] = value === null ? null : String(value);
  }
  return { persistent, rejected };
}

export function splitProviderPlanningPatchByScope(
  fields: Record<string, string | null | undefined> | undefined,
): {
  organization: Record<string, string | null>;
  provider: Record<string, string | null>;
  rejected: RejectedPlanningPatchKey[];
} {
  const { persistent, rejected } = splitProviderPlanningPatchByLayer(fields);
  const organization: Record<string, string | null> = {};
  const provider: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(persistent)) {
    const scope = intelligenceScopeForDbKey(key);
    if (scope === "organization") organization[key] = value;
    else if (scope === "provider") provider[key] = value;
    else provider[key] = value;
  }
  return { organization, provider, rejected };
}

export function engagementStrategyKeysInProviderPlanningPatch(
  fields: Record<string, string | null | undefined> | undefined,
): RejectedPlanningPatchKey[] {
  if (!fields) return [];
  return splitProviderPlanningPatchByLayer(fields).rejected.filter((r) => r.layer === "engagement_specific");
}

/** Strip engagement-scoped columns before provider intelligence builders read `contact`. */
export function filterContactToPersistentIntelligenceLayer(
  contact: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(contact)) {
    if (isEngagementStrategyDbKey(key)) continue;
    out[key] = value;
  }
  return out;
}

/** Provider-only columns for provider intelligence UI (excludes organization-scoped keys). */
export function filterContactToProviderIntelligenceScope(
  contact: Record<string, unknown>,
): Record<string, unknown> {
  const persistent = filterContactToPersistentIntelligenceLayer(contact);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(persistent)) {
    if (isOrganizationIntelligenceDbKey(key)) continue;
    out[key] = value;
  }
  return out;
}

export const ENGAGEMENT_PRE_CALL_PLAN_FIELD_LABELS: Record<string, string> = Object.fromEntries(
  PRE_CALL_PLAN_FIELD_CONFIGS.map((f) => [f.key, f.label]),
);

export { dbKeysForIntelligenceScope, intelligenceScopeForDbKey };
