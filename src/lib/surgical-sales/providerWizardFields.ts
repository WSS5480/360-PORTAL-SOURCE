/** Provider wizard / intelligence field definitions (persistent profile only — no pre-call plan). */

import {
  PROVIDER_INTELLIGENCE_REQUIRED_DB_KEYS,
  PROVIDER_INTELLIGENCE_SECTION_ORDER,
  wizardFieldsForIntelligenceSection,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import type { IntelligenceCaptureSpec } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";

export type WizardFieldConfig = {
  key: string;
  label: string;
  helper?: string;
  rows?: number;
  input?: "text" | "textarea" | "select" | "compact_text" | "structured";
  options?: { value: string; label: string }[];
  required?: boolean;
  capture?: IntelligenceCaptureSpec;
  notesPlaceholder?: string;
  compactPlaceholder?: string;
};

/** Required persistent intelligence for provider onboarding. */
export const PROVIDER_CREATE_PLANNING_REQUIRED_KEYS = [...PROVIDER_INTELLIGENCE_REQUIRED_DB_KEYS] as const;

export type ProviderCreatePlanningKey = (typeof PROVIDER_CREATE_PLANNING_REQUIRED_KEYS)[number];

export const PROVIDER_WIZARD_CLINICAL_FIELDS = [
  ...wizardFieldsForIntelligenceSection("clinical_workflow"),
  ...wizardFieldsForIntelligenceSection("observation_readiness"),
];

export const PROVIDER_WIZARD_OR_ENVIRONMENT_FIELDS = wizardFieldsForIntelligenceSection("or_environment");

export const PROVIDER_WIZARD_PRODUCT_PREFERENCE_FIELDS = wizardFieldsForIntelligenceSection("commercial_signals");

export const PROVIDER_WIZARD_COMPETITOR_FIELDS = PROVIDER_WIZARD_PRODUCT_PREFERENCE_FIELDS.filter(
  (f) => f.key === "provider_competitive_products",
);

export const PROVIDER_WIZARD_COMMUNICATION_FIELDS = wizardFieldsForIntelligenceSection("relationship_intelligence").filter(
  (f) => f.key === "provider_communication_style" || f.key === "provider_responsiveness",
);

export const PROVIDER_WIZARD_INFLUENCE_FIELDS = wizardFieldsForIntelligenceSection("relationship_intelligence").filter(
  (f) =>
    f.key === "influence_level" ||
    f.key === "provider_decision_maker_status" ||
    f.key === "provider_champion_potential",
);

export const PROVIDER_WIZARD_RELATIONSHIP_STRATEGY_FIELDS = wizardFieldsForIntelligenceSection(
  "relationship_intelligence",
).filter((f) => f.key === "provider_follow_up_approach");

/** @deprecated */
export const PROVIDER_WIZARD_OBSERVATION_PREP_FIELDS = wizardFieldsForIntelligenceSection("observation_readiness");

/** @deprecated */
export const PROVIDER_WIZARD_PROCEDURAL_FIELDS = [
  ...wizardFieldsForIntelligenceSection("clinical_workflow"),
  ...wizardFieldsForIntelligenceSection("or_environment"),
];

/** @deprecated */
export const PROVIDER_WIZARD_PLANNING_FIELDS: WizardFieldConfig[] = [];

/** @deprecated */
export const PROVIDER_WIZARD_RELATIONSHIP_FIELDS = wizardFieldsForIntelligenceSection("relationship_intelligence");

/** All persistent intelligence keys from the canonical registry. */
export const PROVIDER_WIZARD_ALL_INTELLIGENCE_KEYS = PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey);

export const PROVIDER_WIZARD_SECTION_FIELD_GROUPS: Record<ProviderIntelligenceSectionId, WizardFieldConfig[]> =
  Object.fromEntries(
    PROVIDER_INTELLIGENCE_SECTION_ORDER.map((id) => [id, wizardFieldsForIntelligenceSection(id)]),
  ) as Record<ProviderIntelligenceSectionId, WizardFieldConfig[]>;
