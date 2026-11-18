/**
 * Rep-facing recommended next steps — concrete field actions only (no fragments or invented facts).
 */

import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { sanitizePipelineSalesCopy } from "@/lib/surgical-sales/debriefIntelligencePipeline/salesCopy";
import type {
  DebriefClassifiedFact,
  DebriefRulesOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import {
  classifyClassifiedFactMaturity,
  extractedIntelligenceMeetsPlanningThreshold,
  maturityPriorityBoost,
} from "@/lib/surgical-sales/extractedIntelligenceClassification";
import {
  isIncompleteSentenceFragment,
  isLowQualityIntelligenceText,
} from "@/lib/surgical-sales/operationalIntelligenceDisplay";

const MAX_STEPS = 5;

const ACTION_VERB_RE =
  /^(?:get|confirm|ask|schedule|contact|capture|validate|follow up|obtain|verify|document|clarify|check|determine|request|establish|find out)\b/i;

const GENERIC_NEXT_STEP_RE = [
  /^identify\s+(?:surgical|the|a|an|office|vendor|platform|pathway|scheduling|credentialing)\b/i,
  /^identify\s+[a-z]+\.?$/i,
  /\bpathway\s*confirmation\b/i,
  /\bplatform and steps\b/i,
  /^observation approval pathway\b/i,
  /^authority confirmation\b/i,
  /^contact information\b/i,
  /^confirm credentialing process\b/i,
  /^what is\b/i,
  /^who owns\b/i,
  /^has the provider\b/i,
  /^still unclear:/i,
  /^next:/i,
];

function normalizeStep(raw: string): string {
  let line = sanitizePipelineSalesCopy(raw.replace(/\?+$/, "").trim(), 160);
  if (!line) return "";
  if (!/[.!?]$/.test(line)) line = `${line}.`;
  return line.charAt(0).toUpperCase() + line.slice(1);
}

function dedupKey(line: string): string {
  return line.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function isConcreteFieldActionStep(text: string): boolean {
  const line = normalizeStep(text);
  if (!line || line.length < 14) return false;
  if (isLowQualityIntelligenceText(line)) return false;
  if (isIncompleteSentenceFragment(line)) return false;
  if (GENERIC_NEXT_STEP_RE.some((re) => re.test(line))) return false;
  if (!ACTION_VERB_RE.test(line)) return false;
  const words = line.split(/\s+/).filter(Boolean).length;
  if (words < 4) return false;
  return true;
}

/** Map discovery-style questions or still-needed labels into field actions. */
export function convertOpenQuestionToFieldAction(question: string): string | null {
  const q = question.trim().replace(/\?+$/, "");
  const lower = q.toLowerCase();

  if (/credentialing|vendor approval|facility approval|platform/.test(lower)) {
    return normalizeStep("Confirm which credentialing platform is required.");
  }
  if (/approved observation|observation access|approves.*observation/.test(lower)) {
    return normalizeStep("Confirm who officially approves vendor observation access.");
  }
  if (/who owns.*scheduling|scheduling owner|scheduling approval|office vs hospital/.test(lower)) {
    return normalizeStep(
      "Confirm whether the provider office or hospital controls final scheduling approval.",
    );
  }
  if (/^what is the credentialing/.test(lower)) {
    return normalizeStep("Confirm which credentialing platform is required.");
  }
  if (/upcoming case|case.*observation|available for observation/.test(lower)) {
    return normalizeStep("Ask what upcoming cases may be available for observation.");
  }
  if (/workflow/.test(lower) && /\b(what|which|how)\b/.test(lower)) {
    return normalizeStep("Ask what workflow steps still need validation before observation.");
  }
  if (/product category|most relevant/.test(lower)) {
    return normalizeStep("Ask which product categories fit the procedures discussed.");
  }
  if (/champion|move access|inside the account/.test(lower)) {
    return normalizeStep("Ask who inside the account can help move observation access forward.");
  }

  if (/\bwhat is\b/i.test(q)) {
    const rewritten = normalizeStep(
      `Confirm ${q.replace(/^what is (?:the )?/i, "which ")}`,
    );
    return isConcreteFieldActionStep(rewritten) ? rewritten : null;
  }

  return isConcreteFieldActionStep(q) ? normalizeStep(q) : null;
}

function stillNeededLabelToAction(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  if (/platform|credentialing step|credentialing pathway/.test(lower)) {
    return normalizeStep("Confirm which credentialing platform is required.");
  }
  if (/observation approval|approval pathway/.test(lower)) {
    return normalizeStep("Confirm who officially approves vendor observation access.");
  }
  if (/authority|office vs hospital/.test(lower)) {
    return normalizeStep(
      "Confirm whether the provider office or hospital controls final scheduling approval.",
    );
  }
  return convertOpenQuestionToFieldAction(raw);
}

export function contactInfoNextStepForName(displayName: string): string {
  const first = displayName.trim().split(/\s+/)[0] || displayName;
  return normalizeStep(`Get ${first}'s phone or email.`);
}

export function buildConcreteDebriefNextSteps(input: {
  dictation: string;
  rules?: DebriefRulesOutcome;
  acceptedFacts?: DebriefClassifiedFact[];
  proposedContacts?: DebriefProposedContactItem[];
  unresolvedItems?: string[];
  aiRecommendedMoves?: string[];
}): string[] {
  const dictation = input.dictation.trim();
  const rules = input.rules;
  const facts = input.acceptedFacts ?? [];
  const candidates: Array<{ text: string; priority: number }> = [];

  const add = (text: string, priority: number) => {
    const step = normalizeStep(text);
    if (!isConcreteFieldActionStep(step)) return;
    candidates.push({ text: step, priority });
  };

  const credentialingDiscussed =
    facts.some((f) => f.classification === "credentialing") || /\bcredential/i.test(dictation);
  const schedulingDiscussed =
    facts.some((f) => f.classification === "scheduling") || /\bschedul/i.test(dictation);
  const schedulingConfirmed = facts.some(
    (f) =>
      f.classification === "scheduling" &&
      extractedIntelligenceMeetsPlanningThreshold(classifyClassifiedFactMaturity(f)),
  );
  const credentialingConfirmed = facts.some(
    (f) =>
      f.classification === "credentialing" &&
      extractedIntelligenceMeetsPlanningThreshold(classifyClassifiedFactMaturity(f)),
  );
  const observationDiscussed = /\bobserv/i.test(dictation) || facts.some((f) => f.classification === "observation_access");

  if (rules && !rules.observationApprovedExplicit) {
    if (rules.credentialingPlatformLabel === "Unknown" && credentialingDiscussed && !credentialingConfirmed) {
      add("Confirm which credentialing platform is required.", 10);
    }
    if (observationDiscussed && (rules.observationInterestOnly || facts.some((f) => /access|approval/i.test(f.fact_text)))) {
      add("Confirm who officially approves vendor observation access.", 12);
    }
    if (schedulingDiscussed && !schedulingConfirmed) {
      add(
        "Confirm whether the provider office or hospital controls final scheduling approval.",
        14,
      );
    }
  }

  const contactNamesAdded = new Set<string>();
  for (const contact of input.proposedContacts ?? []) {
    if (contact.disposition === "skipped") continue;
    if (!contact.contactDetailsMissing || !isPlausiblePersonName(contact.displayName)) continue;
    const key = contact.displayName.toLowerCase();
    if (contactNamesAdded.has(key)) continue;
    contactNamesAdded.add(key);
    add(contactInfoNextStepForName(contact.displayName), 11);
  }

  for (const name of rules?.workflowParticipantNames ?? []) {
    if (!isPlausiblePersonName(name)) continue;
    const key = name.toLowerCase();
    if (contactNamesAdded.has(key)) continue;
    const hasOnFile = input.proposedContacts?.some(
      (c) => c.displayName.toLowerCase() === key && !c.contactDetailsMissing,
    );
    if (hasOnFile) continue;
    contactNamesAdded.add(key);
    add(contactInfoNextStepForName(name), 11);
  }

  if (
    observationDiscussed &&
    !rules?.observationApprovedExplicit &&
    (facts.some((f) => f.classification === "clinical_focus") ||
      /\b(?:case|procedure|hernia|robotic|volume)\b/i.test(dictation))
  ) {
    add("Ask what upcoming cases may be available for observation.", 22);
  }

  if (rules?.credentialingPlatformLabel === "Unknown" && credentialingDiscussed) {
    add("Schedule follow-up after credentialing path is confirmed.", 28);
  }

  for (const raw of input.unresolvedItems ?? []) {
    const action = stillNeededLabelToAction(raw);
    if (action) add(action, 24);
  }

  for (const move of input.aiRecommendedMoves ?? []) {
    const trimmed = move.trim();
    if (!trimmed) continue;
    const action = convertOpenQuestionToFieldAction(trimmed) ?? (isConcreteFieldActionStep(trimmed) ? normalizeStep(trimmed) : null);
    if (action) add(action, 32);
  }

  for (const fact of facts.filter((f) => f.classification === "next_step")) {
    const action =
      convertOpenQuestionToFieldAction(fact.fact_text) ??
      (isConcreteFieldActionStep(fact.fact_text) ? normalizeStep(fact.fact_text) : null);
    if (action) {
      add(action, 34 + maturityPriorityBoost(classifyClassifiedFactMaturity(fact)));
    }
  }

  for (const fact of facts) {
    if (!extractedIntelligenceMeetsPlanningThreshold(classifyClassifiedFactMaturity(fact))) {
      continue;
    }
    if (fact.classification === "next_step") continue;
    const action =
      convertOpenQuestionToFieldAction(fact.fact_text) ??
      (isConcreteFieldActionStep(fact.fact_text) ? normalizeStep(fact.fact_text) : null);
    if (action) add(action, 8 + maturityPriorityBoost(classifyClassifiedFactMaturity(fact)));
  }

  candidates.sort((a, b) => a.priority - b.priority);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const candidate of candidates) {
    const key = dedupKey(candidate.text);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(candidate.text);
    if (out.length >= MAX_STEPS) break;
  }
  return out;
}
