/**
 * Provider Intelligence tab — field briefing read model.
 * Organized for rep execution, not CRM record browsing.
 */

import {
  buildProviderOverviewFieldBriefing,
  type FieldBriefingAccessHeadline,
  type FieldBriefingGapItem,
  type FieldBriefingItem,
} from "@/lib/surgical-sales/buildProviderOverviewFieldBriefing";
import { buildProviderIntelligenceTabView } from "@/lib/surgical-sales/buildProviderIntelligenceTabView";
import type { ProviderIntelligenceTimelineItem } from "@/lib/surgical-sales/buildProviderIntelligenceTabView";
import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderFieldIntelligenceModel,
  type ProviderFieldIntelligenceModel,
} from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { formatSupportContactRecord } from "@/lib/surgical-sales/optionalIntelligenceCategories";
import { buildProviderOpenQuestions } from "@/lib/surgical-sales/buildProviderOpenQuestions";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { REP_INTELLIGENCE_VOCAB } from "@/lib/surgical-sales/intelligenceCapture/repIntelligenceVocabulary";
import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";

export const PROVIDER_BRIEFING_SECTION = {
  kicker: "Field briefing",
  title: "Provider briefing",
  lead: "What we know, what to learn, who matters, and what to do next — built from field evidence.",
  accessPicture: "Access picture",
  whatWeKnow: BRIEF.whatWeKnow,
  evidenceFromField: "Evidence from the field",
  openQuestions: REP_INTELLIGENCE_VOCAB.stillExploring,
  opportunitySignals: "Commercial opportunity",
  relationshipMap: "Relationship map",
  nextAction: "What to do next",
  noEvidence:
    "No field intelligence captured yet. Facts appear here after intro calls, debriefs, and observation.",
  whatWeKnowEmpty: REP_INTELLIGENCE_VOCAB.noCapturedYet,
  evidenceEmpty: "No engagement evidence logged yet.",
  openQuestionsEmpty: "Nothing critical left to explore — refresh before the next touch.",
  opportunityEmpty: REP_INTELLIGENCE_VOCAB.nothingHighlightedYet,
  relationshipsEmpty: "No relationship map on file yet.",
  observationStatus: "Observation status",
  approvalStatus: "Approval status",
  credentialing: "Credentialing",
  scheduling: "Scheduling",
  accessPath: "Access path",
} as const;

export type ProviderBriefingOpenQuestion = {
  id: string;
  text: string;
  priorityLabel: string;
};

export type ProviderBriefingOpportunitySignal = {
  id: string;
  category: string;
  signal: string;
};

export type ProviderBriefingRelationshipEntry = {
  id: string;
  name: string;
  role: string;
  status: "confirmed" | "identified" | "missing";
  detail: string | null;
};

export type ProviderBriefingAccessPicture = {
  headline: string;
  headlineKey: FieldBriefingAccessHeadline;
  observationStatus: string;
  approvalStatus: string;
  credentialing: string;
  scheduling: string;
  accessPath: string | null;
  executionFocus: string[];
};

export type ProviderIntelligenceBriefingView = {
  kicker: string;
  pageTitle: string;
  lead: string;
  providerName: string;
  hasFieldEvidence: boolean;
  accessPicture: ProviderBriefingAccessPicture;
  nextAction: {
    objective: string;
    whyItMatters: string;
    expectedOutcome: string;
  };
  whatWeKnow: FieldBriefingItem[];
  evidenceFromField: ProviderIntelligenceTimelineItem[];
  openQuestions: ProviderBriefingOpenQuestion[];
  opportunitySignals: ProviderBriefingOpportunitySignal[];
  relationshipMap: ProviderBriefingRelationshipEntry[];
};

function buildOpportunitySignals(model: ProviderFieldIntelligenceModel): ProviderBriefingOpportunitySignal[] {
  const signals: ProviderBriefingOpportunitySignal[] = [];
  const seen = new Set<string>();

  const push = (id: string, category: string, signal: string) => {
    const line = scanLine(signal, 120).trim();
    if (!line) return;
    const key = `${category}:${line}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    signals.push({ id, category, signal: line });
  };

  for (const trend of model.clinical.trends) {
    push(`trend-${trend}`, "Volume trend", trend);
  }
  for (const procedure of model.clinical.procedures) {
    push(`proc-${procedure}`, "Procedure focus", procedure);
  }
  for (const frustration of model.clinical.frustrations) {
    push(`frust-${frustration}`, "Clinical frustration", frustration);
  }
  for (const preference of model.clinical.preferences) {
    push(`pref-${preference}`, "Clinical preference", preference);
  }
  for (const observation of model.clinical.workflowObservations) {
    push(`workflow-${observation}`, "Workflow signal", observation);
  }
  if (model.procedureInterests.isConfirmed && model.procedureInterests.primaryLine.trim()) {
    push(
      "procedure-interests",
      "Procedure focus",
      model.procedureInterests.primaryLine,
    );
  }

  return signals.slice(0, 8);
}

function relationshipStatus(
  captureState: ProviderFieldIntelligenceModel["scheduler"]["captureState"],
  isConfirmed: boolean,
): ProviderBriefingRelationshipEntry["status"] {
  if (captureState === "verified" || (isConfirmed && captureState !== "empty")) return "confirmed";
  if (captureState === "referenced" || captureState === "learning") return "identified";
  return "missing";
}

function buildRelationshipMap(input: {
  model: ProviderFieldIntelligenceModel;
  relatedContacts?: Array<Record<string, unknown>>;
}): ProviderBriefingRelationshipEntry[] {
  const entries: ProviderBriefingRelationshipEntry[] = [];
  const seen = new Set<string>();

  const push = (entry: ProviderBriefingRelationshipEntry) => {
    const key = `${entry.name}:${entry.role}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(entry);
  };

  if (input.model.scheduler.captureState !== "empty") {
    push({
      id: "scheduler",
      name: input.model.scheduler.primaryLine.trim() || "Scheduling owner",
      role: "Scheduling coordinator",
      status: relationshipStatus(input.model.scheduler.captureState, input.model.scheduler.isConfirmed),
      detail: input.model.scheduler.secondaryLine,
    });
  }

  if (input.model.champion.captureState !== "empty") {
    push({
      id: "champion",
      name: input.model.champion.primaryLine.trim() || "Champion candidate",
      role: "Champion",
      status: relationshipStatus(input.model.champion.captureState, input.model.champion.isConfirmed),
      detail: input.model.champion.secondaryLine,
    });
  }

  if (input.model.supportContacts.isConfirmed) {
    push({
      id: "support-contacts",
      name: input.model.supportContacts.primaryLine.trim() || "Support contacts",
      role: BRIEF.keyRelationships,
      status: relationshipStatus(
        input.model.supportContacts.captureState,
        input.model.supportContacts.isConfirmed,
      ),
      detail: input.model.supportContacts.secondaryLine,
    });
  }

  for (const related of input.relatedContacts ?? []) {
    const formatted = formatSupportContactRecord(related);
    if (!formatted.trim()) continue;
    push({
      id: `contact-${String(related.id ?? formatted)}`,
      name: contactDisplayName(related),
      role: String(related.title ?? related.role ?? "Support contact").trim() || "Support contact",
      status: "confirmed",
      detail: formatted.includes(contactDisplayName(related))
        ? formatted.replace(contactDisplayName(related), "").replace(/^[\s·—-]+/, "").trim() || null
        : formatted,
    });
  }

  return entries.slice(0, 8);
}

function buildOpenQuestions(
  gaps: FieldBriefingGapItem[],
  stillLearning: Array<{ id: string; text: string }>,
): ProviderBriefingOpenQuestion[] {
  const items: ProviderBriefingOpenQuestion[] = [];
  const seen = new Set<string>();

  for (const gap of gaps) {
    const text = scanLine(gap.text, 140).trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: gap.id,
      text,
      priorityLabel: gap.priorityLabel,
    });
  }

  for (const item of stillLearning) {
    const text = scanLine(item.text, 140).trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: item.id,
      text,
      priorityLabel: "Open",
    });
  }

  return items.slice(0, 8);
}

function buildAccessPicture(
  model: ProviderFieldIntelligenceModel,
  accessStatus: ReturnType<typeof buildProviderOverviewFieldBriefing>["accessStatus"],
): ProviderBriefingAccessPicture {
  return {
    headline: accessStatus.headline,
    headlineKey: accessStatus.headlineKey,
    observationStatus: accessStatus.observationStatus,
    approvalStatus: accessStatus.approvalStatus,
    credentialing: model.credentialing.isConfirmed
      ? model.credentialing.displayValue
      : "Still being learned",
    scheduling: model.scheduler.isConfirmed ? model.scheduler.displayValue : "Still being learned",
    accessPath: model.observationApproval.secondaryLine?.trim() || null,
    executionFocus: accessStatus.executionRecommendations.slice(0, 3),
  };
}

export function buildProviderIntelligenceBriefingView(input: {
  contact: Record<string, unknown>;
  providerId: string;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  organizationName?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  activityTimeline?: Array<Record<string, unknown>>;
  relatedContacts?: Array<Record<string, unknown>>;
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];
}): ProviderIntelligenceBriefingView {
  const contact = input.contact;
  const providerName = contactDisplayName(contact);

  const model = buildProviderFieldIntelligenceModel({
    contact,
    relatedContacts: input.relatedContacts,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.activityTimeline,
    clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers,
  });

  const overviewBriefing = buildProviderOverviewFieldBriefing({
    contact,
    planning: input.planning,
    organizationName: input.organizationName,
    relatedContacts: input.relatedContacts,
    engagements: input.engagements,
  });

  const tabView = buildProviderIntelligenceTabView({
    contact,
    providerId: input.providerId,
    planning: input.planning,
    organizationName: input.organizationName,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.activityTimeline,
    clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers,
  });

  return {
    kicker: PROVIDER_BRIEFING_SECTION.kicker,
    pageTitle: PROVIDER_BRIEFING_SECTION.title,
    lead: PROVIDER_BRIEFING_SECTION.lead,
    providerName,
    hasFieldEvidence: model.hasFieldEvidence,
    accessPicture: buildAccessPicture(model, overviewBriefing.accessStatus),
    nextAction: overviewBriefing.nextMission,
    whatWeKnow: overviewBriefing.whatWeKnow,
    evidenceFromField: tabView.timeline.slice(0, 8),
    openQuestions: model.hasFieldEvidence
      ? buildProviderOpenQuestions({
          contact,
          planning: input.planning,
          model,
        }).map((item) => ({
          id: item.id,
          text: item.text,
          priorityLabel: "Open",
        }))
      : [],
    opportunitySignals: model.hasFieldEvidence ? buildOpportunitySignals(model) : [],
    relationshipMap: model.hasFieldEvidence
      ? buildRelationshipMap({
          model,
          relatedContacts: input.relatedContacts,
        })
      : [],
  };
}

/** @deprecated use PROVIDER_BRIEFING_SECTION */
export const INTELLIGENCE_BRIEFING_SECTION = PROVIDER_BRIEFING_SECTION;
