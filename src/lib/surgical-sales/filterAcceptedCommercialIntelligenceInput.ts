/**
 * Restrict commercial intelligence save input to accepted debrief review items.
 */

import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { ApplyCommercialIntelligenceInput } from "@/lib/surgical-sales/applyCommercialIntelligenceToContactPatch";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { IntelligenceCaptureContext } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  DB_KEY_DEFAULT_CATEGORY,
  type DebriefIntelligenceMergeCategory,
} from "@/lib/surgical-sales/debriefIntelligenceMergeCategories";

const FACT_TYPE_CATEGORIES: Record<DebriefAtomicFact["fact_type"], DebriefIntelligenceMergeCategory[]> = {
  workflow_contact: ["contacts"],
  observation_access: ["observation_access"],
  credentialing: ["observation_access"],
  scheduling: ["contacts"],
  clinical_focus: ["clinical_procedures", "clinical_pain_points", "clinical_trends", "workflow_intelligence"],
  current_product: ["opportunity_signals"],
  product_fit: ["opportunity_signals"],
  relationship: ["follow_ups"],
  facility_intelligence: ["observation_access", "workflow_intelligence"],
  follow_up: ["follow_ups"],
};

const ORGANIZATION_CONTACT_DB_KEYS = new Set([
  "provider_facility_scheduling_contact",
  "provider_or_team_dynamics",
]);

function acceptedCategories(
  fieldPatches: Array<{ dbKey: string; value: string }>,
): Set<DebriefIntelligenceMergeCategory> {
  const categories = new Set<DebriefIntelligenceMergeCategory>();
  for (const patch of fieldPatches) {
    const category = DB_KEY_DEFAULT_CATEGORY[patch.dbKey];
    if (category) categories.add(category);
    if (patch.dbKey.includes("scheduling") || patch.dbKey.includes("coordinator")) {
      categories.add("contacts");
    }
    if (patch.dbKey.includes("observation") || patch.dbKey.includes("credential")) {
      categories.add("observation_access");
    }
    if (patch.dbKey.includes("procedure") || patch.dbKey.includes("clinical")) {
      categories.add("clinical_procedures");
      categories.add("clinical_pain_points");
    }
  }
  return categories;
}

function atomicFactMatchesAcceptedCategories(
  fact: DebriefAtomicFact,
  categories: Set<DebriefIntelligenceMergeCategory>,
): boolean {
  if (categories.size === 0) return false;
  const mapped = FACT_TYPE_CATEGORIES[fact.fact_type] ?? [];
  if (mapped.some((category) => categories.has(category))) return true;
  const attr = fact.attribute.toLowerCase();
  if (attr.includes("frustration") || attr.includes("pain")) {
    return categories.has("clinical_pain_points");
  }
  if (attr.includes("preference") || attr.includes("modality")) {
    return categories.has("workflow_intelligence");
  }
  return false;
}

function filterAcceptedAtomicFacts(
  atomicFacts: DebriefAtomicFact[] | undefined,
  fieldPatches: Array<{ dbKey: string; value: string }>,
): DebriefAtomicFact[] | undefined {
  if (!atomicFacts?.length) return undefined;
  const categories = acceptedCategories(fieldPatches);
  if (categories.size === 0) return [];
  return atomicFacts.filter((fact) => atomicFactMatchesAcceptedCategories(fact, categories));
}

function filterAcceptedProposedContacts(
  proposedContacts: DebriefProposedContactItem[] | undefined,
  fieldPatches: Array<{ dbKey: string; value: string }>,
): DebriefProposedContactItem[] | undefined {
  if (!proposedContacts?.length) return undefined;
  const acceptedDbKeys = new Set(fieldPatches.map((patch) => patch.dbKey));
  const schedulingAccepted = [...acceptedDbKeys].some(
    (dbKey) =>
      dbKey.includes("scheduling") ||
      dbKey.includes("coordinator") ||
      dbKey === "provider_or_team_dynamics",
  );

  return proposedContacts.filter((contact) => {
    if (contact.disposition === "accepted" || contact.disposition === "link") return true;
    if (contact.disposition === "skipped") return false;
    if (schedulingAccepted && /schedul|coordinator/i.test(contact.workflowLabel ?? contact.roleLabel)) {
      return true;
    }
    if (contact.intelligenceDbKey && acceptedDbKeys.has(contact.intelligenceDbKey)) return true;
    return contact.mentionLevel === "confirmed_support_contact";
  });
}

export function buildAcceptedCommercialIntelligenceInput(input: {
  existingContact: Record<string, unknown>;
  fieldPatches: Array<{ dbKey: string; value: string }>;
  logUpdate?: LogUpdateParseResult;
  proposedContacts?: DebriefProposedContactItem[];
  captureContext?: IntelligenceCaptureContext;
}): ApplyCommercialIntelligenceInput {
  const atomicFacts = filterAcceptedAtomicFacts(input.logUpdate?.atomicFacts, input.fieldPatches);

  return {
    existingContact: input.existingContact,
    fieldPatches: input.fieldPatches,
    atomicFacts,
    proposedContacts: filterAcceptedProposedContacts(input.proposedContacts, input.fieldPatches),
    candidateContacts: input.proposedContacts,
    sourceEngagementId: input.captureContext?.source_engagement_id ?? null,
  };
}

export function isOrganizationContactDbKey(dbKey: string): boolean {
  return ORGANIZATION_CONTACT_DB_KEYS.has(dbKey);
}
