/**
 * Observation workflow intelligence — prioritized field guidance (not CRM checklists).
 */

import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import { formatObservationCaseOperationalContext, isObservationOverviewPlaceholderValue } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { DISCOVERY_OPEN_QUESTION_SIGNAL_ORDER } from "@/lib/surgical-sales/discoveryIntelligenceOpenQuestions";
import { discoverySignalOperationalNarrative } from "@/lib/surgical-sales/discoveryIntelligenceNarrative";
import {
  DISCOVERY_FIELD_STATUS,
  isDiscoverySignalStatusResolved,
  resolveDiscoveryStructuredSignalStatus,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  buildProviderIntelligencePreviewForRep,
  translateRepIntelligenceText,
} from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import {
  observationQuickFindingsFromCaseRow,
  type ObservationQuickFindingsDraft,
} from "@/lib/surgical-sales/observationQuickFindings";
import {
  formatObservationWatchItemLabel,
  observationWatchItemsFromCaseRow,
} from "@/lib/surgical-sales/observationWatchItems";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  dedupeObservationIntelligenceBullets,
  isGenericObservationIntelligenceLabel,
  isProviderSourcedIntelligenceFragment,
} from "@/lib/surgical-sales/observationCaseIntelligenceDedup";

export const OBSERVATION_READINESS_MAX_PER_SECTION = 5;

export type ObservationReadinessSummary = {
  known: string[];
  needsConfirmation: string[];
  nextBestQuestions: string[];
  readinessScore: number;
  openQuestionsCount: number;
  hasContent: boolean;
  /** @deprecated Use needsConfirmation + nextBestQuestions */
  stillNeedToLearn: string[];
  /** @deprecated Use known */
  confirmed: string[];
};

type ReadinessBucket = "known" | "needsConfirmation" | "nextBestQuestions";

type ScoredLine = {
  text: string;
  score: number;
  bucket: ReadinessBucket;
};

const DISCOVERY_STILL_NEED: Partial<Record<DiscoveryStructuredSignalId, string>> = {
  observation_approval: "Observation access process",
  scheduling_owner: "Scheduling owner",
  facility_vendor_pathway: "Facility vendor pathway",
  workflow_visibility: "Procedure workflow visibility",
  product_alignment: "Product fit alignment",
  clinical_champion: "Clinical champion",
};

const DISCOVERY_CONFIRMED: Partial<Record<DiscoveryStructuredSignalId, string>> = {
  observation_approval: "Observation approved",
  scheduling_owner: "Scheduling owner identified",
  facility_vendor_pathway: "Access pathway confirmed",
  workflow_visibility: "Workflow understanding confirmed",
  product_alignment: "Product alignment confirmed",
  clinical_champion: "Clinical champion identified",
};

const DISCOVERY_CONFIRMATION_QUESTIONS: Partial<Record<DiscoveryStructuredSignalId, string>> = {
  observation_approval: "What is the observation access process?",
  scheduling_owner: "Who owns scheduling?",
  facility_vendor_pathway: "What is the vendor access process at this facility?",
  workflow_visibility: "Which workflow steps should we focus on?",
  product_alignment: "How does product fit this procedure?",
  clinical_champion: "Who is the clinical champion for this pathway?",
};

function splitQuestionLines(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);
}

function pushScored(target: ScoredLine[], bucket: ReadinessBucket, text: string, score: number): void {
  const trimmed = text.trim();
  if (!trimmed || isGenericObservationIntelligenceLabel(trimmed)) return;
  const key = trimmed.toLowerCase();
  if (target.some((entry) => entry.text.toLowerCase() === key)) return;
  target.push({ text: trimmed, score, bucket });
}

function pushSourcedScored(target: ScoredLine[], bucket: ReadinessBucket, text: string, score: number): void {
  if (isProviderSourcedIntelligenceFragment(text)) return;
  pushScored(target, bucket, text, score);
}

function providerFieldDetailLine(dbKey: string, contact: Record<string, unknown>): string | null {
  const raw = String(contact[dbKey] ?? "").trim();
  if (!raw) return null;
  const text = translateRepIntelligenceText(raw, dbKey) ?? raw;
  if (!text || isProviderSourcedIntelligenceFragment(text) || isGenericObservationIntelligenceLabel(text)) {
    return null;
  }
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function takeBucket(lines: ScoredLine[], bucket: ReadinessBucket, max: number): string[] {
  return [...lines]
    .filter((line) => line.bucket === bucket)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((line) => line.text);
}

export function computeObservationReadinessScore(input: {
  known: string[];
  needsConfirmation: string[];
  nextBestQuestions: string[];
}): number {
  const { known, needsConfirmation, nextBestQuestions } = input;
  if (known.length === 0 && needsConfirmation.length === 0 && nextBestQuestions.length === 0) {
    return 0;
  }
  const knownWeight = known.length * 18;
  const confirmPenalty = needsConfirmation.length * 7;
  const questionPenalty = nextBestQuestions.length * 11;
  return Math.max(0, Math.min(100, 24 + knownWeight - confirmPenalty - questionPenalty));
}

function appendCaseAccessSummary(
  caseRow: Record<string, unknown>,
  providerContact: Record<string, unknown> | null | undefined,
  scored: ScoredLine[],
): void {
  const schedulingOwner = String(caseRow.observation_access_scheduling_owner ?? "").trim();
  const pathway = String(caseRow.observation_access_pathway ?? "").trim();
  const credentialing = String(caseRow.observation_access_credentialing ?? "unknown").trim().toLowerCase();
  const accessNotes = String(providerContact?.access_notes ?? "").trim();

  if (schedulingOwner) {
    pushScored(scored, "known", "Scheduling owner identified", 70);
  } else {
    pushScored(scored, "nextBestQuestions", "Who owns scheduling for this case?", 92);
  }

  if (pathway) {
    pushScored(scored, "known", "Access pathway noted for this case", 68);
  } else {
    pushScored(scored, "nextBestQuestions", "What is the observation access process?", 88);
  }

  if (credentialing === "verified" || credentialing === "not_required") {
    pushScored(
      scored,
      "known",
      credentialing === "verified" ? "Credentialing confirmed" : "Credentialing not required",
      72,
    );
  } else if (credentialing === "in_progress") {
    pushScored(scored, "needsConfirmation", "Credentialing in progress", 75);
  } else if (credentialing === "required_not_started") {
    pushScored(scored, "nextBestQuestions", "Has credentialing been started?", 86);
  } else {
    pushScored(scored, "nextBestQuestions", "Credentialing requirements?", 86);
  }

  if (accessNotes) {
    pushScored(scored, "known", "Provider access notes on file", 55);
  }
}

function appendDiscoverySignals(contact: Record<string, unknown>, scored: ScoredLine[]): void {
  for (const signalId of DISCOVERY_OPEN_QUESTION_SIGNAL_ORDER) {
    const status = resolveDiscoveryStructuredSignalStatus(signalId, contact);
    if (isDiscoverySignalStatusResolved(signalId, status)) {
      const line = DISCOVERY_CONFIRMED[signalId];
      if (line) pushScored(scored, "known", line, 65);
      continue;
    }
    if (status === DISCOVERY_FIELD_STATUS.validated || status === DISCOVERY_FIELD_STATUS.notApplicable) {
      continue;
    }
    const short = DISCOVERY_STILL_NEED[signalId];
    if (short) {
      const question = DISCOVERY_CONFIRMATION_QUESTIONS[signalId];
      if (!question) continue;
      const bucket: ReadinessBucket =
        signalId === "observation_approval" || signalId === "scheduling_owner"
          ? "nextBestQuestions"
          : "needsConfirmation";
      const score = bucket === "nextBestQuestions" ? 84 : 58;
      pushScored(scored, bucket, question, score);
      continue;
    }
    const narrative = discoverySignalOperationalNarrative(signalId, status);
    if (narrative) pushSourcedScored(scored, "needsConfirmation", narrative, 50);
  }
}

function appendProviderGaps(
  contact: Record<string, unknown>,
  planning: ProviderPlanningCompletion | null | undefined,
  scored: ScoredLine[],
): void {
  let added = 0;
  for (const gap of buildIntelligenceLearningGaps(contact, planning ?? null, 8)) {
    if (added >= 2) break;
    const phrase = translateRepIntelligenceText(gap.phrase, gap.dbKey) ?? gap.phrase;
    const detail = providerFieldDetailLine(gap.dbKey, contact) ?? phrase;
    if (!detail || detail.length > 80) continue;
    pushSourcedScored(scored, "needsConfirmation", detail, gap.state === "outdated" ? 45 : 42);
    added += 1;
  }
}

function appendProviderConfirmedFields(
  contact: Record<string, unknown>,
  planning: ProviderPlanningCompletion | null | undefined,
  scored: ScoredLine[],
): void {
  const preview = buildProviderIntelligencePreviewForRep(contact, {
    planning,
    maxItemsPerGroup: 3,
    maxOpenQuestions: 2,
  });

  for (const group of preview.groups) {
    for (const item of group.items) {
      if (item.status !== "Confirmed") continue;
      const text = translateRepIntelligenceText(item.text, item.dbKey) ?? item.text;
      if (!text || text.length > 72) {
        if (item.dbKey) {
          const detail = providerFieldDetailLine(item.dbKey, contact);
          if (detail) pushSourcedScored(scored, "known", detail, 54);
        }
        continue;
      }
      pushSourcedScored(scored, "known", text, 54);
    }
  }
}

function appendOperationalContext(
  operationalContext: CaseOperationalContextView | null | undefined,
  scored: ScoredLine[],
): void {
  if (!operationalContext) return;
  const brief = formatObservationCaseOperationalContext(operationalContext);

  for (const item of [...brief.facility.items, ...brief.provider.items].slice(0, 3)) {
    const value = String(item.value ?? "").trim();
    if (!value || isObservationOverviewPlaceholderValue(value)) continue;
    pushScored(scored, "known", `${item.label}: ${value}`, 44);
  }
}

function appendValidationTargets(caseRow: Record<string, unknown>, scored: ScoredLine[]): void {
  for (const item of observationWatchItemsFromCaseRow(caseRow)) {
    const label = formatObservationWatchItemLabel(
      item.label,
      item.source === "provider_signal" ? "provider_evaluation_openness" : undefined,
    );
    if (item.status === "observed") {
      pushScored(scored, "known", `${label} — validated`, 80);
    } else {
      pushScored(scored, "nextBestQuestions", label, 90);
    }
  }
}

function appendCaseOpenQuestions(caseRow: Record<string, unknown>, scored: ScoredLine[]): void {
  const raw = String(caseRow.live_observation_questions ?? "").trim();
  if (!raw) return;
  for (const line of splitQuestionLines(raw)) {
    pushScored(scored, "nextBestQuestions", line, 95);
  }
}

function appendQuickFindingSignals(findings: ObservationQuickFindingsDraft, scored: ScoredLine[]): void {
  if (findings.workflow_fit === "Strong" || findings.workflow_fit === "Possible") {
    pushScored(scored, "known", "Workflow fit noted on case", 60);
  }

  if (findings.product_interest === "Mentioned" || findings.product_interest === "Strong") {
    pushScored(scored, "known", "Product interest noted", 58);
  }

  if (findings.competitor_seen === "Yes") {
    pushScored(scored, "known", "Competitor product observed", 57);
  }

  if (findings.workflow_friction === "Yes") {
    pushScored(scored, "known", "Workflow friction observed", 55);
  }

  if (findings.follow_up_needed === "Yes") {
    pushScored(scored, "nextBestQuestions", "What follow-up is needed after this case?", 78);
  }
}

function reconcileScoredLines(scored: ScoredLine[]): void {
  const knownKeys = new Set(
    scored.filter((line) => line.bucket === "known").map((line) => line.text.toLowerCase()),
  );
  const dropWhenKnown: Array<{ knownNeedle: string; dropNeedles: string[] }> = [
    {
      knownNeedle: "access pathway noted for this case",
      dropNeedles: [
        "what is the observation access process",
        "observation access process",
        "what is the vendor access process at this facility",
      ],
    },
    {
      knownNeedle: "observation access pathway is documented",
      dropNeedles: [
        "what is the observation access process",
        "observation access process",
        "access pathway noted for this case",
        "access pathway confirmed",
      ],
    },
    {
      knownNeedle: "access pathway confirmed",
      dropNeedles: [
        "what is the observation access process",
        "observation access process",
        "access pathway noted for this case",
        "observation access pathway is documented",
      ],
    },
    {
      knownNeedle: "scheduling owner identified",
      dropNeedles: ["who owns scheduling for this case", "scheduling owner"],
    },
    {
      knownNeedle: "observation approved",
      dropNeedles: ["observation access process"],
    },
    {
      knownNeedle: "credentialing confirmed",
      dropNeedles: ["has credentialing been started", "credentialing path", "credentialing in progress"],
    },
    {
      knownNeedle: "credentialing not required",
      dropNeedles: ["has credentialing been started", "credentialing path", "credentialing in progress"],
    },
  ];

  for (let index = scored.length - 1; index >= 0; index -= 1) {
    const line = scored[index]!;
    if (line.bucket === "known") continue;
    const lineKey = line.text.toLowerCase();
    for (const rule of dropWhenKnown) {
      if (!knownKeys.has(rule.knownNeedle)) continue;
      if (rule.dropNeedles.some((needle) => lineKey === needle || lineKey.includes(needle))) {
        scored.splice(index, 1);
        break;
      }
    }
  }
}

export function buildObservationReadinessSummary(input: {
  caseRow: Record<string, unknown>;
  operationalContext?: CaseOperationalContextView | null;
  providerContact?: Record<string, unknown> | null;
  planning?: ProviderPlanningCompletion | null;
}): ObservationReadinessSummary {
  const scored: ScoredLine[] = [];

  appendCaseAccessSummary(input.caseRow, input.providerContact, scored);

  if (input.providerContact) {
    appendDiscoverySignals(input.providerContact, scored);
    appendProviderGaps(input.providerContact, input.planning, scored);
    appendProviderConfirmedFields(input.providerContact, input.planning, scored);
  }

  appendOperationalContext(input.operationalContext, scored);
  appendValidationTargets(input.caseRow, scored);
  appendCaseOpenQuestions(input.caseRow, scored);
  appendQuickFindingSignals(observationQuickFindingsFromCaseRow(input.caseRow), scored);

  reconcileScoredLines(scored);

  const max = OBSERVATION_READINESS_MAX_PER_SECTION;
  const known = dedupeObservationIntelligenceBullets(takeBucket(scored, "known", max * 2), max);
  const needsConfirmation = dedupeObservationIntelligenceBullets(
    takeBucket(scored, "needsConfirmation", max * 2),
    max,
  );
  const nextBestQuestions = dedupeObservationIntelligenceBullets(
    takeBucket(scored, "nextBestQuestions", max * 2),
    max,
  );
  const readinessScore = computeObservationReadinessScore({ known, needsConfirmation, nextBestQuestions });

  return {
    known,
    needsConfirmation,
    nextBestQuestions,
    readinessScore,
    openQuestionsCount: nextBestQuestions.length,
    hasContent: known.length > 0 || needsConfirmation.length > 0 || nextBestQuestions.length > 0,
    stillNeedToLearn: [...needsConfirmation, ...nextBestQuestions],
    confirmed: known,
  };
}
