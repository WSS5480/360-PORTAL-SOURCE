/**
 * Commercialization operational picture — synthesized intelligence summary for the Intelligence tab.
 * Answers: "What does this operationally mean for commercialization?"
 */

import type { AccountUnderstandingConfirmCard } from "@/lib/surgical-sales/buildAccountUnderstandingUncertaintyCards";
import { buildProviderOperationalReadinessFramework } from "@/lib/surgical-sales/buildProviderOperationalReadinessFramework";
import type { OperationalMotionReadiness } from "@/lib/surgical-sales/buildProviderOperationalReadinessFramework";
import { buildProviderRelationshipOperationalMaturity } from "@/lib/surgical-sales/buildProviderRelationshipOperationalMaturity";
import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { AccountUnderstandingAreaId } from "@/lib/surgical-sales/providerAccountUnderstanding";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

export type CommercializationOperationalPictureLineId =
  | "how_operates"
  | "commercial_blockers"
  | "workflow_visibility"
  | "evaluation_readiness"
  | "relationship_maturity"
  | "tactical_implications"
  | "recommended_next";

export type CommercializationOperationalPictureLine = {
  id: CommercializationOperationalPictureLineId;
  label: string;
  line: string;
};

const LINE_LABELS: Record<CommercializationOperationalPictureLineId, string> = {
  how_operates: "How this account operates",
  commercial_blockers: "Operational context",
  workflow_visibility: "Workflow visibility",
  evaluation_readiness: "Evaluation readiness",
  relationship_maturity: "Relationship maturity",
  tactical_implications: "Tactical implications",
  recommended_next: "Recommended next move",
};

const GENERIC_LINE = /still learning|not yet mapped|early discovery|no .+ on file|synthesized|core signals captured/i;

function cardForArea(
  cards: AccountUnderstandingConfirmCard[],
  areaId: AccountUnderstandingAreaId,
): AccountUnderstandingConfirmCard | undefined {
  return cards.find((c) => c.areaId === areaId);
}

function isUsableLine(line: string | null | undefined): line is string {
  const t = String(line ?? "").trim();
  return t.length > 8 && !GENERIC_LINE.test(t);
}

function pickLine(...candidates: (string | null | undefined)[]): string {
  for (const c of candidates) {
    if (isUsableLine(c)) return scanLine(c, 160);
  }
  return "";
}

function motionById(
  motions: OperationalMotionReadiness[],
  id: OperationalMotionReadiness["motion"],
): OperationalMotionReadiness | undefined {
  return motions.find((m) => m.motion === id);
}

function synthesizeHowAccountOperates(input: {
  frameworkHeadline: string;
  operationalCard?: AccountUnderstandingConfirmCard;
  workflowCard?: AccountUnderstandingConfirmCard;
  orAccessScan: string;
  schedulingScan: string;
}): string {
  const operationalKnown = input.operationalCard?.scanSummaryLine ?? input.operationalCard?.known;
  const workflowKnown = input.workflowCard?.scanSummaryLine ?? input.workflowCard?.known;

  const combined = pickLine(
    operationalKnown && workflowKnown
      ? `${operationalKnown} ${workflowKnown.includes(operationalKnown ?? "") ? "" : `· ${workflowKnown}`}`
      : null,
    input.frameworkHeadline,
    operationalKnown,
    `${input.orAccessScan} · ${input.schedulingScan}`,
    input.orAccessScan,
  );

  if (combined) return combined;
  return "OR access, scheduling, and case-flow signals still need field confirmation before deployment planning.";
}

function synthesizeCommercialBlockers(input: {
  motions: OperationalMotionReadiness[];
  cards: AccountUnderstandingConfirmCard[];
}): string {
  const riskCards = input.cards.filter((c) => c.confidenceLevel === "high_risk");
  const motionBlockers = input.motions
    .flatMap((m) => m.blockers)
    .filter((b) => b.length > 4);

  const lines = [
    ...riskCards.map((c) => c.operationalRisk),
    ...motionBlockers,
    input.motions.find((m) => m.verdict === "blocked")?.headline,
  ].filter(isUsableLine);

  if (lines.length === 0) {
    return "No major operational risk on file — keep building visibility.";
  }

  const unique = [...new Set(lines.map((l) => scanLine(l, 120)))].slice(0, 2);
  return unique.join(" · ");
}

function synthesizeWorkflowVisibility(input: {
  workflowCard?: AccountUnderstandingConfirmCard;
  workflowScan: string;
  observationMotion?: OperationalMotionReadiness;
  orAccessScan: string;
}): string {
  const workflowPartial =
    input.workflowCard?.confidenceLevel === "partial" ||
    input.workflowCard?.readinessTone === "partial";
  const observationUnclear =
    input.observationMotion?.verdict === "not_ready" ||
    input.observationMotion?.verdict === "blocked" ||
    /unclear|blocked|not ready|too early/i.test(input.observationMotion?.headline ?? "");

  if (workflowPartial && observationUnclear) {
    return "Workflow visibility improving but observation path still unclear.";
  }

  const line = pickLine(
    input.workflowCard?.scanSummaryLine,
    input.workflowCard?.known,
    input.workflowScan,
    workflowPartial
      ? "Case-flow signals forming — confirm friction and volume before trial positioning."
      : null,
  );
  if (line) return line;

  if (input.observationMotion?.verdict === "ready") {
    return scanLine(`Workflow can be validated in-room — ${input.orAccessScan}`, 160);
  }
  return "Procedure mix and OR rhythm still unclear — observation cases may misalign with workflow reality.";
}

function synthesizeEvaluationReadiness(input: {
  evaluationMotion?: OperationalMotionReadiness;
  commercialCard?: AccountUnderstandingConfirmCard;
}): string {
  const line = pickLine(
    input.evaluationMotion?.headline,
    input.commercialCard?.scanSummaryLine,
    input.commercialCard?.known,
    input.evaluationMotion?.interpretation,
  );
  if (line) return line;

  const verdict = input.evaluationMotion?.verdict;
  if (verdict === "ready") return "Evaluation path looks viable — align trial timing with mapped access and approvers.";
  if (verdict === "approaching") return "Evaluation interest possible — confirm appetite and committee path before committing resources.";
  if (verdict === "blocked") return "Evaluation blocked until observation access and credentialing gates clear.";
  return "Evaluation posture unknown — map access and champion path before trial design.";
}

function synthesizeRelationshipMaturity(input: {
  relationshipCard?: AccountUnderstandingConfirmCard;
  relationshipHeadline: string;
  relationshipTone: "success" | "warn" | "neutral" | "blocked";
  documentedCount: number;
}): string {
  const trusted =
    input.relationshipCard?.readinessTone === "operationally_ready" ||
    input.relationshipCard?.confidenceLevel === "confirmed";

  if (
    (input.relationshipTone === "success" || input.relationshipCard?.confidenceLevel === "partial") &&
    !trusted
  ) {
    return "Relationship positive but not operationally trusted yet.";
  }

  if (input.relationshipTone === "blocked") {
    return pickLine(
      `Access environment restrictive — ${input.relationshipHeadline}`,
      input.relationshipCard?.operationalRisk,
    ) || "Relationship signals restrictive — rebuild scheduler and staff access before commercial moves.";
  }

  const line = pickLine(input.relationshipHeadline, input.relationshipCard?.scanSummaryLine, input.relationshipCard?.known);
  if (line) return line;

  if (input.documentedCount === 0) {
    return "Engagement style and influence path still developing — commercialization risk is approver misidentification.";
  }
  return "Relationship signals thin — validate champion and staff follow-through before evaluation expansion.";
}

function synthesizeTacticalImplications(input: {
  cards: AccountUnderstandingConfirmCard[];
  fieldGuidance: string;
}): string {
  const tactical = input.cards
    .map((c) => c.tacticalImplication)
    .filter(isUsableLine)
    .slice(0, 2);

  if (tactical.length > 0) return tactical.map((t) => scanLine(t, 100)).join(" · ");

  const guidance = pickLine(input.fieldGuidance);
  if (guidance) return guidance;

  return "Prioritize access mapping and one validated observation before evaluation or preference-card work.";
}

function synthesizeRecommendedNext(input: {
  cards: AccountUnderstandingConfirmCard[];
  focusMotion?: OperationalMotionReadiness;
  fieldGuidance: string;
}): string {
  const ranked = [...input.cards].sort((a, b) => {
    const risk = (c: AccountUnderstandingConfirmCard) =>
      c.confidenceLevel === "high_risk" ? 0 : c.confidenceLevel === "partial" ? 1 : 2;
    return risk(a) - risk(b);
  });

  const next = pickLine(
    ranked[0]?.bestNextAction,
    input.focusMotion?.proceduralChecks[0],
    ranked[0]?.unknown,
    input.fieldGuidance,
  );
  if (next) return next;

  return "Run operational map discovery on access and workflow before the next OR or office touch.";
}

export function buildCommercializationOperationalPicture(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  confirmCards: AccountUnderstandingConfirmCard[];
  gaps: IntelligenceLearningGap[];
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
}): CommercializationOperationalPictureLine[] {
  const framework = buildProviderOperationalReadinessFramework({
    contact: input.contact,
    engagements: input.engagements,
    opportunities: input.opportunities,
  });
  const relationship = buildProviderRelationshipOperationalMaturity(input.contact);

  const workflowCard = cardForArea(input.confirmCards, "workflow");
  const relationshipCard = cardForArea(input.confirmCards, "relationship");
  const operationalCard = cardForArea(input.confirmCards, "operational");
  const commercialCard = cardForArea(input.confirmCards, "commercial");

  const orAccess = framework.pillars.find((p) => p.id === "or_access_maturity")!;
  const workflow = framework.pillars.find((p) => p.id === "workflow_intelligence")!;
  const scheduling = framework.pillars.find((p) => p.id === "scheduling_clarity")!;

  const observationMotion = motionById(framework.motions, "observation");
  const evaluationMotion = motionById(framework.motions, "evaluation");
  const focusMotion = framework.motions.find((m) => m.motion === framework.primaryFocusMotion);

  const lines: Record<CommercializationOperationalPictureLineId, string> = {
    how_operates: synthesizeHowAccountOperates({
      frameworkHeadline: framework.verdict.scan,
      operationalCard,
      workflowCard,
      orAccessScan: orAccess.scanLine,
      schedulingScan: scheduling.scanLine,
    }),
    commercial_blockers: synthesizeCommercialBlockers({
      motions: framework.motions,
      cards: input.confirmCards,
    }),
    workflow_visibility: synthesizeWorkflowVisibility({
      workflowCard,
      workflowScan: workflow.scanLine,
      observationMotion,
      orAccessScan: orAccess.scanLine,
    }),
    evaluation_readiness: synthesizeEvaluationReadiness({
      evaluationMotion,
      commercialCard,
    }),
    relationship_maturity: synthesizeRelationshipMaturity({
      relationshipCard,
      relationshipHeadline: relationship.headline,
      relationshipTone: relationship.tone,
      documentedCount: relationship.documentedCount,
    }),
    tactical_implications: synthesizeTacticalImplications({
      cards: input.confirmCards,
      fieldGuidance: framework.fieldGuidance,
    }),
    recommended_next: synthesizeRecommendedNext({
      cards: input.confirmCards,
      focusMotion,
      fieldGuidance: framework.fieldGuidance,
    }),
  };

  return (Object.keys(LINE_LABELS) as CommercializationOperationalPictureLineId[]).map((id) => ({
    id,
    label: LINE_LABELS[id],
    line: lines[id],
  }));
}
