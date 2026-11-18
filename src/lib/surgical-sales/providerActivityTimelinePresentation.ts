import { normalizeEngagementType, type EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { SALES_TERMINOLOGY as T } from "@/lib/sales/salesTerminology";
import {
  isUpcomingEngagementStatus,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
export type ProviderActivityPreviewKind =
  | "note"
  | "engagement"
  | "case"
  | "opportunity"
  | "intelligence"
  | "product";

export type TimelinePresentation = {
  eventBadge: string;
  title: string;
  summary: string;
  relatedEntity: string | null;
  nextStep: string | null;
};

export type TimelinePresentationContext = {
  eventType: string;
  kind: ProviderActivityPreviewKind;
  engagementType?: string | null;
  engagementStatus?: string | null;
  engagementTitle?: string | null;
  typeLabel?: string | null;
  organization?: string | null;
  productLine?: string | null;
  caseNumber?: string | null;
  caseType?: string | null;
  initiativeName?: string | null;
  questionLabel?: string | null;
  rawSummary?: string | null;
  engagement?: ProviderEngagementSummary | null;
};

function normalizeEventType(raw: string | undefined): string {
  return String(raw || "")
    .trim()
    .replace(/-/g, "_")
    .toUpperCase();
}

function engagementTypeKey(raw: string | null | undefined): EngagementType | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  try {
    const key = normalizeEngagementType(t);
    return key || null;
  } catch {
    return null;
  }
}

function isAuditPhrasing(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return (
    /\bengagement created\b/i.test(t) ||
    /\bactivity recorded\b/i.test(t) ||
    /\bmarked completed\b/i.test(t) ||
    /^[a-z][a-z0-9_]*$/.test(t) && t.includes("_")
  );
}

function truncate(text: string, max: number): string {
  const s = text.trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function orgPhrase(org: string | null, prefix: string): string {
  if (!org) return `${prefix}.`;
  return `${prefix} at ${org}.`;
}

export function formatTimelineRelatedContext(
  organization: string | null | undefined,
  productLine: string | null | undefined,
  summary?: string | null,
): string | null {
  const org = String(organization ?? "").trim() || null;
  const product = String(productLine ?? "").trim() || null;
  const parts: string[] = [];
  if (org && (!summary || !summary.toLowerCase().includes(org.toLowerCase()))) parts.push(org);
  if (product && (!summary || !summary.toLowerCase().includes(product.toLowerCase()))) parts.push(product);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

function resolveEngagementBadge(
  eventType: string,
  engType: EngagementType | null,
  status: string | null,
): string {
  const t = normalizeEventType(eventType);
  if (t === "ENGAGEMENT_COMPLETED") return "Engagement Completed";
  if (t === "ENGAGEMENT_CONVERTED_TO_CASE") return "Case Opened";
  if (t === "PRE_CALL_PLAN_COMPLETED") return "Meeting Prepared";
  if (t === "PRE_CALL_PLAN_CREATED" || t === "PRE_CALL_PLAN_UPDATED") return "Pre-Call Planned";

  if (engType === "observation_request") return "Observation Requested";
  if (engType === "follow_up" || engType === "post_case_follow_up") return "Follow-Up Planned";
  if (engType === "product_demo" || engType === "preference_card_discussion") return "Product Discussed";
  if (engType === "evaluation_planning" || engType === "evaluation_follow_up") return "Evaluation Started";

  if (status === "in_progress") return "Engagement Started";
  return "Engagement Scheduled";
}

function presentEngagement(ctx: TimelinePresentationContext): TimelinePresentation {
  const t = normalizeEventType(ctx.eventType);
  const engType = engagementTypeKey(ctx.engagementType);
  const status = String(ctx.engagementStatus ?? "").toLowerCase();
  const typeLabel = ctx.typeLabel?.trim() || "Engagement";
  const title =
    ctx.engagementTitle?.trim() && ctx.engagementTitle.trim() !== typeLabel
      ? ctx.engagementTitle.trim()
      : typeLabel;
  const org = ctx.organization?.trim() || null;
  const badge = resolveEngagementBadge(ctx.eventType, engType, status);

  let summary: string;
  let nextStep: string | null = null;

  if (t === "ENGAGEMENT_COMPLETED") {
    summary = orgPhrase(org, `${typeLabel} completed`);
    nextStep = "Debrief and schedule next touch";
  } else if (t === "ENGAGEMENT_CONVERTED_TO_CASE") {
    const caseRef = ctx.caseNumber ? `Case ${ctx.caseNumber}` : "A surgical case";
    summary = `${caseRef} opened from this ${typeLabel.toLowerCase()}.`;
    nextStep = "Capture case debrief";
  } else if (t === "PRE_CALL_PLAN_COMPLETED") {
    summary = `Pre-call plan ready for ${typeLabel.toLowerCase()}.`;
    nextStep = "Open engagement before the visit";
  } else if (t === "PRE_CALL_PLAN_CREATED" || t === "PRE_CALL_PLAN_UPDATED") {
    summary = `Pre-call planning underway for ${typeLabel.toLowerCase()}.`;
    nextStep = "Finish pre-call prep";
  } else if (engType === "observation_request") {
    summary = orgPhrase(org, "OR observation request logged");
    nextStep = "Confirm access and case profile";
  } else if (engType === "follow_up" || engType === "post_case_follow_up") {
    summary = orgPhrase(org, "Follow-up touch planned");
    nextStep = "Confirm agenda before the visit";
  } else if (engType === "product_demo" || engType === "preference_card_discussion") {
    summary = orgPhrase(org, "Product discussion scheduled");
    nextStep = "Align demo materials to clinical interests";
  } else if (engType === "evaluation_planning" || engType === "evaluation_follow_up") {
    summary = orgPhrase(org, "Evaluation motion scheduled");
    nextStep = "Tie to evaluation stage";
  } else if (status === "in_progress") {
    summary = orgPhrase(org, `${typeLabel} in progress`);
    nextStep = "Capture outcome while details are fresh";
  } else {
    summary = orgPhrase(org, `${typeLabel} on the calendar`);
    const eng = ctx.engagement;
    if (eng?.status === "planned" && !eng.pre_call_complete) {
      nextStep = "Prepare for meeting";
    } else if (isUpcomingEngagementStatus(eng?.status ?? "planned")) {
      nextStep = "Open engagement plan";
    }
  }

  if (ctx.rawSummary && !isAuditPhrasing(ctx.rawSummary) && t === "ENGAGEMENT_UPDATED") {
    summary = truncate(ctx.rawSummary, 120);
  }

  return {
    eventBadge: badge,
    title,
    summary,
    relatedEntity: formatTimelineRelatedContext(org, ctx.productLine, summary),
    nextStep,
  };
}

function presentIntelligence(ctx: TimelinePresentationContext): TimelinePresentation {
  const q = ctx.questionLabel?.trim() || null;
  const title = q ? truncate(q, 72) : "Provider intelligence";
  const summary = q
    ? `Captured insight on ${q.toLowerCase()}.`
    : ctx.rawSummary && !isAuditPhrasing(ctx.rawSummary)
      ? truncate(ctx.rawSummary, 120)
      : "Intelligence added to this provider profile.";
  return {
    eventBadge: "Intelligence Captured",
    title,
    summary,
    relatedEntity: formatTimelineRelatedContext(ctx.organization, ctx.productLine, summary),
    nextStep: "Review intelligence coverage",
  };
}

function presentCase(ctx: TimelinePresentationContext): TimelinePresentation {
  const t = normalizeEventType(ctx.eventType);
  const caseNum = ctx.caseNumber?.trim() || null;
  const title = caseNum ? `Case ${caseNum}` : "Surgical case";
  const caseType = String(ctx.caseType ?? "").toLowerCase();
  const org = ctx.organization?.trim() || null;

  let badge = "Case Activity";
  if (t === "CASE_CREATED") {
    badge = caseType === "product_support" ? "Case Supported" : "Case Opened";
  } else if (caseType === "product_support") {
    badge = "Case Supported";
  } else if (caseType === "observation") {
    badge = "Case Opened";
  }

  let summary: string;
  let nextStep: string | null = null;
  if (t === "CASE_CREATED") {
    if (caseType === "product_support") {
      summary = orgPhrase(org, "Product support case logged");
      nextStep = "Confirm resolution path";
    } else if (caseType === "observation") {
      summary = orgPhrase(org, "Observation case scheduled");
      nextStep = "Debrief";
    } else {
      summary = orgPhrase(org, caseNum ? `Case ${caseNum} opened` : "New case opened");
      nextStep = "Link evaluation if applicable";
    }
  } else if (ctx.rawSummary && !isAuditPhrasing(ctx.rawSummary)) {
    summary = truncate(ctx.rawSummary, 120);
  } else {
    summary = caseNum ? `Activity on case ${caseNum}.` : "Case activity on this provider.";
  }

  return {
    eventBadge: badge,
    title,
    summary,
    relatedEntity: formatTimelineRelatedContext(org, ctx.productLine, summary),
    nextStep,
  };
}

function presentOpportunity(ctx: TimelinePresentationContext): TimelinePresentation {
  const t = normalizeEventType(ctx.eventType);
  const name = ctx.initiativeName?.trim() || OPPORTUNITY_UI.fallbackRecordLabel;
  const title = truncate(name, 72);
  const product = ctx.productLine?.trim() || null;

  let badge: string = T.opportunityActivity;
  let summary = "Evaluation activity on this provider.";
  let nextStep: string | null = null;

  if (t === "OPPORTUNITY_CREATED") {
    badge = T.providerAddedToOpportunities;
    summary = product
      ? `Provider added to Opportunities with ${product} product fit context.`
      : "Provider added to Opportunities.";
    nextStep = "Schedule observation or capture product fit signals";
  } else if (t === "EVALUATION_ACTIVE") {
    badge = T.evaluationStarted;
    summary = product
      ? `Hands-on evaluation underway for ${product}.`
      : "Product evaluation is now active.";
    nextStep = "Advance evaluation stage after outcomes";
  } else if (t === "EVALUATION_PLANNED") {
    badge = T.evaluationStarted;
    summary = "Evaluation window planned.";
    nextStep = "Schedule evaluation cases or visits";
  } else if (t === "OPPORTUNITY_STAGE_CHANGED" && ctx.rawSummary && !isAuditPhrasing(ctx.rawSummary)) {
    badge = T.evaluationAdvanced;
    summary = truncate(ctx.rawSummary, 120);
    nextStep = "Confirm next evaluation step";
  } else if (t === "OPPORTUNITY_WON") {
    badge = "Evaluation won";
    summary = "Evaluation marked won — preference card or adoption next.";
    nextStep = "Expand utilization";
  } else if (t === "OPPORTUNITY_LOST") {
    badge = "Evaluation closed";
    summary = "Evaluation closed lost.";
  } else if (ctx.rawSummary && !isAuditPhrasing(ctx.rawSummary)) {
    summary = truncate(ctx.rawSummary, 120);
  }

  return {
    eventBadge: badge,
    title,
    summary,
    relatedEntity: formatTimelineRelatedContext(ctx.organization, product, summary),
    nextStep,
  };
}

function presentNote(ctx: TimelinePresentationContext): TimelinePresentation {
  const body = ctx.rawSummary?.trim() || "";
  const title =
    body.length > 0 && body.length <= 48 ? body : "Field note";
  return {
    eventBadge: "Note Added",
    title,
    summary: body ? truncate(body, 120) : "Note captured on this provider.",
    relatedEntity: formatTimelineRelatedContext(ctx.organization, ctx.productLine, body),
    nextStep: null,
  };
}

function presentProduct(ctx: TimelinePresentationContext): TimelinePresentation {
  const product = ctx.productLine?.trim() || "Product";
  return {
    eventBadge: "Product Discussed",
    title: truncate(product, 72),
    summary: orgPhrase(ctx.organization?.trim() || null, "Product line discussed"),
    relatedEntity: formatTimelineRelatedContext(ctx.organization, product, null),
    nextStep: "Capture product preferences in intelligence",
  };
}

/** Maps feed/timeline events to operational timeline copy. */
export function buildProviderActivityTimelinePresentation(
  ctx: TimelinePresentationContext,
): TimelinePresentation {
  const t = normalizeEventType(ctx.eventType);
  if (t === "PRODUCT_ADDED") return presentProduct(ctx);
  if (ctx.kind === "note") return presentNote(ctx);
  if (ctx.kind === "intelligence") return presentIntelligence(ctx);
  if (ctx.kind === "engagement") return presentEngagement(ctx);
  if (ctx.kind === "case") return presentCase(ctx);
  return presentOpportunity(ctx);
}
