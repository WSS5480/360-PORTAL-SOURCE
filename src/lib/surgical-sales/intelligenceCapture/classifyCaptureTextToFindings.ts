/**
 * Capture-first classification — rep types/pastes/dictates first, the platform
 * proposes which intelligence area each finding belongs to.
 *
 * Deterministic and stage-scoped: only categories unlocked for the provider's
 * pathway stage are ever proposed. Nothing here writes data — proposals go to
 * a rep review step, and accepted findings commit through the existing
 * category-scoped finding route (same mapping, evidence, and attribution as
 * category-first capture).
 */

import { assessObservationAccessFromDebrief } from "@/lib/surgical-sales/observationApprovalDebriefMapping";
import {
  INTELLIGENCE_CAPTURE_CATEGORY_IDS,
  type IntelligenceCaptureCategoryId,
} from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { normalizeCaptureTextToFindings } from "@/lib/surgical-sales/intelligenceCapture/normalizeCaptureTextToFindings";

export type CaptureProposalConfidence = "high" | "medium" | "low";

export type CaptureFindingProposal = {
  finding: string;
  /** null ⇒ no unlocked category matched — rep must place it before saving. */
  categoryId: IntelligenceCaptureCategoryId | null;
  confidence: CaptureProposalConfidence;
  /** Rep-facing reason line ("Mentions scheduling and OR availability"). */
  reason: string | null;
  /** Set when the finding carries an observation approval/interest signal. */
  observationAccess: {
    approvalExplicit: boolean;
    interest: boolean;
  } | null;
};

type CategoryKeywordBank = {
  /** Strong signals — 2 points each. */
  strong: RegExp[];
  /** Weak signals — 1 point each. */
  weak: RegExp[];
  reason: string;
};

/**
 * Rep-language keyword banks. Strong tokens are phrases a rep would only use
 * about that area; weak tokens corroborate but never assign a category alone
 * (the score threshold is 2).
 */
const CATEGORY_KEYWORDS: Record<IntelligenceCaptureCategoryId, CategoryKeywordBank> = {
  observation_access: {
    strong: [
      /\bobservation\s+(?:approved|allowed|denied|blocked)\b/i,
      /\b(?:approved|cleared|signed off|denied|blocked|shut down)\b[^.]{0,40}\bobserv/i,
      /\bobserv(?:e|ation|ing)\b[^.]{0,60}\b(?:approv|allow|permission|denied|blocked|open to|willing|not opposed)\b/i,
      /\b(?:come|sit|stand)\s+in\s+on\s+a\s+case\b/i,
      /\bshadow\s+(?:a|the|his|her|their)\s+case\b/i,
    ],
    weak: [/\bobserv(?:e|ation|ing)\b/i, /\bpermission\b/i, /\bapproval\b/i],
    reason: "Mentions observation access or approval",
  },
  access_pathway: {
    strong: [
      /\bschedul(?:e|er|ing|es)\b/i,
      /\b(?:surgery|or|case)\s+coordinator\b/i,
      /\bcoordinator\b[^.]{0,50}\b(?:schedul|calendar|case|or\b)/i,
      /\b(?:controls?|owns?|manages?|handles?)\b[^.]{0,40}\b(?:calendar|schedule|or time|block time)\b/i,
      /\bblock\s+time\b/i,
      /\bbest\s+days?\b[^.]{0,40}\bcase/i,
    ],
    weak: [/\bcalendar\b/i, /\boffice\s+manager\b/i, /\bavailability\b/i, /\bbook(?:ing|ed)?\b/i],
    reason: "Mentions scheduling or calendar control",
  },
  credentialing_facility: {
    strong: [
      /\bcredential(?:s|ed|ing)?\b/i,
      /\bvendormate|reptrax|symplr|greenlight\s+medical|intellicentrics|sec3ure\b/i,
      /\bvendor\s+(?:badge|check[- ]?in|registration|portal)\b/i,
      /\bbackground\s+check\b/i,
      /\b(?:immuniz|vaccin)\w*\b[^.]{0,40}\b(?:record|requir|proof)\b/i,
      /\bfacility\s+(?:requirement|approval|paperwork|access\s+polic)/i,
    ],
    weak: [/\bbadge\b/i, /\bcompliance\b/i, /\bpaperwork\b/i, /\bhospital\s+polic/i],
    reason: "Mentions credentialing or facility requirements",
  },
  key_people_influence: {
    strong: [
      /\bchampion\b/i,
      /\bdecision\s+maker\b/i,
      /\bgatekeeper\b/i,
      /\b(?:big|key)\s+influence\b/i,
      /\b(?:chief|head)\s+of\s+\w+/i,
      /\b(?:supportive|advocate|ally|on our side|blocker)\b[^.]{0,40}\b(?:admin|nurse|manager|director|surgeon|staff)\b/i,
      /\b(?:admin|nurse|manager|director|surgeon|staff)\b[^.]{0,40}\b(?:supportive|advocate|ally|on our side|blocker|pushing for)\b/i,
    ],
    weak: [/\binfluen\w+\b/i, /\bpolitics\b/i, /\breports\s+to\b/i],
    reason: "Mentions champions, blockers, or influence",
  },
  clinical_focus: {
    strong: [
      /\b(?:mostly|primarily|focus(?:es|ed)?\s+on|specializ\w+\s+in)\b[^.]{0,60}\b(?:case|procedure|repair|surgery|arthroplast|fusion|scope|reconstruction)\w*/i,
      /\bcase\s+mix\b/i,
      /\b(?:procedure|case)\s+volume\b/i,
      /\b\d+\s*(?:cases?|procedures?)\s+(?:a|per)\s+(?:week|month|day|year)\b/i,
      /\bpatient\s+population\b/i,
      /\boutcomes?\s+(?:he|she|they)\s+car\w+\s+about\b/i,
    ],
    weak: [/\bspecialt\w+\b/i, /\btechnique\b/i, /\bapproach\b/i, /\bprocedures?\b/i],
    reason: "Mentions procedure mix or clinical priorities",
  },
  opportunity_signals: {
    strong: [
      /\bcompetit\w+\b/i,
      /\b(?:currently|already)\s+us(?:es|ing)\b/i,
      /\bus(?:es|ing)\s+(?:a\s+)?(?:competitor|another\s+vendor|[A-Z][\w&-]+(?:'s)?\s+(?:system|tray|implant|product|kit))/,
      /\bswitch(?:ing)?\s+from\b/i,
      /\bunder\s+contract\b/i,
      /\b(?:gap|missing|unmet|wish(?:es)?\s+(?:there|they|he|she)|nobody\s+makes)\b/i,
      /\b(?:loyal|locked)\s+(?:to|in)\b/i,
    ],
    weak: [/\bvendor\b/i, /\bproducts?\b/i, /\bimplants?\b/i, /\btrays?\b/i, /\bcontract\b/i],
    reason: "Mentions competitors, products in use, or gaps",
  },
  procedure_workflow: {
    strong: [
      /\broom\s+setup\b/i,
      /\bturnover\b/i,
      /\b(?:tray|instrument)\s+flow\b/i,
      /\bcase\s+sequence\b/i,
      /\bbottleneck\w*\b/i,
      /\bflip\s+the\s+room\b/i,
      /\bworkflow\b/i,
      /\bbetween\s+cases\b/i,
    ],
    weak: [/\bsetup\b/i, /\binstrument\w*\b/i, /\bor\s+flow\b/i, /\bdelay\w*\b/i],
    reason: "Mentions OR workflow or case flow",
  },
  clinical_challenges: {
    strong: [
      /\bfrustrat\w+\b/i,
      /\bpain\s+points?\b/i,
      /\bcomplain\w*\b/i,
      /\bstruggl\w+\b/i,
      /\bfed\s+up\b/i,
      /\bworkaround\b/i,
    ],
    weak: [/\bannoy\w+\b/i, /\bdifficult\b/i, /\bproblem\b/i, /\bissue\b/i],
    reason: "Mentions frustrations or pain points",
  },
  product_fit_evaluation: {
    strong: [
      /\bour\s+(?:product|system|tray|implant|kit|device)\b/i,
      /\b(?:good|strong|poor|great)\s+fit\b/i,
      /\balign(?:s|ed|ment)?\s+with\b/i,
      /\b(?:demo|trial|evaluat\w+|hands[- ]on)\b/i,
      /\breact(?:ed|ion)\b[^.]{0,40}\b(?:product|demo|device)\b/i,
    ],
    weak: [/\bfit\b/i, /\bliked\b/i, /\bimpressed\b/i],
    reason: "Mentions product fit or evaluation reactions",
  },
  adoption_strategy: {
    strong: [
      /\badopt\w*\b/i,
      /\bcommit\w*\b[^.]{0,40}\b(?:case|trial|volume|product)\b/i,
      /\bconver(?:t|sion|ting)\b/i,
      /\brollout\b/i,
      /\bnext\s+steps?\b[^.]{0,50}\b(?:case|trial|contract|commit)\b/i,
      /\bvolume\s+estimate\b/i,
      /\bpricing|contract\s+talks?\b/i,
    ],
    weak: [/\bcommitment\b/i, /\bexpand\w*\b/i],
    reason: "Mentions adoption, conversion, or commitment",
  },
};

const ASSIGN_THRESHOLD = 2;
const HIGH_CONFIDENCE_SCORE = 4;

function scoreCategory(bank: CategoryKeywordBank, text: string): number {
  let score = 0;
  for (const re of bank.strong) {
    if (re.test(text)) score += 2;
  }
  for (const re of bank.weak) {
    if (re.test(text)) score += 1;
  }
  return score;
}

function confidenceForScore(score: number): CaptureProposalConfidence {
  if (score >= HIGH_CONFIDENCE_SCORE) return "high";
  if (score >= ASSIGN_THRESHOLD + 1) return "medium";
  return "low";
}

export function classifyCaptureFinding(
  finding: string,
  unlockedCategoryIds: readonly IntelligenceCaptureCategoryId[],
): CaptureFindingProposal {
  const text = finding.trim();
  const unlocked = new Set(unlockedCategoryIds);

  // Observation approval/interest is workflow state, not just text — when the
  // dedicated assessor fires and the category is unlocked, it wins outright.
  // Interest-only matches are broad ("no problem", "should be fine"), so they
  // must be anchored by an actual observation mention to claim the finding.
  const access = assessObservationAccessFromDebrief(text);
  const mentionsObservation = /\bobserv(?:e|ation|ing)\b|\bshadow\b|\bsit\s+in\s+on\b/i.test(text);
  const accessSignal =
    access.observationApprovalExplicit || (access.observationInterest && mentionsObservation);
  if (accessSignal && unlocked.has("observation_access")) {
    return {
      finding: text,
      categoryId: "observation_access",
      confidence: access.observationApprovalExplicit ? "high" : "medium",
      reason: access.observationApprovalExplicit
        ? "Reads as explicit observation approval"
        : "Reads as observation interest (approval not confirmed)",
      observationAccess: {
        approvalExplicit: access.observationApprovalExplicit,
        interest: access.observationInterest,
      },
    };
  }

  let best: { categoryId: IntelligenceCaptureCategoryId; score: number } | null = null;
  for (const categoryId of INTELLIGENCE_CAPTURE_CATEGORY_IDS) {
    if (!unlocked.has(categoryId)) continue;
    const score = scoreCategory(CATEGORY_KEYWORDS[categoryId], text);
    if (score > (best?.score ?? 0)) {
      best = { categoryId, score };
    }
  }

  if (!best || best.score < ASSIGN_THRESHOLD) {
    return {
      finding: text,
      categoryId: null,
      confidence: "low",
      reason: null,
      observationAccess: null,
    };
  }

  return {
    finding: text,
    categoryId: best.categoryId,
    confidence: confidenceForScore(best.score),
    reason: CATEGORY_KEYWORDS[best.categoryId].reason,
    observationAccess: null,
  };
}

/**
 * Split freeform capture text into findings and propose an unlocked category
 * for each. Stage scoping is the caller's job — pass only the categories the
 * provider's pathway stage (and observation-approval gates) currently unlock.
 */
export function classifyCaptureTextToFindings(input: {
  text: string;
  unlockedCategoryIds: readonly IntelligenceCaptureCategoryId[];
}): CaptureFindingProposal[] {
  return normalizeCaptureTextToFindings(input.text).map((finding) =>
    classifyCaptureFinding(finding, input.unlockedCategoryIds),
  );
}
