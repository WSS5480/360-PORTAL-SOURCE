import type { ExecutionLeaderboardMetricKey } from "@/lib/surgical-sales/executionLeaderboardConfig";
import { OPTIONAL_INTELLIGENCE_ALL_DB_KEYS } from "@/lib/surgical-sales/optionalIntelligenceCategories";
import {
  hasTextContent,
  isCompletedCaseStatus,
  isCompletedEngagementStatus,
  isScheduledObservationCaseStatus,
} from "@/lib/surgical-sales/executionLeaderboardMetrics";

/** Confidence tiers for intelligence scoring — rewards validated signal over volume. */
export const INTELLIGENCE_CONFIDENCE_LEVELS = ["low", "medium", "high", "confirmed", "validated"] as const;

export type IntelligenceConfidenceLevel = (typeof INTELLIGENCE_CONFIDENCE_LEVELS)[number];

export const INTELLIGENCE_CONFIDENCE_MULTIPLIERS: Record<IntelligenceConfidenceLevel, number> = {
  low: 0,
  medium: 1,
  high: 1,
  confirmed: 1.25,
  validated: 1.25,
};

export const OBSERVATION_WITH_DEBRIEF_PLAN_MULTIPLIER = 1.35;
export const PRODUCT_SUPPORT_WITH_POST_REVIEW_MULTIPLIER = 1.4;

export const UNSTRUCTURED_FIELD_CAPTURE_CONFIDENCE: IntelligenceConfidenceLevel = "medium";
export const PROMOTED_INTELLIGENCE_CONFIDENCE: IntelligenceConfidenceLevel = "validated";

const INTELLIGENCE_NOTE_CLASSIFICATIONS = new Set([
  "provider_intelligence",
  "competitive_intelligence",
  "organization_intelligence",
  "product_usage",
  "clinical_discovery",
]);

/** Rep-facing list of admin CRM behaviors that never earn leaderboard points. */
export const LEADERBOARD_EXCLUDED_SCORING_BEHAVIORS = [
  "Field intelligence checklist completion",
  "Discovery checklist completion",
  "Scheduler identified",
  "Credentialing path identified",
  "Access pathway mapped",
  "Vendor access path completed",
  "Optional intelligence entry",
  "Contact metadata updated",
  "Vendor pathway identified",
  "Credentialing information entered",
  "Contact records updated",
  "Notes created without field intelligence",
  "Empty engagements created",
  "Empty opportunities created",
  "Generic CRM data entry",
  "CRM maintenance and record updates",
  "Form completion without pathway progression",
] as const;

/** Discovery Mapping / access-pathway admin keys — not provider progression. */
export const LEADERBOARD_EXCLUDED_DISCOVERY_QUESTION_KEYS = new Set([
  "observation_approval",
  "scheduling_owner",
  "facility_vendor_pathway",
  "observation_logistics",
  "discovery_mapping",
  "stage_mapping",
  "provider_scheduling_contact",
  "provider_observation_coordinator_contact",
  "provider_facility_scheduling_contact",
  "provider_observation_scheduling_control",
  "provider_observation_access_path",
  "provider_observation_credentialing_needed",
  "provider_credentialing_status",
  "provider_observation_feasibility",
  "provider_evaluation_openness",
  "provider_observation_best_days_case_types",
  "provider_ideal_observation_cases",
  ...OPTIONAL_INTELLIGENCE_ALL_DB_KEYS,
  "personality_notes",
  "access_notes",
]);

const EXCLUDED_PROMOTED_FIELD_PATTERNS = [
  /\bscheduler\b/i,
  /\bcredential/i,
  /\bvendor pathway\b/i,
  /\bvendor access path\b/i,
  /\baccess path(?:way)?\b/i,
  /\bfacility approval\b/i,
  /\bcontact record\b/i,
  /\bcontact updated\b/i,
  /\bcontact metadata\b/i,
  /\bdiscovery mapping\b/i,
  /\bstage mapping\b/i,
  /\bscheduling owner\b/i,
  /\bscheduling control\b/i,
];

/** Observation request credit — scheduled field work, not admin access metadata. */
export function observationRequestQualifiesForScore(caseRow: {
  case_type?: string | null;
  status?: string | null;
  case_date?: string | null;
  surgeon_contact_id?: string | null;
}): boolean {
  if (String(caseRow.case_type ?? "").trim().toLowerCase() !== "observation") return false;
  if (!hasTextContent(caseRow.case_date)) return false;
  if (!hasTextContent(caseRow.surgeon_contact_id)) return false;

  const status = String(caseRow.status ?? "").trim().toLowerCase();
  if (status === "cancelled") return false;
  if (isScheduledObservationCaseStatus(status)) return true;
  if (isCompletedCaseStatus(status)) return true;
  return status === "billing_review" || status === "docs_needed";
}

const RELATIONSHIP_ENGAGEMENT_TYPES = new Set([
  "intro_call",
  "follow_up",
  "evaluation_follow_up",
  "or_visit",
  "office_visit_360",
  "reactivation",
]);

export function normalizeDiscoveryQuestionKey(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function discoveryAnswerQualifiesForScore(_questionKey: unknown): boolean {
  return false;
}

export function promotedFieldQualifiesForScore(fieldLabel: unknown): boolean {
  const normalized = normalizeIntelligenceContent(fieldLabel);
  if (!normalized) return false;
  const keyish = normalized.replace(/\s+/g, "_");
  if (LEADERBOARD_EXCLUDED_DISCOVERY_QUESTION_KEYS.has(keyish)) return false;
  return !EXCLUDED_PROMOTED_FIELD_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function engagementQualifiesForScore(args: {
  status: string | null | undefined;
  engagement_type: string | null | undefined;
  case_id?: string | null;
  opportunity_id?: string | null;
  organization_id?: string | null;
  debrief_completed?: boolean | null;
  debrief_completed_at?: string | null;
}): boolean {
  if (!isCompletedEngagementStatus(args.status)) return false;

  const engagementType = String(args.engagement_type || "").toLowerCase();
  const hasCase = Boolean(String(args.case_id ?? "").trim());
  const hasOpportunity = Boolean(String(args.opportunity_id ?? "").trim());
  const hasOrganization = Boolean(String(args.organization_id ?? "").trim());
  const debriefDone =
    args.debrief_completed === true || String(args.debrief_completed_at ?? "").trim().length > 0;

  if (engagementType === "provider_debrief") return debriefDone && (hasCase || hasOpportunity || hasOrganization);
  if (engagementType === "post_case_follow_up") return hasCase;
  if (hasCase || hasOpportunity) return true;
  if (RELATIONSHIP_ENGAGEMENT_TYPES.has(engagementType) && hasOrganization && debriefDone) return true;
  if (RELATIONSHIP_ENGAGEMENT_TYPES.has(engagementType) && hasOrganization) {
    return engagementType === "or_visit" || engagementType === "office_visit_360";
  }

  return false;
}

export type OpportunityScoreMeta = {
  surgeonContactId: string | null;
  physicianName: string | null;
  productLine: string | null;
  productId: string | null;
  sourceCaseId: string | null;
  sourceEngagementId: string | null;
};

export function normalizeIntelligenceContent(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

export function intelligenceFingerprint(metric: string, content: string): string {
  const normalized = normalizeIntelligenceContent(content);
  if (!normalized) return `${metric}:__empty__`;
  return `${metric}:${normalized}`;
}

export function parseIntelligenceConfidence(raw: unknown): IntelligenceConfidenceLevel {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "low") return "low";
  if (value === "medium" || value === "med") return "medium";
  if (value === "high") return "high";
  if (value === "confirmed" || value === "confirm") return "confirmed";
  if (value === "validated" || value === "validate") return "validated";
  return UNSTRUCTURED_FIELD_CAPTURE_CONFIDENCE;
}

export function intelligenceConfidenceMultiplier(level: IntelligenceConfidenceLevel): number {
  return INTELLIGENCE_CONFIDENCE_MULTIPLIERS[level];
}

export class RepIntelligenceDeduper {
  private readonly seen = new Set<string>();

  /** Returns weighted units for a unique intelligence capture, or 0 when duplicate or low confidence. */
  scoreUnique(args: {
    metric: ExecutionLeaderboardMetricKey | string;
    content: string;
    confidence?: IntelligenceConfidenceLevel;
  }): number {
    const normalized = normalizeIntelligenceContent(args.content);
    if (!normalized) return 0;
    const fp = intelligenceFingerprint(String(args.metric), normalized);
    if (this.seen.has(fp)) return 0;
    const weight = intelligenceConfidenceMultiplier(args.confidence ?? UNSTRUCTURED_FIELD_CAPTURE_CONFIDENCE);
    if (weight <= 0) return 0;
    this.seen.add(fp);
    return weight;
  }

  /** Dedupes within the same observation case — repeats on the same signal do not stack. */
  scoreObservationIntelligence(args: {
    caseId: string;
    metric: ExecutionLeaderboardMetricKey | string;
    content: string;
    confidence?: IntelligenceConfidenceLevel;
  }): number {
    const normalized = normalizeIntelligenceContent(args.content);
    if (!normalized) return 0;
    const caseId = String(args.caseId || "").trim() || "unknown";
    const fp = `obs:${caseId}:${args.metric}:${normalized}`;
    if (this.seen.has(fp)) return 0;
    const weight = intelligenceConfidenceMultiplier(args.confidence ?? UNSTRUCTURED_FIELD_CAPTURE_CONFIDENCE);
    if (weight <= 0) return 0;
    this.seen.add(fp);
    return weight;
  }

  /** Dedupes by provider + discovery question — repeats on the same question do not stack. */
  scoreDiscoveryAnswer(args: {
    providerId: string;
    questionKey: string;
    content: string;
    confidence?: IntelligenceConfidenceLevel;
  }): number {
    const normalized = normalizeIntelligenceContent(args.content);
    if (!normalized) return 0;
    const fp = `discovery:${args.providerId}:${args.questionKey}:${normalized}`;
    if (this.seen.has(fp)) return 0;
    const weight = intelligenceConfidenceMultiplier(args.confidence ?? UNSTRUCTURED_FIELD_CAPTURE_CONFIDENCE);
    if (weight <= 0) return 0;
    this.seen.add(fp);
    return weight;
  }
}

/** Only structured field intelligence notes score — not generic CRM notes or data entry. */
export function noteActivityQualifies(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  if (metadata.audit_only === true) return false;

  const classification = String(metadata.classification ?? metadata.category ?? "").toLowerCase();
  return INTELLIGENCE_NOTE_CLASSIFICATIONS.has(classification);
}

export function noteActivityMapsToIntelligence(metadata: Record<string, unknown> | null | undefined): boolean {
  return noteActivityQualifies(metadata);
}

export function resolveIntelligenceMetricFromNote(
  metadata: Record<string, unknown> | null | undefined,
): ExecutionLeaderboardMetricKey | null {
  void metadata;
  return null;
}

export function noteActivityConfidence(metadata: Record<string, unknown> | null | undefined): IntelligenceConfidenceLevel {
  if (!metadata || typeof metadata !== "object") return UNSTRUCTURED_FIELD_CAPTURE_CONFIDENCE;
  return parseIntelligenceConfidence(metadata.confidence ?? metadata.insight_confidence ?? metadata.ai_confidence);
}

export function opportunityHasProvider(meta: OpportunityScoreMeta): boolean {
  return Boolean(meta.surgeonContactId?.trim() || meta.physicianName?.trim());
}

export function opportunityHasProduct(meta: OpportunityScoreMeta): boolean {
  return Boolean(meta.productLine?.trim() || meta.productId?.trim());
}

export function opportunityHasSourceEvidence(meta: OpportunityScoreMeta): boolean {
  return Boolean(meta.sourceCaseId?.trim() || meta.sourceEngagementId?.trim());
}

/** Pipeline credit only when tied to provider, product, and field evidence. */
export function opportunityQualifiesForScore(meta: OpportunityScoreMeta | null | undefined): boolean {
  if (!meta) return false;
  return opportunityHasProvider(meta) && opportunityHasProduct(meta) && opportunityHasSourceEvidence(meta);
}

export function observationCaseCompletionWeight(hasDebriefPlanning: boolean): number {
  return hasDebriefPlanning ? OBSERVATION_WITH_DEBRIEF_PLAN_MULTIPLIER : 1;
}

export function productSupportCaseCompletionWeight(hasPostCaseReview: boolean): number {
  return hasPostCaseReview ? PRODUCT_SUPPORT_WITH_POST_REVIEW_MULTIPLIER : 1;
}

export function scoreFieldIntelligenceCapture(
  deduper: RepIntelligenceDeduper,
  args: {
    caseId?: string;
    metric: ExecutionLeaderboardMetricKey;
    content: unknown;
    confidence?: IntelligenceConfidenceLevel;
  },
): number {
  const content = String(args.content ?? "");
  if (args.caseId) {
    return deduper.scoreObservationIntelligence({
      caseId: args.caseId,
      metric: args.metric,
      content,
      confidence: args.confidence ?? UNSTRUCTURED_FIELD_CAPTURE_CONFIDENCE,
    });
  }
  return deduper.scoreUnique({
    metric: args.metric,
    content,
    confidence: args.confidence ?? UNSTRUCTURED_FIELD_CAPTURE_CONFIDENCE,
  });
}

export function scoreValidatedIntelligenceUnits(
  deduper: RepIntelligenceDeduper,
  args: {
    caseId?: string;
    units: Array<{
      metric: ExecutionLeaderboardMetricKey;
      content: string;
      confidence: IntelligenceConfidenceLevel;
    }>;
  },
): Partial<Record<ExecutionLeaderboardMetricKey, number>> {
  const scored = {} as Partial<Record<ExecutionLeaderboardMetricKey, number>>;
  for (const unit of args.units) {
    const weight = args.caseId
      ? deduper.scoreObservationIntelligence({
          caseId: args.caseId,
          metric: unit.metric,
          content: unit.content,
          confidence: unit.confidence,
        })
      : deduper.scoreUnique({
          metric: unit.metric,
          content: unit.content,
          confidence: unit.confidence,
        });
    if (weight <= 0) continue;
    scored[unit.metric] = (scored[unit.metric] || 0) + weight;
  }
  return scored;
}

export function scorePromotedIntelligence(deduper: RepIntelligenceDeduper, fieldLabel: string): number {
  if (!promotedFieldQualifiesForScore(fieldLabel)) return 0;
  return deduper.scoreUnique({
    metric: "validated_intelligence_captured",
    content: fieldLabel,
    confidence: PROMOTED_INTELLIGENCE_CONFIDENCE,
  });
}

export function scoreDiscoveryInsight(
  deduper: RepIntelligenceDeduper,
  args: {
    providerId: string;
    questionKey: string;
    response: unknown;
    confidence?: unknown;
  },
): number {
  if (!discoveryAnswerQualifiesForScore(args.questionKey)) return 0;
  return deduper.scoreDiscoveryAnswer({
    providerId: args.providerId,
    questionKey: args.questionKey,
    content: String(args.response ?? ""),
    confidence: parseIntelligenceConfidence(args.confidence),
  });
}
