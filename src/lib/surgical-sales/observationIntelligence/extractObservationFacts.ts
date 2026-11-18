import {
  isNegativeEvidenceStatement,
  isUnknownEvidenceStatement,
} from "@/lib/surgical-sales/observationEvidenceClassification";
import {
  fragmentHasIntelligenceSignal,
  isConversationalFillerText,
} from "@/lib/surgical-sales/observationFindingQuality";
import {
  ANGLE_REQUEST_PATTERN,
  ANOTHER_ANGLE_PATTERN,
  COMPETITOR_BRAND_PATTERN,
  COULD_NOT_SEE_WELL_PATTERN,
  EXTRA_VISUALIZATION_TIME_VALUE,
  FIXATION_CONTEXT_PATTERN,
  GETTING_VISUALIZATION_PATTERN,
  PACKAGING_FRICTION_PATTERN,
  PEEL_PACK_HARD_PATTERN,
  PRODUCT_NOT_READY_PATTERN,
  PROVIDER_FRUSTRATION_PATTERN,
  PROVIDER_ROLE_PATTERN,
  READINESS_DELAY_VALUE,
  READINESS_LOOKING_FOR_PATTERN,
  REPOSITIONED_EXPOSURE_PATTERN,
  STAFF_ROLE_PATTERN,
  VISUALIZATION_CHALLENGE_VALUE,
  VISUALIZATION_DIFFICULT_PATTERN,
  VIEW_BEFORE_FIXATION_PATTERN,
  WAITING_AROUND_PATTERN,
} from "./extractionPatterns";
import type { ObservationFact, ObservationFactExtraction, ObservationFactType } from "./observationFactTypes";

function titleCasePhrase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      /[a-z][A-Z]/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

function cleanValue(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").replace(/[.!?]+$/g, "");
}

/** Contrast/hedging connectors — split so operational clauses survive uncertainty language. */
const HEDGING_CONNECTOR_SPLIT_PATTERN =
  /\s+(?:but|although|however|though)\s+|\s+(?:I['\u2019]?m\s+)?not\s+sure\s+(?:yet\s+)?if\s+|\s+not\s+sure\s+if\s+|\s+(?:I\s+)?don'?t\s+know\s+yet\s+|\s+too\s+early\s+to\s+know(?:\s+if|\s+whether|\s+to\s+tell)?\s+/i;

function trimObservationClause(clause: string): string {
  return clause.trim().replace(/^,+\s*/, "");
}

/** Split one sentence on hedging connectors before unknown-evidence filtering runs. */
export function splitFragmentOnHedgingConnectors(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parts = trimmed
    .split(HEDGING_CONNECTOR_SPLIT_PATTERN)
    .map(trimObservationClause)
    .filter((part) => part.length >= 8);

  return parts.length > 0 ? parts : trimmed.length >= 8 ? [trimmed] : [];
}

function expandSentenceClauses(part: string): string[] {
  const expanded: string[] = [];

  for (const hedgingClause of splitFragmentOnHedgingConnectors(part)) {
    if (hedgingClause.length > 32 && /\band\b/i.test(hedgingClause)) {
      for (const clause of hedgingClause.split(/\band\b/i)) {
        const trimmedClause = trimObservationClause(clause);
        if (trimmedClause.length >= 8) expanded.push(trimmedClause);
      }
    } else if (hedgingClause.length >= 8) {
      expanded.push(hedgingClause);
    }
  }

  return expanded;
}

export function splitObservationFragments(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines = trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  const sentenceParts = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8);

  const expanded: string[] = [];
  for (const part of sentenceParts.length > 0 ? sentenceParts : [trimmed]) {
    expanded.push(...expandSentenceClauses(part));
  }

  return expanded.length > 0 ? expanded : trimmed.length >= 8 ? [trimmed] : [];
}

function pushFact(
  target: ObservationFact[],
  seen: Set<string>,
  type: ObservationFactType,
  value: string,
  evidence: string,
): void {
  const normalized = cleanValue(value);
  if (!normalized) return;
  const key = `${type}:${normalized.toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);
  target.push({ type, value: normalized, evidence: evidence.trim() });
}

function isCompetitorProductName(productName: string, fragment: string): boolean {
  const combined = `${productName} ${fragment}`.toLowerCase();
  if (COMPETITOR_BRAND_PATTERN.test(combined)) return true;
  if (/\bcompetitor\b/i.test(fragment)) return true;
  if (/\bmesh\b/i.test(productName) || /\btray\b/i.test(productName)) {
    return /^[A-Z]/.test(productName);
  }
  return false;
}

function extractProductFacts(fragment: string, evidence: string, facts: ObservationFact[], seen: Set<string>): void {
  const usingMatch = fragment.match(
    /\b(?:still\s+)?(?:using|uses?)\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b/,
  );
  if (usingMatch?.[1]) {
    const product = titleCasePhrase(usingMatch[1]);
    pushFact(facts, seen, "current_product", product, evidence);
    if (isCompetitorProductName(product, fragment)) {
      pushFact(facts, seen, "competitor_product", product, evidence);
    }
  }

  const primaryMatch = fragment.match(
    /\b(?:primary|standard)\s+(?:product|mesh|tray)\s+(?:is\s+)?([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b/i,
  );
  if (primaryMatch?.[1]) {
    const product = titleCasePhrase(primaryMatch[1]);
    pushFact(facts, seen, "current_product", product, evidence);
    if (isCompetitorProductName(product, fragment)) {
      pushFact(facts, seen, "competitor_product", product, evidence);
    }
  }

  const competitorNamed = fragment.match(
    /\bcompetitor\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b/i,
  );
  if (competitorNamed?.[1]) {
    const product = titleCasePhrase(competitorNamed[1]);
    const label = product.toLowerCase() === "mesh" ? "Competitor Mesh" : product;
    pushFact(facts, seen, "competitor_product", label, evidence);
    pushFact(facts, seen, "current_product", label, evidence);
  }

  if (/\bcompetitor\s+tray\b/i.test(fragment)) {
    pushFact(facts, seen, "competitor_product", "Competitor tray", evidence);
  }

  if (/\bcompetitor\s+rep\b/i.test(fragment) || /\brival\s+(?:rep|vendor|tray|energy|device)\b/i.test(fragment)) {
    pushFact(facts, seen, "competitor_product", "Competitor rep present", evidence);
  }

  const observedMatch = fragment.match(
    /\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\s+(?:observed|used|captured)\b/,
  );
  if (observedMatch?.[1]) {
    const product = titleCasePhrase(observedMatch[1]);
    pushFact(facts, seen, "current_product", product, evidence);
  }
}

function hasFixationContext(fragment: string): boolean {
  return FIXATION_CONTEXT_PATTERN.test(fragment);
}

function hasVisualizationChallengeLanguage(fragment: string): boolean {
  return (
    ANGLE_REQUEST_PATTERN.test(fragment) ||
    ANOTHER_ANGLE_PATTERN.test(fragment) ||
    COULD_NOT_SEE_WELL_PATTERN.test(fragment) ||
    REPOSITIONED_EXPOSURE_PATTERN.test(fragment) ||
    /\b(?:different|better|new)\s+angle\b/i.test(fragment) ||
    /\b(?:couldn't|could not|wasn't|was not|not)\s+getting\b[^.]{0,48}\b(?:the\s+)?view\b/i.test(fragment) ||
    /\b(?:couldn't|could not)\s+get\s+(?:a\s+)?good\s+view\b/i.test(fragment) ||
    /\b(?:spent|took|taking)\s+time\s+getting\s+exposure\b/i.test(fragment) ||
    /\breposition(?:ed|ing)?\s+to\s+see\s+better\b/i.test(fragment) ||
    /\bbetter\s+look\b[^.]{0,40}\bfixation\b/i.test(fragment) ||
    /\bview\s+he\s+wanted\b/i.test(fragment) ||
    VISUALIZATION_DIFFICULT_PATTERN.test(fragment) ||
    /\bhard\s+to\s+see\b/i.test(fragment) ||
    /\bdifficult\s+(?:to\s+)?(?:visuali|see)\b/i.test(fragment) ||
    (VIEW_BEFORE_FIXATION_PATTERN.test(fragment) && /\bbefore\s+fixation\b/i.test(fragment)) ||
    (COULD_NOT_SEE_WELL_PATTERN.test(fragment) && hasFixationContext(fragment)) ||
    (ANOTHER_ANGLE_PATTERN.test(fragment) && hasFixationContext(fragment)) ||
    (/\bdelay\b/i.test(fragment) &&
      VIEW_BEFORE_FIXATION_PATTERN.test(fragment) &&
      hasFixationContext(fragment)) ||
    (/\bback\s+and\s+forth\b/i.test(fragment) &&
      /\b(?:positioning|visuali[sz]|fixation)\b/i.test(fragment))
  );
}

function hasSpentTimeOnViewLanguage(fragment: string): boolean {
  return (
    (/\b(?:spent|spend|took|taking)\b[^.]{0,72}\b(?:decent|extra|additional)?\s*(?:amount\s+of\s+)?time\b/i.test(
      fragment,
    ) &&
      /\b(?:visuali[sz]|better\s+view|view|fixation|exposure|mesh)\b/i.test(fragment)) ||
    GETTING_VISUALIZATION_PATTERN.test(fragment)
  );
}

function hasReadinessDelayLanguage(fragment: string): boolean {
  return (
    WAITING_AROUND_PATTERN.test(fragment) ||
    PRODUCT_NOT_READY_PATTERN.test(fragment) ||
    /\b(?:wasn't|was not)\s+ready\b/i.test(fragment) ||
    /\broom\s+not\s+ready\b/i.test(fragment) ||
    READINESS_LOOKING_FOR_PATTERN.test(fragment) ||
    /\bwaiting\s+for\s+(?:mesh|product|tray|supplies?)\b/i.test(fragment)
  );
}

function pushVisualizationWorkflowFacts(
  fragment: string,
  evidence: string,
  facts: ObservationFact[],
  seen: Set<string>,
  value: string,
): void {
  pushFact(facts, seen, "workflow_issue", value, evidence);
  pushFact(facts, seen, "visualization_challenge", value, evidence);
  if (hasFixationContext(fragment)) {
    const fixationValue =
      value === EXTRA_VISUALIZATION_TIME_VALUE ? "visualization delay before fixation" : value;
    pushFact(facts, seen, "fixation_challenge", fixationValue, evidence);
  }
}

function pushReadinessDelayFacts(evidence: string, facts: ObservationFact[], seen: Set<string>): void {
  pushFact(facts, seen, "workflow_issue", READINESS_DELAY_VALUE, evidence);
  pushFact(facts, seen, "workflow_delay", READINESS_DELAY_VALUE, evidence);
}

function extractWorkflowFacts(fragment: string, evidence: string, facts: ObservationFact[], seen: Set<string>): void {
  const improveVisualization = /\b(?:trying|attempting)\s+to\s+(?:improve|get)\s+(?:a\s+)?(?:better\s+)?(?:view|visuali[sz])/i.test(
    fragment,
  );

  if (hasSpentTimeOnViewLanguage(fragment) || improveVisualization) {
    pushVisualizationWorkflowFacts(fragment, evidence, facts, seen, EXTRA_VISUALIZATION_TIME_VALUE);
  } else if (hasVisualizationChallengeLanguage(fragment)) {
    pushVisualizationWorkflowFacts(fragment, evidence, facts, seen, VISUALIZATION_CHALLENGE_VALUE);
  }

  if (hasReadinessDelayLanguage(fragment)) {
    pushReadinessDelayFacts(evidence, facts, seen);
  }

  if (/\b(?:slow(?:ed)?|slowing)\s+(?:the\s+)?(?:flow|pace)\b/i.test(fragment)) {
    pushFact(facts, seen, "workflow_delay", "workflow pace slowed", evidence);
    pushFact(facts, seen, "workflow_issue", "workflow pace slowed", evidence);
  }

  if (/\b(?:long|extra)\s+(?:room\s+)?turnover\b/i.test(fragment) || /\broom\s+turnover\b/i.test(fragment)) {
    pushFact(facts, seen, "room_turnover_issue", "room turnover delay", evidence);
    pushFact(facts, seen, "workflow_issue", "room turnover delay", evidence);
    return;
  }

  if (
    /\bsetup\s+(?:ran\s+)?long\b/i.test(fragment) ||
    /\bsetup\s+delay\b/i.test(fragment) ||
    /\bextra\s+setup\b/i.test(fragment)
  ) {
    pushFact(facts, seen, "workflow_delay", "setup delay observed", evidence);
    pushFact(facts, seen, "workflow_issue", "setup delay observed", evidence);
  }
}

function extractStaffFacts(fragment: string, evidence: string, facts: ObservationFact[], seen: Set<string>): void {
  const coordinatedTeam =
    /\bstaff\s+was\s+good\b/i.test(fragment) ||
    /\beveryone\s+seemed\s+to\s+know\b/i.test(fragment) ||
    /\bknew\s+what\s+they\s+were\s+doing\b/i.test(fragment) ||
    /\beveryone\s+knew\s+their\s+role\b/i.test(fragment) ||
    /\bteam\s+worked\s+well\s+together\b/i.test(fragment) ||
    (STAFF_ROLE_PATTERN.test(fragment) && /\bknew\s+the\s+setup\b/i.test(fragment));

  if (coordinatedTeam) {
    pushFact(facts, seen, "staff_efficiency", "coordinated team", evidence);
    return;
  }

  if (
    /\b(?:staff|team)\s+seemed\s+(?:pretty\s+)?(?:organized|efficient|comfortable|prepared|smooth)\b/i.test(
      fragment,
    ) ||
    /\bstaff\s+was\s+organized\b/i.test(fragment) ||
    (/\b(?:staff|team)\b/i.test(fragment) &&
      /\b(?:organized|efficient|comfortable|prepared|smooth)\s+overall\b/i.test(fragment)) ||
    (/\bteam\s+moved\s+fast\b/i.test(fragment) && STAFF_ROLE_PATTERN.test(fragment))
  ) {
    const value = /\borganized\b/i.test(fragment)
      ? "staff appeared organized"
      : /\bcomfortable\b/i.test(fragment)
        ? "team comfortable with current products"
        : "positive staff workflow observed";
    pushFact(facts, seen, "staff_efficiency", value, evidence);
    return;
  }

  const productFrictionMentioned =
    PACKAGING_FRICTION_PATTERN.test(fragment) || PEEL_PACK_HARD_PATTERN.test(fragment);

  if (productFrictionMentioned && !/\b(?:didn't|did not|no one|nobody)\b/i.test(fragment)) {
    const value = PEEL_PACK_HARD_PATTERN.test(fragment) || /\bpackaging\b/i.test(fragment)
      ? "packaging friction observed"
      : "staff workflow friction observed";
    pushFact(facts, seen, "staff_issue", value, evidence);
    return;
  }

  const staffRoleMentioned = STAFF_ROLE_PATTERN.test(fragment);
  if (
    staffRoleMentioned &&
    /\b(?:trouble|difficult|hard|struggl\w*|frustrat\w*)\b/i.test(fragment) &&
    /\b(?:opening|packaging|product|setup)\b/i.test(fragment) &&
    !/\b(?:didn't|did not|no one|nobody)\b/i.test(fragment)
  ) {
    pushFact(facts, seen, "staff_issue", "staff workflow friction observed", evidence);
  }
}

function extractProviderFacts(fragment: string, evidence: string, facts: ObservationFact[], seen: Set<string>): void {
  if (/\b(?:didn't|did not|wasn't|was not)\s+seem\s+(?:angry|upset|frustrat)/i.test(fragment)) {
    return;
  }

  const providerMentioned = PROVIDER_ROLE_PATTERN.test(fragment);
  const explicitFrustration = PROVIDER_FRUSTRATION_PATTERN.test(fragment);

  if (providerMentioned && explicitFrustration) {
    pushFact(facts, seen, "provider_frustration", "provider clinical frustration observed", evidence);
  }
}

function extractProductSignalFacts(fragment: string, evidence: string, facts: ObservationFact[], seen: Set<string>): void {
  if (
    /\b(?:open to|interested in|want to try|wants to evaluate|asked about)\b[^.]{0,60}\b(?:trial|demo|evaluat)/i.test(
      fragment,
    ) ||
    /\bwants to evaluate\b/i.test(fragment)
  ) {
    pushFact(facts, seen, "product_interest", "product evaluation interest", evidence);
    pushFact(facts, seen, "product_fit_signal", "product evaluation interest", evidence);
  }
  if (/\b(?:acsIS|endolumik|peel[- ]?pack)\b/i.test(fragment) && /\b(?:fit|trial|interest|demo|evaluat)\b/i.test(fragment)) {
    pushFact(facts, seen, "product_fit_signal", "product fit signal observed", evidence);
  }
  if (
    /\bvisualization\s+and\s+fixation\s+workflow\b/i.test(fragment) ||
    /\b(?:early\s+)?opportunit(?:y|ies)\b[^.]{0,80}\b(?:visuali[sz]\w*|fixation)\b/i.test(fragment) ||
    /\b(?:may\s+be\s+around|around)\b[^.]{0,80}\bvisuali[sz]\w*\b[^.]{0,40}\bfixation\b/i.test(fragment)
  ) {
    pushFact(
      facts,
      seen,
      "product_fit_signal",
      "visualization and fixation workflow opportunity",
      evidence,
    );
  }
}

function shouldSkipFragment(fragment: string): boolean {
  const evidence = fragment.trim();
  if (!evidence || isConversationalFillerText(evidence)) return true;
  if (!fragmentHasIntelligenceSignal(evidence)) return true;
  if (isUnknownEvidenceStatement(evidence)) return true;
  if (isNegativeEvidenceStatement(evidence)) return true;
  return false;
}

/** Extract facts from a single note fragment. */
export function extractFactsFromFragment(fragment: string): ObservationFact[] {
  const facts: ObservationFact[] = [];
  const seen = new Set<string>();
  if (shouldSkipFragment(fragment)) return facts;

  const evidence = fragment.trim();
  extractProductFacts(fragment, evidence, facts, seen);
  extractWorkflowFacts(fragment, evidence, facts, seen);
  extractStaffFacts(fragment, evidence, facts, seen);
  extractProviderFacts(fragment, evidence, facts, seen);
  extractProductSignalFacts(fragment, evidence, facts, seen);
  return facts;
}

function extractFromFragment(fragment: string, facts: ObservationFact[], seen: Set<string>): void {
  for (const fact of extractFactsFromFragment(fragment)) {
    pushFact(facts, seen, fact.type, fact.value, fact.evidence);
  }
}

/** Step 1 — normalize note text into surgical observation facts. */
export function extractObservationFacts(rawText: string): ObservationFactExtraction {
  const fragments = splitObservationFragments(rawText);
  const facts: ObservationFact[] = [];
  const seen = new Set<string>();

  for (const fragment of fragments.length > 0 ? fragments : [rawText.trim()]) {
    extractFromFragment(fragment, facts, seen);
  }

  return {
    facts: facts.slice(0, 24),
    extractedAt: new Date().toISOString(),
    model: "facts-v1",
  };
}

/** Fragments with intelligence signal that produced no rule-based facts. */
export function findUnmatchedSignalFragments(rawText: string): string[] {
  const fragments = splitObservationFragments(rawText);
  const candidates = fragments.length > 0 ? fragments : rawText.trim() ? [rawText.trim()] : [];
  return candidates.filter((fragment) => {
    if (shouldSkipFragment(fragment)) return false;
    return extractFactsFromFragment(fragment).length === 0;
  });
}
