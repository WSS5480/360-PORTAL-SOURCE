/**
 * Intelligence Gap Engine — domain and topic registry derived from field definitions.
 * No product, specialty, or provider-specific hardcoding.
 */

import {
  ORGANIZATION_INTELLIGENCE_FIELD_DEFS,
  type OrganizationIntelligenceCategory,
  type OrganizationIntelligenceFieldDef,
} from "@/lib/surgical-sales/organizationIntelligenceFields";
import {
  PROVIDER_INTELLIGENCE_FIELD_DEFS,
  type ProviderIntelligenceCategory,
  type ProviderIntelligenceFieldDef,
} from "@/lib/surgical-sales/providerIntelligenceFields";
import { intelligenceSectionIdForDbKey } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

export type IntelligenceGapDomainId = "access" | "workflow" | "clinical";

export const INTELLIGENCE_GAP_DOMAIN_LABELS: Record<IntelligenceGapDomainId, string> = {
  access: "Access",
  workflow: "Workflow",
  clinical: "Clinical",
};

export type IntelligenceGapTopicRef = {
  domain: IntelligenceGapDomainId;
  topicId: string;
  topicLabel: string;
};

const PROVIDER_FIELD_BY_KEY = new Map(PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f]));
const ORG_FIELD_BY_KEY = new Map(ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f]));

const PROVIDER_CATEGORY_TOPIC: Record<
  ProviderIntelligenceCategory,
  IntelligenceGapTopicRef
> = {
  observation_feasibility: {
    domain: "access",
    topicId: "observation_approval",
    topicLabel: "Observation approval",
  },
  ideal_cases: {
    domain: "access",
    topicId: "observation_cases",
    topicLabel: "Observation cases",
  },
  observation_cadence: {
    domain: "access",
    topicId: "observation_cadence",
    topicLabel: "Observation cadence",
  },
  validation_questions: {
    domain: "access",
    topicId: "observation_validation",
    topicLabel: "Observation validation",
  },
  procedures: {
    domain: "workflow",
    topicId: "procedure_types",
    topicLabel: "Procedure types",
  },
  modality: {
    domain: "workflow",
    topicId: "procedure_modality",
    topicLabel: "Procedure modality",
  },
  technique_detail: {
    domain: "workflow",
    topicId: "technique_preferences",
    topicLabel: "Technique preferences",
  },
  workflow_pain: {
    domain: "workflow",
    topicId: "workflow_notes",
    topicLabel: "Workflow notes",
  },
  case_mix: {
    domain: "workflow",
    topicId: "volume_indicators",
    topicLabel: "Volume indicators",
  },
  communication_style: {
    domain: "clinical",
    topicId: "engagement_style",
    topicLabel: "Engagement style",
  },
  responsiveness: {
    domain: "clinical",
    topicId: "responsiveness",
    topicLabel: "Responsiveness",
  },
  decision_influence: {
    domain: "clinical",
    topicId: "decision_influence",
    topicLabel: "Decision influence",
  },
  follow_up_rhythm: {
    domain: "clinical",
    topicId: "follow_up_rhythm",
    topicLabel: "Follow-up rhythm",
  },
  evaluation_openness: {
    domain: "clinical",
    topicId: "adoption_opportunities",
    topicLabel: "Adoption opportunities",
  },
  competitor_usage: {
    domain: "clinical",
    topicId: "product_fit_signals",
    topicLabel: "Product fit signals",
  },
  product_interest: {
    domain: "clinical",
    topicId: "product_fit_signals",
    topicLabel: "Product fit signals",
  },
  dissatisfaction: {
    domain: "clinical",
    topicId: "clinical_frustrations",
    topicLabel: "Clinical frustrations",
  },
};

const ORG_CATEGORY_TOPIC: Record<
  OrganizationIntelligenceCategory,
  IntelligenceGapTopicRef
> = {
  vendor_credentialing: {
    domain: "access",
    topicId: "credentialing",
    topicLabel: "Credentialing",
  },
  or_access_rules: {
    domain: "access",
    topicId: "facility_access",
    topicLabel: "Facility access",
  },
  observation_approval: {
    domain: "access",
    topicId: "observation_approval",
    topicLabel: "Observation approval",
  },
  scheduling_pathway: {
    domain: "access",
    topicId: "scheduling_pathway",
    topicLabel: "Scheduling pathway",
  },
  purchasing_committee: {
    domain: "access",
    topicId: "vendor_approval",
    topicLabel: "Vendor approval",
  },
  facility_workflow_culture: {
    domain: "workflow",
    topicId: "staff_roles",
    topicLabel: "Staff roles",
  },
  or_vendor_landscape: {
    domain: "clinical",
    topicId: "product_fit_signals",
    topicLabel: "Product fit signals",
  },
  support_norms: {
    domain: "workflow",
    topicId: "staff_roles",
    topicLabel: "Staff roles",
  },
  spd_tray_behavior: {
    domain: "workflow",
    topicId: "workflow_notes",
    topicLabel: "Workflow notes",
  },
  facility_logistics: {
    domain: "workflow",
    topicId: "workflow_notes",
    topicLabel: "Workflow notes",
  },
  room_turnover: {
    domain: "workflow",
    topicId: "workflow_notes",
    topicLabel: "Workflow notes",
  },
};

function refineSchedulingTopic(def: OrganizationIntelligenceFieldDef): IntelligenceGapTopicRef {
  const label = def.label.toLowerCase();
  if (/coordinator/.test(label)) {
    return { domain: "access", topicId: "or_coordinator", topicLabel: "OR coordinator" };
  }
  if (/scheduling contact|scheduler|office scheduling|facility scheduling/.test(label)) {
    return { domain: "access", topicId: "scheduler", topicLabel: "Scheduler" };
  }
  if (/scheduling control|scheduling pathway/.test(label)) {
    return { domain: "access", topicId: "scheduling_pathway", topicLabel: "Scheduling pathway" };
  }
  if (/best observation days|case types/.test(label)) {
    return { domain: "access", topicId: "observation_scheduling", topicLabel: "Observation scheduling" };
  }
  return ORG_CATEGORY_TOPIC.scheduling_pathway;
}

function refineCredentialingTopic(def: OrganizationIntelligenceFieldDef): IntelligenceGapTopicRef {
  const label = def.label.toLowerCase();
  if (/platform|service/.test(label)) {
    return { domain: "access", topicId: "credentialing_platform", topicLabel: "Credentialing platform" };
  }
  if (/contact|approval contact/.test(label)) {
    return { domain: "access", topicId: "credentialing_contacts", topicLabel: "Credentialing contacts" };
  }
  if (/required documents|renewal|instructions/.test(label)) {
    return { domain: "access", topicId: "credentialing_process", topicLabel: "Credentialing process" };
  }
  return ORG_CATEGORY_TOPIC.vendor_credentialing;
}

function refineDissatisfactionTopic(def: ProviderIntelligenceFieldDef): IntelligenceGapTopicRef {
  const label = def.label.toLowerCase();
  if (/product gap|dissatisfaction/.test(label)) {
    return { domain: "clinical", topicId: "product_fit_signals", topicLabel: "Product fit signals" };
  }
  if (/staff frustration/.test(label)) {
    return { domain: "workflow", topicId: "staff_roles", topicLabel: "Staff roles" };
  }
  if (/future opportunity|adoption/.test(label)) {
    return { domain: "clinical", topicId: "adoption_opportunities", topicLabel: "Adoption opportunities" };
  }
  return PROVIDER_CATEGORY_TOPIC.dissatisfaction;
}

export function resolveIntelligenceGapTopic(dbKey: string): IntelligenceGapTopicRef | null {
  const orgDef = ORG_FIELD_BY_KEY.get(dbKey);
  if (orgDef) {
    if (orgDef.category === "scheduling_pathway") return refineSchedulingTopic(orgDef);
    if (orgDef.category === "vendor_credentialing") return refineCredentialingTopic(orgDef);
    return ORG_CATEGORY_TOPIC[orgDef.category];
  }

  const providerDef = PROVIDER_FIELD_BY_KEY.get(dbKey);
  if (providerDef) {
    if (providerDef.category === "dissatisfaction") return refineDissatisfactionTopic(providerDef);
    if (providerDef.dbKey === "provider_future_opportunity_signals") {
      return PROVIDER_CATEGORY_TOPIC.evaluation_openness;
    }
    if (providerDef.dbKey === "provider_product_gaps") {
      return { domain: "clinical", topicId: "product_fit_signals", topicLabel: "Product fit signals" };
    }
    if (providerDef.dbKey === "provider_staff_frustrations") {
      return { domain: "workflow", topicId: "staff_roles", topicLabel: "Staff roles" };
    }
    return PROVIDER_CATEGORY_TOPIC[providerDef.category];
  }

  const sectionId = intelligenceSectionIdForDbKey(dbKey);
  if (!sectionId) return null;

  switch (sectionId) {
    case "observation_readiness":
      return PROVIDER_CATEGORY_TOPIC.observation_feasibility;
    case "clinical_workflow":
      return PROVIDER_CATEGORY_TOPIC.procedures;
    case "commercial_signals":
      return PROVIDER_CATEGORY_TOPIC.dissatisfaction;
    case "or_environment":
      return ORG_CATEGORY_TOPIC.facility_workflow_culture;
    default:
      return null;
  }
}

export function intelligenceGapEngineFieldKeys(): string[] {
  const keys = new Set<string>();
  for (const def of PROVIDER_INTELLIGENCE_FIELD_DEFS) keys.add(def.dbKey);
  for (const def of ORGANIZATION_INTELLIGENCE_FIELD_DEFS) keys.add(def.dbKey);
  return [...keys];
}
