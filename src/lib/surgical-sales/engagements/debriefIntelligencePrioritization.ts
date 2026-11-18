/**
 * Debrief Intelligence Prioritization — ranks observation patterns for prepare output.
 * Deterministic scoring only; does not touch extraction or OIE storage.
 */

export type DebriefPrioritizedPattern = {
  label: string;
  count: number;
  total: number;
  importance?: number;
};

export type DebriefCommercialSignalTier = "high" | "medium" | "low" | "exclude";

const HIGH_COMMERCIAL_PATTERNS: RegExp[] = [
  /clinical challenge/i,
  /visualization|fixation|exposure challenge/i,
  /workflow friction|workflow delay|slowed case progress|pace slowed/i,
  /provider frustration|provider pain|staff frustration|staff friction/i,
  /workaround|product dissatisfaction|product limitation|opportunity signal/i,
  /product availability verification caused delays/i,
];

const MEDIUM_COMMERCIAL_PATTERNS: RegExp[] = [
  / used consistently$/i,
  /competitor product|procedure volume|procedure focus|clinical growth|evaluation fit|product interest/i,
];

const LOW_VALUE_POSITIVE_PATTERNS: RegExp[] = [
  /staff appeared organized/i,
  /staff appeared comfortable/i,
  /staff workflow appeared coordinated/i,
  /staff workflow appeared efficient/i,
  /staff workflow appeared smooth/i,
  /staff appeared prepared/i,
  /staff appeared familiar/i,
  /staff workflow appeared positive/i,
  /communication smooth|no complaints|routine workflow|case went smoothly|went smoothly/i,
];

const NO_COMPLAINT_PATTERNS: RegExp[] = [
  /no complaint|no issue|no concerns|without complaint|no friction observed/i,
];

function normalizedLabel(label: string): string {
  return String(label ?? "").trim();
}

export function isHighCommercialOpportunitySignal(label: string): boolean {
  const text = normalizedLabel(label);
  return HIGH_COMMERCIAL_PATTERNS.some((pattern) => pattern.test(text));
}

export function isProductUsageSignal(label: string): boolean {
  return / used consistently$/i.test(normalizedLabel(label));
}

export function isLowValuePositiveWorkflowSignal(label: string): boolean {
  const text = normalizedLabel(label);
  return LOW_VALUE_POSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

export function isNoComplaintSignal(label: string): boolean {
  const text = normalizedLabel(label);
  return NO_COMPLAINT_PATTERNS.some((pattern) => pattern.test(text));
}

export function classifyDebriefCommercialSignalTier(label: string): DebriefCommercialSignalTier {
  const text = normalizedLabel(label);
  if (!text) return "exclude";
  if (isNoComplaintSignal(text)) return "exclude";
  if (isHighCommercialOpportunitySignal(text)) return "high";
  if (isLowValuePositiveWorkflowSignal(text)) return "low";
  if (isProductUsageSignal(text) || MEDIUM_COMMERCIAL_PATTERNS.some((pattern) => pattern.test(text))) {
    return "medium";
  }
  return "exclude";
}

function isRepeatedPattern(pattern: DebriefPrioritizedPattern): boolean {
  return pattern.count >= 2 && pattern.total >= 2 && pattern.count / pattern.total >= 0.4;
}

export function scoreDebriefCommercialPriority(pattern: DebriefPrioritizedPattern): number {
  const tier = classifyDebriefCommercialSignalTier(pattern.label);
  let score = 0;

  if (tier === "high") {
    score += 100;
    if (isRepeatedPattern(pattern)) score += 40;
  } else if (tier === "medium") {
    score += 40;
    if (isProductUsageSignal(pattern.label)) {
      score += 0;
    } else if (isRepeatedPattern(pattern)) {
      score += 30;
    }
  } else if (tier === "low") {
    score -= 50;
  } else {
    score -= 75;
  }

  return score;
}

export function sortDebriefPatternsByCommercialPriority(
  patterns: DebriefPrioritizedPattern[],
): DebriefPrioritizedPattern[] {
  return [...patterns].sort(
    (a, b) =>
      scoreDebriefCommercialPriority(b) - scoreDebriefCommercialPriority(a) ||
      b.count - a.count ||
      a.label.localeCompare(b.label),
  );
}

/** Display order for What We Know — product context first, low-value positive last. */
export function sortDebriefKnownFactsPatterns(
  patterns: DebriefPrioritizedPattern[],
): DebriefPrioritizedPattern[] {
  const tierRank = (pattern: DebriefPrioritizedPattern): number => {
    if (isProductUsageSignal(pattern.label)) return 0;
    if (classifyDebriefCommercialSignalTier(pattern.label) === "high") return 1;
    if (classifyDebriefCommercialSignalTier(pattern.label) === "medium") return 2;
    if (classifyDebriefCommercialSignalTier(pattern.label) === "low") return 3;
    return 4;
  };

  return [...patterns].sort(
    (a, b) =>
      tierRank(a) - tierRank(b) ||
      b.count - a.count ||
      scoreDebriefCommercialPriority(b) - scoreDebriefCommercialPriority(a) ||
      a.label.localeCompare(b.label),
  );
}

export function selectPrimaryHypothesisPattern(
  patterns: DebriefPrioritizedPattern[],
): DebriefPrioritizedPattern | null {
  const candidates = sortDebriefPatternsByCommercialPriority(patterns).filter((pattern) => {
    const tier = classifyDebriefCommercialSignalTier(pattern.label);
    if (tier === "low" || tier === "exclude") return false;
    if (isProductUsageSignal(pattern.label)) return false;
    return isHighCommercialOpportunitySignal(pattern.label);
  });

  return candidates[0] ?? null;
}

export function selectStrongestCommercialConversationPattern(
  patterns: DebriefPrioritizedPattern[],
): DebriefPrioritizedPattern | null {
  return selectPrimaryHypothesisPattern(patterns);
}

export function isVisualizationHypothesisPattern(label: string): boolean {
  return /visualization|fixation|exposure challenge|extra time.*visual/i.test(normalizedLabel(label));
}

export function isWorkflowFrictionHypothesisPattern(label: string): boolean {
  return /workflow delay|slowed case progress|workflow friction|product availability verification/i.test(
    normalizedLabel(label),
  );
}

export function isProviderFrustrationHypothesisPattern(label: string): boolean {
  return /provider frustration|provider pain|frustration during/i.test(normalizedLabel(label));
}

export function buildConservativeHypothesis(providerDisplayName: string): string {
  return `No clear commercial issue has emerged from observations yet. The debrief should explore whether ${providerDisplayName} sees any workflow or clinical challenges worth addressing before recommending a next step.`;
}

export function buildVisualizationHypothesis(input: {
  providerDisplayName: string;
  procedureLabel?: string | null;
  count: number;
  total: number;
}): string {
  const procedure = input.procedureLabel?.trim();
  const procedurePhrase = procedure
    ? ` in some larger or more complex ${procedure.toLowerCase()}${/repair|case|surgery|procedure/i.test(procedure) ? "" : " cases"}`
    : " in some larger or more complex cases";

  const frequency =
    input.count >= 2 && input.total >= 2
      ? ` Observed in ${input.count} of ${input.total} observations.`
      : "";

  return `Visualization challenges may occur${procedurePhrase}.${frequency} The debrief should validate whether ${input.providerDisplayName} sees this as a meaningful issue and whether it affects efficiency, exposure, or product evaluation interest.`;
}

export function buildWorkflowFrictionHypothesis(input: {
  providerDisplayName: string;
  observedLabel: string;
}): string {
  const topic = normalizedLabel(input.observedLabel).replace(/\.$/, "").toLowerCase();
  return `Observations suggest ${topic} may affect case flow. The debrief should validate whether ${input.providerDisplayName} views this as a meaningful problem worth addressing.`;
}

export function buildProviderFrustrationHypothesis(input: {
  providerDisplayName: string;
  observedLabel: string;
}): string {
  const topic = normalizedLabel(input.observedLabel).replace(/\.$/, "").toLowerCase();
  return `Observations suggest ${topic}. The debrief should validate whether ${input.providerDisplayName} sees this as recurring enough to matter for efficiency or product decisions.`;
}

export function buildHypothesisFromPrimaryPattern(input: {
  pattern: DebriefPrioritizedPattern | null;
  providerDisplayName: string;
  procedureLabel?: string | null;
}): string {
  const { pattern, providerDisplayName, procedureLabel } = input;
  if (!pattern) {
    return buildConservativeHypothesis(providerDisplayName);
  }

  if (isVisualizationHypothesisPattern(pattern.label)) {
    return buildVisualizationHypothesis({
      providerDisplayName,
      procedureLabel,
      count: pattern.count,
      total: pattern.total,
    });
  }

  if (isProviderFrustrationHypothesisPattern(pattern.label)) {
    return buildProviderFrustrationHypothesis({
      providerDisplayName,
      observedLabel: pattern.label,
    });
  }

  if (isWorkflowFrictionHypothesisPattern(pattern.label)) {
    return buildWorkflowFrictionHypothesis({
      providerDisplayName,
      observedLabel: pattern.label,
    });
  }

  if (isHighCommercialOpportunitySignal(pattern.label)) {
    return buildWorkflowFrictionHypothesis({
      providerDisplayName,
      observedLabel: pattern.label,
    });
  }

  return buildConservativeHypothesis(providerDisplayName);
}

export function buildCommercialSignalFromPrimaryPattern(input: {
  pattern: DebriefPrioritizedPattern | null;
  supportingPatterns: DebriefPrioritizedPattern[];
}): string {
  const { pattern, supportingPatterns } = input;
  if (!pattern) {
    const onlyLowValue = supportingPatterns.every(
      (row) =>
        isLowValuePositiveWorkflowSignal(row.label) ||
        classifyDebriefCommercialSignalTier(row.label) === "exclude",
    );
    if (onlyLowValue && supportingPatterns.length > 0) {
      return "Observations show a generally smooth workflow so far. Use the debrief to learn whether anything still bothers the surgeon enough to explore a change.";
    }
    return "Observation detail is still limited — use the debrief to confirm what actually matters to the surgeon.";
  }

  if (isVisualizationHypothesisPattern(pattern.label)) {
    const repeated = isRepeatedPattern(pattern);
    const lead = repeated
      ? "Extra visualization time appeared across multiple observations."
      : "Extra visualization time showed up during observations.";
    return `${lead} Because it may affect efficiency or exposure, this is worth validating during the debrief.`;
  }

  if (isProviderFrustrationHypothesisPattern(pattern.label)) {
    return "Provider frustration appeared during observations. Because it may signal a meaningful workflow issue, this is worth validating during the debrief.";
  }

  if (isWorkflowFrictionHypothesisPattern(pattern.label)) {
    return "Workflow friction appeared during observations. Because it may affect case flow, this is worth validating during the debrief.";
  }

  return "Repeated observations suggest there may be a commercially meaningful pattern worth validating during the debrief.";
}

export function buildHypothesisAlignedLearnPrompts(input: {
  pattern: DebriefPrioritizedPattern | null;
  providerDisplayName: string;
}): string[] {
  if (!input.pattern || !isHighCommercialOpportunitySignal(input.pattern.label)) {
    return [
      "Is there any workflow or clinical issue the surgeon would want to improve?",
      "Does anything observed so far actually bother them day to day?",
      "Would they consider changing anything if a meaningful issue were confirmed?",
      "What type of next step would feel appropriate if an issue matters to them?",
    ];
  }

  if (isVisualizationHypothesisPattern(input.pattern.label)) {
    return [
      "Does visualization become difficult in specific case types?",
      "Does it slow the procedure enough to matter?",
      `Is this something ${input.providerDisplayName} wants to improve?`,
      "Is he open to evaluating a solution if the issue is meaningful?",
    ];
  }

  if (isProviderFrustrationHypothesisPattern(input.pattern.label)) {
    return [
      "How often does this frustration show up in real cases?",
      "Does it affect efficiency, workflow, or satisfaction?",
      `Would ${input.providerDisplayName} want to change anything if it were confirmed?`,
      "What would need to be true before trying something different?",
    ];
  }

  return [
    "Is this actually a problem from the surgeon's perspective?",
    "How often does this occur in real cases?",
    "Does it impact efficiency, workflow, or satisfaction?",
    "Would they consider changing anything?",
  ];
}

export function buildHypothesisAlignedQuestions(input: {
  pattern: DebriefPrioritizedPattern | null;
}): string[] {
  if (!input.pattern || !isHighCommercialOpportunitySignal(input.pattern.label)) {
    return [
      "When you think about the cases we've observed, is anything consistently annoying or slowing you down?",
      "Is there anything you'd want to improve if you could?",
      "Would you bring up a workflow issue on your own, or only if someone asked?",
      "What would need to be true for you to want to try something different?",
    ];
  }

  if (isVisualizationHypothesisPattern(input.pattern.label)) {
    return [
      "In the cases we observed, visualization seemed to take extra time in some situations. Is that something you notice too?",
      "Does that tend to happen only in larger or more complex repairs?",
      "Is it just part of the case, or does it slow you down enough to be worth addressing?",
      "If there were a way to improve visualization in those cases, would that be worth evaluating?",
    ];
  }

  if (isProviderFrustrationHypothesisPattern(input.pattern.label)) {
    return [
      "When that frustration comes up, is it just part of the case or does it actually slow you down?",
      "How often do you run into that situation during real cases?",
      "If you could change one thing about that part of the workflow, what would it be?",
      "Would you want to talk about it if it keeps showing up?",
    ];
  }

  return [
    "When this happens during a case, is it just a minor annoyance or does it actually affect how you work?",
    "How often do you run into that situation during real cases?",
    "If you could change one thing about that part of the workflow, what would it be?",
    "Does it slow you down enough that you'd want to talk about it?",
  ];
}
