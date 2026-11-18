/**
 * Field execution briefing — mobile-first procedural deployment packet.
 * Prioritizes risk, next mission, confirmations, contacts, and immediate actions.
 */

import {
  buildProviderNextDiscoveryPriorities,
  type NextDiscoveryPriority,
} from "@/lib/surgical-sales/buildProviderNextDiscoveryPriorities";
import {
  buildProviderPrimaryOperationalRisk,
  type ProviderPrimaryOperationalRisk,
} from "@/lib/surgical-sales/buildProviderPrimaryOperationalRisk";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { intelligenceSectionIdForDbKey } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { operationalIntelligenceChipLabel } from "@/lib/surgical-sales/providerIntelligenceBriefing";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  buildIntelligenceFreshnessReconfirmationQueue,
  type IntelligenceFreshnessReconfirmationItem,
} from "@/lib/surgical-sales/providerIntelligenceFreshness";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  formatIntelligenceCaptureSummaryChip,
  parseIntelligenceCaptureValue,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  PROVIDER_COMMERCIAL_WORKFLOW_STAGE_LABELS,
  resolveProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";

export const FIELD_EXECUTION_BRIEFING_TITLE = "Field deployment";
export const FIELD_EXECUTION_BRIEFING_KICKER = "Procedural briefing — execute in order";

export type FieldExecutionContactKind = "coordinator" | "support" | "provider";

export type FieldExecutionContact = {
  id: string;
  kind: FieldExecutionContactKind;
  role: string;
  name: string;
  detail: string | null;
  dbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
};

export type FieldExecutionConfirmation = {
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
  fieldLabel: string;
  warning: string;
  prompt: string;
  cta: string;
  tier: IntelligenceFreshnessReconfirmationItem["freshnessTier"];
  confidencePercent: number;
};

export type FieldExecutionActionKind =
  | "deploy_mission"
  | "reconfirm"
  | "capture"
  | "engagement"
  | "prepare"
  | "contacts"
  | "intelligence";

export type FieldExecutionAction = {
  id: string;
  label: string;
  kind: FieldExecutionActionKind;
  primary?: boolean;
  sectionId?: ProviderIntelligenceSectionId;
  dbKey?: string;
  href?: string;
};

export type ProviderFieldExecutionBriefing = {
  title: string;
  kicker: string;
  postureLabel: string;
  workflowLabel: string;
  operationalRisk: ProviderPrimaryOperationalRisk | null;
  nextMission: NextDiscoveryPriority | null;
  confirmations: FieldExecutionConfirmation[];
  contacts: FieldExecutionContact[];
  actions: FieldExecutionAction[];
};

function coordinatorContact(
  contact: Record<string, unknown>,
): FieldExecutionContact | null {
  const dbKey = "provider_observation_coordinator_contact";
  const raw = contact[dbKey] as string | null | undefined;
  if (!fieldHasIntelligenceSignal(dbKey, raw)) return null;
  const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
  const parsed = parseIntelligenceCaptureValue(dbKey, raw);
  const notes = String(parsed.notes ?? "").trim();
  const value = chip || String(raw ?? "").trim();
  return {
    id: `intel-${dbKey}`,
    kind: "coordinator",
    role: operationalIntelligenceChipLabel(dbKey),
    name: value.split(/[—–\-|,]/)[0]?.trim() || value,
    detail: notes || (value.includes("—") ? value : null),
    dbKey,
    sectionId: intelligenceSectionIdForDbKey(dbKey) ?? "observation_readiness",
  };
}

function supportContacts(related: Record<string, unknown>[] | undefined): FieldExecutionContact[] {
  if (!related?.length) return [];
  return related.slice(0, 4).map((row, i) => {
    const name =
      contactDisplayName(row) ||
      String(row.name ?? row.full_name ?? row.contact_name ?? "").trim() ||
      "Contact";
    const role = String(row.role ?? row.title ?? row.relationship ?? "Support").trim();
    const phone = String(row.phone ?? row.mobile ?? "").trim();
    const email = String(row.email ?? "").trim();
    const detail = [phone, email].filter(Boolean).join(" · ") || null;
    return {
      id: `support-${String(row.id ?? i)}`,
      kind: "support" as const,
      role,
      name,
      detail,
    };
  });
}

function providerDirectContact(contact: Record<string, unknown>): FieldExecutionContact | null {
  const email = String(contact.email ?? contact.provider_email ?? "").trim();
  const phone = String(contact.phone ?? contact.mobile ?? "").trim();
  if (!email && !phone) return null;
  const name =
    String(contact.display_name ?? contact.name ?? "").trim() || "Provider";
  return {
    id: "provider-direct",
    kind: "provider",
    role: "Provider",
    name,
    detail: [phone, email].filter(Boolean).join(" · ") || null,
  };
}

function confirmationsFromQueue(
  queue: IntelligenceFreshnessReconfirmationItem[],
  maxItems = 4,
): FieldExecutionConfirmation[] {
  return queue.slice(0, maxItems).map((item) => {
    const sectionId = intelligenceSectionIdForDbKey(item.dbKey);
    return {
      dbKey: item.dbKey,
      sectionId: sectionId ?? "observation_readiness",
      fieldLabel: operationalIntelligenceChipLabel(item.dbKey),
      warning: item.staleWarning ?? item.freshnessBadge,
      prompt: item.reconfirmationPrompt ?? item.staleWarning ?? "Reconfirm on next touch",
      cta: item.revalidateCta,
      tier: item.freshnessTier,
      confidencePercent: item.confidencePercent,
    };
  });
}

function buildActions(input: {
  risk: ProviderPrimaryOperationalRisk | null;
  mission: NextDiscoveryPriority | null;
  confirmations: FieldExecutionConfirmation[];
  newEngagementHref: string;
  prepareEngagementHref: string | null;
  intelligenceHref: string;
}): FieldExecutionAction[] {
  const actions: FieldExecutionAction[] = [];

  if (input.mission) {
    actions.push({
      id: "deploy-mission",
      label: "Deploy mission",
      kind: "deploy_mission",
      primary: true,
      sectionId: input.mission.sectionId,
      dbKey: input.mission.dbKey,
    });
  } else if (input.risk?.cta) {
    actions.push({
      id: "resolve-risk",
      label: input.risk.cta.label,
      kind: "capture",
      primary: true,
      sectionId: input.risk.cta.sectionId,
      dbKey: input.risk.cta.dbKey,
    });
  }

  const topConfirm = input.confirmations[0];
  if (topConfirm) {
    actions.push({
      id: `reconfirm-${topConfirm.dbKey}`,
      label: topConfirm.cta,
      kind: "reconfirm",
      sectionId: topConfirm.sectionId,
      dbKey: topConfirm.dbKey,
    });
  }

  actions.push({
    id: "new-engagement",
    label: "Log engagement",
    kind: "engagement",
    href: input.newEngagementHref,
  });

  if (input.prepareEngagementHref) {
    actions.push({
      id: "prepare-engagement",
      label: "Prepare for meeting",
      kind: "prepare",
      href: input.prepareEngagementHref,
      primary: !input.mission && !input.risk?.cta,
    });
  }

  actions.push({
    id: "manage-contacts",
    label: "Key contacts",
    kind: "contacts",
  });

  actions.push({
    id: "full-intelligence",
    label: "Full intelligence workspace",
    kind: "intelligence",
    href: input.intelligenceHref,
  });

  return actions;
}

export function buildProviderFieldExecutionBriefing(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  relatedContacts?: Record<string, unknown>[];
  newEngagementHref: string;
  prepareEngagementHref?: string | null;
  intelligenceHref: string;
}): ProviderFieldExecutionBriefing {
  const fieldMetadata = parseProviderIntelligenceFieldMetadata(input.contact);
  const commercialStage = resolveProviderCommercialWorkflowStage({
    relationshipStage: input.relationshipStage ?? String(input.contact.provider_relationship_stage ?? ""),
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const operationalRisk = buildProviderPrimaryOperationalRisk({
    contact: input.contact,
    planning: input.planning,
    relationshipStage: input.relationshipStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const priorities = buildProviderNextDiscoveryPriorities({
    contact: input.contact,
    planning: input.planning,
    relationshipStage: input.relationshipStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });
  const nextMission = priorities[0] ?? null;

  const confirmations = confirmationsFromQueue(
    buildIntelligenceFreshnessReconfirmationQueue(input.contact, fieldMetadata, 5),
  );

  const contacts: FieldExecutionContact[] = [];
  const coordinator = coordinatorContact(input.contact);
  if (coordinator) contacts.push(coordinator);
  const providerLine = providerDirectContact(input.contact);
  if (providerLine) contacts.push(providerLine);
  for (const c of supportContacts(input.relatedContacts)) {
    if (contacts.length >= 5) break;
    contacts.push(c);
  }

  const postureLabel =
    operationalRisk?.tone === "success" || operationalRisk?.tone === "neutral"
      ? "Clear to execute"
      : operationalRisk?.tone === "danger" || operationalRisk?.tone === "warn"
        ? "Resolve risk first"
        : "Proceed with caution";

  return {
    title: FIELD_EXECUTION_BRIEFING_TITLE,
    kicker: FIELD_EXECUTION_BRIEFING_KICKER,
    postureLabel,
    workflowLabel: PROVIDER_COMMERCIAL_WORKFLOW_STAGE_LABELS[commercialStage],
    operationalRisk,
    nextMission,
    confirmations,
    contacts,
    actions: buildActions({
      risk: operationalRisk,
      mission: nextMission,
      confirmations,
      newEngagementHref: input.newEngagementHref,
      prepareEngagementHref: input.prepareEngagementHref ?? null,
      intelligenceHref: input.intelligenceHref,
    }),
  };
}
