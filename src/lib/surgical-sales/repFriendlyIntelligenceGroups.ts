export type RepFriendlyIntelligenceCategoryId =
  | "current_workflow"
  | "challenges_friction"
  | "product_signals"
  | "people_access"
  | "next_steps";

export type RepFriendlyIntelligenceItem = {
  id?: string;
  text: string;
  quote?: string;
  evidenceText?: string | null;
  sourceNoteText?: string | null;
  extractedFactId?: string | null;
  inferred?: boolean;
  supportingEvidence?: string[];
  /** Optional extraction/display metadata. Used for semantic routing only; extraction remains unchanged. */
  concept?: string | null;
  sourceCategory?: string | null;
  sourceType?: string | null;
  productMentioned?: string | null;
  personMentioned?: string | null;
};

export type IntelligenceVerificationStatus = "Verified" | "Inferred";

export type IntelligenceVerificationAudit = {
  claim: string;
  evidenceText: string;
  sourceNoteText: string;
  extractedFactId: string;
  assignedCategory: RepFriendlyIntelligenceCategoryId;
  verificationStatus: IntelligenceVerificationStatus;
};

export type VerifiedRepFriendlyIntelligenceItem = RepFriendlyIntelligenceItem & {
  verification: IntelligenceVerificationAudit;
};

export type RepFriendlyIntelligenceGroup = {
  id: RepFriendlyIntelligenceCategoryId;
  title: string;
  description: string;
  items: VerifiedRepFriendlyIntelligenceItem[];
};

export type RepFriendlyIntelligenceBriefing = {
  groups: RepFriendlyIntelligenceGroup[];
  summary: string;
};

export const REP_FRIENDLY_INTELLIGENCE_CATEGORIES: Array<{
  id: RepFriendlyIntelligenceCategoryId;
  title: string;
  description: string;
}> = [
  {
    id: "current_workflow",
    title: "Current Workflow",
    description: "Current products, competitors, processes, techniques, setup, and existing approach.",
  },
  {
    id: "challenges_friction",
    title: "Challenges & Friction",
    description: "Pain points, workflow issues, inefficiencies, delays, access issues, and operational obstacles.",
  },
  {
    id: "product_signals",
    title: "Product Signals",
    description: "Product interest, evaluation signals, comparison questions, objections, and openness to change.",
  },
  {
    id: "people_access",
    title: "People & Access",
    description: "Contacts, influencers, decision-makers, scheduling paths, credentialing, and access pathways.",
  },
  {
    id: "next_steps",
    title: "Next Steps",
    description: "Follow-ups, action items, evaluations, observations, meetings, and requested information.",
  },
];

const CONCEPT_TO_CATEGORY: Record<string, RepFriendlyIntelligenceCategoryId> = {
  current_product: "current_workflow",
  competitor_product: "current_workflow",
  technology_preference: "current_workflow",
  procedure_focus: "current_workflow",
  procedure_volume_trend: "current_workflow",
  case_outcome: "current_workflow",
  no_issue_or_routine: "current_workflow",
  visualization_or_access_issue: "challenges_friction",
  sizing_or_fit_issue: "challenges_friction",
  inventory_availability_issue: "challenges_friction",
  workflow_or_timing_issue: "challenges_friction",
  placement_or_positioning_issue: "challenges_friction",
  training_or_familiarity_issue: "challenges_friction",
  product_performance_issue: "challenges_friction",
  staff_workflow: "challenges_friction",
  unavailable_item: "challenges_friction",
  requested_item: "next_steps",
  alternative_used: "current_workflow",
  product_interest: "product_signals",
  provider_sentiment: "product_signals",
  support_needed: "next_steps",
  next_action: "next_steps",
  contact_role: "people_access",
  access_pathway: "people_access",
  credentialing_requirement: "people_access",
};

const SOURCE_CATEGORY_TO_CATEGORY: Record<string, RepFriendlyIntelligenceCategoryId> = {
  clinical_pain_points: "challenges_friction",
  workflow_friction: "challenges_friction",
  staff_observations: "challenges_friction",
  competitor_products: "current_workflow",
  product_fit_signals: "product_signals",
  provider_behavior: "product_signals",
  growth_opportunities: "next_steps",
  follow_up_recommendations: "next_steps",
  follow_up_signals: "next_steps",
  scheduling_contact: "people_access",
  observation_access: "people_access",
  workflow_participant: "people_access",
  clinical_focus: "current_workflow",
  product_intelligence: "product_signals",
  organization_intelligence: "people_access",
  follow_up_task: "next_steps",
};

const LOW_VALUE_PATTERNS = [
  /^(?:clinical\s+)?procedure focus$/i,
  /^procedure focus:\s*/i,
  /^provider behavior$/i,
  /^clinical focus$/i,
  /^clinical procedure focus$/i,
  /^visualization or access issue$/i,
  /^workflow or timing issue$/i,
  /^product interest$/i,
  /^next step recommended$/i,
  /^current product$/i,
  /^competitor product$/i,
  /^unknown intelligence signal$/i,
  /^no meaningful intelligence issue identified$/i,
];

const PROCEDURE_ONLY_PATTERN =
  /^(?:robotic|laparoscopic|open|minimally invasive|mis)?\s*(?:[a-z]+\s+){0,5}(?:repair|reconstruction|procedure|case|surgery|arthroplasty|fixation)$/i;
const PROCEDURE_CONTEXT_ONLY_PATTERN =
  /^(?:colorectal|orthopedic|orthopaedic|cardiac|vascular|thoracic|urology|gynecology|gyn|ent|spine|trauma|hernia|shoulder|knee|hip|pelvic|abdominal|robotic|laparoscopic|open)$/i;

function keyify(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[“”"'.!?()[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceAppearsInSource(evidence: string, sourceNoteText: string): boolean {
  const normalizedEvidence = normalizeText(evidence);
  const normalizedSource = normalizeText(sourceNoteText);
  return Boolean(normalizedEvidence) && normalizedSource.includes(normalizedEvidence);
}

function cleanDisplayText(text: string): string {
  return text.trim().replace(/[.!?]+$/g, "");
}

function isLowValueDisplayText(item: RepFriendlyIntelligenceItem): boolean {
  const trimmed = item.text.trim();
  if (!trimmed) return true;
  if (/^(?:unknown|none|n\/a|yes|no)$/i.test(trimmed)) return true;
  if (/^[-•\s]+$/.test(trimmed)) return true;
  if (LOW_VALUE_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;
  if (
    PROCEDURE_ONLY_PATTERN.test(trimmed) &&
    !/\b(?:used|using|current|product|competitor|setup|approach|observe|observation|schedule|coordinate|visualization|view|exposure|access|extra time|difficult|challenging)\b/i.test(trimmed)
  ) {
    return true;
  }
  if (PROCEDURE_CONTEXT_ONLY_PATTERN.test(trimmed)) return true;

  const concept = keyify(item.concept);
  if (
    (concept === "procedure_focus" || concept === "procedure_volume_trend" || concept === "technology_preference") &&
    PROCEDURE_CONTEXT_ONLY_PATTERN.test(trimmed)
  ) {
    return true;
  }
  if ((concept === "procedure_focus" || concept === "procedure_volume_trend") && PROCEDURE_ONLY_PATTERN.test(trimmed)) {
    return true;
  }

  return false;
}

function evidenceForItem(item: RepFriendlyIntelligenceItem): string {
  return (
    item.evidenceText?.trim() ||
    item.quote?.trim() ||
    (item.supportingEvidence ?? []).map((entry) => entry.trim()).filter(Boolean).join(" | ") ||
    ""
  );
}

function sourceNoteForItem(item: RepFriendlyIntelligenceItem, evidenceText: string): string {
  return item.sourceNoteText?.trim() || evidenceText;
}

function claimRequiresDirectUsage(claim: string): boolean {
  return /\b(?:was|were|is|are)?\s*(?:used|using|in use|trialed|trialled|implanted|placed|deployed)\b/i.test(
    claim,
  );
}

function evidenceDirectlySupportsUsage(evidence: string): boolean {
  return /\b(?:used|using|uses|trialed|trialled|implanted|placed|deployed|had\b[^.!?]{0,48}\bin (?:the )?(?:case|procedure|surgery)|in use)\b/i.test(
    evidence,
  );
}

function hasUnsupportedRelationship(input: {
  claim: string;
  evidence: string;
  categoryId: RepFriendlyIntelligenceCategoryId;
}): boolean {
  const claim = input.claim.toLowerCase();
  const evidence = input.evidence.toLowerCase();

  if (
    input.categoryId === "current_workflow" &&
    claimRequiresDirectUsage(claim) &&
    !evidenceDirectlySupportsUsage(evidence)
  ) {
    return true;
  }
  if (input.categoryId === "current_workflow" && /\b(?:used|using|trialed|trialled|implanted|placed|deployed)\b/.test(claim)) {
    if (/\b(?:asked|question|interested|future|evaluation|compare|compared|compares|comparison)\b/.test(evidence)) {
      return true;
    }
  }
  if (
    input.categoryId !== "people_access" &&
    /\bevaluat(?:e|ing|ion)\b/.test(claim) &&
    /\b(?:interested|interest|asked|question|future)\b/.test(evidence) &&
    !/\b(?:interest|interested|scheduling|schedule|asked|question|open)\b/.test(claim)
  ) {
    return true;
  }
  if (/\bcompleted|done|finished\b/.test(claim) && /\b(?:future|follow up|next step|plan|schedule)\b/.test(evidence)) {
    return true;
  }
  if (/\bworkflow\b/.test(claim) && PROCEDURE_ONLY_PATTERN.test(evidence)) return true;
  if (/\bdecision[- ]?maker\b/.test(claim) && /\b(?:contact|coordinator|manager)\b/.test(evidence) && !/\bdecision[- ]?maker\b/.test(evidence)) {
    return true;
  }
  if (/\bproduct fit\b|\bfit signal\b|\bproduct opening\b/.test(claim) && /\b(?:asked|question|compare|compared|compares)\b/.test(evidence)) {
    return true;
  }

  return false;
}

export function verifyRepFriendlyIntelligenceItem(input: {
  item: RepFriendlyIntelligenceItem;
  categoryId: RepFriendlyIntelligenceCategoryId;
}): VerifiedRepFriendlyIntelligenceItem | null {
  const claim = cleanDisplayText(input.item.text);
  if (!claim) return null;

  const evidenceText = evidenceForItem(input.item);
  if (!evidenceText) return null;

  const sourceNoteText = sourceNoteForItem(input.item, evidenceText);
  if (!sourceNoteText || !evidenceAppearsInSource(evidenceText, sourceNoteText)) return null;

  if (hasUnsupportedRelationship({ claim, evidence: evidenceText, categoryId: input.categoryId })) {
    return null;
  }

  const supportingEvidence = input.item.supportingEvidence?.filter((entry) => entry.trim()) ?? [];
  const verificationStatus: IntelligenceVerificationStatus =
    input.item.inferred || supportingEvidence.length > 1 || /\s\|\s/.test(evidenceText) ? "Inferred" : "Verified";

  const extractedFactId =
    input.item.extractedFactId?.trim() || input.item.id?.trim() || `${input.categoryId}:${normalizeText(claim)}`;

  return {
    ...input.item,
    text: claim,
    evidenceText,
    sourceNoteText,
    extractedFactId,
    verification: {
      claim,
      evidenceText,
      sourceNoteText,
      extractedFactId,
      assignedCategory: input.categoryId,
      verificationStatus,
    },
  };
}

function categoryFromMetadata(item: RepFriendlyIntelligenceItem): RepFriendlyIntelligenceCategoryId | null {
  if (/\bcurrent setup\b/i.test(item.text)) return "current_workflow";
  if (
    /\b(?:access difficulty|visualization|repositioning|difficult|challenging|loses? time|lost time)\b/i.test(
      item.text,
    ) &&
    !/\bobservation access\b/i.test(item.text)
  ) {
    return "challenges_friction";
  }

  const concept = keyify(item.concept);
  if (concept && CONCEPT_TO_CATEGORY[concept]) return CONCEPT_TO_CATEGORY[concept];

  const sourceCategory = keyify(item.sourceCategory);
  if (sourceCategory && SOURCE_CATEGORY_TO_CATEGORY[sourceCategory]) {
    return SOURCE_CATEGORY_TO_CATEGORY[sourceCategory];
  }

  return null;
}

function classifyByBusinessMeaning(item: RepFriendlyIntelligenceItem): RepFriendlyIntelligenceCategoryId {
  const fromMetadata = categoryFromMetadata(item);
  if (fromMetadata) return fromMetadata;

  const text = item.text.toLowerCase();

  if (
    /\b(?:follow up|follow-up|next step|action item|schedule|book|set up|meeting|evaluation case|future case|send|share|email|text|requested|request|materials?|clinical data|paper|study|literature|observe|observation)\b/i.test(
      text,
    )
  ) {
    return "next_steps";
  }

  if (
    /\b(?:scheduling|scheduler|coordinator|office manager|manager|credentialing|credentialed|access pathway|observation access|key contact|influencer|decision maker|relationship|introduced|met with|spoke with)\b/i.test(
      text,
    ) ||
    /\s[—-]\s/.test(item.text)
  ) {
    return "people_access";
  }

  if (
    /\b(?:interest|interested|comparison|compare|compares|evaluation|evaluate|trial|demo|buying criteria|criteria|objection|learning curve|product question|asked .*about|asked .*whether|not locked into|open to alternatives|open to change|future discussion|continued discussion|receptive)\b/i.test(
      text,
    )
  ) {
    return "product_signals";
  }

  if (
    /\b(?:friction|challenge|challenging|difficult|difficulty|pain|issue|problem|inefficien|delay|delayed|waiting|access|visualization|inventory|availability|stock|readiness|bottleneck|turnover|reposition|frustrat|workaround|extra time|slowed|staff concern|operational obstacle)\b/i.test(
      text,
    )
  ) {
    return "challenges_friction";
  }

  return "current_workflow";
}

function extractEntityKey(item: RepFriendlyIntelligenceItem): string | null {
  const explicit = item.productMentioned?.trim() || item.personMentioned?.trim();
  if (explicit) return normalizeText(explicit);

  const text = item.text.trim();
  const currentProduct = text.match(/\b(?:current|competitor)?\s*product:\s*([^.;]+)/i)?.[1];
  if (currentProduct) return normalizeText(currentProduct);

  const usedProduct = text.match(/\b(.{2,80}?)\s+(?:was|were)\s+used\b/i)?.[1];
  if (usedProduct && !/\b(?:product|item|device|implant|tray|graft|system|mesh)\s*$/i.test(usedProduct)) {
    return normalizeText(usedProduct);
  }

  const contact = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[—-]\s+/)?.[1];
  if (contact) return normalizeText(contact);

  return null;
}

function semanticThemeKey(categoryId: RepFriendlyIntelligenceCategoryId, item: RepFriendlyIntelligenceItem): string {
  const concept = keyify(item.concept);
  const value = normalizeText(item.text);
  const entity = extractEntityKey(item);

  if (categoryId === "current_workflow") {
    if (entity) return `current:entity:${entity}`;
    if (concept === "case_outcome" && /no workflow delays|room ran|efficient/i.test(value)) {
      return "current:case-outcome:no-workflow-delays";
    }
    if (concept === "case_outcome" && /not observed|wasn'?t present|not present|less convinced/i.test(value)) {
      return "current:case-outcome:resolved-issue";
    }
    if (/setup|approach|process|technique|workflow|currently|standard/.test(value)) return "current:setup";
    if (concept) return `current:concept:${concept}`;
  }

  if (categoryId === "challenges_friction") {
    if (/visualization|view|exposure/.test(value)) return "challenge:visualization";
    if (/access|tight|reposition|credential/.test(value)) return "challenge:access";
    if (/inventory|availability|stock|readiness|waiting|supply/.test(value)) return "challenge:inventory";
    if (/delay|turnover|extra time|slowed|timing|bottleneck/.test(value)) return "challenge:timing";
    if (/staff|scrub|circulator|assistant|team/.test(value)) return "challenge:staff";
    if (concept) return `challenge:concept:${concept}`;
  }

  if (categoryId === "product_signals") {
    if (/training|learning curve|staff/.test(value)) return `product-signal:training:${entity ?? "unknown"}`;
    if (/compatible|works with|existing equipment|setup/.test(value)) {
      return `product-signal:compatibility:${entity ?? "unknown"}`;
    }
    if (/compare|comparison|compares|versus|vs/.test(value)) return "product-signal:comparison";
    if (/evaluation|trial|demo|future case/.test(value)) return "product-signal:evaluation";
    if (/objection|concern|criteria|learning curve/.test(value)) return "product-signal:criteria-objection";
    if (entity) return `product-signal:entity:${entity}`;
    if (concept) return `product-signal:concept:${concept}`;
  }

  if (categoryId === "people_access") {
    if (entity) return `people:entity:${entity}`;
    if (/credential/.test(value)) return "people:credentialing";
    if (/observation access|access pathway/.test(value)) return "people:observation-access";
    if (/relationship/.test(value)) return "people:relationship";
    if (concept) return `people:concept:${concept}`;
  }

  if (categoryId === "next_steps") {
    if (/observe|observation/.test(value)) return "next:observation";
    if (/evaluation case|future case|evaluate/.test(value)) return "next:evaluation-case";
    if (/literature|clinical data|paper|study|materials|send|share|email|text/.test(value)) return "next:materials";
    if (/meeting|schedule|book|set up/.test(value)) return "next:meeting";
    if (/follow up|follow-up/.test(value)) return "next:follow-up";
    if (concept) return `next:concept:${concept}`;
  }

  return `${categoryId}:${value}`;
}

function specificityScore(item: RepFriendlyIntelligenceItem): number {
  let score = Math.min(item.text.length, 180);
  if (item.productMentioned || item.personMentioned) score += 30;
  if (item.concept) score += 16;
  if (/\b(?:difficult|challenging|interested|follow up|current setup|was used|asked|requested)\b/i.test(item.text)) {
    score += 20;
  }
  if (/^(?:product|workflow|clinical|procedure|current product|competitor product)\b/i.test(item.text)) score -= 20;
  return score;
}

function preferMoreSpecificItem(
  current: VerifiedRepFriendlyIntelligenceItem,
  candidate: VerifiedRepFriendlyIntelligenceItem,
): VerifiedRepFriendlyIntelligenceItem {
  return specificityScore(candidate) > specificityScore(current) ? candidate : current;
}

export function groupRepFriendlyIntelligenceItems(
  items: RepFriendlyIntelligenceItem[],
): RepFriendlyIntelligenceGroup[] {
  const buckets = new Map<RepFriendlyIntelligenceCategoryId, Map<string, VerifiedRepFriendlyIntelligenceItem>>();

  for (const category of REP_FRIENDLY_INTELLIGENCE_CATEGORIES) {
    buckets.set(category.id, new Map());
  }

  for (const rawItem of items) {
    const text = cleanDisplayText(rawItem.text);
    const item = { ...rawItem, text };
    if (isLowValueDisplayText(item)) continue;

    const categoryId = classifyByBusinessMeaning(item);
    const verified = verifyRepFriendlyIntelligenceItem({ item, categoryId });
    if (!verified) continue;
    const key = semanticThemeKey(categoryId, item);
    const bucket = buckets.get(categoryId);
    if (!bucket) continue;

    const existing = bucket.get(key);
    bucket.set(key, existing ? preferMoreSpecificItem(existing, verified) : verified);
  }

  return REP_FRIENDLY_INTELLIGENCE_CATEGORIES.map((category) => ({
    ...category,
    items: [...(buckets.get(category.id)?.values() ?? [])],
  }));
}

export function repFriendlyGroupsHaveItems(groups: RepFriendlyIntelligenceGroup[]): boolean {
  return groups.some((group) => group.items.length > 0);
}

function firstItemText(group: RepFriendlyIntelligenceGroup): string | null {
  return group.items[0]?.text ?? null;
}

function shortPhrase(text: string): string {
  const trimmed = cleanDisplayText(text);
  return trimmed.length > 110 ? `${trimmed.slice(0, 107).trim()}...` : trimmed;
}

export function summarizeRepFriendlyIntelligenceGroups(groups: RepFriendlyIntelligenceGroup[]): string {
  const populated = groups.filter((group) => group.items.length > 0);
  if (populated.length === 0) return "No actionable intelligence has been captured yet.";

  const current = firstItemText(groups.find((group) => group.id === "current_workflow")!);
  const challenge = firstItemText(groups.find((group) => group.id === "challenges_friction")!);
  const product = firstItemText(groups.find((group) => group.id === "product_signals")!);
  const people = firstItemText(groups.find((group) => group.id === "people_access")!);
  const next = firstItemText(groups.find((group) => group.id === "next_steps")!);

  const sentences: string[] = [];
  if (current) sentences.push(`Current workflow: ${shortPhrase(current)}.`);
  if (challenge) sentences.push(`Main friction: ${shortPhrase(challenge)}.`);
  if (product) sentences.push(`Product signal: ${shortPhrase(product)}.`);
  if (people) sentences.push(`Access path: ${shortPhrase(people)}.`);
  if (next) sentences.push(`Next step: ${shortPhrase(next)}.`);

  return sentences.slice(0, 3).join(" ");
}

export function buildRepFriendlyIntelligenceBriefing(
  items: RepFriendlyIntelligenceItem[],
): RepFriendlyIntelligenceBriefing {
  const groups = groupRepFriendlyIntelligenceItems(items);
  return {
    groups,
    summary: summarizeRepFriendlyIntelligenceGroups(groups),
  };
}
