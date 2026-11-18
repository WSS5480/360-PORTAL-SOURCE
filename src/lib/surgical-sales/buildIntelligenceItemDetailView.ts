/**
 * Operational intelligence item detail — focused panel read model.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  formatIntelligenceFieldAttributionDisplay,
  parseProviderIntelligenceFieldMetadata,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import {
  PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { buildIntelligenceSectionSignalRows } from "@/lib/surgical-sales/providerIntelligenceSectionSignals";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { intelligenceFieldDisplayName } from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import { sanitizeIntelligenceTabUserCopy } from "@/lib/surgical-sales/buildIntelligenceTabPresentation";
import type { ValidationQueueScope } from "@/lib/surgical-sales/buildOperationalIntelligenceWorkspaceView";

export type IntelligenceItemDetailId =
  | "credentialing_path"
  | "or_access_path"
  | "vendor_clearance"
  | "procedure_mix"
  | "observation_history"
  | ProviderIntelligenceSectionId;

export type IntelligenceItemValidationRow = {
  id: string;
  label: string;
  dbKey?: string;
};

export type IntelligenceItemRecommendedStep = {
  id: string;
  label: string;
  description: string;
  kind: "log" | "ask" | "briefing" | "update";
};

export type IntelligenceItemDetailView = {
  itemId: string;
  title: string;
  scopeLine: string;
  subtitle: string;
  summary: {
    status: string;
    scope: ValidationQueueScope;
    appliesTo: string;
    whyMatters: string;
    primaryNextAction: string;
  };
  whatWeKnow: {
    lines: string[];
    emptyMessage: string;
  };
  stillToValidate: IntelligenceItemValidationRow[];
  fieldQuestions: string[];
  recommendedSteps: IntelligenceItemRecommendedStep[];
  sourceHistory: {
    lastUpdate: string | null;
    sourceEngagement: string | null;
    rawNotes: string | null;
  };
  primaryDbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
  dbKeys: string[];
};

type ItemTemplate = {
  id: string;
  title: string;
  scope: ValidationQueueScope;
  defaultStatus: string;
  subtitle: string;
  whyMatters: string;
  primaryNextAction: string;
  emptyKnownMessage: string;
  stillToValidate: IntelligenceItemValidationRow[];
  fieldQuestions: string[];
  recommendedSteps: IntelligenceItemRecommendedStep[];
  dbKeys: string[];
  sectionId?: ProviderIntelligenceSectionId;
  appliesToSuffix?: string;
};

const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  vendor_clearance: {
    id: "vendor_clearance",
    title: "Vendor clearance",
    scope: "Facility",
    defaultStatus: "Needs validation",
    subtitle: "Clarify vendor clearance before observation planning or case support.",
    whyMatters:
      "Vendor clearance determines whether observation or field support can happen without access delays.",
    primaryNextAction:
      "Confirm clearance path with office, scheduler, or facility access contact.",
    emptyKnownMessage: "No confirmed clearance process captured yet.",
    stillToValidate: [
      { id: "v1", label: "Credentialing platform or process", dbKey: "provider_credentialing_status" },
      { id: "v2", label: "Who confirms vendor clearance", dbKey: "provider_observation_coordinator_contact" },
      { id: "v3", label: "Expected turnaround time" },
      { id: "v4", label: "Whether clearance is needed before observation", dbKey: "provider_observation_credentialing_needed" },
      { id: "v5", label: "Any provider-specific exception" },
    ],
    fieldQuestions: [
      "What has to be completed before a vendor can observe a case?",
      "Who confirms vendor clearance before the visit?",
      "How far in advance should clearance be submitted?",
    ],
    recommendedSteps: [
      { id: "log", label: "Log field update", description: "Capture clearance steps or contacts from your last touch.", kind: "log" },
      { id: "ask", label: "Ask office/scheduler", description: "Confirm who owns clearance and typical turnaround.", kind: "ask" },
      { id: "briefing", label: "Open tactical briefing", description: "Prep questions for the next facility touch.", kind: "briefing" },
    ],
    dbKeys: ["provider_credentialing_status", "provider_observation_credentialing_needed"],
    sectionId: "or_environment",
    appliesToSuffix: "shared across providers",
  },
  credentialing_path: {
    id: "credentialing_path",
    title: "Credentialing path",
    scope: "Facility",
    defaultStatus: "Needs validation",
    subtitle: "Confirm how vendor clearance works before observation planning.",
    whyMatters:
      "Credentialing path sets whether field time is productive or stalls at the door.",
    primaryNextAction:
      "Map credentialing steps with the facility access or vendor relations contact.",
    emptyKnownMessage: "No confirmed credentialing path captured yet.",
    stillToValidate: [
      { id: "c1", label: "Credentialing owner or department", dbKey: "provider_credentialing_status" },
      { id: "c2", label: "Required forms or platform", dbKey: "provider_observation_credentialing_needed" },
      { id: "c3", label: "Typical approval timeline" },
      { id: "c4", label: "Observation-specific requirements" },
    ],
    fieldQuestions: [
      "Walk me through credentialing from first request to OR access.",
      "Is there a separate path for observation versus case support?",
      "What usually slows clearance down at this facility?",
    ],
    recommendedSteps: [
      { id: "log", label: "Log field update", description: "Document credentialing steps you learn on site.", kind: "log" },
      { id: "ask", label: "Ask office/scheduler", description: "Identify who signs off on vendor access.", kind: "ask" },
      { id: "briefing", label: "Open tactical briefing", description: "Line up credentialing questions for next touch.", kind: "briefing" },
    ],
    dbKeys: ["provider_credentialing_status", "provider_observation_credentialing_needed"],
    sectionId: "or_environment",
    appliesToSuffix: "shared across providers",
  },
  or_access_path: {
    id: "or_access_path",
    title: "OR access path",
    scope: "Facility",
    defaultStatus: "Needs validation",
    subtitle: "Identify who approves observation or vendor access.",
    whyMatters:
      "OR access path determines whether observation slots and field support are realistic.",
    primaryNextAction:
      "Confirm scheduling owner and approval steps before holding OR time.",
    emptyKnownMessage: "No confirmed OR access process captured yet.",
    stillToValidate: [
      { id: "o1", label: "Who approves observation visits", dbKey: "provider_observation_access_path" },
      { id: "o2", label: "Feasibility for vendor presence in room", dbKey: "provider_observation_feasibility" },
      { id: "o3", label: "Coordinator or scheduler contact", dbKey: "provider_observation_coordinator_contact" },
      { id: "o4", label: "Best days or case types for access", dbKey: "provider_observation_best_days_case_types" },
    ],
    fieldQuestions: [
      "Who needs to approve before a vendor can be in the OR?",
      "What case types are realistic for a first observation?",
      "How far out should access be requested?",
    ],
    recommendedSteps: [
      { id: "log", label: "Log field update", description: "Capture access rules from scheduler or coordinator.", kind: "log" },
      { id: "ask", label: "Ask office/scheduler", description: "Confirm posting and approval workflow.", kind: "ask" },
      { id: "briefing", label: "Open tactical briefing", description: "Prepare access questions for next touch.", kind: "briefing" },
    ],
    dbKeys: ["provider_observation_access_path", "provider_observation_feasibility"],
    sectionId: "or_environment",
    appliesToSuffix: "shared across providers",
  },
  procedure_mix: {
    id: "procedure_mix",
    title: "Procedure mix",
    scope: "Provider",
    defaultStatus: "Still learning",
    subtitle: "Confirm open, laparoscopic, robotic, or hybrid mix for this surgeon.",
    whyMatters:
      "Procedure mix drives technique fit, inventory, and which cases are worth supporting.",
    primaryNextAction:
      "Confirm case mix and technique preferences on the next surgeon touch.",
    emptyKnownMessage: "No confirmed procedure mix captured yet.",
    stillToValidate: [
      { id: "p1", label: "Open versus minimally invasive split", dbKey: "provider_procedure_focus" },
      { id: "p2", label: "Robotic or advanced platform use", dbKey: "provider_technique_preferences" },
      { id: "p3", label: "Typical case volume band", dbKey: "provider_case_volume_estimate" },
      { id: "p4", label: "Setup or dock expectations", dbKey: "provider_technique_detail" },
    ],
    fieldQuestions: [
      "What case types make up most of your week?",
      "Where are you using robotic or advanced platforms?",
      "Any preferences we should plan setup around?",
    ],
    recommendedSteps: [
      { id: "log", label: "Log field update", description: "Capture mix and preferences from conversation or case review.", kind: "log" },
      { id: "ask", label: "Ask on next touch", description: "Validate mix with surgeon, PA, or scheduler.", kind: "ask" },
      { id: "briefing", label: "Open tactical briefing", description: "Prep procedure-mix questions.", kind: "briefing" },
    ],
    dbKeys: ["provider_procedure_focus", "provider_technique_preferences"],
    sectionId: "clinical_workflow",
    appliesToSuffix: "specific to this provider",
  },
  observation_history: {
    id: "observation_history",
    title: "Observation history",
    scope: "Engagement",
    defaultStatus: "Not observed",
    subtitle: "Capture whether this provider has prior observation or OR visit history.",
    whyMatters:
      "Observation history shapes how much coaching versus net-new access work is needed.",
    primaryNextAction:
      "Log prior observations or schedule the first OR visit with mapped access.",
    emptyKnownMessage: "No observation or OR visit history captured yet.",
    stillToValidate: [
      { id: "h1", label: "Prior observation at this facility" },
      { id: "h2", label: "OR visit or ride-along history" },
      { id: "h3", label: "Outcome or debrief notes from last visit" },
      { id: "h4", label: "Coordinator relationship from prior touch" },
    ],
    fieldQuestions: [
      "Have we supported an observation or OR visit with this provider before?",
      "What happened on the last visit — access, case flow, follow-up?",
      "Who should we debrief with after the next observation?",
    ],
    recommendedSteps: [
      { id: "log", label: "Log field update", description: "Record observation outcomes or plans.", kind: "log" },
      { id: "ask", label: "Ask office/scheduler", description: "Confirm history and next observation slot.", kind: "ask" },
      { id: "briefing", label: "Open tactical briefing", description: "Prep for first or repeat observation.", kind: "briefing" },
    ],
    dbKeys: [],
    sectionId: "observation_readiness",
    appliesToSuffix: "engagement record",
  },
};

const SECTION_TO_ITEM_ID: Record<ProviderIntelligenceSectionId, string> = {
  or_environment: "vendor_clearance",
  clinical_workflow: "procedure_mix",
  observation_readiness: "observation_history",
  relationship_intelligence: "procedure_mix",
  commercial_signals: "vendor_clearance",
};

function scopeIntelligenceLabel(scope: ValidationQueueScope): string {
  if (scope === "Facility") return "Facility intelligence";
  if (scope === "Provider") return "Provider intelligence";
  return "Engagement intelligence";
}

function collectKnownLines(
  contact: Record<string, unknown>,
  dbKeys: string[],
  sectionId?: ProviderIntelligenceSectionId,
): string[] {
  const lines: string[] = [];
  const keys = dbKeys.length > 0 ? dbKeys : sectionId ? (PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? []) : [];

  for (const dbKey of keys) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;
    const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
    if (chip) {
      lines.push(sanitizeIntelligenceTabUserCopy(chip));
      continue;
    }
    const label = intelligenceFieldDisplayName(dbKey);
    const excerpt = sanitizeIntelligenceTabUserCopy(raw.slice(0, 120));
    lines.push(`${label}: ${excerpt}`);
  }

  if (sectionId && lines.length < 4) {
    for (const row of buildIntelligenceSectionSignalRows(sectionId, contact, 6)) {
      const line = sanitizeIntelligenceTabUserCopy(row.display);
      if (line && !lines.some((l) => l.toLowerCase() === line.toLowerCase())) {
        lines.push(line);
      }
      if (lines.length >= 6) break;
    }
  }

  return lines.slice(0, 6);
}

function resolveStatus(
  contact: Record<string, unknown>,
  template: ItemTemplate,
  statusOverride?: string,
): string {
  if (statusOverride) return statusOverride;
  const keys = template.dbKeys;
  if (keys.length === 0) return template.defaultStatus;
  const confirmed = keys.filter((k) => fieldHasIntelligenceSignal(k, String(contact[k] ?? ""))).length;
  if (confirmed === keys.length && keys.length > 0) return "Confirmed";
  if (confirmed > 0) return "Still learning";
  return template.defaultStatus;
}

function resolveSourceHistory(
  contact: Record<string, unknown>,
  dbKeys: string[],
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
  engagements?: ProviderEngagementSummary[],
): IntelligenceItemDetailView["sourceHistory"] {
  const meta =
    fieldMetadata ?? parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata);

  let lastUpdate: string | null = null;
  let sourceEngagement: string | null = null;
  let rawNotes: string | null = null;

  for (const dbKey of dbKeys) {
    const m = meta[dbKey];
    if (!m) continue;
    const attr = formatIntelligenceFieldAttributionDisplay(m);
    if (attr.validatedLine && !lastUpdate) lastUpdate = attr.validatedLine.replace(/^Validated\s+/i, "");
    if (attr.sourceLine && !sourceEngagement) sourceEngagement = attr.sourceLine;
    if (attr.captureLine && !rawNotes) rawNotes = attr.captureLine;
    if (m.source_label?.trim() && !sourceEngagement) {
      sourceEngagement = `Captured from ${m.source_label.trim()}`;
    }
  }

  if (!sourceEngagement && engagements?.length) {
    const latest = engagements[0];
    if (latest?.engagement_type_label || latest?.engagement_type) {
      sourceEngagement = `Recent ${latest.engagement_type_label || latest.engagement_type}`;
    }
  }

  return {
    lastUpdate: lastUpdate ? sanitizeIntelligenceTabUserCopy(lastUpdate) : null,
    sourceEngagement: sourceEngagement ? sanitizeIntelligenceTabUserCopy(sourceEngagement) : null,
    rawNotes: rawNotes ? sanitizeIntelligenceTabUserCopy(rawNotes) : null,
  };
}

export function resolveIntelligenceItemIdFromSection(
  sectionId: ProviderIntelligenceSectionId,
): string {
  return SECTION_TO_ITEM_ID[sectionId] ?? sectionId;
}

export function buildIntelligenceItemDetailView(input: {
  itemId: string;
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  organizationName?: string | null;
  providerName?: string | null;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  engagements?: ProviderEngagementSummary[];
  statusOverride?: string;
}): IntelligenceItemDetailView | null {
  const template = ITEM_TEMPLATES[input.itemId];
  if (!template) return null;

  const org = String(input.organizationName ?? "").trim() || "This facility";
  const provider = String(input.providerName ?? "").trim() || "This provider";

  let appliesTo = org;
  if (template.scope === "Provider") {
    appliesTo = provider;
  } else if (template.scope === "Engagement") {
    appliesTo = provider;
  }
  if (template.appliesToSuffix) {
    appliesTo = `${appliesTo} · ${template.appliesToSuffix}`;
  }

  const status = resolveStatus(input.contact, template, input.statusOverride);
  const scopeLine = `${scopeIntelligenceLabel(template.scope)} · ${status}`;

  return {
    itemId: template.id,
    title: template.title,
    scopeLine: sanitizeIntelligenceTabUserCopy(scopeLine),
    subtitle: sanitizeIntelligenceTabUserCopy(template.subtitle),
    summary: {
      status,
      scope: template.scope,
      appliesTo: sanitizeIntelligenceTabUserCopy(appliesTo),
      whyMatters: sanitizeIntelligenceTabUserCopy(template.whyMatters),
      primaryNextAction: sanitizeIntelligenceTabUserCopy(template.primaryNextAction),
    },
    whatWeKnow: {
      lines: collectKnownLines(input.contact, template.dbKeys, template.sectionId),
      emptyMessage: template.emptyKnownMessage,
    },
    stillToValidate: template.stillToValidate,
    fieldQuestions: template.fieldQuestions.map((q) => sanitizeIntelligenceTabUserCopy(q)),
    recommendedSteps: LOG_UPDATE_UI_ENABLED
      ? template.recommendedSteps
      : template.recommendedSteps.filter((step) => step.kind !== "log"),
    sourceHistory: resolveSourceHistory(
      input.contact,
      template.dbKeys,
      input.fieldMetadata,
      input.engagements,
    ),
    primaryDbKey: template.dbKeys[0],
    sectionId: template.sectionId,
    dbKeys: template.dbKeys,
  };
}
