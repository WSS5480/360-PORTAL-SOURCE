/**
 * Provider overview priority cards — what’s happening, why it matters, next move.
 */

import type { CanonicalExecutionBlocker } from "@/lib/surgical-sales/buildProviderCanonicalExecutionBlockers";
import type { ProviderFieldTimeRisk } from "@/lib/surgical-sales/buildProviderFieldTimeRisk";
import { overviewRiskFieldDescription } from "@/lib/surgical-sales/providerOverviewRiskCopy";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import type {
  ProviderOverviewDeploymentStep,
  ProviderOverviewUpcomingEngagement,
} from "@/lib/surgical-sales/buildProviderOverviewCommandCenterView";

export type ProviderOverviewGuidanceCardKind =
  | "blocker"
  | "risk"
  | "next_move"
  | "upcoming"
  | "readiness";

export type ProviderOverviewGuidanceCard = {
  id: string;
  kind: ProviderOverviewGuidanceCardKind;
  eyebrow: string;
  headline: string;
  explanation: string;
  nextMove: string;
  ctaHref?: string;
  /** When set, resolution panel sits directly under this blocker card */
  anchorsResolution?: boolean;
};

const EXPLANATION_MAX = 120;
const HEADLINE_MAX = 72;
const NEXT_MOVE_MAX = 56;

function repLine(text: string, max: number): string {
  return scanLine(
    text
      .replace(/\boperational\b/gi, "")
      .replace(/\bsignal(s)?\b/gi, "")
      .replace(/\borchestrat(e|ion)\b/gi, "")
      .replace(/\bframework\b/gi, "")
      .replace(/\bexecution risk\b/gi, "wasted field time")
      .replace(/\s{2,}/g, " ")
      .trim(),
    max,
  );
}

function stepNextMove(step: ProviderOverviewDeploymentStep): string {
  const byId: Record<string, string> = {
    access: "Confirm OR access path",
    workflow: "Capture case mix on next touch",
    relationship: "Map the relationship on next touch",
    commercial: "Confirm trial willingness",
    scheduling: "Confirm OR scheduling workflow",
  };
  if (step.status === "open") {
    return byId[step.id] ?? `Confirm ${step.label.toLowerCase()}`;
  }
  return byId[step.id] ?? `Refresh ${step.label.toLowerCase()}`;
}

function buildBlockerCard(blocker: CanonicalExecutionBlocker): ProviderOverviewGuidanceCard {
  const headline = repLine(blocker.headline, HEADLINE_MAX);
  const fromDb = overviewRiskFieldDescription({ dbKey: blocker.dbKey, rawHeadline: blocker.headline });
  const fromImpact = repLine(
    blocker.operationalConsequence?.summary ?? blocker.operationalImpact,
    EXPLANATION_MAX,
  );
  const explanation =
    fromDb && !fromDb.toLowerCase().includes(headline.toLowerCase().slice(0, 12))
      ? fromDb
      : fromImpact && !fromImpact.toLowerCase().includes(headline.toLowerCase().slice(0, 12))
        ? fromImpact
        : "";

  return {
    id: blocker.id,
    kind: "blocker",
    eyebrow: "Operational risk",
    headline,
    explanation,
    nextMove: "",
    ctaHref: undefined,
    anchorsResolution: true,
  };
}

function buildRiskCard(
  riskLine: string,
  fieldTimeRisk: ProviderFieldTimeRisk,
  blockerDbKey?: string,
): ProviderOverviewGuidanceCard {
  const headline = repLine(riskLine, HEADLINE_MAX);
  const reducer = fieldTimeRisk.narrative?.reducers[0];
  const secondLine = reducer?.dbKey
    ? overviewRiskFieldDescription({ dbKey: reducer.dbKey })
    : "";
  const explanation =
    secondLine && secondLine.toLowerCase() !== headline.toLowerCase()
      ? repLine(secondLine, EXPLANATION_MAX)
      : "";

  const nextMove = repLine(
    reducer?.reducerSignal ||
      fieldTimeRisk.narrative?.reducers[0]?.reducerSignal ||
      "Confirm before you book OR time",
    NEXT_MOVE_MAX,
  );

  return {
    id: `field-risk:${blockerDbKey ?? "general"}`,
    kind: "risk",
    eyebrow: "Risk",
    headline,
    explanation,
    nextMove,
  };
}

function buildNextMoveCard(input: {
  support: string | null;
  ctaLabel: string;
  ctaHref: string;
  hasBlocker: boolean;
}): ProviderOverviewGuidanceCard {
  const support = input.support?.trim() ?? "";
  const lead = support.split(/[.!?]/)[0]?.trim() ?? "";
  const headline = repLine(lead || input.ctaLabel, HEADLINE_MAX);
  const explanation = input.hasBlocker
    ? repLine(
        support || "Once the blocker is cleared, this keeps the account moving.",
        EXPLANATION_MAX,
      )
    : repLine(support || "Best use of your next touch on this account.", EXPLANATION_MAX);

  return {
    id: "next-move",
    kind: "next_move",
    eyebrow: "Next move",
    headline,
    explanation,
    nextMove: repLine(input.ctaLabel, NEXT_MOVE_MAX),
    ctaHref: input.ctaHref,
  };
}

function buildUpcomingCard(upcoming: ProviderOverviewUpcomingEngagement): ProviderOverviewGuidanceCard {
  return {
    id: "upcoming-engagement",
    kind: "upcoming",
    eyebrow: "Upcoming",
    headline: repLine(upcoming.headline, HEADLINE_MAX),
    explanation: repLine(`Scheduled for ${upcoming.whenLabel}.`, EXPLANATION_MAX),
    nextMove: repLine(upcoming.ctaLabel, NEXT_MOVE_MAX),
    ctaHref: upcoming.ctaHref,
  };
}

function buildReadinessCard(
  headline: string,
  support: string | null,
  steps: ProviderOverviewDeploymentStep[],
): ProviderOverviewGuidanceCard | null {
  const weakest = [...steps]
    .filter((s) => s.status !== "complete")
    .sort((a, b) => {
      const rank = { open: 0, partial: 1, complete: 2 };
      return rank[a.status] - rank[b.status];
    })[0];

  if (!weakest && steps.every((s) => s.status === "complete")) {
    return null;
  }

  return {
    id: "readiness",
    kind: "readiness",
    eyebrow: "Readiness",
    headline: repLine(headline, HEADLINE_MAX),
    explanation: repLine(support || "A few items still open before you book time.", EXPLANATION_MAX),
    nextMove: weakest ? stepNextMove(weakest) : "Spot-check notes before you deploy",
  };
}

export function buildProviderOverviewGuidanceCards(input: {
  blocker: CanonicalExecutionBlocker | null;
  operationalRiskLine: string | null;
  action: { support: string | null; ctaLabel: string; ctaHref: string };
  upcoming: ProviderOverviewUpcomingEngagement | null;
  status: { headline: string; support: string | null };
  readinessSteps: ProviderOverviewDeploymentStep[];
  fieldTimeRisk: ProviderFieldTimeRisk;
  includeNextMoveCard?: boolean;
}): ProviderOverviewGuidanceCard[] {
  const cards: ProviderOverviewGuidanceCard[] = [];
  const hasBlocker = Boolean(input.blocker);

  if (input.blocker) {
    cards.push(buildBlockerCard(input.blocker));
  }

  if (input.includeNextMoveCard !== false) {
    cards.push(
      buildNextMoveCard({
        support: input.action.support,
        ctaLabel: input.action.ctaLabel,
        ctaHref: input.action.ctaHref,
        hasBlocker,
      }),
    );
  }

  if (input.operationalRiskLine?.trim()) {
    cards.push(
      buildRiskCard(input.operationalRiskLine, input.fieldTimeRisk, input.blocker?.dbKey),
    );
  }

  if (input.upcoming) {
    cards.push(buildUpcomingCard(input.upcoming));
  }

  if (!hasBlocker) {
    const readiness = buildReadinessCard(
      input.status.headline,
      input.status.support,
      input.readinessSteps,
    );
    if (readiness) cards.push(readiness);
  }

  return cards;
}
