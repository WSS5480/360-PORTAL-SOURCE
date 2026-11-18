import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderRelationshipSnapshotView,
  type ProviderRelationshipSnapshotView,
} from "@/lib/surgical-sales/buildProviderRelationshipSnapshotView";
import {
  findPlanningSection,
  type ProviderPlanningCompletion,
} from "@/lib/surgical-sales/providerPlanningCompletion";
import { normalizeProviderRelationshipStage } from "@/lib/surgical-sales/providerRelationshipStage";

export type ProviderRelationshipSignal = {
  id: string;
  text: string;
};

export const RELATIONSHIP_SIGNAL_MAX = 5;

const EARLY_RELATIONSHIP_STAGES = new Set(["early_discovery", "active_evaluation"]);

const HIGH_INFLUENCE_LEVELS = new Set(["decision_maker", "influencer", "high", "medium"]);

type SignalCandidate = ProviderRelationshipSignal & { priority: number };

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function isUnknownish(raw: string | null): boolean {
  if (!raw) return true;
  const lower = raw.toLowerCase();
  return lower === "unknown" || lower === "—" || lower === "-";
}

function countCompletedEngagements(engagements: ProviderEngagementSummary[]): number {
  return engagements.filter((e) => String(e.status || "").toLowerCase() === "completed").length;
}

function matchesOperationalCommunicationStyle(raw: string | null): boolean {
  if (!raw) return false;
  const s = raw.toLowerCase();
  return /operational|pragmatic|direct|concise|brief|data[- ]?driven|results[- ]?focused|efficient|bottom[- ]?line|task[- ]?focused/.test(
    s,
  );
}

function clinicalInterestsThin(
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
): boolean {
  const procedure = trimOrNull(contact.provider_procedure_focus);
  const interests = trimOrNull(contact.provider_product_interests);
  if (!procedure && !interests) return true;
  if (!planning) return !procedure || !interests;
  const clinical = findPlanningSection(planning, "clinical_workflow");
  if (!clinical) return !procedure && !interests;
  return clinical.percent < 30;
}

function collectCandidates(input: {
  contact: Record<string, unknown>;
  snapshot: ProviderRelationshipSnapshotView;
  planning?: ProviderPlanningCompletion | null;
  engagements: ProviderEngagementSummary[];
}): SignalCandidate[] {
  const { contact, snapshot, planning, engagements } = input;
  const stageRaw = normalizeProviderRelationshipStage(contact.provider_relationship_stage);
  const completedCount = countCompletedEngagements(engagements);
  const totalEngagements = engagements.length;
  const commRaw = trimOrNull(contact.provider_communication_style);
  const influenceRaw = trimOrNull(contact.influence_level);
  const championRaw = trimOrNull(contact.provider_champion_potential);

  const candidates: SignalCandidate[] = [];

  const push = (id: string, text: string, priority: number, when: boolean) => {
    if (when) candidates.push({ id, text, priority });
  };

  push("dormant", "Reactivation needed before next commercial push", 4, stageRaw === "dormant" || stageRaw === "archived");

  const decisionUnclear =
    !snapshot.decisionMaker.hasValue &&
    (!snapshot.influence.hasValue || isUnknownish(influenceRaw));
  push("decision-authority-unclear", "Decision authority unclear", 10, decisionUnclear);

  push(
    "no-completed-touch",
    "No completed touchpoints logged yet",
    12,
    completedCount === 0 && totalEngagements === 0 && EARLY_RELATIONSHIP_STAGES.has(stageRaw),
  );

  push(
    "communication-rhythm",
    "Communication rhythm not established",
    15,
    !snapshot.followUp.hasValue ||
      (!snapshot.communication.hasValue && completedCount === 0) ||
      (completedCount > 0 && !snapshot.followUp.hasValue),
  );

  push(
    "clinical-interests-unknown",
    "Clinical interests still unknown",
    20,
    clinicalInterestsThin(contact, planning),
  );

  push(
    "relationship-early",
    "Relationship still early-stage",
    25,
    EARLY_RELATIONSHIP_STAGES.has(stageRaw) ||
      (snapshot.capturedCount <= 2 && stageRaw !== "established_customer" && stageRaw !== "active_relationship"),
  );

  push(
    "cadence-forming",
    "Engagement cadence forming — lock follow-up rhythm",
    28,
    completedCount >= 1 && completedCount <= 2 && !snapshot.followUp.hasValue,
  );

  push(
    "champion-unassessed",
    "Champion potential not assessed",
    32,
    !championRaw && (snapshot.influence.hasValue || completedCount > 0),
  );

  const influenceKey = String(influenceRaw || "").toLowerCase();
  push(
    "procedural-influence",
    "Strong procedural influence suspected",
    40,
    HIGH_INFLUENCE_LEVELS.has(influenceKey) && snapshot.influence.hasValue,
  );

  push(
    "prefers-operational",
    "Prefers operational discussions",
    45,
    matchesOperationalCommunicationStyle(commRaw) ||
      (snapshot.communication.hasValue &&
        matchesOperationalCommunicationStyle(snapshot.communication.value)),
  );

  push(
    "established-thin-playbook",
    "Established stage — relationship playbook still thin",
    18,
    stageRaw === "established_customer" && snapshot.capturedCount < 4,
  );

  push(
    "repeat-touchpoints",
    "Repeat touchpoints logged — sustain rhythm",
    48,
    completedCount >= 3 && snapshot.followUp.hasValue,
  );

  return candidates;
}

/**
 * Interprets relationship intelligence into concise operational signals (max 5).
 */
export function buildProviderRelationshipSignals(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  engagements?: ProviderEngagementSummary[];
  snapshot?: ProviderRelationshipSnapshotView;
}): ProviderRelationshipSignal[] {
  const snapshot =
    input.snapshot ?? buildProviderRelationshipSnapshotView({ contact: input.contact });
  const engagements = input.engagements ?? [];

  const seen = new Set<string>();
  const ordered = collectCandidates({
    contact: input.contact,
    snapshot,
    planning: input.planning,
    engagements,
  })
    .sort((a, b) => a.priority - b.priority)
    .filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

  let signals = ordered.slice(0, RELATIONSHIP_SIGNAL_MAX).map(({ id, text }) => ({ id, text }));

  if (signals.length === 0) {
    signals = [{ id: "relationship-early", text: "Relationship still early-stage" }];
  }

  return signals;
}
