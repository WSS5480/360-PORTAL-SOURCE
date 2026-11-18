import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  inferProviderEvaluationPath,
  resolveStoredEvaluationPath,
} from "@/lib/surgical-sales/buildProviderEvaluationPathView";
import { deriveProviderObservationCount } from "@/lib/surgical-sales/providerObservationProgress";
import type { SalesPathwayEvaluationActivity } from "@/lib/surgical-sales/salesPathwayCanonical";
import { readStartMissionSnapshot } from "@/lib/surgical-sales/engagements/startMissionSnapshot";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";

export type MissionBoardEvaluationCardContext = {
  debriefOutcomeSummary: string | null;
  primaryOpportunity: string | null;
  recommendedPath: SalesPathwayEvaluationActivity;
  selectedPath: SalesPathwayEvaluationActivity | null;
};

function trimSnippet(value: string | null | undefined, max = 140): string | null {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function primaryOpportunityFromContact(contact: Record<string, unknown>): string | null {
  return (
    trimSnippet(String(contact.provider_strategic_goal ?? "")) ||
    trimSnippet(String(contact.provider_preference_card_signals ?? "")) ||
    trimSnippet(String(contact.provider_procedure_focus ?? "")) ||
    null
  );
}

function debriefOutcomeFromContact(contact: Record<string, unknown>): string | null {
  const notes = trimSnippet(String(contact.provider_rep_strategy_notes ?? ""));
  if (notes) return notes;

  const fitValidated = String(contact.provider_product_fit_validated ?? "").trim().toLowerCase();
  if (fitValidated === "yes" || fitValidated === "true") {
    return "Product fit validated after debrief.";
  }

  return null;
}

export function summarizeDebriefOutcomeFromEngagements(
  engagements: ReadonlyArray<Record<string, unknown>> | undefined,
): string | null {
  let best: { recordedAt: string; summary: string } | null = null;

  for (const row of engagements ?? []) {
    const type = String(row.engagement_type ?? "");
    if (!isProviderDebriefEngagement(type)) continue;

    const status = String(row.status ?? "").trim().toLowerCase();
    if (!["completed", "done", "closed"].includes(status)) continue;

    const session = readStartMissionSnapshot(row.debrief_intelligence_snapshot);
    const outcomeLabel =
      String(session?.outcome_label ?? "").trim() ||
      String(row.next_action ?? "").trim() ||
      (session?.outcome_id ? session.outcome_id.replace(/_/g, " ") : "");
    const liveNotes = String(session?.live_notes ?? "").trim();
    const summary = liveNotes
      ? trimSnippet(`${outcomeLabel}: ${liveNotes}`, 160)
      : trimSnippet(outcomeLabel, 160);
    if (!summary) continue;

    const recordedAt = String(session?.outcome_recorded_at ?? row.updated_at ?? row.completed_at ?? "");
    if (best && recordedAt && recordedAt <= best.recordedAt) continue;

    best = { recordedAt, summary };
  }

  return best?.summary ?? null;
}

export function buildMissionBoardEvaluationCardContext(input: {
  provider: ProviderDirectoryRow;
  engagements?: ReadonlyArray<Record<string, unknown>>;
}): MissionBoardEvaluationCardContext {
  const contact = input.provider as Record<string, unknown>;
  const inferInput = {
    upcomingEngagement: input.provider.upcoming_engagement,
    linkedOpportunitiesCount: input.provider.linked_opportunities_count,
    observationCount: deriveProviderObservationCount(input.provider),
    contact,
  };

  const debriefOutcomeSummary =
    summarizeDebriefOutcomeFromEngagements(input.engagements) ?? debriefOutcomeFromContact(contact);

  return {
    debriefOutcomeSummary,
    primaryOpportunity: primaryOpportunityFromContact(contact),
    recommendedPath: inferProviderEvaluationPath(inferInput),
    selectedPath: resolveStoredEvaluationPath(contact),
  };
}
