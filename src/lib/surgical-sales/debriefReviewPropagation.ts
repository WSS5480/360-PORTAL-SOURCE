/**
 * Rep-friendly propagation destinations — commercial impact labels (no backend taxonomy).
 * Save routing is unchanged; only how reps see where intelligence lands.
 */

import type { DebriefIntelligenceCategory } from "@/lib/surgical-sales/debriefIntelligenceCategories";
import type { DebriefIntelligenceCapturedItem } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { TacticalDebriefInsight } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";
import type { IntelligenceCaptureScope } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

export type DebriefReviewUpdateDestination =
  | "engagement_notes"
  | "provider_profile"
  | "observation_access_notes"
  | "clinical_focus"
  | "workflow_participants"
  | "follow_up_actions";

/** Where accepted intelligence shows up for the rep — not save routing keys. */
export type CommercialImpactGroupId =
  | "provider_profile"
  | "provider_intelligence"
  | "organization_intelligence"
  | "future_planning";

export type CommercialImpactItemId =
  | "observation_access"
  | "procedure_focus"
  | "competitive_products"
  | "clinical_frustrations"
  | "technique_preferences"
  | "scheduling_workflow"
  | "credentialing_requirements"
  | "recommended_next_engagement";

export const COMMERCIAL_IMPACT_GROUP_LABELS: Record<CommercialImpactGroupId, string> = {
  provider_profile: "Provider Profile",
  provider_intelligence: "Provider Intelligence",
  organization_intelligence: "Organization Intelligence",
  future_planning: "Future Planning",
};

export const COMMERCIAL_IMPACT_ITEM_LABELS: Record<CommercialImpactItemId, string> = {
  observation_access: "Observation Access",
  procedure_focus: "Procedure Focus",
  competitive_products: "Competitive Products",
  clinical_frustrations: "Clinical Frustrations",
  technique_preferences: "Technique Preferences",
  scheduling_workflow: "Scheduling Workflow",
  credentialing_requirements: "Credentialing Requirements",
  recommended_next_engagement: "Recommended Next Engagement",
};

/** Rep-facing business outcomes — why saved intelligence matters. */
export const BUSINESS_OUTCOME_ORDER = [
  "future_engagement_planning",
  "observation_readiness",
  "clinical_opportunity_mapping",
  "provider_profile_intelligence",
] as const;

export type BusinessOutcomeId = (typeof BUSINESS_OUTCOME_ORDER)[number];

export const BUSINESS_OUTCOME_LABELS: Record<BusinessOutcomeId, string> = {
  future_engagement_planning: "Future engagement planning",
  observation_readiness: "Observation readiness",
  clinical_opportunity_mapping: "Clinical opportunity mapping",
  provider_profile_intelligence: "Provider profile intelligence",
};

export function businessOutcomeIdForItem(itemId: CommercialImpactItemId): BusinessOutcomeId {
  switch (itemId) {
    case "recommended_next_engagement":
      return "future_engagement_planning";
    case "credentialing_requirements":
    case "scheduling_workflow":
      return "observation_readiness";
    case "procedure_focus":
    case "competitive_products":
    case "clinical_frustrations":
    case "technique_preferences":
      return "clinical_opportunity_mapping";
    case "observation_access":
    default:
      return "provider_profile_intelligence";
  }
}

export function businessOutcomeLabelForItem(itemId: CommercialImpactItemId): string {
  return BUSINESS_OUTCOME_LABELS[businessOutcomeIdForItem(itemId)];
}

const COMMERCIAL_GROUP_ORDER: CommercialImpactGroupId[] = [
  "provider_profile",
  "provider_intelligence",
  "organization_intelligence",
  "future_planning",
];

const COMMERCIAL_ITEM_ORDER: CommercialImpactItemId[] = [
  "observation_access",
  "procedure_focus",
  "competitive_products",
  "clinical_frustrations",
  "technique_preferences",
  "scheduling_workflow",
  "credentialing_requirements",
  "recommended_next_engagement",
];

/** @deprecated Internal save-routing labels — not shown in rep-facing propagation UI. */
export const DEBRIEF_REVIEW_UPDATE_DESTINATION_LABELS: Record<
  DebriefReviewUpdateDestination,
  string
> = {
  engagement_notes: "Engagement notes",
  provider_profile: "Provider profile",
  observation_access_notes: "Observation access notes",
  clinical_focus: "Clinical focus",
  workflow_participants: "Workflow participants",
  follow_up_actions: "Follow-up actions",
};

const OR_ACCESS_DB_PREFIXES = [
  "provider_observation_",
  "provider_credentialing",
  "provider_ideal_observation",
];

const INTERNAL_TAXONOMY_IN_LABEL_RE =
  /\b(?:provider operational understanding|or access\s*&\s*deployment|deployment readiness|readiness signals?|deployment signals?|operational intelligence|pathway impact)\b/i;

export function sanitizeRepFriendlyUpdateLabel(label: string): string {
  let text = String(label ?? "").trim();
  if (!text) return "";
  text = text.replace(/^Provider profile\s*[—→-]\s*/i, "");
  text = text.replace(/\s*[—→]\s*/g, " — ");
  if (INTERNAL_TAXONOMY_IN_LABEL_RE.test(text)) return "";
  return text.replace(/\s{2,}/g, " ").trim();
}

export function destinationForDbKey(dbKey: string): DebriefReviewUpdateDestination {
  const key = dbKey.toLowerCase();
  if (/scheduling|coordinator_contact|scheduling_contact|champion|support_contact/i.test(key)) {
    return "workflow_participants";
  }
  if (isOrganizationIntelligenceDbKey(key)) {
    return "observation_access_notes";
  }
  if (/procedure|clinical|case_mix|volume|provider_procedure/i.test(key)) {
    return "clinical_focus";
  }
  if (
    OR_ACCESS_DB_PREFIXES.some((p) => key.startsWith(p) || key.includes(p)) ||
    /credential|platform|feasibility|access_path/i.test(key)
  ) {
    return "observation_access_notes";
  }
  if (/team_dynamic|_contact$/i.test(key)) {
    return "workflow_participants";
  }
  if (/next_step|follow_up|follow-up/i.test(key)) {
    return "follow_up_actions";
  }
  if (/product|preference|acsis|competitive/i.test(key)) {
    return "provider_profile";
  }
  if (/relationship|receptiv|trust|workflow|pain|turnover|setup/i.test(key)) {
    return "provider_profile";
  }
  return "provider_profile";
}

export function destinationForIntelligenceCategory(
  category: DebriefIntelligenceCategory,
): DebriefReviewUpdateDestination {
  switch (category) {
    case "clinical_focus":
      return "clinical_focus";
    case "access_intelligence":
      return "observation_access_notes";
    case "people_contacts":
      return "workflow_participants";
    case "next_steps":
      return "follow_up_actions";
    case "product_fit_signals":
    case "competitive_intelligence":
    case "workflow_intelligence":
    case "relationship_intelligence":
    default:
      return "provider_profile";
  }
}

export function destinationForIntelligenceCapturedItem(
  item: Pick<DebriefIntelligenceCapturedItem, "intelligenceCategory" | "kind">,
): DebriefReviewUpdateDestination {
  if (item.kind === "clinical_focus") return "clinical_focus";
  if (item.kind === "workflow_ownership") return "workflow_participants";
  if (item.kind === "observation_access_status" || item.kind === "credentialing_requirement") {
    return "observation_access_notes";
  }
  if (item.kind === "product_relevance" || item.kind === "current_product_use") return "provider_profile";
  return destinationForIntelligenceCategory(item.intelligenceCategory);
}

type CommercialImpactRef = {
  groupId: CommercialImpactGroupId;
  itemId: CommercialImpactItemId;
  destinationId: DebriefReviewUpdateDestination;
};

function commercialImpactRef(
  groupId: CommercialImpactGroupId,
  itemId: CommercialImpactItemId,
  destinationId: DebriefReviewUpdateDestination,
): CommercialImpactRef {
  return { groupId, itemId, destinationId };
}

export function commercialImpactForDbKey(dbKey: string): CommercialImpactRef {
  const key = dbKey.toLowerCase();
  const destinationId = destinationForDbKey(dbKey);

  if (/clinical_frustration|frustration/.test(key)) {
    return commercialImpactRef("provider_intelligence", "clinical_frustrations", destinationId);
  }
  if (/technique_preference|clinical_preference|technique_preferences/.test(key)) {
    return commercialImpactRef("provider_intelligence", "technique_preferences", destinationId);
  }
  if (/procedure_focus|procedure_interest|case_mix|ideal_observation|best_days|volume|clinical_focus/.test(key)) {
    return commercialImpactRef("provider_intelligence", "procedure_focus", destinationId);
  }
  if (/credential|platform|vendor_pathway/.test(key)) {
    return commercialImpactRef(
      "organization_intelligence",
      "credentialing_requirements",
      destinationId,
    );
  }
  if (
    /scheduling|coordinator|scheduling_contact|scheduling_control|observation_coordinator|champion|support_contact|team_dynamic|_contact$/.test(
      key,
    )
  ) {
    return commercialImpactRef("organization_intelligence", "scheduling_workflow", destinationId);
  }
  if (/next_step|follow_up|follow-up|recommended/.test(key)) {
    return commercialImpactRef(
      "future_planning",
      "recommended_next_engagement",
      destinationId,
    );
  }
  if (
    /observation|feasibility|access_path|evaluation_openness|approval/.test(key) ||
    isOrganizationIntelligenceDbKey(dbKey)
  ) {
    if (/credential|platform/.test(key)) {
      return commercialImpactRef(
        "organization_intelligence",
        "credentialing_requirements",
        destinationId,
      );
    }
    return commercialImpactRef("provider_profile", "observation_access", destinationId);
  }
  if (destinationId === "clinical_focus") {
    return commercialImpactRef("provider_intelligence", "procedure_focus", destinationId);
  }
  if (destinationId === "workflow_participants") {
    return commercialImpactRef("organization_intelligence", "scheduling_workflow", destinationId);
  }
  if (destinationId === "follow_up_actions") {
    return commercialImpactRef(
      "future_planning",
      "recommended_next_engagement",
      destinationId,
    );
  }
  if (destinationId === "observation_access_notes") {
    if (/credential|platform/.test(key)) {
      return commercialImpactRef(
        "organization_intelligence",
        "credentialing_requirements",
        destinationId,
      );
    }
    return commercialImpactRef("provider_profile", "observation_access", destinationId);
  }
  return commercialImpactRef("provider_profile", "observation_access", destinationId);
}

export function commercialImpactForCategory(
  category: DebriefIntelligenceCategory,
): CommercialImpactRef {
  switch (category) {
    case "clinical_focus":
      return commercialImpactRef(
        "provider_intelligence",
        "procedure_focus",
        destinationForIntelligenceCategory(category),
      );
    case "access_intelligence":
      return commercialImpactRef(
        "provider_profile",
        "observation_access",
        destinationForIntelligenceCategory(category),
      );
    case "people_contacts":
      return commercialImpactRef(
        "organization_intelligence",
        "scheduling_workflow",
        destinationForIntelligenceCategory(category),
      );
    case "next_steps":
      return commercialImpactRef(
        "future_planning",
        "recommended_next_engagement",
        destinationForIntelligenceCategory(category),
      );
    case "workflow_intelligence":
      return commercialImpactRef(
        "organization_intelligence",
        "scheduling_workflow",
        destinationForIntelligenceCategory(category),
      );
    case "product_fit_signals":
    case "competitive_intelligence":
      return commercialImpactRef(
        "provider_intelligence",
        "procedure_focus",
        destinationForIntelligenceCategory(category),
      );
    default:
      return commercialImpactRef(
        "provider_profile",
        "observation_access",
        destinationForIntelligenceCategory(category),
      );
  }
}

export function commercialImpactForCapturedKind(
  kind: DebriefIntelligenceCapturedItem["kind"],
): CommercialImpactRef {
  switch (kind) {
    case "clinical_focus":
      return commercialImpactRef("provider_intelligence", "procedure_focus", "clinical_focus");
    case "credentialing_requirement":
      return commercialImpactRef(
        "organization_intelligence",
        "credentialing_requirements",
        "observation_access_notes",
      );
    case "workflow_ownership":
      return commercialImpactRef(
        "organization_intelligence",
        "scheduling_workflow",
        "workflow_participants",
      );
    case "observation_access_status":
      return commercialImpactRef(
        "provider_profile",
        "observation_access",
        "observation_access_notes",
      );
    case "product_relevance":
      return commercialImpactRef("provider_intelligence", "procedure_focus", "provider_profile");
    case "current_product_use":
      return commercialImpactRef("provider_intelligence", "competitive_products", "provider_profile");
    default:
      return commercialImpactRef(
        "provider_profile",
        "observation_access",
        "provider_profile",
      );
  }
}

export function formatCommercialImpactDestination(ref: CommercialImpactRef): string {
  return businessOutcomeLabelForItem(ref.itemId);
}

export function repFriendlyUpdateLabelForDbKey(dbKey: string, _fallbackLabel?: string): string {
  return formatCommercialImpactDestination(commercialImpactForDbKey(dbKey));
}

export function repFriendlyUpdateLabelForCategory(
  category: DebriefIntelligenceCategory,
): string {
  return formatCommercialImpactDestination(commercialImpactForCategory(category));
}

function insightsTouchCategory(
  insights: TacticalDebriefInsight[],
  ids: TacticalDebriefInsight["category_id"][],
): boolean {
  return insights.some((i) => ids.includes(i.category_id) && i.items.length > 0);
}

function contactTouchesWorkflow(contact: DebriefProposedContactItem): boolean {
  if (contact.disposition === "skipped") return false;
  return (
    contact.disposition === "add_details" ||
    contact.disposition === "link" ||
    contact.disposition === "accepted" ||
    contact.disposition === "pending"
  );
}

function addCommercialImpactItem(
  active: Map<CommercialImpactItemId, CommercialImpactRef>,
  ref: CommercialImpactRef,
): void {
  active.set(ref.itemId, ref);
}

/** Collect commercial-impact items affected by accepted updates (excludes engagement-note-only saves). */
export function collectActiveCommercialImpactItems(input: {
  scope: IntelligenceCaptureScope;
  logUpdate: LogUpdateParseResult | null;
  insights?: TacticalDebriefInsight[];
  proposedContacts?: DebriefProposedContactItem[];
  engagementNotesSaved?: boolean;
}): CommercialImpactRef[] {
  const active = new Map<CommercialImpactItemId, CommercialImpactRef>();
  const { logUpdate, insights = [], proposedContacts = [] } = input;

  const acceptedFields =
    logUpdate?.fieldUpdates.filter((u) => u.accepted).map((u) => u.dbKey) ?? [];

  for (const dbKey of acceptedFields) {
    addCommercialImpactItem(active, commercialImpactForDbKey(dbKey));
  }

  if (proposedContacts.some(contactTouchesWorkflow)) {
    addCommercialImpactItem(
      active,
      commercialImpactRef(
        "organization_intelligence",
        "scheduling_workflow",
        "workflow_participants",
      ),
    );
  }

  if (insightsTouchCategory(insights, ["or_access"])) {
    addCommercialImpactItem(
      active,
      commercialImpactRef(
        "provider_profile",
        "observation_access",
        "observation_access_notes",
      ),
    );
  }
  if (insightsTouchCategory(insights, ["workflow_intelligence"])) {
    addCommercialImpactItem(
      active,
      commercialImpactRef("provider_intelligence", "procedure_focus", "clinical_focus"),
    );
  }
  if (insightsTouchCategory(insights, ["new_stakeholders"])) {
    addCommercialImpactItem(
      active,
      commercialImpactRef(
        "organization_intelligence",
        "scheduling_workflow",
        "workflow_participants",
      ),
    );
  }
  if (insightsTouchCategory(insights, ["next_step_opportunity"])) {
    addCommercialImpactItem(
      active,
      commercialImpactRef(
        "future_planning",
        "recommended_next_engagement",
        "follow_up_actions",
      ),
    );
  }

  return COMMERCIAL_ITEM_ORDER.filter((itemId) => active.has(itemId)).map(
    (itemId) => active.get(itemId)!,
  );
}

/** @deprecated Save-routing destinations — use collectActiveCommercialImpactItems for rep UI. */
export function collectActiveDebriefUpdateDestinations(input: {
  scope: IntelligenceCaptureScope;
  logUpdate: LogUpdateParseResult | null;
  insights?: TacticalDebriefInsight[];
  proposedContacts?: DebriefProposedContactItem[];
  engagementNotesSaved?: boolean;
}): DebriefReviewUpdateDestination[] {
  const destinations = new Set<DebriefReviewUpdateDestination>();
  for (const ref of collectActiveCommercialImpactItems(input)) {
    destinations.add(ref.destinationId);
  }
  const { logUpdate, engagementNotesSaved } = input;
  if (engagementNotesSaved || logUpdate?.saveAsNoteAccepted) {
    destinations.add("engagement_notes");
  }
  if (
    input.scope.engagementId &&
    (logUpdate?.fieldUpdates.some((u) => u.accepted) ?? false) &&
    !destinations.has("engagement_notes")
  ) {
    destinations.add("engagement_notes");
  }
  const ORDER: DebriefReviewUpdateDestination[] = [
    "engagement_notes",
    "provider_profile",
    "observation_access_notes",
    "clinical_focus",
    "workflow_participants",
    "follow_up_actions",
  ];
  return ORDER.filter((dest) => destinations.has(dest));
}

export type DebriefReviewPropagationTarget = {
  id: CommercialImpactItemId;
  /** Save-routing destination — unchanged backend behavior. */
  destinationId: DebriefReviewUpdateDestination;
  groupId: CommercialImpactGroupId;
  groupLabel: string;
  label: string;
  active: boolean;
  detail: string | null;
};

export type CommercialImpactPropagationGroup = {
  groupId: CommercialImpactGroupId;
  groupLabel: string;
  items: DebriefReviewPropagationTarget[];
};

export function buildDebriefReviewPropagationTargets(input: {
  scope: IntelligenceCaptureScope;
  logUpdate: LogUpdateParseResult | null;
  insights?: TacticalDebriefInsight[];
  proposedContacts?: DebriefProposedContactItem[];
  engagementNotesSaved?: boolean;
}): DebriefReviewPropagationTarget[] {
  return collectActiveCommercialImpactItems(input).map((ref) => ({
    id: ref.itemId,
    destinationId: ref.destinationId,
    groupId: ref.groupId,
    groupLabel: COMMERCIAL_IMPACT_GROUP_LABELS[ref.groupId],
    label: businessOutcomeLabelForItem(ref.itemId),
    active: true,
    detail: null,
  }));
}

/** Deduped business outcomes for rep-facing propagation UI. */
export function collectUniqueBusinessOutcomesFromTargets(
  targets: DebriefReviewPropagationTarget[],
): string[] {
  const seen = new Set<BusinessOutcomeId>();
  for (const target of targets) {
    if (!target.active) continue;
    seen.add(businessOutcomeIdForItem(target.id));
  }
  return BUSINESS_OUTCOME_ORDER.filter((outcomeId) => seen.has(outcomeId)).map(
    (outcomeId) => BUSINESS_OUTCOME_LABELS[outcomeId],
  );
}

export function groupCommercialImpactTargets(
  targets: DebriefReviewPropagationTarget[],
): CommercialImpactPropagationGroup[] {
  const byGroup = new Map<CommercialImpactGroupId, DebriefReviewPropagationTarget[]>();
  for (const target of targets) {
    if (!target.active) continue;
    const list = byGroup.get(target.groupId) ?? [];
    list.push(target);
    byGroup.set(target.groupId, list);
  }
  return COMMERCIAL_GROUP_ORDER.filter((groupId) => byGroup.has(groupId)).map((groupId) => ({
    groupId,
    groupLabel: COMMERCIAL_IMPACT_GROUP_LABELS[groupId],
    items: byGroup.get(groupId)!,
  }));
}

/** Resolve save-routing id from a propagation target (supports legacy snapshots). */
export function propagationTargetDestinationId(
  target: Pick<DebriefReviewPropagationTarget, "id" | "destinationId">,
): DebriefReviewUpdateDestination {
  if (target.destinationId) return target.destinationId;
  const legacy = target.id as DebriefReviewUpdateDestination;
  if (legacy in DEBRIEF_REVIEW_UPDATE_DESTINATION_LABELS) return legacy;
  return "provider_profile";
}
