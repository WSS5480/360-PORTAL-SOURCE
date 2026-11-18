/**
 * Rep-facing copy for the Intelligence Brief Review screen.
 */

import { parseClinicalStorageValue } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { DEBRIEF_REVIEW_CONTACT_ACTION } from "@/lib/surgical-sales/debriefApprovalUx";
import { normalizeNextActionDisplayTitle } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefNextActionDisplay";

export const INTELLIGENCE_BRIEF_TITLE = "Suggested Updates";
export const INTELLIGENCE_BRIEF_SUBTITLE =
  "Checked items will update the provider record. Unchecked items will be ignored.";

export const INTELLIGENCE_BRIEF_SUMMARY_TITLE = "Debrief Summary";
export const INTELLIGENCE_BRIEF_KEY_TAKEAWAYS = "What changed";

/** Executive debrief summary — what changed, not extraction mechanics. */
export const EXECUTIVE_DEBRIEF_SUMMARY = {
  observationApproved: "Observation approved",
  observationNotYetApproved: "Observation not yet approved",
  observationInterestNoted: "Observation interest noted",
  credentialingRequired: "Credentialing required",
  credentialingNoLongerRequired: "Credentialing no longer required",
  schedulingCoordinatorIdentified: "Scheduling coordinator identified",
  supportContactIdentified: "Support contact identified",
  clinicalFrustrationsIdentified: "Validated pain point identified",
  potentialFutureOpportunityIdentified: "Potential future opportunity noted",
  noSignificantIssueConfirmed: "No significant issue confirmed",
  increasingProcedureVolume: "Increasing procedure volume",
  increasingCaseVolume: "Increasing case volume",
  newProcedureAdoption: "New procedure adoption",
  procedureFocusIdentified: "Procedure focus identified",
  clinicalPreferencesIdentified: "Clinical preferences identified",
  positiveProviderSentiment: "Positive provider sentiment",
  nextStepIdentified: "Next step identified",
  currentProductIdentified: (productName: string) => `Current product identified: ${productName}`,
} as const;
export const INTELLIGENCE_BRIEF_SHOW_DETAILS = "Show details";
export const INTELLIGENCE_BRIEF_HIDE_DETAILS = "Hide details";
export const INTELLIGENCE_BRIEF_VIEW_DETAILS = "View details";
export const INTELLIGENCE_BRIEF_DECISIONS_TITLE = "Contact suggestions";
export const INTELLIGENCE_BRIEF_CONTACT_STATUS = DEBRIEF_REVIEW_CONTACT_ACTION;
export const INTELLIGENCE_BRIEF_SUGGESTED_CONTACT_STATUS = "Suggested Contact";
export const INTELLIGENCE_BRIEF_SUGGESTED_CONTACT_NEEDS_VERIFICATION = "Needs Verification";
export const INTELLIGENCE_BRIEF_OBSERVATION_SUMMARY = "Observation access";

export const INTELLIGENCE_BRIEF_OBSERVATION_LABEL = {
  status: "Status",
  approval: "Approval",
  requirements: "Requirements",
} as const;

export const INTELLIGENCE_BRIEF_PRIORITY_LABEL = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
} as const;

export type FollowUpPriority = keyof typeof INTELLIGENCE_BRIEF_PRIORITY_LABEL;

/**
 * Business-outcome card names — the review answers "what changed because of
 * this engagement?", so sections are sales concepts, not extraction taxonomy.
 */
export const INTELLIGENCE_BRIEF_SECTION = {
  contacts: "Contacts",
  observationAccess: "Access Pathway",
  clinicalInsights: "Clinical Trends",
  productsInUse: "Products in Use",
  productIntelligence: "Product Interest",
  workflowInsights: "Workflow & Priorities",
  followUpActions: "Next Actions",
} as const;

export const INTELLIGENCE_BRIEF_PRODUCT_STATUS = {
  needsConfirmation: "Needs confirmation",
  validated: "Validated",
} as const;

export const INTELLIGENCE_BRIEF_PRODUCT_NEXT_STEP =
  "Confirm product usage during first observation";

const PRODUCT_STATUS_ALIASES = [
  /^needs[_\s-]?confirmation$/i,
  /^needs confirmation$/i,
  /^status needs confirmation$/i,
];

export function displayProductEvidenceStatus(raw?: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (PRODUCT_STATUS_ALIASES.some((pattern) => pattern.test(value))) {
    return INTELLIGENCE_BRIEF_PRODUCT_STATUS.needsConfirmation;
  }
  if (/^validated$/i.test(value)) {
    return INTELLIGENCE_BRIEF_PRODUCT_STATUS.validated;
  }
  return value;
}

export function displayProductNextValidationStep(raw?: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/confirm product usage during/i.test(value)) {
    return INTELLIGENCE_BRIEF_PRODUCT_NEXT_STEP;
  }
  return value;
}

export function productStatusLinesEquivalent(a?: string | null, b?: string | null): boolean {
  const left = displayProductEvidenceStatus(a);
  const right = displayProductEvidenceStatus(b);
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}

export const INTELLIGENCE_BRIEF_CONFIRM = "Confirm";
export const INTELLIGENCE_BRIEF_DISMISS = "Dismiss";
export const INTELLIGENCE_BRIEF_CONFIRMED = "Confirmed";
export const INTELLIGENCE_BRIEF_DISMISSED = "Dismissed";

export const INTELLIGENCE_BRIEF_ITEMS_HINT = (count: number) =>
  `${count} update${count === 1 ? "" : "s"} selected`;

export const INTELLIGENCE_BRIEF_EMPTY = "No actionable intelligence from this debrief.";

const APPROVAL_DISPLAY: Record<string, string> = {
  "Not Confirmed": "Not Yet Approved",
  Confirmed: "Approved",
};

const CREDENTIALING_DISPLAY: Record<string, string> = {
  Required: "Credentialing Required",
  "Not required": "Credentialing Not Required",
  Discussed: "Credentialing Discussed",
  "Not discussed": "Credentialing Not Discussed",
};

export function displayObservationApproval(approval: string): string {
  return APPROVAL_DISPLAY[approval] ?? approval;
}

export function displayCredentialingSummary(summary: string): string {
  if (/^Required\b/i.test(summary)) return "Credentialing Required";
  return CREDENTIALING_DISPLAY[summary] ?? summary;
}

export function displayClinicalInsight(title: string): string {
  const parsed = parseClinicalStorageValue(title);
  if (parsed) return parsed.procedureFocus;

  const trimmed = title.trim();
  if (
    trimmed &&
    !/\b(?:increas|volume|growing|discussed|mentioned)\b/i.test(trimmed)
  ) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  const toVolumeLine = (body: string) => {
    const normalized = body.replace(/\s+/g, " ").trim().toLowerCase();
    return normalized ? `Increased ${normalized} volume` : trimmed;
  };

  if (/volume increasing$/i.test(trimmed)) {
    return toVolumeLine(trimmed.replace(/\s*volume increasing$/i, "").trim());
  }
  if (/^increased\b/i.test(trimmed)) {
    const body = trimmed.replace(/^increased\s+/i, "").replace(/\s+volume$/i, "").trim();
    return toVolumeLine(body);
  }
  if (/increasing$/i.test(trimmed)) {
    return toVolumeLine(trimmed.replace(/\s*increasing$/i, "").trim());
  }
  if (/^robotic\b/i.test(trimmed) && !/^increased\b/i.test(trimmed)) {
    return toVolumeLine(trimmed);
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function inferFollowUpPriority(
  title: string,
  followUpReason?: string | null,
): FollowUpPriority {
  const blob = `${title} ${followUpReason ?? ""}`.toLowerCase();
  if (/\b(?:phone|email|contact info|contact information)\b/i.test(blob)) {
    return "high";
  }
  if (/\bget\s+[a-z]+\s+contact\b/i.test(blob)) {
    return "high";
  }
  if (/\bidentify\s+[a-z]+(?:'s|\s+(?:contact|phone|email))\b/i.test(blob)) {
    return "high";
  }
  if (/\b(?:credential|platform|pathway|observation|approval|timing|schedul)\b/i.test(blob)) {
    return "medium";
  }
  return "low";
}

export function contactSummaryLine(displayName: string, role?: string | null): string {
  const name = displayName.trim();
  const roleText = role?.trim();
  return roleText ? `${name} — ${roleText}` : name;
}

export function displayFollowUpAction(title: string): string {
  return normalizeNextActionDisplayTitle(title);
}

export function briefSectionSummary(brief: {
  contacts: unknown[];
  observationAccess: unknown | null;
  clinicalInsights: unknown[];
  followUpActions: unknown[];
}): string {
  const parts: string[] = [];
  if (brief.contacts.length > 0) parts.push(`${brief.contacts.length} contact${brief.contacts.length === 1 ? "" : "s"}`);
  if (brief.observationAccess) parts.push("observation access");
  if (brief.clinicalInsights.length > 0) {
    parts.push(`${brief.clinicalInsights.length} clinical insight${brief.clinicalInsights.length === 1 ? "" : "s"}`);
  }
  if (brief.followUpActions.length > 0) {
    parts.push(`${brief.followUpActions.length} follow-up${brief.followUpActions.length === 1 ? "" : "s"}`);
  }
  const total =
    brief.contacts.length +
    (brief.observationAccess ? 1 : 0) +
    brief.clinicalInsights.length +
    brief.followUpActions.length;
  if (total === 0) return INTELLIGENCE_BRIEF_EMPTY;
  return INTELLIGENCE_BRIEF_ITEMS_HINT(total);
}

/** Rep-facing save summary — grouped by brief section, not CRM field labels. */
export function buildBriefSaveSummaryLines(
  acceptedFields: Array<{ dbKey: string }>,
): string[] {
  const sections = new Set<string>();
  for (const field of acceptedFields) {
    const key = field.dbKey;
    if (/observation|credential|access|coordinator|scheduling|cadence|feasibility/i.test(key)) {
      sections.add("Observation access confirmed");
    } else if (/procedure|technique|volume|pain|clinical|workflow_pain/i.test(key)) {
      sections.add("Clinical insight confirmed");
    } else if (/contact|participant|coordinator_contact/i.test(key)) {
      sections.add("Contact intelligence confirmed");
    } else {
      sections.add("Account intelligence confirmed");
    }
  }
  return [...sections];
}
