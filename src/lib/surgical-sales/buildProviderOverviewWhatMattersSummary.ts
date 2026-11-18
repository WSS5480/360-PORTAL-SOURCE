/**
 * Overview "What matters right now" — mission-oriented context only.
 * Clinical signals, open questions, and evidence live on the Intelligence tab.
 */

import {

  buildProviderWhatMattersNow,

  type ProviderWhatMattersBullet,

} from "@/lib/surgical-sales/buildProviderWhatMattersNow";

import { buildProviderFieldIntelligenceModel } from "@/lib/surgical-sales/providerFieldIntelligenceModel";

import { buildProviderObservationReadiness, isSchedulerContactLinkedOnFile } from "@/lib/surgical-sales/providerObservationReadiness";
import {
  enrichProviderIntelligenceContact,
  linkedSchedulingContactDisplayName,
} from "@/lib/surgical-sales/enrichProviderIntelligenceContact";
import { schedulingOwnerDisplayLine } from "@/lib/surgical-sales/schedulingIntelligenceReadModel";
import { isStaleSchedulingNarrative } from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";
import { isCredentialingWorkflowComplete } from "@/lib/surgical-sales/observationAccessWorkflowState";

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";
import { normalizeSalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";

import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  extractLatestNoteHighlight,
  shouldIncludeOverviewContextBullet,
} from "@/lib/surgical-sales/providerOverviewSparsePresentation";



export const MAX_OVERVIEW_WHAT_MATTERS_BULLETS = 5;

const COMPLETED_CASE_STATUSES = new Set(["completed", "done", "closed"]);

/** Observation access is proven — skip discovery admin gaps (credentialing, scheduler capture). */
function observationAccessEstablishedForOverview(input: {
  cases?: Array<Record<string, unknown>>;
  contact: Record<string, unknown>;
}): boolean {
  const hasCompletedObservation = (input.cases ?? []).some((row) => {
    if (!isSurgicalObservationCase(row.case_type)) return false;
    return COMPLETED_CASE_STATUSES.has(String(row.status ?? "").trim().toLowerCase());
  });
  if (hasCompletedObservation) return true;

  const stageId = normalizeSalesPathwayStageId(
    String(
      input.contact.relationship_pathway_stage_id ??
        input.contact.provider_relationship_pathway_stage_id ??
        "",
    ),
  );
  return (
    stageId === "debrief" ||
    stageId === "evaluation" ||
    stageId === "commitment" ||
    stageId === "outcomes"
  );
}



export type ProviderOverviewWhatMattersLine = {

  id: string;

  text: string;

};



function pushUnique(

  out: ProviderOverviewWhatMattersLine[],

  seen: Set<string>,

  id: string,

  text: string,

) {

  const line = scanLine(text, 120).trim();

  if (!line) return;

  const key = line.toLowerCase();

  if (seen.has(key) || out.length >= MAX_OVERVIEW_WHAT_MATTERS_BULLETS) return;

  seen.add(key);

  out.push({ id, text: line });

}



function schedulerOverviewLabel(
  contact: Record<string, unknown>,
  relatedContacts?: Array<Record<string, unknown>>,
): string | null {
  const line = schedulingOwnerDisplayLine(contact)?.trim();
  if (!line) {
    return linkedSchedulingContactDisplayName(relatedContacts);
  }
  if (isStaleSchedulingNarrative(line)) {
    return linkedSchedulingContactDisplayName(relatedContacts);
  }
  const linkedName = line.split(/\s·\s/)[0]?.trim();
  if (linkedName && !isStaleSchedulingNarrative(linkedName)) {
    return scanLine(linkedName, 72);
  }
  const shortName = line.split(/[—–-]/)[0]?.trim();
  if (shortName && !isStaleSchedulingNarrative(shortName)) {
    return scanLine(shortName, 72);
  }
  return linkedSchedulingContactDisplayName(relatedContacts) ?? scanLine(line, 72);
}



function buildFieldSignalBullets(input: {
  contact: Record<string, unknown>;
  relatedContacts?: Array<Record<string, unknown>>;
  engagements: ProviderEngagementSummary[];
  activityTimeline?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): ProviderOverviewWhatMattersLine[] {
  const contact = enrichProviderIntelligenceContact({
    contact: input.contact ?? {},
    relatedContacts: input.relatedContacts,
  });
  const engagements = input.engagements ?? [];
  const out: ProviderOverviewWhatMattersLine[] = [];
  const seen = new Set<string>();

  if (observationAccessEstablishedForOverview({ cases: input.cases, contact })) {
    const noteLine = extractLatestNoteHighlight(input.activityTimeline);
    if (noteLine) {
      pushUnique(out, seen, "latest-note", noteLine);
    }
    return out;
  }

  const readiness = buildProviderObservationReadiness(contact);
  const schedulerLinked =
    isSchedulerContactLinkedOnFile(contact) || readiness.schedulerContactInfoCaptured === "yes";

  if (readiness.credentialingRequired === "yes" && !isCredentialingWorkflowComplete(contact)) {
    pushUnique(out, seen, "credentialing-required", "Credentialing required");
  }



  const model = buildProviderFieldIntelligenceModel({ contact });

  if (schedulerLinked) {
    const label = schedulerOverviewLabel(contact, input.relatedContacts);
    if (label) {
      pushUnique(out, seen, "scheduler-on-file", `Scheduler: ${label}`);
    }
  } else if (model.scheduler.captureState === "referenced" || model.scheduler.captureState === "learning") {
    pushUnique(out, seen, "scheduler-mentioned", "Scheduler mentioned");
  } else if (model.scheduler.isConfirmed && model.scheduler.primaryLine.trim()) {
    const label = schedulerOverviewLabel(contact, input.relatedContacts);
    if (label) {
      pushUnique(
        out,
        seen,
        "scheduler-on-file",
        `Scheduler: ${label}`,
      );
    }
  }



  if (out.length === 0) {
    const noteLine = extractLatestNoteHighlight(input.activityTimeline);
    if (noteLine) {
      pushUnique(out, seen, "latest-note", noteLine);
    }
  }

  return out;
}



export function buildProviderOverviewWhatMattersSummary(input: {

  providerId: string;

  relationshipStage: string;

  newEngagementHref: string;

  intelligenceHref: string;

  createOpportunityHref?: string;

  engagements: ProviderEngagementSummary[];

  planning?: ProviderPlanningCompletion | null;

  cases?: Array<Record<string, unknown>>;

  opportunities?: Array<Record<string, unknown>>;

  activity_timeline?: Array<Record<string, unknown>>;

  contact: Record<string, unknown>;

  relatedContacts?: Array<Record<string, unknown>>;

}): ProviderOverviewWhatMattersLine[] {
  if (isProviderSalesCustomer(input.relationshipStage) || isProviderSalesCustomer(input.contact)) {
    return [];
  }
  const contact = input.contact ?? {};
  const engagements = input.engagements ?? [];
  const seen = new Set<string>();
  const merged: ProviderOverviewWhatMattersLine[] = [];

  for (const line of buildFieldSignalBullets({
    contact,
    relatedContacts: input.relatedContacts,
    engagements,
    activityTimeline: input.activity_timeline,
    cases: input.cases,
  })) {
    pushUnique(merged, seen, line.id, line.text);
  }

  const contextBullets = buildProviderWhatMattersNow({
    ...input,
    contact,
    engagements,
  }).filter(
    (bullet): bullet is ProviderWhatMattersBullet & { text: string } =>
      shouldIncludeOverviewContextBullet(bullet),
  );



  for (const bullet of contextBullets) {

    pushUnique(merged, seen, bullet.id, bullet.text);

  }



  return merged.slice(0, MAX_OVERVIEW_WHAT_MATTERS_BULLETS);

}


