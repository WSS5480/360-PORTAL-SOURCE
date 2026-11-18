/**
 * Observation approval vs interest — debrief phrase guardrails (any dictation style).
 *
 * Approval is only "Yes" when the rep clearly states approval happened.
 * Interest, openness, or conditional access must not advance observation approval.
 */

import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import type {
  ConfirmedIntelligenceUpdate,
  PartialIntelligenceUpdate,
} from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import { textNegatesObservationAccess } from "@/lib/surgical-sales/intelligenceContradictionDetection";

export type ObservationAccessPathLevel = "yes" | "partial" | "no";

export type ObservationAccessBlockerId =
  | "credentialing"
  | "scheduling"
  | "approval_pathway"
  | "none";

export type ObservationDebriefAccessAssessment = {
  observationInterest: boolean;
  observationApprovalExplicit: boolean;
  accessPathIdentified: ObservationAccessPathLevel;
  blockers: ObservationAccessBlockerId[];
  evidenceQuote: string | null;
};

/** Rep clearly states observation was approved (not merely openness or interest). */
const EXPLICIT_OBSERVATION_APPROVAL_RE = [
  /\bobservation\s+approved\b/i,
  /\b(?:he|she|they)\s+approved\s+(?:the\s+)?observation\b/i,
  /\bapproved\s+(?:the\s+)?observation\b/i,
  /\bapproved\s+(?:us\s+)?for\s+observation\b/i,
  /\bwe\s+can\s+observe\b/i,
  /\b(?:we\s+)?can\s+observe(?!\s+(?:later|after|once|when|if|probably))\b/i,
  /\bcleared\s+to\s+observe\b/i,
  /\bwe\s+have\s+permission\s+to\s+observe\b/i,
  /\bpermission\s+to\s+observe\b/i,
  /\bgave\s+(?:us\s+)?(?:approval|clearance)\s+(?:for\s+)?observation\b/i,
  /\bobservation\s+(?:is\s+)?approved\b/i,
  /\bobservation\s+was\s+approved\b/i,
  /\bobservation\s+(?:access\s+)?(?:was\s+)?granted\b/i,
  /\bgranted\s+(?:us\s+)?(?:approval|permission|access|clearance)\b/i,
  /\byes,?\s+we\s+can\s+observe\b/i,
];

/** Interest / openness — never counts as approval. */
const OBSERVATION_INTEREST_ONLY_RE = [
  /\bopen\s+to\s+observation\b/i,
  /\binterested\s+in\s+observation\b/i,
  /\bno\s+resistance\b/i,
  /\bnot\s+opposed\b/i,
  /\bdidn'?t\s+shut\s+down\b/i,
  /\bdid\s+not\s+seem\s+opposed\b/i,
  /\bseems?\s+willing\b/i,
  /\bwants?\s+to\s+learn\s+more\b/i,
  /\bcan\s+probably\s+observe\b/i,
  /\bprobably\s+observe\s+later\b/i,
  /\bonce\s+credentialing\b/i,
  /\bafter\s+credentialing\b/i,
  /\bwhen\s+credentialing\b/i,
  /\bobservation\s+seems?\s+possible\b/i,
  /\bobservation\b[^.]{0,48}\b(?:wasn'?t|was not|not)\s+denied\b/i,
  /\b(?:can|could)\s+probably\s+get\s+into\b/i,
  /\bwork\s+through\s+(?:the\s+)?(?:office|vendor)\b/i,
  /\bthrough\s+the\s+right\s+people\b/i,
  /\bapproachable\b/i,
  /\bworth\s+continuing\b/i,
  /\bpath\s+in\s+there\b/i,
  /\bnot\s+directly\s+approved\b/i,
  /\bshould(?:n'?t)?\s+(?:not\s+)?be\s+(?:a\s+)?problem\b/i,
  /\bno\s+problem\b/i,
  /\bshould\s+be\s+fine\b/i,
  /\b(?:generally|usually|typically)\s+possible\b/i,
  /\bshould\s+be\s+possible\b/i,
  /\bno\s+objections?\b/i,
  /\bwilling\s+to\s+(?:discuss|talk\s+about|consider)\s+(?:an?\s+)?observation\b/i,
  /\bobservation\s+(?:pathway|path)\s+exists\b/i,
  /\bobservation\s+(?:was\s+)?discussed\b/i,
];

const ACCESS_PATH_IDENTIFIED_RE =
  /\b(?:right\s+people|work\s+through|channels?|pathway|credentialing|vendor\s+access|getting\s+into\s+cases|access\s+path)\b/i;

const CREDENTIALING_BLOCKER_RE = /\b(?:credential|intellicentrics|vendor\s+access|vendormate)\b/i;
const SCHEDULING_BLOCKER_RE = /\b(?:schedul|coordinator|timing|karen)\b/i;

function quoteAround(text: string, pattern: RegExp): string | null {
  const m = pattern.exec(text);
  if (m?.index == null) return null;
  const start = Math.max(0, m.index - 24);
  const end = Math.min(text.length, m.index + m[0].length + 64);
  return text.slice(start, end).trim().slice(0, 280);
}

function hasNegatedObservationApproval(text: string): boolean {
  return (
    /\b(?:no|not|nothing)\b[^.!?;]{0,40}\bobservation\s+(?:was\s+)?(?:approved|granted)\b/i.test(text) ||
    /\bobservation\s+(?:was\s+)?not\s+(?:yet\s+)?(?:approved|granted)\b/i.test(text) ||
    /\b(?:no|not)\s+observation\s+was\s+(?:approved|granted)\b/i.test(text) ||
    /\bnot\s+yet\s+approved\b/i.test(text) ||
    /\bnothing\s+(?:was\s+)?(?:approved|granted)\b/i.test(text) ||
    // Suspension / revocation is the current state — historical approval
    // phrases in the same note must not count as explicit approval.
    textNegatesObservationAccess(text)
  );
}

export function debriefExplicitlyApprovesObservation(note: string): boolean {
  const text = note.trim();
  if (!text) return false;
  if (hasNegatedObservationApproval(text)) return false;
  return EXPLICIT_OBSERVATION_APPROVAL_RE.some((re) => re.test(text));
}

export function debriefIndicatesObservationInterest(note: string): boolean {
  const text = note.trim();
  if (!text) return false;
  if (debriefExplicitlyApprovesObservation(text)) return true;
  return (
    OBSERVATION_INTEREST_ONLY_RE.some((re) => re.test(text)) ||
    (/\bobservation\b/i.test(text) &&
      /\b(?:open|interest|intro|conversation|discuss)\b/i.test(text))
  );
}

function resolveBlockers(note: string, assessment: Pick<ObservationDebriefAccessAssessment, "observationApprovalExplicit" | "accessPathIdentified">): ObservationAccessBlockerId[] {
  const blockers: ObservationAccessBlockerId[] = [];
  if (!assessment.observationApprovalExplicit) {
    blockers.push("approval_pathway");
  }
  if (CREDENTIALING_BLOCKER_RE.test(note) || /\bonce\s+credentialing\b/i.test(note)) {
    blockers.push("credentialing");
  }
  if (SCHEDULING_BLOCKER_RE.test(note) && /\bstill\s+need|get\s+her\s+info\b/i.test(note)) {
    blockers.push("scheduling");
  }
  if (blockers.length === 0 && assessment.accessPathIdentified !== "no") {
    return ["none"];
  }
  return blockers;
}

export function assessObservationAccessFromDebrief(note: string): ObservationDebriefAccessAssessment {
  const text = note.trim();
  const observationApprovalExplicit = debriefExplicitlyApprovesObservation(text);
  const observationInterest = debriefIndicatesObservationInterest(text);

  let accessPathIdentified: ObservationAccessPathLevel = "no";
  if (observationApprovalExplicit) {
    accessPathIdentified = "yes";
  } else if (ACCESS_PATH_IDENTIFIED_RE.test(text) || observationInterest) {
    accessPathIdentified = "partial";
  }

  const assessment: ObservationDebriefAccessAssessment = {
    observationInterest,
    observationApprovalExplicit,
    accessPathIdentified,
    blockers: [],
    evidenceQuote:
      quoteAround(text, /\bobservation\b[^.]{0,120}[.!?]/i) ??
      quoteAround(text, /\b(?:approved|open to|not opposed|shut down)\b[^.]{0,100}[.!?]/i),
  };
  assessment.blockers = resolveBlockers(text, assessment);
  return assessment;
}

function formatBlockerLabel(id: ObservationAccessBlockerId): string {
  switch (id) {
    case "credentialing":
      return "Credentialing";
    case "scheduling":
      return "Scheduling";
    case "approval_pathway":
      return "Approval pathway";
    default:
      return "";
  }
}

/** Structured persist narrative for provider_observation_feasibility / observation_approval signal. */
export function buildObservationAccessDebriefPersistValue(
  assessment: ObservationDebriefAccessAssessment,
): string {
  const lines = [
    `Observation interest: ${assessment.observationInterest ? "Yes" : "No"}`,
    `Observation approval: ${assessment.observationApprovalExplicit ? "Yes" : "No"}`,
    `Access path identified: ${
      assessment.accessPathIdentified === "yes"
        ? "Yes"
        : assessment.accessPathIdentified === "partial"
          ? "Partial"
          : "No"
    }`,
  ];
  const blockers = assessment.blockers.filter((b) => b !== "none");
  if (blockers.length) {
    lines.push(`Blocker: ${blockers.map(formatBlockerLabel).filter(Boolean).join(" / ")}`);
  }
  return lines.join(". ");
}

export function buildObservationAccessPartialUpdate(
  note: string,
): PartialIntelligenceUpdate | null {
  const assessment = assessObservationAccessFromDebrief(note);
  if (!assessment.observationInterest && !assessment.observationApprovalExplicit) {
    return null;
  }

  const stillNeeds: string[] = [];
  if (!assessment.observationApprovalExplicit) {
    stillNeeds.push("Official observation approval still needs confirmation");
  }
  if (assessment.accessPathIdentified === "partial") {
    stillNeeds.push("Confirm who approves observation access and through which pathway");
  }
  if (assessment.blockers.includes("credentialing")) {
    stillNeeds.push("Confirm credentialing platform and steps");
  }
  if (assessment.blockers.includes("scheduling")) {
    stillNeeds.push("Confirm scheduling owner before observation timing");
  }

  const quote = assessment.evidenceQuote;
  const reasoning = quote
    ? `Debrief maps observation access without treating interest as approval. Source quote: "${quote}"`
    : "Debrief maps observation access without treating interest as approval.";

  return {
    domain: "or_access",
    label: assessment.observationApprovalExplicit
      ? "Observation approval stated in debrief"
      : "Observation interest without approval",
    value: buildObservationAccessDebriefPersistValue(assessment),
    still_needs: [...new Set(stillNeeds.map((s) => s.trim()).filter(Boolean))].slice(0, 6),
    confidence: assessment.observationApprovalExplicit ? "medium" : "medium",
    save_target: "provider",
    reasoning,
    source_scope: "provider conversation",
  };
}

function rowImpliesFalseApproval(row: { label: string; value: string; reasoning?: string }): boolean {
  const blob = `${row.label} ${row.value} ${row.reasoning ?? ""}`;
  if (debriefExplicitlyApprovesObservation(blob)) return false;
  return (
    /\b(?:approved|approval\s+confirmed|observation\s+allowed|feasible|easy|yes)\b/i.test(blob) &&
    !/\b(?:not\s+approved|without\s+approval|approval:\s*no)\b/i.test(blob)
  );
}

function isOrAccessRow(row: { domain: string; label?: string; value?: string }): boolean {
  if (row.domain === "or_access") return true;
  const blob = `${row.label ?? ""} ${row.value ?? ""}`;
  return /\bobservation\s+(?:approval|access|feasib)|\bopen\s+to\s+observation\b/i.test(blob);
}

/** Downgrade false-positive observation approval from AI/pipeline output. */
export function applyObservationApprovalDebriefGuardrails(
  mapping: LogUpdateOpenAiMapping,
  rawNote: string,
): LogUpdateOpenAiMapping {
  const note = rawNote.trim();
  if (!note) return mapping;

  const assessment = assessObservationAccessFromDebrief(note);
  let confirmed_updates = [...mapping.confirmed_updates];
  let partial_updates = [...mapping.partial_updates];

  const falseConfirmed: ConfirmedIntelligenceUpdate[] = [];
  confirmed_updates = confirmed_updates.filter((row) => {
    if (!isOrAccessRow(row)) return true;
    if (rowImpliesFalseApproval(row)) {
      falseConfirmed.push(row);
      return false;
    }
    if (row.confidence === "high" && !assessment.observationApprovalExplicit) {
      falseConfirmed.push(row);
      return false;
    }
    return true;
  });

  for (const row of falseConfirmed) {
    const existing = partial_updates.find((p) => p.domain === "or_access");
    if (!existing) {
      const built = buildObservationAccessPartialUpdate(note);
      if (built) partial_updates.push(built);
    }
  }

  partial_updates = partial_updates.map((row) => {
    if (!isOrAccessRow(row)) return row;
    if (rowImpliesFalseApproval(row) || !assessment.observationApprovalExplicit) {
      const built = buildObservationAccessPartialUpdate(note);
      if (!built) return row;
      return {
        ...built,
        still_needs: [...new Set([...built.still_needs, ...row.still_needs])].slice(0, 8),
        reasoning: row.reasoning.includes("Source quote:")
          ? row.reasoning
          : built.reasoning,
      };
    }
    return row;
  });

  const hasOrAccessPartial = partial_updates.some((p) => p.domain === "or_access");
  const hasOrAccessConfirmed = confirmed_updates.some((c) => c.domain === "or_access");
  if (
    !hasOrAccessPartial &&
    !hasOrAccessConfirmed &&
    (assessment.observationInterest || assessment.observationApprovalExplicit)
  ) {
    const built = buildObservationAccessPartialUpdate(note);
    if (built) partial_updates.push(built);
  }

  const operational_signals = (mapping.operational_signals ?? []).map((sig) => {
    if (sig.domain !== "or_access") return sig;
    const blob = `${sig.signal} ${sig.operational_meaning} ${sig.evidence}`;
    if (
      !assessment.observationApprovalExplicit &&
      /\b(?:approved|allowed|feasible|confirmed)\b/i.test(blob) &&
      debriefIndicatesObservationInterest(note)
    ) {
      return {
        ...sig,
        confidence: "medium" as const,
        signal: "Observation interest noted",
        operational_meaning: buildObservationAccessDebriefPersistValue(assessment),
      };
    }
    return sig;
  });

  return {
    ...mapping,
    confirmed_updates,
    partial_updates,
    operational_signals,
  };
}
