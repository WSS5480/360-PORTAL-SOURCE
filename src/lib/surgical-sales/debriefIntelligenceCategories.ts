/**
 * Normalized debrief intelligence categories — each extracted item has one primary
 * and zero or more secondary categories (separate from provider pathway stage).
 */

import type { IntelligenceDomain } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import {
  debriefExplicitlyApprovesObservation,
  debriefIndicatesObservationInterest,
} from "@/lib/surgical-sales/observationApprovalDebriefMapping";

export const DEBRIEF_INTELLIGENCE_CATEGORIES = [
  "access_intelligence",
  "relationship_intelligence",
  "clinical_focus",
  "workflow_intelligence",
  "product_fit_signals",
  "competitive_intelligence",
  "people_contacts",
  "next_steps",
] as const;

export type DebriefIntelligenceCategory = (typeof DEBRIEF_INTELLIGENCE_CATEGORIES)[number];

export const DEBRIEF_INTELLIGENCE_CATEGORY_LABELS: Record<DebriefIntelligenceCategory, string> = {
  access_intelligence: "Access Intelligence",
  relationship_intelligence: "Relationship Intelligence",
  clinical_focus: "Clinical Focus",
  workflow_intelligence: "Workflow Intelligence",
  product_fit_signals: "Product Fit Signals",
  competitive_intelligence: "Competitive Intelligence",
  people_contacts: "People / Contacts",
  next_steps: "Next Steps",
};

export const DEBRIEF_INTELLIGENCE_CATEGORY_DESCRIPTIONS: Record<DebriefIntelligenceCategory, string> = {
  access_intelligence:
    "Observation approval, credentialing, scheduling pathway, facility approval, access blockers.",
  relationship_intelligence:
    "Provider openness, resistance, trust level, receptiveness, relationship temperature.",
  clinical_focus: "Procedure types, case mix, volume, specialty focus, clinical complexity.",
  workflow_intelligence:
    "OR workflow, turnover, setup, scheduling process, bottlenecks.",
  product_fit_signals:
    "Explicit interest in our product, category, evaluation, trial, or solution — not vague OR or workflow friction alone.",
  competitive_intelligence: "Named competitor products, current products used, vendor preferences.",
  people_contacts: "Schedulers, OR coordinators, office managers, champions, blockers.",
  next_steps: "Follow-up actions, owner, timing, unresolved questions.",
};

/** Review UI groups use the same ids as intelligence categories. */
export type DebriefInsightGroupId = DebriefIntelligenceCategory;

export const DEBRIEF_INSIGHT_GROUP_PRIORITY: Record<DebriefIntelligenceCategory, number> = {
  access_intelligence: 1,
  people_contacts: 2,
  next_steps: 3,
  relationship_intelligence: 4,
  clinical_focus: 5,
  workflow_intelligence: 6,
  product_fit_signals: 7,
  competitive_intelligence: 8,
};

export type DebriefExtractionSignalKind =
  | "confirmed_fact"
  | "inferred_signal"
  | "interest_signal"
  | "approval_signal"
  | "mentioned_person"
  | "confirmed_contact"
  | "pain_point"
  | "product_interest"
  | "next_step"
  | "completed_action"
  | "unknown";

const COMPETITIVE_MARKERS =
  /\b(?:competitor|competitive|versus|vs\.?|currently uses?|incumbent|preference\s*card|ethicon|medtronic|intuitive|stryker)\b/i;

const RELATIONSHIP_MARKERS =
  /\b(?:approachable|receptive|openness|resistance|trust|relationship|communication|not opposed|shut down|willing|receptive|champion)\b/i;

const WORKFLOW_MARKERS =
  /\b(?:workflow|turnover|setup|bottleneck|or\s+time|room|staff|process|coordination|scheduling\s+process)\b/i;

const CLINICAL_MARKERS =
  /\b(?:procedure|case\s+mix|volume|hernia|robotic|laparoscopic|abdominal|specialty|complexity|clinical)\b/i;

/** Explicit link to our product, evaluation, trial, or solution — not vague workflow pain. */
const EXPLICIT_OUR_PRODUCT_RE =
  /\b(?:ACSIS|our\s+(?:product|setup|solution|system|offering|portfolio|line)|asked\s+about|inquir(?:ed|y)\s+about|(?:could|would|may)\s+be\s+helped\s+by\s+(?:our|us|the)\s+(?:product|setup|solution|system)|helped\s+by\s+(?:our|the)\s+(?:product|setup|solution|system))\b/i;

const EXPLICIT_PRODUCT_EVAL_TRIAL_RE =
  /\b(?:product\s+(?:fit|eval|trial|demo|category)|(?:evaluat(?:e|ing|ion)|trial)\s+(?:of|for|with)\s+(?:our|ACSIS|the\s+product)|solution\s+(?:fit|eval)|our\s+(?:product|solution))\b/i;

export function debriefExplicitProductFitConnection(blob: string): boolean {
  const text = blob.trim();
  if (!text) return false;
  if (EXPLICIT_OUR_PRODUCT_RE.test(text) || EXPLICIT_PRODUCT_EVAL_TRIAL_RE.test(text)) {
    return true;
  }
  if (/\b(?:our|we|us)\b/i.test(text) && /\b(?:product|solution|setup|system|trial|evaluat|ACSIS)\b/i.test(text)) {
    return true;
  }
  return false;
}

/** Confidence for product-fit items after explicit connection is established. */
export function resolveProductFitSignalConfidence(blob: string): "high" | "medium" | "low" {
  const text = blob.trim();
  if (!debriefExplicitProductFitConnection(text)) return "low";
  if (/\b(?:asked\s+about|inquir(?:ed|y)\s+about|questions?\s+about)\b/i.test(text)) return "high";
  if (
    /\b(?:could\s+be\s+helped|helped\s+by|our\s+(?:setup|product|solution)|interested\s+in|trial|evaluat)\b/i.test(
      text,
    )
  ) {
    return "medium";
  }
  if (/\bACSIS\b/i.test(text)) return "high";
  return "medium";
}

const ACCESS_MARKERS =
  /\b(?:observation|credential|intellicentrics|vendormate|access|approval|facility|pathway|blocker|schedul|coordinator)\b/i;

function uniqueCategories(
  primary: DebriefIntelligenceCategory,
  secondary: DebriefIntelligenceCategory[],
): { primaryCategory: DebriefIntelligenceCategory; secondaryCategories: DebriefIntelligenceCategory[] } {
  const seen = new Set<DebriefIntelligenceCategory>([primary]);
  const secondaryCategories = secondary.filter((c) => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
  return { primaryCategory: primary, secondaryCategories };
}

function domainPrimaryCategory(domain: IntelligenceDomain | null | undefined): DebriefIntelligenceCategory | null {
  switch (domain) {
    case "or_access":
    case "credentialing":
    case "scheduling":
      return "access_intelligence";
    case "relationship":
      return "relationship_intelligence";
    case "case_mix":
      return "clinical_focus";
    case "workflow":
      return "workflow_intelligence";
    case "product_fit":
    case "evaluation":
      return "product_fit_signals";
    case "procurement":
      return "competitive_intelligence";
    case "stakeholders":
      return "people_contacts";
    case "next_steps":
      return "next_steps";
    default:
      return null;
  }
}

export function classifyDebriefIntelligenceCategories(input: {
  domain?: IntelligenceDomain | null;
  label: string;
  value: string;
  evidence?: string;
  signalKind: DebriefExtractionSignalKind;
  isContact?: boolean;
  mentionLevel?: "mentioned_person" | "workflow_participant" | "potential_support_contact" | "confirmed_support_contact";
  schedulingContact?: boolean;
}): {
  primaryCategory: DebriefIntelligenceCategory;
  secondaryCategories: DebriefIntelligenceCategory[];
} {
  const blob = [input.label, input.value, input.evidence].filter(Boolean).join(" ");
  const secondary: DebriefIntelligenceCategory[] = [];

  if (input.isContact) {
    if (input.schedulingContact || /\bschedul/i.test(blob)) {
      return uniqueCategories("people_contacts", ["access_intelligence", "workflow_intelligence"]);
    }
    if (/\bchampion|blocker|decision|influence/i.test(blob)) {
      return uniqueCategories("people_contacts", ["relationship_intelligence"]);
    }
    return uniqueCategories("people_contacts", ["access_intelligence"]);
  }

  if (
    input.signalKind === "next_step" ||
    input.signalKind === "unknown" ||
    input.signalKind === "completed_action"
  ) {
    if (ACCESS_MARKERS.test(blob)) secondary.push("access_intelligence");
    if (input.isContact || /\b[A-Z][a-z]+/.test(blob)) secondary.push("people_contacts");
    return uniqueCategories("next_steps", secondary);
  }

  const domainPrimary = domainPrimaryCategory(input.domain);

  if (input.signalKind === "approval_signal" || input.signalKind === "interest_signal") {
    if (input.domain === "or_access" || /\bobservation\b/i.test(blob)) {
      if (input.signalKind === "interest_signal" || debriefIndicatesObservationInterest(blob)) {
        secondary.push("relationship_intelligence");
      }
      return uniqueCategories("access_intelligence", secondary);
    }
  }

  if (input.signalKind === "pain_point") {
    if (input.domain === "workflow" || WORKFLOW_MARKERS.test(blob) || !input.domain) {
      const painSecondary: DebriefIntelligenceCategory[] = [];
      if (debriefExplicitProductFitConnection(blob)) painSecondary.push("product_fit_signals");
      if (CLINICAL_MARKERS.test(blob)) painSecondary.push("clinical_focus");
      return uniqueCategories("workflow_intelligence", painSecondary);
    }
    if (debriefExplicitProductFitConnection(blob)) {
      const fitSecondary: DebriefIntelligenceCategory[] = ["workflow_intelligence"];
      if (CLINICAL_MARKERS.test(blob)) fitSecondary.push("clinical_focus");
      return uniqueCategories("product_fit_signals", fitSecondary);
    }
    return uniqueCategories("workflow_intelligence", CLINICAL_MARKERS.test(blob) ? ["clinical_focus"] : []);
  }

  if (input.signalKind === "product_interest" && debriefExplicitProductFitConnection(blob)) {
    if (COMPETITIVE_MARKERS.test(blob)) {
      return uniqueCategories("product_fit_signals", ["competitive_intelligence"]);
    }
    const fitSecondary: DebriefIntelligenceCategory[] = [];
    if (WORKFLOW_MARKERS.test(blob)) fitSecondary.push("workflow_intelligence");
    if (CLINICAL_MARKERS.test(blob)) fitSecondary.push("clinical_focus");
    return uniqueCategories("product_fit_signals", fitSecondary);
  }

  if (input.domain === "procurement" || (COMPETITIVE_MARKERS.test(blob) && !debriefExplicitProductFitConnection(blob))) {
    return uniqueCategories("competitive_intelligence", ["product_fit_signals"]);
  }

  if (domainPrimary === "access_intelligence" || (ACCESS_MARKERS.test(blob) && debriefExplicitlyApprovesObservation(blob))) {
    if (WORKFLOW_MARKERS.test(blob)) secondary.push("workflow_intelligence");
    if (RELATIONSHIP_MARKERS.test(blob)) secondary.push("relationship_intelligence");
    return uniqueCategories("access_intelligence", secondary);
  }

  if (domainPrimary === "relationship_intelligence" || RELATIONSHIP_MARKERS.test(blob)) {
    if (ACCESS_MARKERS.test(blob)) secondary.push("access_intelligence");
    return uniqueCategories("relationship_intelligence", secondary);
  }

  if (domainPrimary === "clinical_focus" || CLINICAL_MARKERS.test(blob)) {
    if (WORKFLOW_MARKERS.test(blob)) secondary.push("workflow_intelligence");
    return uniqueCategories("clinical_focus", secondary);
  }

  if (domainPrimary === "workflow_intelligence" || WORKFLOW_MARKERS.test(blob)) {
    if (debriefExplicitProductFitConnection(blob)) secondary.push("product_fit_signals");
    if (CLINICAL_MARKERS.test(blob)) secondary.push("clinical_focus");
    return uniqueCategories("workflow_intelligence", secondary);
  }

  if (domainPrimary === "product_fit_signals" && debriefExplicitProductFitConnection(blob)) {
    if (COMPETITIVE_MARKERS.test(blob)) secondary.push("competitive_intelligence");
    if (WORKFLOW_MARKERS.test(blob)) secondary.push("workflow_intelligence");
    if (CLINICAL_MARKERS.test(blob)) secondary.push("clinical_focus");
    return uniqueCategories("product_fit_signals", secondary);
  }

  if (
    (domainPrimary === "product_fit_signals" || input.domain === "product_fit" || input.domain === "evaluation") &&
    !debriefExplicitProductFitConnection(blob)
  ) {
    if (WORKFLOW_MARKERS.test(blob)) {
      if (CLINICAL_MARKERS.test(blob)) secondary.push("clinical_focus");
      return uniqueCategories("workflow_intelligence", secondary);
    }
  }

  if (domainPrimary === "people_contacts") {
    return uniqueCategories("people_contacts", ["access_intelligence"]);
  }

  if (domainPrimary === "next_steps") {
    return uniqueCategories("next_steps", secondary);
  }

  if (input.signalKind === "inferred_signal") {
    return uniqueCategories(domainPrimary ?? "workflow_intelligence", secondary);
  }

  return uniqueCategories(domainPrimary ?? "workflow_intelligence", secondary);
}

export function intelligenceCategoryLabel(category: DebriefIntelligenceCategory): string {
  return DEBRIEF_INTELLIGENCE_CATEGORY_LABELS[category];
}

export function formatIntelligenceCategoryTags(input: {
  primaryCategory: DebriefIntelligenceCategory;
  secondaryCategories?: DebriefIntelligenceCategory[];
}): string {
  const parts = [intelligenceCategoryLabel(input.primaryCategory)];
  for (const sec of input.secondaryCategories ?? []) {
    parts.push(intelligenceCategoryLabel(sec));
  }
  return parts.join(" · ");
}
