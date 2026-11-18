/**
 * Rep-facing copy for Observation Intelligence — plain English only.
 * Calculation layer stays elsewhere; this module transforms outputs for display.
 */

import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import type { EvidenceAreaStatus } from "@/lib/surgical-sales/observationIntelligence/scoreObservationEvidence";
import type { DebriefReadinessPhase } from "@/lib/surgical-sales/buildObservationLearningTabView";
import type { IntelligenceSignal } from "@/lib/surgical-sales/caseIntelligenceSignals";
import { cleanCapturedFindingLabel } from "@/lib/surgical-sales/findingDisplayLabels";
import {
  formatObservationFindingForRepDisplay,
  repPainTopicForEstablishedCopy,
  resolveRepProductName,
} from "@/lib/surgical-sales/observationIntelligenceDisplayLabels";
import { findingToIntelligenceSignal, isPositiveStaffContextSignal } from "@/lib/surgical-sales/caseIntelligenceSignals";
import {
  appendRepPendingSuffix,
  formatRepObservedWithCompletedCount,
  formatRepProviderHistoryProductLine,
  formatRepProviderHistoryWorkflowLine,
  formatRepStaffPositiveLine,
  repDisplayCompletedObservationCount,
  repFindingCountsFromFinding,
  repWorkflowTopicFromLabel,
} from "@/lib/surgical-sales/observationRepFindingPresentation";
import { staffEfficiencyRepLabel } from "@/lib/surgical-sales/staffEfficiencyRepLabels";
import {
  formatRepeatEvidenceCrossCaseObjective,
  translateLearningObjectiveTopic,
} from "@/lib/surgical-sales/observationLearningObjectiveDisplay";

export const OBSERVATION_REP_SECTIONS = {
  whatWeKnow: "What We Know",
  stillNeedToLearn: "What We Still Need to Learn",
  focusNext: "Focus for Next Observation",
  thisObservation: "This Observation",
  providerContext: "Provider Context",
  evidenceProgress: "Observation Areas",
  debriefReadiness: "Debrief Readiness",
} as const;

export const OBSERVATION_REP_PROGRAM_GOAL =
  "Gather enough evidence across observations to support a productive provider debrief.";

const REP_PILLAR_LABELS: Record<string, string> = {
  provider_pain_points: "Provider frustrations",
  staff_pain_points: "Staff frustrations",
  workflow_findings: "Workflow friction",
  current_products: "Products in use",
  product_fit_signals: "Product openings",
};

const EVIDENCE_PILLAR_LEARNING_ORDER = [
  "current_products",
  "workflow_findings",
  "provider_pain_points",
  "staff_pain_points",
  "product_fit_signals",
] as const;

type RepEvidenceGuidanceTier = "unknown" | "emerging" | "known";

const EVIDENCE_GUIDANCE_TIER_RANK: Record<RepEvidenceGuidanceTier, number> = {
  unknown: 0,
  emerging: 1,
  known: 2,
};

const PILLAR_LEARNING_GUIDANCE: Record<string, Record<RepEvidenceGuidanceTier, string>> = {
  provider_pain_points: {
    unknown: "Listen for provider frustrations.",
    emerging: "Watch whether provider frustrations show up again.",
    known: "Understand when provider frustrations occur and how they affect decisions.",
  },
  staff_pain_points: {
    unknown: "Watch for staff workflow friction.",
    emerging: "Watch whether staff workflow friction keeps showing up.",
    known: "Understand how staff concerns affect case flow.",
  },
  workflow_findings: {
    unknown: "Observe workflow patterns during the case.",
    emerging: "Watch whether workflow patterns repeat across cases.",
    known: "Understand how workflow patterns affect efficiency or decision-making.",
  },
  current_products: {
    unknown: "Confirm which products are being used.",
    emerging: "Confirm whether product use is consistent.",
    known: "Watch for product openings based on observed workflow.",
  },
  product_fit_signals: {
    unknown: "Watch for moments where a different product might help.",
    emerging: "Watch whether product openings keep showing up.",
    known: "Understand how often product openings come up and whether they matter for a conversation.",
  },
};

export function repEvidenceGuidanceTier(status: EvidenceAreaStatus): RepEvidenceGuidanceTier {
  if (status === "missing") return "unknown";
  if (status === "validated" || status === "supported") return "known";
  return "emerging";
}

function repEvidencePillarLearningGuidanceFallback(
  pillarId: string,
  tier: RepEvidenceGuidanceTier,
): string {
  const category = repEvidencePillarLabel(pillarId, pillarId).toLowerCase();
  if (tier === "unknown") return `Learn more about ${category}.`;
  if (tier === "emerging") return `Watch whether ${category} keeps showing up.`;
  return `Understand how often ${category} come up and what they mean for the relationship.`;
}

export function repEvidencePillarLearningGuidance(
  pillarId: string,
  status: EvidenceAreaStatus,
): string {
  const tier = repEvidenceGuidanceTier(status);
  return (
    PILLAR_LEARNING_GUIDANCE[pillarId]?.[tier] ??
    repEvidencePillarLearningGuidanceFallback(pillarId, tier)
  );
}

function resolvePillarIdFromEvidenceGap(gap: string): string | null {
  const normalized = gap.trim().toLowerCase();
  if (/provider pain/i.test(normalized)) return "provider_pain_points";
  if (/staff pain/i.test(normalized)) return "staff_pain_points";
  if (/workflow bottleneck|workflow finding/i.test(normalized)) return "workflow_findings";
  if (/current product/i.test(normalized)) return "current_products";
  if (/product fit/i.test(normalized)) return "product_fit_signals";
  return null;
}

function isSupplementalEvidenceGap(gap: string): boolean {
  return resolvePillarIdFromEvidenceGap(gap) === null;
}

export function repEvidencePillarLabel(pillarId: string, fallback: string): string {
  return REP_PILLAR_LABELS[pillarId] ?? fallback;
}

export function repEvidenceAreaStatusLabel(status: EvidenceAreaStatus): string {
  if (status === "validated" || status === "supported") return "Known";
  if (status === "missing") return "Not Yet Covered";
  return "Early Observations";
}

export function repEvidenceProgressLead(input: {
  knownCount: number;
  emergingCount: number;
  total: number;
}): string {
  if (input.knownCount === 0 && input.emergingCount === 0) {
    return `${input.total} observation areas still to explore`;
  }
  if (input.knownCount === 0) {
    return `${input.emergingCount} of ${input.total} areas have early observations`;
  }
  const toExplore = input.total - input.knownCount - input.emergingCount;
  return `${input.knownCount} confirmed · ${input.emergingCount} early · ${toExplore} to explore`;
}

/** Final pass to strip engine ontology from rep-facing strings. */
export function sanitizeRepFacingCopy(text: string): string {
  return text
    .replace(/\bvalidate whether\b/gi, "Watch whether")
    .replace(/\bgather evidence around\b/gi, "Learn more about")
    .replace(/\bpain points?\b/gi, "frustrations")
    .replace(/\bproduct-fit signals?\b/gi, "product openings")
    .replace(/\badoption signal\b/gi, "product use pattern")
    .replace(/\bstrengthens prior signal\b/gi, "builds on a prior observation")
    .replace(/\bstrengthens prior workflow signal\b/gi, "builds on a prior workflow note")
    .replace(/\bstrengthens provider pain point evidence\b/gi, "provider frustration pattern is building")
    .replace(/\bstrengthens staff pain point evidence\b/gi, "staff frustration pattern is building")
    .replace(/\bstrengthens product-fit hypothesis\b/gi, "product opening looks more consistent")
    .replace(/\bstrengthens current product pattern\b/gi, "same product pattern is building")
    .replace(/\bstrengthens adoption signal\b/gi, "product use pattern is building")
    .replace(/\bnew signal captured\b/gi, "New observation noted")
    .replace(/\bnew workflow signal captured\b/gi, "New workflow note")
    .replace(/\bnew provider pain point captured\b/gi, "New provider frustration noted")
    .replace(/\bnew staff pain point captured\b/gi, "New staff frustration noted")
    .replace(/\bcaptured in current in-progress case\b/gi, "also seen in this in-progress case")
    .replace(/\bfindings captured\b/gi, "notes captured")
    .replace(/\bwhat you captured today\b/gi, "what you noted today")
    .replace(/\bsignal captured\b/gi, "observation noted")
    .replace(/\brepeat evidence\b/gi, "consistent observation across cases")
    .replace(/\bvalidated\b/gi, "confirmed")
    .replace(/\bsupported pattern\b/gi, "consistent pattern")
    .replace(/\bearly signal\b/gi, "early observation")
    .replace(/\bcaptured signal\b/gi, "early observation")
    .replace(/\bconfidence\b/gi, "certainty")
    .replace(/\bmaturity\b/gi, "progress")
    .replace(/\bhypothesis\b/gi, "possibility")
    .replace(/\bstrengthens\b/gi, "adds to")
    .replace(/\bevidence threshold\b/gi, "observation threshold")
    .replace(/\binsufficient evidence\b/gi, "need confirmation across more cases")
    .replace(/\blow confidence\b/gi, "need additional observations")
    .replace(/\bsignal(s)?\b/gi, "observation")
    .replace(/\bevidence\b/gi, "observations")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function repDebriefReadinessHeadline(phase: DebriefReadinessPhase): string {
  if (phase === "ready") return "Ready for Debrief";
  if (phase === "nearly_ready") return "Evidence Nearly Ready";
  return "Not Ready for Debrief";
}

export function resolveProviderDisplayName(caseRow: Record<string, unknown>): string | null {
  const name = String(
    caseRow.provider_name ?? caseRow.surgeon_name ?? caseRow.provider_display_name ?? "",
  ).trim();
  return name || null;
}

function observationCountPhrase(completedCount: number): string {
  if (completedCount >= 3) return `across ${completedCount} completed cases`;
  if (completedCount === 2) return "across 2 completed cases";
  if (completedCount === 1) return "in 1 completed case";
  return "";
}

/** Opt-in count language: "default" keeps legacy phrasing byte-identical. */
export type RepFindingCountStyle = "default" | "program_fraction";

/** "— seen in N of M observations" when a real fraction exists; legacy phrasing otherwise. */
function programFractionCountPhrase(
  completedCount: number,
  programCompletedCount?: number,
): string {
  if (
    programCompletedCount !== undefined &&
    programCompletedCount >= 2 &&
    completedCount >= 2 &&
    completedCount <= programCompletedCount
  ) {
    return `— seen in ${completedCount} of ${programCompletedCount} observations`;
  }
  return observationCountPhrase(completedCount);
}

function briefingObservationCountSuffix(completedCount: number): string {
  if (completedCount >= 3) return ` across ${completedCount} completed observations`;
  if (completedCount === 2) return " across 2 completed observations";
  if (completedCount === 1) return " in 1 completed observation";
  return "";
}

export type EstablishedFindingSurface = "briefing" | "intelligence";

/** Patterns that indicate rep-facing copy regressed to abstract ontology phrasing. */
export const REP_STORY_BANNED_PATTERNS: RegExp[] = [
  /concern around frustration/i,
  /frustration around frustration/i,
  /\bproduct availability observed\b/i,
  /frustrations related to product availability observed/i,
];

function appendStoryCountSuffix(
  base: string,
  countPhrase: string,
  counts: ReturnType<typeof repFindingCountsFromFinding>,
): string {
  const suffix = countPhrase
    ? countPhrase.startsWith(" ")
      ? countPhrase
      : ` ${countPhrase}`
    : "";
  const line = `${base}${suffix}`;
  return appendRepPendingSuffix(line, counts);
}

function staffEstablishedStory(
  finding: AggregatedFindingEvidence,
  peerFindings: AggregatedFindingEvidence[],
): string | null {
  const context = resolveStaffFrustrationContext(finding, peerFindings);
  const blob = findingEvidenceText(finding);

  if (
    context === "product availability" ||
    /product availability|stocked product|verify product|uncertainty.*product|staff_supply/.test(blob)
  ) {
    return "Staff had to verify products were stocked before the case could proceed";
  }
  if (context === "workflow delays" || /workflow delay|pace slowed|staff burden:\s*workflow/i.test(blob)) {
    return "Staff ran into delays that slowed the case";
  }
  if (context === "product packaging" || /packag|peel pack/.test(blob)) {
    return "Staff ran into issues opening product packaging before the case";
  }
  if (context && !isVagueProviderSignalTopic(context)) {
    return `Staff ran into challenges related to ${context} during the case`;
  }
  return "Staff frustration came up during the case";
}

function workflowEstablishedStory(
  finding: AggregatedFindingEvidence,
  peerFindings: AggregatedFindingEvidence[],
): string | null {
  const blob = findingEvidenceText(finding);
  const id = finding.normalizedFindingId;

  if (
    id === "workflow_visualization_before_fixation" ||
    id === "visualization_challenge" ||
    /visualization.*fixation|fixation.*visualization|visualization challenge/.test(blob)
  ) {
    return "Extra time was spent improving visualization before fixation";
  }
  if (id === "workflow_delay" || /workflow delay|pace slowed|slowed the flow/.test(blob)) {
    return "Case flow slowed due to workflow delays";
  }
  if (id === "staff_supply_setup_delay") {
    return "Staff had to verify products were stocked before the case could proceed";
  }

  const topic = resolveWorkflowSignalTopic(finding, peerFindings);
  if (/visuali.*fixation|fixation.*visuali/.test(topic)) {
    return "Extra time was spent improving visualization before fixation";
  }
  if (/workflow delay|workflow delays/.test(topic)) {
    return "Case flow slowed due to workflow delays";
  }
  if (isVagueProviderSignalTopic(topic)) return null;

  const display = topic.charAt(0).toUpperCase() + topic.slice(1);
  return `${display} affected case flow`;
}

function providerFrustrationEstablishedStory(
  finding: AggregatedFindingEvidence,
  providerName: string | null,
  peerFindings: AggregatedFindingEvidence[],
): string {
  const context = resolveProviderFrustrationContext(finding, peerFindings);
  const name = providerName?.trim();

  if (context) {
    return name
      ? `${name} expressed frustration during ${context}`
      : `Provider expressed frustration during ${context}`;
  }
  return name
    ? `${name} expressed frustration during the case`
    : "Provider expressed frustration during the case";
}

function isStaffEstablishedFinding(finding: AggregatedFindingEvidence, title: string): boolean {
  return (
    finding.normalizedFindingId === "staff_friction" ||
    finding.normalizedFindingId.startsWith("staff_supply") ||
    finding.normalizedFindingId.startsWith("staff_efficiency") ||
    /^staff burden:/i.test(title) ||
    /^uncertainty/i.test(title) ||
    /uncertainty.*product|stocked product/i.test(findingEvidenceText(finding))
  );
}

function isProviderPainEstablishedFinding(finding: AggregatedFindingEvidence): boolean {
  return (
    finding.normalizedFindingId.includes("pain") ||
    finding.normalizedFindingId === "provider_frustration"
  );
}

function isWorkflowEstablishedFinding(
  finding: AggregatedFindingEvidence,
  signalType: string | undefined,
): boolean {
  return (
    signalType === "workflow_signal" ||
    signalType === "workflow_bottleneck" ||
    finding.normalizedFindingId.startsWith("workflow_") ||
    finding.normalizedFindingId === "visualization_challenge"
  );
}

export function formatRepEstablishedFindingStory(
  finding: AggregatedFindingEvidence,
  input: {
    surface: EstablishedFindingSurface;
    providerName?: string | null;
    programCompletedCount?: number;
    peerFindings?: AggregatedFindingEvidence[];
    countStyle?: RepFindingCountStyle;
  },
): string {
  const canonicalTitle = cleanCapturedFindingLabel(finding);
  if (!canonicalTitle) return "";

  const counts = repFindingCountsFromFinding(finding, input.programCompletedCount);
  const completed = counts.completedObservationCount;
  if (input.programCompletedCount !== undefined && completed <= 0) return "";

  const isBriefing = input.surface === "briefing";
  const countPhrase = isBriefing
    ? briefingObservationCountSuffix(completed)
    : input.countStyle === "program_fraction"
      ? programFractionCountPhrase(completed, input.programCompletedCount)
      : observationCountPhrase(completed);
  const peerFindings = input.peerFindings ?? [];
  const providerName = input.providerName ?? null;
  const signal = findingToIntelligenceSignal(finding, { procedureContext: null });
  const title =
    formatObservationFindingForRepDisplay(finding, { mode: "established_pattern" }) || canonicalTitle;

  if (finding.isPositiveStaffSignal) {
    const line = formatRepStaffPositiveLine(
      isBriefing ? staffEfficiencyRepLabel(finding.label) : title,
      counts,
    );
    if (!isBriefing) return line;
    return line
      .replace(/\bacross completed cases\b/i, "across prior completed observations")
      .replace(/\bin 1 completed case\b/i, "in a prior completed observation");
  }

  if (finding.normalizedFindingId.startsWith("product_in_use:")) {
    const productName = resolveRepProductName(finding, signal);
    const base = isBriefing
      ? productName
        ? `${productName} has been seen in use`
        : "Product use has been noted"
      : productName
        ? `${productName} was used during the case`
        : "A product was used during the case";
    return appendStoryCountSuffix(base, countPhrase, counts);
  }

  if (finding.normalizedFindingId.startsWith("competitor_product:")) {
    const productName = resolveRepProductName(finding, signal);
    const base = isBriefing
      ? productName
        ? `Competitor product ${productName} has been seen in use`
        : "Competitor product use has been noted"
      : productName
        ? `Competitor product ${productName} was used during the case`
        : "A competitor product was used during the case";
    return appendStoryCountSuffix(base, countPhrase, counts);
  }

  if (isProviderPainEstablishedFinding(finding) || signal.type === "provider_pain_point") {
    const base = providerFrustrationEstablishedStory(finding, providerName, peerFindings);
    return appendStoryCountSuffix(base, countPhrase, counts);
  }

  if (isStaffEstablishedFinding(finding, title) || signal.type === "staff_pain_point") {
    const base = staffEstablishedStory(finding, peerFindings);
    if (!base) return "";
    return appendStoryCountSuffix(base, countPhrase, counts);
  }

  if (isWorkflowEstablishedFinding(finding, signal.type)) {
    const base = workflowEstablishedStory(finding, peerFindings);
    if (!base) return "";
    return appendStoryCountSuffix(base, countPhrase, counts);
  }

  if (finding.normalizedFindingId.startsWith("product_fit") || signal.type === "product_fit_opportunity") {
    const topic = title.replace(/\s+opportunity$/i, "").trim().toLowerCase();
    const base = isBriefing
      ? `A possible product opening around ${topic || "this workflow"} has been noted`
      : `A possible product opening around ${topic || "this workflow"} came up during the case`;
    return appendStoryCountSuffix(base, countPhrase, counts);
  }

  const base = title.replace(/\s+observed$/i, "").trim();
  if (isVagueProviderSignalTopic(base)) return "";

  const display = base.charAt(0).toUpperCase() + base.slice(1);
  const fallback = isBriefing
    ? `${display} has been noted`
    : `${display} came up during the case`;
  return appendStoryCountSuffix(fallback, countPhrase, counts);
}

export function formatEstablishedFindingRepLine(
  finding: AggregatedFindingEvidence,
  input: {
    surface: EstablishedFindingSurface;
    providerName?: string | null;
    programCompletedCount?: number;
    peerFindings?: AggregatedFindingEvidence[];
  },
): string {
  return formatRepEstablishedFindingStory(finding, input);
}

export function isEstablishedFinding(
  finding: AggregatedFindingEvidence,
  programCompletedCount?: number,
): boolean {
  if (finding.isInferred) return false;
  if (programCompletedCount !== undefined) {
    if (repDisplayCompletedObservationCount(finding, programCompletedCount) <= 0) {
      return false;
    }
  }
  const status = finding.maturityStatus;
  if (
    status === "validated_pattern" ||
    status === "debrief_ready" ||
    status === "supported_pattern" ||
    status === "repeated_signal"
  ) {
    return true;
  }
  if (finding.completedObservationCount >= 2) return true;
  if (finding.observationCount >= 2 && finding.completedObservationCount >= 1) return true;
  if (
    finding.completedObservationCount >= 1 &&
    (finding.normalizedFindingId.includes("pain") ||
      finding.normalizedFindingId === "provider_frustration" ||
      finding.normalizedFindingId === "staff_friction")
  ) {
    return true;
  }
  return finding.completedObservationCount >= 1 && !finding.capturedFromCurrentNote;
}

function painTopicFromTitle(title: string): string {
  return title
    .replace(/^provider concern:\s*/i, "")
    .replace(/^staff burden:\s*/i, "")
    .trim()
    .toLowerCase();
}

function findingEvidenceText(finding: AggregatedFindingEvidence): string {
  const canonical = cleanCapturedFindingLabel(finding);
  return `${finding.normalizedFindingId} ${finding.matchKey} ${finding.label} ${finding.evidenceLabel} ${canonical}`.toLowerCase();
}

function isStaffPeerFinding(peer: AggregatedFindingEvidence): boolean {
  return (
    peer.normalizedFindingId === "staff_friction" ||
    peer.normalizedFindingId.startsWith("staff_efficiency") ||
    peer.normalizedFindingId.includes("staff_pain") ||
    /^staff burden:/i.test(peer.label)
  );
}

function isProviderOrWorkflowPeer(peer: AggregatedFindingEvidence): boolean {
  return (
    peer.normalizedFindingId === "provider_frustration" ||
    peer.normalizedFindingId.includes("provider_pain") ||
    peer.normalizedFindingId.startsWith("workflow_") ||
    /visualization|fixation/.test(peer.normalizedFindingId)
  );
}

function resolveSignalContextFromPeerFindings(
  finding: AggregatedFindingEvidence,
  peerFindings: AggregatedFindingEvidence[] = [],
  options: { staffPeersOnly?: boolean; providerOrWorkflowPeersOnly?: boolean } = {},
): string | null {
  for (const peer of peerFindings) {
    if (peer.normalizedFindingId === finding.normalizedFindingId) continue;
    if (options.staffPeersOnly && !isStaffPeerFinding(peer)) continue;
    if (options.providerOrWorkflowPeersOnly && !isProviderOrWorkflowPeer(peer)) continue;
    const blob = findingEvidenceText(peer);
    if (/visuali|fixation/.test(blob)) {
      return "visualization/fixation decision-making";
    }
    if (/product availability|stocked product|verify product|uncertainty.*product/.test(blob)) {
      return "product availability";
    }
    if (/workflow delay|pace slowed|workflow burden/.test(blob)) {
      return "workflow delays";
    }
  }
  return null;
}

function stripPainOntologyPrefix(label: string): string {
  return label
    .replace(/^provider concern:\s*/i, "")
    .replace(/^staff burden:\s*/i, "")
    .replace(/^uncertainty\s+/i, "")
    .trim();
}

function isVagueProviderSignalTopic(topic: string): boolean {
  const normalized = topic.trim().toLowerCase();
  return (
    !normalized ||
    /^(clinical frustration|frustration|provider frustration|frustration during cases|frustration during procedures)$/.test(
      normalized,
    ) ||
    normalized === "workflow delays" ||
    normalized === "workflow delay" ||
    normalized === "product availability"
  );
}

/** True when a label is too abstract to stand alone as rep-facing story copy. */
export function isVagueRepStoryLabel(label: string): boolean {
  return isVagueProviderSignalTopic(label);
}

function resolveProviderFrustrationContext(
  finding: AggregatedFindingEvidence,
  peerFindings: AggregatedFindingEvidence[] = [],
): string | null {
  const blob = findingEvidenceText(finding);
  if (/visuali|fixation/.test(blob)) {
    return "visualization/fixation decision-making";
  }

  for (const raw of [cleanCapturedFindingLabel(finding), finding.label]) {
    const candidate = stripPainOntologyPrefix(raw);
    if (!candidate || isVagueProviderSignalTopic(candidate)) continue;
    const lower = candidate.toLowerCase();
    if (/visuali|fixation/.test(lower)) return "visualization/fixation decision-making";
    if (/decision/.test(lower)) return "decision-making during the case";
    return lower;
  }

  return resolveSignalContextFromPeerFindings(finding, peerFindings, {
    providerOrWorkflowPeersOnly: true,
  });
}

function resolveStaffFrustrationContext(
  finding: AggregatedFindingEvidence,
  peerFindings: AggregatedFindingEvidence[] = [],
): string | null {
  const blob = findingEvidenceText(finding);
  if (/product availability|stocked product|verify product|uncertainty.*product/.test(blob)) {
    return "product availability";
  }
  if (/workflow delay|pace slowed|workflow burden|staff burden:\s*workflow/i.test(blob)) {
    return "workflow delays";
  }
  if (/packag|peel pack/.test(blob)) {
    return "product packaging";
  }

  const candidate = stripPainOntologyPrefix(cleanCapturedFindingLabel(finding) || finding.label);
  if (candidate && !isVagueProviderSignalTopic(candidate)) {
    return candidate.toLowerCase();
  }

  return resolveSignalContextFromPeerFindings(finding, peerFindings, { staffPeersOnly: true });
}

function resolveWorkflowSignalTopic(
  finding: AggregatedFindingEvidence,
  peerFindings: AggregatedFindingEvidence[] = [],
): string {
  const canonical = cleanCapturedFindingLabel(finding) || finding.label;
  const topic = repWorkflowTopicFromLabel(canonical);
  if (!isVagueProviderSignalTopic(topic)) return topic;
  const labelTopic = repWorkflowTopicFromLabel(finding.label);
  if (labelTopic && !isVagueProviderSignalTopic(labelTopic)) return labelTopic;

  const peerContext = resolveSignalContextFromPeerFindings(finding, peerFindings, {
    providerOrWorkflowPeersOnly: true,
  });
  if (peerContext) return peerContext;

  return topic;
}

function formatProviderFrustrationSignalLine(
  finding: AggregatedFindingEvidence,
  providerName: string | null,
  counts: ReturnType<typeof repFindingCountsFromFinding>,
  peerFindings: AggregatedFindingEvidence[] = [],
  completedCount = counts.completedObservationCount,
): string {
  const context = resolveProviderFrustrationContext(finding, peerFindings);
  const countPhrase = observationCountPhrase(completedCount);
  const name = providerName?.trim();

  let line: string;
  if (context) {
    line = name
      ? `${name} expressed frustration during ${context}`
      : `Provider expressed frustration during ${context}`;
  } else {
    line = name
      ? `${name} expressed frustration during the case`
      : "Provider frustration was observed during the case";
  }

  if (countPhrase) line = `${line} ${countPhrase}`;
  return appendRepPendingSuffix(line, counts);
}

function formatStaffFrustrationSignalLine(
  finding: AggregatedFindingEvidence,
  counts: ReturnType<typeof repFindingCountsFromFinding>,
  peerFindings: AggregatedFindingEvidence[] = [],
  completedCount = counts.completedObservationCount,
): string {
  const context = resolveStaffFrustrationContext(finding, peerFindings);
  const countPhrase = observationCountPhrase(completedCount);

  let line: string;
  if (context) {
    line = countPhrase
      ? `Staff frustrations related to ${context} observed ${countPhrase}`
      : `Staff frustrations related to ${context} observed`;
  } else {
    line = countPhrase
      ? `Staff frustration was observed during the case ${countPhrase}`
      : "Staff frustration was observed during the case";
  }

  return appendRepPendingSuffix(line, counts);
}

export function formatProviderIntelligenceSignalLine(
  finding: AggregatedFindingEvidence,
  providerName: string | null,
  peerFindings: AggregatedFindingEvidence[] = [],
  programCompletedCount?: number,
): string {
  return formatRepEstablishedFindingStory(finding, {
    surface: "intelligence",
    providerName,
    programCompletedCount,
    peerFindings,
  });
}

export function buildProviderIntelligenceSignalLines(input: {
  findings: AggregatedFindingEvidence[];
  providerName: string | null;
  programCompletedCount?: number;
}): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const finding of input.findings) {
    if (!isEstablishedFinding(finding, input.programCompletedCount)) continue;
    const line = formatProviderIntelligenceSignalLine(
      finding,
      input.providerName,
      input.findings,
      input.programCompletedCount,
    );
    const key = line.toLowerCase();
    if (!line || seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }

  return lines.slice(0, 6);
}

export function buildProviderRollupCapturedSignals(input: {
  findings: AggregatedFindingEvidence[];
  providerName: string | null;
  completedCount: number;
  primaryCaseComplete: boolean;
  currentCaseHasCapturedNotes: boolean;
  thisObservationLines: string[];
}): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  const push = (line: string) => {
    const key = line.toLowerCase().trim();
    if (!line || seen.has(key)) return;
    seen.add(key);
    lines.push(line);
  };

  if (input.currentCaseHasCapturedNotes && !input.primaryCaseComplete) {
    for (const line of input.thisObservationLines) {
      push(line);
    }
  }

  if (input.completedCount <= 0) {
    return lines.slice(0, 6);
  }

  const establishedLines = buildWhatWeKnowLines({
    findings: input.findings,
    providerName: input.providerName,
    programCompletedCount: input.completedCount,
  });

  for (const line of establishedLines) {
    push(line);
  }

  return lines.slice(0, 6);
}

export function formatWhatWeKnowLine(
  finding: AggregatedFindingEvidence,
  providerName: string | null,
  programCompletedCount?: number,
  peerFindings?: AggregatedFindingEvidence[],
  countStyle?: RepFindingCountStyle,
): string {
  return formatRepEstablishedFindingStory(finding, {
    surface: "intelligence",
    providerName,
    programCompletedCount,
    peerFindings,
    countStyle,
  });
}

export function buildWhatWeKnowLines(input: {
  findings: AggregatedFindingEvidence[];
  providerName: string | null;
  programCompletedCount?: number;
  countStyle?: RepFindingCountStyle;
}): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const finding of input.findings) {
    if (!isEstablishedFinding(finding, input.programCompletedCount)) continue;
    const line = formatWhatWeKnowLine(
      finding,
      input.providerName,
      input.programCompletedCount,
      input.findings,
      input.countStyle,
    );
    const key = line.toLowerCase();
    if (!line || seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }

  return lines.slice(0, 6);
}

export function translateEvidenceGapToLearningQuestion(gap: string): string {
  const trimmed = gap.trim();
  if (!trimmed) return trimmed;

  const pillarId = resolvePillarIdFromEvidenceGap(trimmed);
  if (pillarId) {
    return repEvidencePillarLearningGuidance(pillarId, "missing");
  }

  if (/complete current case/i.test(trimmed)) {
    return "Finish this case to confirm what you noted today";
  }
  if (/repeat product\/workflow evidence/i.test(trimmed)) {
    return "Confirm whether product use and workflow friction repeat across completed cases.";
  }
  const repeatMatch = trimmed.match(/^repeat evidence needed for\s+(.+)$/i);
  if (repeatMatch?.[1]) {
    return formatRepeatEvidenceCrossCaseObjective(repeatMatch[1].trim());
  }
  if (/^repeat evidence for\s+/i.test(trimmed)) {
    const topic = trimmed.replace(/^repeat evidence for\s+/i, "").trim();
    return formatRepeatEvidenceCrossCaseObjective(topic);
  }
  if (/confirm whether .+ use is consistent/i.test(trimmed)) {
    return repEvidencePillarLearningGuidance("current_products", "early_signal");
  }
  if (/more evidence needed for/i.test(trimmed)) {
    const match = trimmed.match(/more evidence needed for\s+(.+)$/i);
    if (match?.[1]) {
      return `Learn more about ${translateLearningObjectiveTopic(match[1].trim())}.`;
    }
  }

  return sanitizeRepFacingCopy(
    trimmed
      .replace(/\bvalidated\b/gi, "confirmed")
      .replace(/\bsignal(s)?\b/gi, "observation")
      .replace(/\bevidence\b/gi, "observations")
      .replace(/\blow confidence\b/gi, "need additional observations")
      .replace(/\binsufficient evidence\b/gi, "need confirmation across more cases"),
  );
}

export function buildStillNeedToLearnLines(input: {
  evidenceGaps: string[];
  evidenceProgress: Array<{ id: string; label: string; status: EvidenceAreaStatus }>;
}): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  const push = (line: string) => {
    const key = line.toLowerCase();
    if (!line || seen.has(key)) return;
    seen.add(key);
    lines.push(line);
  };

  for (const gap of input.evidenceGaps) {
    if (!isSupplementalEvidenceGap(gap)) continue;
    push(translateEvidenceGapToLearningQuestion(gap));
  }

  const pillarById = new Map(input.evidenceProgress.map((pillar) => [pillar.id, pillar]));
  const sortedPillars = EVIDENCE_PILLAR_LEARNING_ORDER.map((id) => pillarById.get(id))
    .filter((pillar): pillar is NonNullable<(typeof input.evidenceProgress)[number]> => Boolean(pillar))
    .sort((left, right) => {
      const tierDiff =
        EVIDENCE_GUIDANCE_TIER_RANK[repEvidenceGuidanceTier(left.status)] -
        EVIDENCE_GUIDANCE_TIER_RANK[repEvidenceGuidanceTier(right.status)];
      if (tierDiff !== 0) return tierDiff;
      return (
        EVIDENCE_PILLAR_LEARNING_ORDER.indexOf(
          left.id as (typeof EVIDENCE_PILLAR_LEARNING_ORDER)[number],
        ) -
        EVIDENCE_PILLAR_LEARNING_ORDER.indexOf(
          right.id as (typeof EVIDENCE_PILLAR_LEARNING_ORDER)[number],
        )
      );
    });

  for (const pillar of sortedPillars) {
    push(repEvidencePillarLearningGuidance(pillar.id, pillar.status));
  }

  return lines.slice(0, 6);
}

export function focusCueToObjective(cue: string): string {
  const trimmed = cue.trim();
  if (!trimmed) return trimmed;

  if (/^does the provider react/i.test(trimmed)) {
    return "Listen for provider frustrations";
  }
  if (/^does staff show/i.test(trimmed)) {
    return "Listen for staff frustrations";
  }

  const slowMatch = trimmed.match(/^does (.+?) slow the case/i);
  if (slowMatch?.[1]) {
    return `Watch whether ${slowMatch[1].trim()} slows the workflow`;
  }

  const againMatch = trimmed.match(/^does (.+?) happen again/i);
  if (againMatch?.[1]) {
    return `Observe whether ${againMatch[1].trim()} repeats`;
  }

  const usedAgainMatch = trimmed.match(/^is (.+?) used again/i);
  if (usedAgainMatch?.[1]) {
    return `Note whether ${usedAgainMatch[1].trim()} is used again`;
  }

  const confirmUsedMatch = trimmed.match(/^confirm whether (.+?) is used/i);
  if (confirmUsedMatch?.[1]) {
    return `Note whether ${confirmUsedMatch[1].trim()} is used`;
  }

  const productFitMatch = trimmed.match(/^does the (.+?) create a product-fit opening/i);
  if (productFitMatch?.[1]) {
    return `Watch for product-fit openings around ${productFitMatch[1].trim()}`;
  }

  if (/^identify current product used/i.test(trimmed)) {
    return "Identify products used during the case";
  }
  if (/^current product identified/i.test(trimmed)) {
    return "Identify products used during the case";
  }
  if (/^capture baseline workflow/i.test(trimmed)) {
    return "Observe workflow, product use, and any provider or staff friction";
  }
  if (/^watch for provider or staff friction/i.test(trimmed)) {
    return "Watch for provider or staff friction";
  }
  if (/^pay attention to product use/i.test(trimmed)) {
    return trimmed.replace(/^pay attention to/i, "Observe");
  }
  if (/^watch whether/i.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  if (/^confirm whether/i.test(trimmed)) {
    return trimmed.replace(/^confirm whether/i, "Note whether");
  }
  if (/^capture any product-fit opportunity/i.test(trimmed)) {
    return "Watch for product-fit opportunities and related workflow friction";
  }

  return trimmed.endsWith(".") ? trimmed : `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

export function buildFocusObjectiveLines(focusCues: string[], fallbackFocus?: string): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const cue of focusCues) {
    const objective = focusCueToObjective(cue);
    const key = objective.toLowerCase();
    if (!objective || seen.has(key)) continue;
    seen.add(key);
    lines.push(objective);
  }

  if (lines.length === 0 && fallbackFocus) {
    lines.push(focusCueToObjective(fallbackFocus));
  }

  if (lines.length === 0) {
    lines.push("Observe workflow, product use, and any provider or staff friction");
  }

  return lines.slice(0, 5);
}

function providerBriefingFromFinding(
  finding: AggregatedFindingEvidence,
  providerName: string | null,
): string | null {
  const counts = repFindingCountsFromFinding(finding);
  const completed = counts.completedObservationCount;
  if (completed < 1 && !counts.capturedFromCurrentNote) return null;

  const signal = findingToIntelligenceSignal(finding, { procedureContext: null });

  if (signal.type === "observed_product" || signal.type === "competitor_product") {
    const product = String(signal.productContext ?? signal.label)
      .replace(/\s+observed$/i, "")
      .trim();
    return formatRepProviderHistoryProductLine(product, counts) || null;
  }

  if (signal.type === "workflow_signal" || signal.type === "workflow_bottleneck") {
    const topic = repWorkflowTopicFromLabel(signal.label);
    return formatRepProviderHistoryWorkflowLine(topic, counts) || null;
  }

  if (signal.type === "provider_pain_point") {
    const topic = painTopicFromTitle(signal.label);
    const line =
      providerName
        ? `${providerName} has commented on ${topic}`
        : `Provider has commented on ${topic}`;
    return appendRepPendingSuffix(
      completed >= 2 ? `${line} across completed cases` : line,
      counts,
    );
  }

  if (signal.type === "staff_pain_point") {
    const topic = painTopicFromTitle(signal.label);
    return appendRepPendingSuffix(`Staff frustrations around ${topic} have been noted`, counts);
  }

  if (isPositiveStaffContextSignal(signal)) {
    return formatRepStaffPositiveLine(signal.label, counts);
  }

  if (finding.normalizedFindingId.startsWith("staff_efficiency:")) {
    return formatRepStaffPositiveLine(staffEfficiencyRepLabel(finding.label), counts);
  }

  return null;
}

export function buildProviderFieldBriefing(input: {
  findings: AggregatedFindingEvidence[];
  evidenceGaps: string[];
  evidenceProgress: Array<{ id: string; status: EvidenceAreaStatus }>;
  providerName: string | null;
  procedureContext?: string | null;
}): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  const push = (line: string) => {
    const key = line.toLowerCase();
    if (!line || seen.has(key)) return;
    seen.add(key);
    lines.push(line);
  };

  for (const finding of input.findings) {
    if (finding.isInferred) continue;
    push(providerBriefingFromFinding(finding, input.providerName) ?? "");
  }

  const providerPainMissing = input.evidenceProgress.some(
    (pillar) => pillar.id === "provider_pain_points" && pillar.status === "missing",
  );
  const staffPainMissing = input.evidenceProgress.some(
    (pillar) => pillar.id === "staff_pain_points" && pillar.status === "missing",
  );

  if (providerPainMissing) {
    push("No provider frustrations have been identified yet.");
  }
  if (staffPainMissing) {
    push("No staff frustrations have been identified yet.");
  }

  for (const gap of input.evidenceGaps) {
    const translated = translateEvidenceGapToLearningQuestion(gap);
    if (/finish this case/i.test(translated)) continue;
    if (/listen for provider frustrations/i.test(translated) && providerPainMissing) continue;
    if (/staff workflow friction|staff pain/i.test(translated) && staffPainMissing) continue;
    if (/validate whether product and workflow observations repeat/i.test(translated)) {
      push("Additional observations would help confirm workflow and product patterns.");
    }
  }

  return lines.slice(0, 6);
}

export function buildDebriefReadinessReasons(input: {
  findings: AggregatedFindingEvidence[];
  evidenceGaps: string[];
  evidenceProgress: Array<{ id: string; status: EvidenceAreaStatus }>;
  providerName: string | null;
}): string[] {
  const reasons: string[] = [];
  const seen = new Set<string>();

  const push = (line: string) => {
    const key = line.toLowerCase();
    if (!line || seen.has(key)) return;
    seen.add(key);
    reasons.push(line);
  };

  const workflowEstablished = input.findings.some(
    (finding) =>
      isEstablishedFinding(finding) &&
      (finding.normalizedFindingId.startsWith("workflow_") ||
        finding.normalizedFindingId === "visualization_challenge"),
  );
  const productEstablished = input.findings.some(
    (finding) =>
      isEstablishedFinding(finding) &&
      finding.normalizedFindingId.startsWith("product_in_use:"),
  );
  const providerPainMissing = input.evidenceProgress.some(
    (pillar) => pillar.id === "provider_pain_points" && pillar.status === "missing",
  );
  const staffPainMissing = input.evidenceProgress.some(
    (pillar) => pillar.id === "staff_pain_points" && pillar.status === "missing",
  );
  const hasProviderPainFinding = input.findings.some((finding) =>
    /provider_pain|provider_sentiment|provider_frustration/.test(finding.normalizedFindingId),
  );
  const hasStaffFrictionFinding = input.findings.some((finding) =>
    /staff_pain|staff_friction/.test(finding.normalizedFindingId),
  );
  const hasStaffAreaFinding = input.findings.some((finding) =>
    /staff_pain|staff_workflow|staff_efficiency/.test(finding.normalizedFindingId),
  );

  if (workflowEstablished) {
    push("Workflow concerns appear repeatedly");
  }
  if (productEstablished) {
    push("Product use pattern is clear");
  }
  if (providerPainMissing && !hasProviderPainFinding) {
    push("Provider frustrations still unknown");
  }
  if (staffPainMissing && !hasStaffFrictionFinding && !hasStaffAreaFinding) {
    push("Staff frustrations not yet understood");
  }

  if (reasons.length === 0) {
    for (const gap of input.evidenceGaps.slice(0, 3)) {
      push(translateEvidenceGapToLearningQuestion(gap));
    }
  }

  return reasons.slice(0, 4);
}

export function buildDebriefReadinessNextStep(input: {
  phase: DebriefReadinessPhase;
  observationsRemaining: number;
  stillNeedToLearn: string[];
  focusObjectives: string[];
  debriefUnlocked: boolean;
  /** When provided, missing observation areas are named directly in the locked next step. */
  evidenceProgress?: Array<{ id: string; status: EvidenceAreaStatus }>;
}): string {
  if (input.debriefUnlocked) {
    return "Generate the provider debrief when you are ready to walk through what you've learned.";
  }

  const focusHint = input.focusObjectives[0]?.toLowerCase() ?? "";
  const gapHint = input.stillNeedToLearn
    .slice(0, 2)
    .map((gap) => gap.toLowerCase())
    .join(" and ");

  if (input.phase === "ready") {
    return "Review what you've learned and prepare for the provider debrief.";
  }

  if (input.observationsRemaining > 0) {
    const countLabel =
      input.observationsRemaining === 1
        ? "1 more observation"
        : `${input.observationsRemaining} more observations`;

    const missingPillars = (input.evidenceProgress ?? [])
      .filter((pillar) => pillar.status === "missing")
      .map((pillar) => repEvidencePillarLabel(pillar.id, pillar.id).toLowerCase())
      .slice(0, 2);
    if (missingPillars.length > 0) {
      return `Capture ${countLabel} — prioritize ${missingPillars.join(" and ")} — to strengthen debrief readiness.`;
    }

    if (gapHint && focusHint) {
      return `Capture ${countLabel} focused on ${gapHint}, especially ${focusHint}, to strengthen debrief readiness.`;
    }
    if (gapHint) {
      return `Capture ${countLabel} focused on ${gapHint} to strengthen debrief readiness.`;
    }
    if (focusHint) {
      return `Capture ${countLabel} with attention to ${focusHint} to strengthen debrief readiness.`;
    }
    return `Capture ${countLabel} to strengthen debrief readiness.`;
  }

  return "Continue capturing observations to build debrief readiness.";
}

export function repProgramMaturityNote(input: {
  currentCaseComplete: boolean;
  currentCaseHasCapturedNotes: boolean;
}): string {
  if (input.currentCaseComplete) {
    return "This case counts toward the observation program.";
  }
  if (input.currentCaseHasCapturedNotes) {
    return "Mark this case complete when your observation note is finished.";
  }
  return "Add a case note to start capturing observations.";
}
