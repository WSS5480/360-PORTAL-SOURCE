import {
  relationshipEmptyHint,
  relationshipEmptyTitle,
} from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import { formatProviderRelationshipStage } from "@/lib/surgical-sales/providerRelationshipStage";

export type RelationshipSnapshotField = {
  id: string;
  label: string;
  hasValue: boolean;
  value: string | null;
  emptyTitle: string;
  emptyHint: string;
};

export type ProviderRelationshipSnapshotView = {
  stage: RelationshipSnapshotField;
  influence: RelationshipSnapshotField;
  decisionMaker: RelationshipSnapshotField;
  communication: RelationshipSnapshotField;
  followUp: RelationshipSnapshotField;
  strategyNotes: RelationshipSnapshotField;
  fields: RelationshipSnapshotField[];
  capturedCount: number;
  totalCount: number;
  updateSectionId: string;
};

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function isMissingValue(raw: string | null): boolean {
  if (!raw) return true;
  const lower = raw.toLowerCase();
  return lower === "unknown" || lower === "—" || lower === "-";
}

function formatInfluenceLevel(raw: string | null): string | null {
  if (!raw || isMissingValue(raw)) return null;
  const map: Record<string, string> = {
    decision_maker: "Decision maker",
    influencer: "Influencer",
    gatekeeper: "Gatekeeper",
    low: "Low influence",
    medium: "Medium influence",
    high: "High influence",
  };
  return map[raw.toLowerCase()] ?? raw.replace(/_/g, " ");
}

function formatContactMethod(raw: string | null): string | null {
  if (!raw || isMissingValue(raw)) return null;
  const map: Record<string, string> = {
    email: "Email",
    phone: "Phone",
    call: "Phone",
    text: "Text",
    in_person: "In person",
  };
  return map[raw.toLowerCase()] ?? raw.replace(/_/g, " ");
}

function formatDecisionMakerStatus(raw: string | null): string | null {
  if (!raw || isMissingValue(raw)) return null;
  const lower = raw.toLowerCase();
  if (lower === "yes" || lower === "true") return "Confirmed decision maker";
  if (lower === "no" || lower === "false") return "Not the primary decision maker";
  if (lower === "partial" || lower === "shared") return "Shared decision maker";
  return raw;
}

function buildField(
  id: string,
  label: string,
  displayValue: string | null,
  emptyHint?: string,
): RelationshipSnapshotField {
  const hasValue = Boolean(displayValue && !isMissingValue(displayValue));
  return {
    id,
    label,
    hasValue,
    value: hasValue ? displayValue : null,
    emptyTitle: relationshipEmptyTitle(label),
    emptyHint: emptyHint ?? relationshipEmptyHint(id),
  };
}

function buildCommunicationField(contact: Record<string, unknown>): RelationshipSnapshotField {
  const style = trimOrNull(contact.provider_communication_style);
  const method = formatContactMethod(trimOrNull(contact.preferred_contact_method));

  let combined: string | null = null;
  if (style && !isMissingValue(style)) {
    combined = method ? `${style} · Prefers ${method.toLowerCase()}` : style;
  } else if (method) {
    combined = `Prefers ${method.toLowerCase()} contact`;
  }

  return buildField("communication", "Communication style", combined);
}

export function buildProviderRelationshipSnapshotView(input: {
  contact: Record<string, unknown>;
}): ProviderRelationshipSnapshotView {
  const stageRaw = trimOrNull(input.contact.provider_relationship_stage) ?? "prospect";
  const stageDisplay = formatProviderRelationshipStage(stageRaw);

  const stage = buildField("stage", "Relationship stage", stageDisplay);

  const influence = buildField(
    "influence",
    "Influence level",
    formatInfluenceLevel(trimOrNull(input.contact.influence_level)),
  );

  const decisionMaker = buildField(
    "decision_maker",
    "Decision-maker status",
    formatDecisionMakerStatus(trimOrNull(input.contact.provider_decision_maker_status)),
  );

  const communication = buildCommunicationField(input.contact);

  const followUp = buildField(
    "follow_up",
    "Follow-up approach",
    trimOrNull(input.contact.provider_follow_up_approach),
  );

  const strategyNotes = buildField(
    "strategy_notes",
    "Rep strategy notes",
    trimOrNull(input.contact.provider_rep_strategy_notes),
  );

  const fields = [stage, influence, decisionMaker, communication, followUp, strategyNotes];

  const capturedCount = fields.filter((f) => f.hasValue).length;
  const totalCount = fields.length;

  let updateSectionId = "relationship_strategy";
  if (!communication.hasValue) updateSectionId = "communication_style";
  else if (!influence.hasValue || !decisionMaker.hasValue) updateSectionId = "influence_level";
  else if (!followUp.hasValue || !strategyNotes.hasValue) updateSectionId = "relationship_strategy";

  return {
    stage,
    influence,
    decisionMaker,
    communication,
    followUp,
    strategyNotes,
    fields,
    capturedCount,
    totalCount,
    updateSectionId,
  };
}
