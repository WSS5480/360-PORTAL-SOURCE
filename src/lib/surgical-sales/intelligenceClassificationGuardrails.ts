/**
 * Server-side classification guardrails for structured debrief intelligence.
 * Prevents absence-of-knowledge, open rep needs, and partial facts from landing as confirmed updates.
 */

import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import { applyObservationApprovalDebriefGuardrails } from "@/lib/surgical-sales/observationApprovalDebriefMapping";
import { sanitizeFieldIntelligenceText } from "@/lib/surgical-sales/fieldIntelligenceLanguage";
import type {
  ConfirmedIntelligenceUpdate,
  IntelligenceDomain,
  PartialIntelligenceUpdate,
  StillToValidate,
} from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

export type IntelligenceRowClassification = "confirmed" | "partial" | "still_to_validate" | "omit";

const UNCERTAINTY_MARKERS =
  /\b(?:but|however|although|though|didn['']?t|did not|don['']?t know|do not know|not sure|unclear|not yet|yet to|still need(?:s)?|still learning|still figuring|rough(?:ly)?|approximate(?:ly)?|partial(?:ly)?|incomplete|without a (?:clear|good|detailed)|no (?:clear|good|detailed|full)|didn['']?t get|have not gotten|haven['']?t gotten|need(?:s)? (?:more )?(?:confirmation|validation|breakdown|detail)|to be determined|tbd|mixed but)\b/i;

const ABSENCE_AS_FACT =
  /\b(?:not (?:yet )?(?:identified|known|confirmed|validated|mapped|determined|established)|unknown|unidentified|missing (?:info(?:rmation)?|data|detail|breakdown|owner|contact)|no (?:breakdown|visibility|owner|contact|named)|owner not|not (?:fully )?mapped|absence of|lack of visibility|without (?:a |any )?(?:named|clear|identified))\b/i;

const REP_OPEN_NEED =
  /\b(?:i|we)\s+(?:still\s+)?need\s+to\s+(?:figure|learn|confirm|validate|find|identify|get|understand|clarify)\b/i;

const INFERRED_COMMERCIAL =
  /\b(?:will adopt|likely to adopt|ready to buy|evaluation (?:is )?likely|commercial impact|deal velocity|win probability|product acceptance|strong fit|committed to (?:use|buy)|definitely (?:using|buying))\b/i;

const AFFIRMATIVE_FACT =
  /\b(?:confirmed|requires|must|will not approve|approves|approved|goes through|is required|named contact|contact is|coordinator is|turnaround is|timeline is|process is)\b/i;

const QUESTION_START = /^\s*(?:who|what|when|where|which|how|whether)\b/i;

function combinedText(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function textHasUncertaintyMarkers(text: string): boolean {
  return UNCERTAINTY_MARKERS.test(text);
}

export function textStatesAbsenceAsFact(text: string): boolean {
  return ABSENCE_AS_FACT.test(text);
}

export function textIsRepOpenNeed(text: string): boolean {
  return REP_OPEN_NEED.test(text);
}

export function textInfersUnsupportedCommercial(text: string): boolean {
  return INFERRED_COMMERCIAL.test(text) && !AFFIRMATIVE_FACT.test(text);
}

export function classifyIntelligenceRow(input: {
  label: string;
  value: string;
  evidence?: string;
  reasoning?: string;
  confidence?: string;
}): IntelligenceRowClassification {
  const label = input.label.trim();
  const value = input.value.trim();
  const blob = combinedText([label, value, input.evidence, input.reasoning]);

  if (!label && !value) return "omit";

  if (QUESTION_START.test(value) || QUESTION_START.test(label)) {
    return "still_to_validate";
  }

  if (textIsRepOpenNeed(blob)) {
    return "still_to_validate";
  }

  if (textStatesAbsenceAsFact(label) || (textStatesAbsenceAsFact(value) && !AFFIRMATIVE_FACT.test(value))) {
    return "still_to_validate";
  }

  if (textInfersUnsupportedCommercial(blob)) {
    return "partial";
  }

  if (textHasUncertaintyMarkers(blob)) {
    return "partial";
  }

  if (input.confidence === "low") {
    return textStatesAbsenceAsFact(blob) ? "still_to_validate" : "partial";
  }

  if (input.confidence === "medium") {
    return "partial";
  }

  if (input.confidence === "high" && AFFIRMATIVE_FACT.test(blob) && !textHasUncertaintyMarkers(blob)) {
    return "confirmed";
  }

  if (input.confidence === "high" && !textHasUncertaintyMarkers(blob) && !textStatesAbsenceAsFact(blob)) {
    return "confirmed";
  }

  return "partial";
}

export function formatPartialUpdateLabel(
  domain: IntelligenceDomain,
  signal: string,
  existingLabel: string,
): string {
  const lower = `${signal} ${existingLabel}`.toLowerCase();
  if (domain === "case_mix" || /\bprocedure\s*mix\b|\bopen\b.*\b(?:lap|robotic)\b/i.test(lower)) {
    return "Procedure mix partially mapped";
  }
  if (/\bpartially\s+mapped\b/i.test(existingLabel)) return existingLabel;
  if (/\bpartial\b/i.test(existingLabel)) return existingLabel;
  const base = signal.trim() || existingLabel.trim() || "Update";
  return `${base} partially mapped`;
}

export function absenceOrNeedToValidationQuestion(
  label: string,
  value: string,
  evidence?: string,
): string | null {
  const blob = combinedText([label, value, evidence]);

  if (textIsRepOpenNeed(blob)) {
    const figure = blob.match(
      /\b(?:i|we)\s+(?:still\s+)?need\s+to\s+figure\s+out\s+(.+?)(?:[.;]|$)/i,
    );
    if (figure?.[1]) {
      const subject = figure[1].trim().replace(/\.$/, "");
      return subject.match(/^(who|what|when|where|which|how)\b/i)
        ? `${subject.charAt(0).toUpperCase()}${subject.slice(1)}?`
        : `Who or what is ${subject}?`;
    }
    const learn = blob.match(/\bneed\s+to\s+(?:learn|identify|confirm|validate)\s+(.+?)(?:[.;]|$)/i);
    if (learn?.[1]) {
      const subject = learn[1].trim().replace(/\.$/, "");
      return `What is ${subject}?`;
    }
  }

  if (/\bscheduling\b/i.test(blob) && /\b(?:access|owner|coordinator|contact)\b/i.test(blob)) {
    return "Who coordinates access or scheduling?";
  }

  if (/\bprocedure\s*mix\b|\bopen\b.*\b(?:lap|robotic)\b/i.test(blob)) {
    return "What is the detailed open/lap/robotic case breakdown?";
  }

  if (textStatesAbsenceAsFact(label)) {
    const cleaned = label
      .replace(/\b(not (?:yet )?(?:identified|known|confirmed|mapped)|unknown|missing)\b/gi, "")
      .trim();
    if (cleaned.length > 4) {
      return cleaned.endsWith("?") ? cleaned : `What is ${cleaned.toLowerCase()}?`;
    }
  }

  if (QUESTION_START.test(value)) {
    return value.endsWith("?") ? value : `${value}?`;
  }

  return null;
}

export function defaultStillNeedsForPartial(
  label: string,
  value: string,
  evidence?: string,
): string[] {
  const question = absenceOrNeedToValidationQuestion(label, value, evidence);
  const needs: string[] = [];
  if (question) needs.push(question.replace(/\?$/, "").trim() + " still needs confirmation");

  const blob = combinedText([label, value, evidence]);
  if (/\bprocedure\s*mix\b|\bopen\b.*\b(?:lap|robotic)\b/i.test(blob)) {
    needs.push("Detailed open/lap/robotic case breakdown still needs validation");
  }
  if (/\bbreakdown\b/i.test(blob) && textHasUncertaintyMarkers(blob)) {
    needs.push("Quantified breakdown still needs validation");
  }

  return [...new Set(needs.map((n) => n.trim()).filter(Boolean))].slice(0, 6);
}

function pushStillToValidate(
  list: StillToValidate[],
  entry: StillToValidate,
): StillToValidate[] {
  const key = entry.question.toLowerCase().trim();
  if (list.some((s) => s.question.toLowerCase().trim() === key)) return list;
  return [...list, entry];
}

function toPartialRow(
  row: ConfirmedIntelligenceUpdate,
  stillNeeds: string[],
): PartialIntelligenceUpdate {
  return {
    ...row,
    label: formatPartialUpdateLabel(row.domain, row.label, row.label),
    confidence: row.confidence === "high" ? "medium" : row.confidence,
    still_needs: stillNeeds.length ? stillNeeds : ["Additional detail still needs validation"],
  };
}

/** Reclassify model- or pipeline-derived updates before field routing and review UI. */
export function reclassifyIntelligenceMapping(
  mapping: LogUpdateOpenAiMapping,
  options?: { rawNote?: string },
): LogUpdateOpenAiMapping {
  const noteBlob = options?.rawNote?.trim() ?? "";

  let stillToValidate = [...mapping.still_to_validate];
  let partialUpdates: PartialIntelligenceUpdate[] = [];
  let confirmedUpdates: ConfirmedIntelligenceUpdate[] = [];
  let doNotUpdate = [...mapping.do_not_update];

  for (const row of mapping.confirmed_updates) {
    const kind = classifyIntelligenceRow({
      label: row.label,
      value: row.value,
      evidence: row.reasoning,
      reasoning: row.reasoning,
      confidence: row.confidence,
    });

    if (kind === "confirmed") {
      confirmedUpdates.push(row);
      continue;
    }

    if (kind === "still_to_validate") {
      const question =
        absenceOrNeedToValidationQuestion(row.label, row.value, row.reasoning) ??
        row.label.trim();
      stillToValidate = pushStillToValidate(stillToValidate, {
        domain: row.domain,
        question,
        priority: "high",
        save_target: row.save_target,
      });
      continue;
    }

    if (kind === "partial") {
      partialUpdates.push(
        toPartialRow(row, defaultStillNeedsForPartial(row.label, row.value, row.reasoning)),
      );
      continue;
    }

    doNotUpdate = [
      ...doNotUpdate,
      {
        item: row.label,
        reason: "Absence of knowledge or unsupported inference — not saved as a confirmed fact.",
      },
    ];
  }

  for (const row of mapping.partial_updates) {
    const kind = classifyIntelligenceRow({
      label: row.label,
      value: row.value,
      evidence: row.reasoning,
      reasoning: row.reasoning,
      confidence: row.confidence,
    });
    if (kind === "still_to_validate") {
      const question =
        absenceOrNeedToValidationQuestion(row.label, row.value, row.reasoning) ?? row.label;
      stillToValidate = pushStillToValidate(stillToValidate, {
        domain: row.domain,
        question,
        priority: "medium",
        save_target: row.save_target,
      });
      continue;
    }
    const stillNeeds =
      row.still_needs.length > 0
        ? row.still_needs
        : defaultStillNeedsForPartial(row.label, row.value, row.reasoning);
    partialUpdates.push({
      ...row,
      label: formatPartialUpdateLabel(row.domain, row.label, row.label),
      still_needs: stillNeeds,
      confidence: row.confidence === "high" ? "medium" : row.confidence,
    });
  }

  if (noteBlob) {
    const mixMatch = noteBlob.match(
      /\b(?:mix of|do(?:es)?)\s+open[^.]{0,120}?(?:lap|robotic)[^.]{0,120}?(?:didn['']?t|did not|no (?:good |clear )?breakdown|not yet)/i,
    );
    if (mixMatch) {
      const hasPartial = partialUpdates.some((p) => /procedure\s*mix/i.test(p.label));
      if (!hasPartial) {
        partialUpdates.push({
          domain: "case_mix",
          label: "Procedure mix partially mapped",
          value:
            "Open, lap, and robotic cases were mentioned, but detailed breakdown still needs validation.",
          still_needs: ["Detailed open/lap/robotic case breakdown still needs validation"],
          confidence: "medium",
          save_target: "provider",
          reasoning: "Rep noted case types without quantified breakdown.",
        });
      }
      confirmedUpdates = confirmedUpdates.filter(
        (u) => !/\bprocedure\s*mix\b.*\b(?:known|mapped|confirmed)\b/i.test(`${u.label} ${u.value}`),
      );
    }

    if (textIsRepOpenNeed(noteBlob) && /\b(?:access|scheduling|coordinator)\b/i.test(noteBlob)) {
      stillToValidate = pushStillToValidate(stillToValidate, {
        domain: "scheduling",
        question: "Who coordinates access or scheduling?",
        priority: "high",
        save_target: "organization",
      });
      confirmedUpdates = confirmedUpdates.filter(
        (u) =>
          !/\b(?:scheduling|access).*\b(?:not identified|unknown|missing|owner not)\b/i.test(
            `${u.label} ${u.value}`,
          ),
      );
    }
  }

  const operational_signals = (mapping.operational_signals ?? []).map((sig) => {
    const blob = combinedText([sig.evidence, sig.operational_meaning, sig.signal]);
    let confidence = sig.confidence;
    if (textIsRepOpenNeed(blob) || textStatesAbsenceAsFact(blob)) {
      confidence = "low";
    } else if (textHasUncertaintyMarkers(blob) && confidence === "high") {
      confidence = "medium";
    }
    return { ...sig, confidence };
  });

  const sanitized: LogUpdateOpenAiMapping = {
    ...mapping,
    summary: sanitizeFieldIntelligenceText(mapping.summary, { preferShort: true, maxLen: 320 }),
    operational_signals: operational_signals.map((sig) => ({
      ...sig,
      signal: sanitizeFieldIntelligenceText(sig.signal, { maxLen: 120 }),
      operational_meaning: sanitizeFieldIntelligenceText(sig.operational_meaning, { maxLen: 500 }),
      reasoning: sanitizeFieldIntelligenceText(sig.reasoning, { maxLen: 400 }),
    })),
    confirmed_updates: confirmedUpdates.map((row) => ({
      ...row,
      label: sanitizeFieldIntelligenceText(row.label, { maxLen: 120 }),
      value: sanitizeFieldIntelligenceText(row.value, { maxLen: 500 }),
      reasoning: sanitizeFieldIntelligenceText(row.reasoning, { maxLen: 400 }),
    })),
    partial_updates: partialUpdates.map((row) => ({
      ...row,
      label: sanitizeFieldIntelligenceText(row.label, { maxLen: 120 }),
      value: sanitizeFieldIntelligenceText(row.value, { maxLen: 500 }),
      reasoning: sanitizeFieldIntelligenceText(row.reasoning, { maxLen: 400 }),
      still_needs: row.still_needs.map((n) => sanitizeFieldIntelligenceText(n, { maxLen: 200 })).filter(Boolean),
    })),
    still_to_validate: stillToValidate.map((row) => ({
      ...row,
      question: sanitizeFieldIntelligenceText(row.question, { maxLen: 300 }),
    })),
    do_not_update: doNotUpdate,
  };

  return applyObservationApprovalDebriefGuardrails(sanitized, noteBlob);
}
