/**
 * Separates factual evidence from uncertainty/qualification language in note fragments.
 * Uncertainty sets `uncertain` and `notes`; it must never become `evidence_text`.
 */

import { isUnknownEvidenceStatement } from "@/lib/surgical-sales/observationEvidenceClassification";

export type EvidenceUncertaintySplit = {
  /** Sentence or fragment that states the observable fact. */
  factualEvidence: string;
  /** Qualification phrases peeled from the fragment (not used as evidence). */
  uncertaintyPhrases: string[];
  /** True when qualification language limits confidence. */
  uncertain: boolean;
  /** Rep-facing note explaining limited confidence. */
  uncertaintyNotes?: string;
};

/** Qualification / hedging language — not evidentiary on its own. */
export const UNCERTAINTY_QUALIFICATION_PATTERNS: RegExp[] = [
  /\b(?:i\s+)?need(?:s)?\s+more\s+observations?\b/i,
  /\bneed(?:s)?\s+more\s+cases\b/i,
  /\bnot\s+sure\s+(?:if|whether)\b/i,
  /\bunclear\s+whether\b/i,
  /\bmay\s+just\s+be\b/i,
  /\bnot\s+enough\s+cases\s+yet\b/i,
  /\bhard\s+to\s+tell\b/i,
  /\bneeds?\s+validation\b/i,
  /\bprovider\s+was\s+not\s+certain\b/i,
  /\b(?:staff\s+)?mentioned\s+it\s+casually\b/i,
  /\b(?:don'?t|do\s+not)\s+know\s+(?:if|whether|yet)\b/i,
  /\bi\s+don'?t\s+know\s+if\b/i,
  /\buncertain\b/i,
  /\btoo\s+early\b/i,
  /\bmaybe\b/i,
  /\bmight\b/i,
  /\bcould\s+be\b/i,
  /\bnot\s+(?:sure|certain)\s+(?:yet\s+)?(?:if|whether)\b/i,
  /\bhard\s+to\s+say\b/i,
  /\btoo\s+early\s+(?:for\s+me\s+)?to\s+(?:tell|know)\b/i,
  /\bwhere\s+the\s+pain\s+points\s+are\b/i,
  /\bneed\s+(?:a\s+)?few\s+more\s+cases\b/i,
  /\b(?:seemed|appeared)\s+unclear\b/i,
  /\bwithout\s+enough\s+(?:data|evidence|cases)\b/i,
];

const HEDGE_INTRODUCER_PATTERN = /\s*,?\s*(?:but|although|though|however)\s+/i;

function peelHedgeIntroducer(clause: string): string {
  return clause.replace(/^(?:but|although|though|however)\s+/i, "").trim();
}

function matchesUncertaintyLanguage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isUnknownEvidenceStatement(trimmed)) return true;
  return UNCERTAINTY_QUALIFICATION_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** Clause is primarily qualification — not evidentiary on its own. */
function clauseIsQualificationDominant(text: string): boolean {
  if (!matchesUncertaintyLanguage(text)) return false;

  return !/\b(?:implant\s+)?siz(?:e|ing)\b/i.test(text) &&
    !/\b(?:trouble|issues?|difficult(?:y|ies)|hard\s+time)\b[^.]{0,40}\b(?:implant\s+)?siz/i.test(text) &&
    !/\bconfirming\s+implant\s+siz/i.test(text) &&
    !/\b(?:extra\s+time|spent|took|taking)\b[^.]{0,80}\b(?:visuali[sz]|view|exposure|angle|fixation)\b/i.test(
      text,
    ) &&
    !/\bvisuali[sz](?:ation)?\s+was\s+(?:difficult|challenging|poor|hard)\b/i.test(text) &&
    !/\b(?:hard|difficult)\s+to\s+(?:see|visuali[sz])\b/i.test(text) &&
    !/\b(?:getting|obtaining)\s+(?:a\s+)?(?:better\s+)?(?:view|visuali[sz](?:ation)?|exposure)\b/i.test(text) &&
    !/\b(?:trouble|difficult(?:y|ies)|hard\s+time)\b[^.]{0,40}\bvisuali[sz](?:ation)?\b/i.test(text) &&
    !/\b(?:requested|unavailable|alternative|inventory|out\s+of\s+stock)\b/i.test(text) &&
    !/\bvisualization\b/i.test(text) &&
    !/\b(?:using|uses?|used)\s+[A-Z]/i.test(text);
}

function hasConcreteFactualSignal(text: string): boolean {
  const trimmed = peelHedgeIntroducer(text).trim();
  if (!trimmed || trimmed.length < 8) return false;
  if (clauseIsQualificationDominant(trimmed)) return false;

  return (
    /\b(?:implant\s+)?siz(?:e|ing)\b/i.test(trimmed) ||
    /\b(?:trouble|issues?|difficult(?:y|ies)|hard\s+time)\b[^.]{0,40}\b(?:implant\s+)?siz/i.test(trimmed) ||
    /\bconfirming\s+implant\s+siz/i.test(trimmed) ||
    /\b(?:extra\s+time|spent|took|taking)\b[^.]{0,80}\b(?:visuali[sz]|view|exposure|angle|fixation)\b/i.test(
      trimmed,
    ) ||
    /\bvisuali[sz](?:ation)?\s+was\s+(?:difficult|challenging|poor|hard)\b/i.test(trimmed) ||
    /\b(?:hard|difficult)\s+to\s+(?:see|visuali[sz])\b/i.test(trimmed) ||
    /\b(?:getting|obtaining)\s+(?:a\s+)?(?:better\s+)?(?:view|visuali[sz](?:ation)?|exposure)\b/i.test(trimmed) ||
    /\b(?:trouble|difficult(?:y|ies)|hard\s+time)\b[^.]{0,40}\bvisuali[sz](?:ation)?\b/i.test(trimmed) ||
    /\b(?:requested|unavailable|alternative|inventory|out\s+of\s+stock)\b/i.test(trimmed) ||
    /\b(?:using|uses?|used)\s+[A-Z]/i.test(trimmed) ||
    (/\b(?:staff|team|nurse|tech)\b/i.test(trimmed) &&
      /\b(?:organized|smooth|efficient|delay|frustrat|trouble|issues?)\b/i.test(trimmed)) ||
    /\b(?:organized|smooth|efficient|routine|uneventful)\b/i.test(trimmed) ||
    /\b(?:implant|mesh|screw|plate|tray|product)\b/i.test(trimmed) ||
    /\b(?:extra\s+time|spent|took|delay|trouble|issues?|difficult)\b/i.test(trimmed)
  );
}

export function noteQualifiesExtractedFact(
  factualEvidence: string,
  rawNote: string,
): EvidenceUncertaintySplit {
  const noteSplit = splitFragmentEvidenceAndUncertainty(rawNote);
  const factual = factualEvidence.trim();
  if (!factual || !noteSplit.uncertain) {
    return {
      factualEvidence: factual,
      uncertaintyPhrases: [],
      uncertain: false,
    };
  }

  const factualPrefix = factual.toLowerCase().slice(0, Math.min(24, factual.length));
  const inheritsUncertainty =
    noteSplit.factualEvidence.toLowerCase().includes(factualPrefix) ||
    rawNote.toLowerCase().includes(factualPrefix);

  if (!inheritsUncertainty) {
    return {
      factualEvidence: factual,
      uncertaintyPhrases: [],
      uncertain: false,
    };
  }

  return {
    factualEvidence: factual,
    uncertaintyPhrases: noteSplit.uncertaintyPhrases,
    uncertain: true,
    uncertaintyNotes: noteSplit.uncertaintyNotes,
  };
}

export function mergeFragmentUncertaintyWithNote(
  localSplit: EvidenceUncertaintySplit,
  rawNote: string,
): EvidenceUncertaintySplit {
  if (localSplit.uncertain) return localSplit;

  const factual = localSplit.factualEvidence.trim();
  if (!factual) return localSplit;

  return noteQualifiesExtractedFact(factual, rawNote);
}

function splitIntoClauses(fragment: string): string[] {
  const trimmed = fragment.trim();
  if (!trimmed) return [];

  const hedgeChunks = trimmed.split(HEDGE_INTRODUCER_PATTERN);
  const clauses: string[] = [];

  for (const chunk of hedgeChunks) {
    const sentences = chunk
      .split(/\.\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    clauses.push(...(sentences.length > 0 ? sentences : [chunk.trim()]));
  }

  return clauses.filter(Boolean);
}

function formatUncertaintyNotes(phrases: string[]): string | undefined {
  const unique = [...new Set(phrases.map((phrase) => phrase.trim()).filter(Boolean))];
  if (unique.length === 0) return undefined;
  return `Qualification: ${unique.join(" ")}`;
}

/** True when text contains hedging or qualification language. */
export function fragmentHasUncertaintyLanguage(text: string): boolean {
  return matchesUncertaintyLanguage(text);
}

/**
 * Split a note fragment into factual evidence vs uncertainty qualification.
 * Factual evidence is used for concept matching and evidence_text.
 */
export function splitFragmentEvidenceAndUncertainty(fragment: string): EvidenceUncertaintySplit {
  const clauses = splitIntoClauses(fragment);
  const factualParts: string[] = [];
  const uncertaintyPhrases: string[] = [];

  for (const rawClause of clauses) {
    const clause = rawClause.trim();
    if (!clause) continue;

    const uncertainClause = matchesUncertaintyLanguage(clause);
    const factualClause = hasConcreteFactualSignal(clause);

    if (uncertainClause && !factualClause) {
      uncertaintyPhrases.push(peelHedgeIntroducer(clause));
      continue;
    }

    if (uncertainClause && factualClause) {
      const segments = clause.split(HEDGE_INTRODUCER_PATTERN).map((part) => part.trim()).filter(Boolean);
      if (segments.length > 1) {
        for (const segment of segments) {
          if (matchesUncertaintyLanguage(segment) && !hasConcreteFactualSignal(segment)) {
            uncertaintyPhrases.push(peelHedgeIntroducer(segment));
          } else if (segment) {
            factualParts.push(peelHedgeIntroducer(segment));
          }
        }
        continue;
      }
    }

    if (factualClause) {
      factualParts.push(peelHedgeIntroducer(clause));
    } else if (!uncertainClause) {
      factualParts.push(peelHedgeIntroducer(clause));
    }
  }

  let factualEvidence = factualParts.filter(Boolean).join(". ").trim();

  if (!factualEvidence && uncertaintyPhrases.length === 0 && matchesUncertaintyLanguage(fragment)) {
    uncertaintyPhrases.push(peelHedgeIntroducer(fragment));
  }

  if (!factualEvidence && hasConcreteFactualSignal(fragment) && matchesUncertaintyLanguage(fragment)) {
    const segments = fragment.split(HEDGE_INTRODUCER_PATTERN).map((part) => part.trim()).filter(Boolean);
    for (const segment of segments) {
      if (matchesUncertaintyLanguage(segment) && !hasConcreteFactualSignal(segment)) {
        uncertaintyPhrases.push(peelHedgeIntroducer(segment));
      } else if (segment && hasConcreteFactualSignal(segment)) {
        factualEvidence = peelHedgeIntroducer(segment);
      }
    }
  }

  const uncertain = uncertaintyPhrases.length > 0;

  return {
    factualEvidence,
    uncertaintyPhrases,
    uncertain,
    uncertaintyNotes: formatUncertaintyNotes(uncertaintyPhrases),
  };
}

export function mergeUncertaintyNotes(
  existing: string | undefined,
  uncertaintyNotes: string | undefined,
): string | undefined {
  const parts = [existing, uncertaintyNotes].map((value) => value?.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(" · ");
}
