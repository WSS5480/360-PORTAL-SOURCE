/**
 * Normalizes intelligence from each commercial-pathway source into timeline facts.
 */

import type { AccountIntelligence } from "@/lib/surgical-sales/accountIntelligence";
import { parseProviderDebriefPlanSnapshot } from "@/lib/surgical-sales/engagements/buildProviderDebriefPlan";
import { parseDebriefIntelligenceSnapshot } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import { EARLY_DISCOVERY_ENGAGEMENT_TYPES } from "@/lib/surgical-sales/engagements/engagementIntelligenceReadiness";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderObservationNoteEntry } from "@/lib/surgical-sales/engagements/loadProviderObservationNoteCorpus";
import { isEvaluationEngagementType } from "@/lib/surgical-sales/leaderboardPathwayScoring";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { PROVIDER_OBSERVATION_CASE_INTEL_SELECT } from "@/lib/surgical-sales/loadProviderObservationCasesForIntelligence";
import type {
  ProviderIntelligenceCategory,
  ProviderIntelligenceConfidence,
  ProviderIntelligenceFact,
  ProviderIntelligenceSourceType,
} from "@/lib/surgical-sales/intelligence/providerIntelligenceAggregatorTypes";

let factCounter = 0;

function nextFactId(prefix: string): string {
  factCounter += 1;
  return `${prefix}-${factCounter}`;
}

function trimOrNull(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function makeFact(input: {
  sourceType: ProviderIntelligenceSourceType;
  sourceEngagementId?: string | null;
  sourceEngagementType?: string | null;
  sourceCaseId?: string | null;
  date?: string | null;
  confidence?: ProviderIntelligenceConfidence;
  category: ProviderIntelligenceCategory;
  label: string;
  excerpt: string;
  fieldKey?: string | null;
}): ProviderIntelligenceFact | null {
  const excerpt = input.excerpt.trim();
  if (!excerpt || excerpt.length < 4) return null;

  return {
    id: nextFactId(input.sourceType),
    sourceType: input.sourceType,
    sourceEngagementId: input.sourceEngagementId ?? null,
    sourceEngagementType: input.sourceEngagementType ?? null,
    sourceCaseId: input.sourceCaseId ?? null,
    date: input.date ?? null,
    confidence: input.confidence ?? "medium",
    category: input.category,
    label: input.label,
    excerpt: excerpt.slice(0, 600),
    fieldKey: input.fieldKey ?? null,
  };
}

const DISCOVERY_CONTACT_FIELDS: Array<{
  key: string;
  label: string;
  category: ProviderIntelligenceCategory;
}> = [
  { key: "provider_procedure_focus", label: "Procedure focus", category: "procedure" },
  { key: "provider_technique_preferences", label: "Technique preferences", category: "clinical_workflow" },
  { key: "provider_competitive_products", label: "Competitive products", category: "competitive" },
  { key: "provider_evaluation_openness", label: "Evaluation openness", category: "evaluation" },
  { key: "provider_observation_feasibility", label: "Observation feasibility", category: "access" },
  { key: "provider_observation_access_path", label: "Observation access path", category: "access" },
  { key: "provider_observation_credentialing_needed", label: "Credentialing needed", category: "access" },
  { key: "provider_ideal_observation_cases", label: "Ideal observation cases", category: "planning" },
  { key: "provider_dissatisfaction_areas", label: "Dissatisfaction areas", category: "clinical_workflow" },
  { key: "provider_preference_card_signals", label: "Preference card signals", category: "product_fit" },
  { key: "provider_or_team_dynamics", label: "OR team dynamics", category: "relationship" },
  { key: "provider_relationship_summary", label: "Relationship summary", category: "relationship" },
];

const OBSERVATION_CASE_FIELDS: Array<{
  key: string;
  label: string;
  category: ProviderIntelligenceCategory;
}> = [
  { key: "procedure_type", label: "Procedure type", category: "procedure" },
  { key: "live_observation_workflow", label: "Workflow observation", category: "clinical_workflow" },
  { key: "live_observation_clinical_pain_points", label: "Clinical pain points", category: "clinical_workflow" },
  { key: "live_observation_product_fit", label: "Product fit signal", category: "product_fit" },
  { key: "live_observation_competitors", label: "Competitors observed", category: "competitive" },
  { key: "live_observation_staff_process", label: "Staff process", category: "clinical_workflow" },
  { key: "live_observation_surgeon_reactions", label: "Surgeon reactions", category: "relationship" },
  { key: "debrief_key_findings", label: "Debrief key findings", category: "outcome" },
  { key: "observation_goal", label: "Observation goal", category: "planning" },
];

export function extractDiscoveryContactFacts(
  contact: Record<string, unknown>,
): ProviderIntelligenceFact[] {
  const facts: ProviderIntelligenceFact[] = [];
  const date =
    trimOrNull(contact.provider_planning_updated_at) ?? trimOrNull(contact.updated_at);

  for (const field of DISCOVERY_CONTACT_FIELDS) {
    const value = trimOrNull(contact[field.key]);
    if (!value) continue;
    const fact = makeFact({
      sourceType: "discovery_contact",
      date,
      confidence: "medium",
      category: field.category,
      label: field.label,
      excerpt: value,
      fieldKey: field.key,
    });
    if (fact) facts.push(fact);
  }

  return facts;
}

export function extractDiscoveryEngagementFacts(
  engagements: ProviderEngagementSummary[],
): ProviderIntelligenceFact[] {
  const facts: ProviderIntelligenceFact[] = [];

  for (const engagement of engagements) {
    const type = normalizeEngagementType(String(engagement.engagement_type ?? ""));
    if (!type || !EARLY_DISCOVERY_ENGAGEMENT_TYPES.has(type)) continue;

    const date =
      trimOrNull(engagement.scheduled_at) ??
      trimOrNull(engagement.engagement_date) ??
      trimOrNull(engagement.updated_at);

    if (engagement.notes?.trim()) {
      const fact = makeFact({
        sourceType: "discovery_engagement",
        sourceEngagementId: engagement.id,
        sourceEngagementType: type,
        date,
        confidence: "medium",
        category: "planning",
        label: `${engagement.engagement_type_label} notes`,
        excerpt: engagement.notes,
        fieldKey: "notes",
      });
      if (fact) facts.push(fact);
    }

    if (engagement.memory_context_line?.trim()) {
      const fact = makeFact({
        sourceType: "discovery_engagement",
        sourceEngagementId: engagement.id,
        sourceEngagementType: type,
        date,
        confidence: "medium",
        category: "planning",
        label: `${engagement.engagement_type_label} memory context`,
        excerpt: engagement.memory_context_line,
        fieldKey: "memory_context_line",
      });
      if (fact) facts.push(fact);
    }
  }

  return facts;
}

export function extractIntroCallFacts(
  engagements: Array<Record<string, unknown>>,
): ProviderIntelligenceFact[] {
  const facts: ProviderIntelligenceFact[] = [];

  for (const row of engagements) {
    const type = String(row.engagement_type ?? "").trim();
    if (type !== "intro_call") continue;

    const engagementId = trimOrNull(row.id);
    const date =
      trimOrNull(row.debrief_completed_at) ??
      trimOrNull(row.scheduled_at) ??
      trimOrNull(row.updated_at);

    const visitSnapshot = parseDebriefIntelligenceSnapshot(row.debrief_intelligence_snapshot);
    if (visitSnapshot?.narrative?.trim()) {
      const fact = makeFact({
        sourceType: "intro_call",
        sourceEngagementId: engagementId,
        sourceEngagementType: type,
        date: visitSnapshot.savedAt || date,
        confidence: "high",
        category: "outcome",
        label: "Intro call visit debrief narrative",
        excerpt: visitSnapshot.narrative,
        fieldKey: "debrief_intelligence_snapshot.narrative",
      });
      if (fact) facts.push(fact);
    }

    const planSnapshot = parseProviderDebriefPlanSnapshot(row.debrief_intelligence_snapshot);
    if (planSnapshot) {
      for (const learning of planSnapshot.whatWeLearned.slice(0, 4)) {
        const fact = makeFact({
          sourceType: "intro_call",
          sourceEngagementId: engagementId,
          sourceEngagementType: type,
          date: planSnapshot.generatedAt || date,
          confidence: "medium",
          category: "clinical_workflow",
          label: `Intro call learning: ${learning.category}`,
          excerpt: learning.evidence?.trim() || learning.signal,
          fieldKey: "debrief_intelligence_snapshot.whatWeLearned",
        });
        if (fact) facts.push(fact);
      }
    }
  }

  return facts;
}

export function extractObservationCaseFacts(
  cases: Array<Record<string, unknown>>,
): ProviderIntelligenceFact[] {
  const facts: ProviderIntelligenceFact[] = [];

  for (const caseRow of cases) {
    const caseId = trimOrNull(caseRow.id);
    const date = trimOrNull(caseRow.case_date) ?? trimOrNull(caseRow.updated_at);

    for (const field of OBSERVATION_CASE_FIELDS) {
      const value = trimOrNull(caseRow[field.key]);
      if (!value) continue;
      const fact = makeFact({
        sourceType: "observation_case",
        sourceCaseId: caseId,
        date,
        confidence: "high",
        category: field.category,
        label: field.label,
        excerpt: value,
        fieldKey: field.key,
      });
      if (fact) facts.push(fact);
    }
  }

  return facts;
}

export function extractObservationNoteFacts(
  corpus: ProviderObservationNoteEntry[],
): ProviderIntelligenceFact[] {
  const facts: ProviderIntelligenceFact[] = [];

  for (const entry of corpus) {
    const fact = makeFact({
      sourceType: "observation_note",
      sourceCaseId: entry.caseId,
      date: entry.createdAt ?? entry.caseDate,
      confidence: "high",
      category: "clinical_workflow",
      label: `Observation #${entry.observationIndex} note`,
      excerpt: entry.body,
      fieldKey: "case_activity.body",
    });
    if (fact) facts.push(fact);
  }

  return facts;
}

export function extractProviderDebriefFacts(
  engagements: Array<Record<string, unknown>>,
): ProviderIntelligenceFact[] {
  const facts: ProviderIntelligenceFact[] = [];

  for (const row of engagements) {
    const type = String(row.engagement_type ?? "").trim();
    if (!isProviderDebriefEngagement(type)) continue;

    const engagementId = trimOrNull(row.id);
    const date =
      trimOrNull(row.debrief_completed_at) ??
      trimOrNull(row.scheduled_at) ??
      trimOrNull(row.updated_at);

    const snapshot = parseProviderDebriefPlanSnapshot(row.debrief_intelligence_snapshot);
    if (snapshot) {
      for (const learning of snapshot.whatWeLearned.slice(0, 6)) {
        const fact = makeFact({
          sourceType: "provider_debrief",
          sourceEngagementId: engagementId,
          sourceEngagementType: type,
          sourceCaseId: trimOrNull(snapshot.context.caseId),
          date: snapshot.generatedAt || date,
          confidence: "medium",
          category: "clinical_workflow",
          label: `Provider debrief learning: ${learning.category}`,
          excerpt: learning.evidence?.trim() || learning.signal,
          fieldKey: "debrief_intelligence_snapshot.whatWeLearned",
        });
        if (fact) facts.push(fact);
      }
    }

    for (const field of [
      "pre_observation_value_hypothesis",
      "pre_observation_probes",
      "pre_observation_additional_notes",
    ] as const) {
      const value = trimOrNull(row[field]);
      if (!value) continue;
      const fact = makeFact({
        sourceType: "provider_debrief",
        sourceEngagementId: engagementId,
        sourceEngagementType: type,
        date,
        confidence: "medium",
        category: "planning",
        label: field,
        excerpt: value,
        fieldKey: field,
      });
      if (fact) facts.push(fact);
    }
  }

  return facts;
}

export function extractDebriefVisitFacts(
  engagements: Array<Record<string, unknown>>,
): ProviderIntelligenceFact[] {
  const facts: ProviderIntelligenceFact[] = [];

  for (const row of engagements) {
    const type = String(row.engagement_type ?? "").trim();
    if (isProviderDebriefEngagement(type)) continue;

    const snapshot = parseDebriefIntelligenceSnapshot(row.debrief_intelligence_snapshot);
    if (!snapshot?.narrative?.trim()) continue;

    const fact = makeFact({
      sourceType: "debrief_visit",
      sourceEngagementId: trimOrNull(row.id),
      sourceEngagementType: type,
      date: snapshot.savedAt,
      confidence: "high",
      category: "outcome",
      label: `${type} visit debrief narrative`,
      excerpt: snapshot.narrative,
      fieldKey: "debrief_intelligence_snapshot.narrative",
    });
    if (fact) facts.push(fact);
  }

  return facts;
}

export function extractEvaluationEngagementFacts(
  engagements: Array<Record<string, unknown>>,
): ProviderIntelligenceFact[] {
  const facts: ProviderIntelligenceFact[] = [];

  for (const row of engagements) {
    const type = String(row.engagement_type ?? "").trim();
    if (!isEvaluationEngagementType(type)) continue;

    const engagementId = trimOrNull(row.id);
    const date =
      trimOrNull(row.debrief_completed_at) ??
      trimOrNull(row.scheduled_at) ??
      trimOrNull(row.updated_at);

    if (row.notes) {
      const fact = makeFact({
        sourceType: "evaluation_engagement",
        sourceEngagementId: engagementId,
        sourceEngagementType: type,
        date,
        confidence: "medium",
        category: "evaluation",
        label: `${type} engagement notes`,
        excerpt: String(row.notes),
        fieldKey: "notes",
      });
      if (fact) facts.push(fact);
    }

    if (row.debrief_completed) {
      const fact = makeFact({
        sourceType: "evaluation_outcome",
        sourceEngagementId: engagementId,
        sourceEngagementType: type,
        date: trimOrNull(row.debrief_completed_at) ?? date,
        confidence: "high",
        category: "outcome",
        label: `${type} debrief completed`,
        excerpt: `Debrief completed for ${type} engagement.`,
        fieldKey: "debrief_completed",
      });
      if (fact) facts.push(fact);
    }

    const visitSnapshot = parseDebriefIntelligenceSnapshot(row.debrief_intelligence_snapshot);
    if (visitSnapshot?.visitOutcome) {
      const fact = makeFact({
        sourceType: "evaluation_outcome",
        sourceEngagementId: engagementId,
        sourceEngagementType: type,
        date: visitSnapshot.visitOutcome.recordedAt || date,
        confidence: "high",
        category: "outcome",
        label: `${type} visit outcome`,
        excerpt: `${visitSnapshot.visitOutcome.label}: ${visitSnapshot.visitOutcome.rationale}`,
        fieldKey: "debrief_intelligence_snapshot.visitOutcome",
      });
      if (fact) facts.push(fact);
    }
  }

  return facts;
}

export function extractProviderProfileFacts(
  contact: Record<string, unknown>,
  providerId: string,
): ProviderIntelligenceFact[] {
  const snapshot = buildProviderIntelligenceSnapshot(contact, providerId);
  const facts: ProviderIntelligenceFact[] = [];
  const date = trimOrNull(snapshot.last_updated_at);

  const rows: Array<{ key: keyof typeof snapshot; label: string; category: ProviderIntelligenceCategory }> = [
    { key: "procedures", label: "Procedures", category: "procedure" },
    { key: "technique_preferences", label: "Technique preferences", category: "clinical_workflow" },
    { key: "competitive_products", label: "Competitive products", category: "competitive" },
    { key: "evaluation_openness", label: "Evaluation openness", category: "evaluation" },
    { key: "observation_readiness", label: "Observation readiness", category: "access" },
    { key: "relationship_summary", label: "Relationship summary", category: "relationship" },
    { key: "or_team_dynamics", label: "OR team dynamics", category: "relationship" },
    { key: "preference_card_signals", label: "Preference card signals", category: "product_fit" },
  ];

  for (const row of rows) {
    const value = trimOrNull(snapshot[row.key]);
    if (!value) continue;
    const fact = makeFact({
      sourceType: "provider_profile",
      date,
      confidence: "medium",
      category: row.category,
      label: row.label,
      excerpt: value,
      fieldKey: String(row.key),
    });
    if (fact) facts.push(fact);
  }

  return facts;
}

export function extractOrganizationFacts(input: {
  organizationId: string | null;
  organizationName: string | null;
  accountIntelligence: AccountIntelligence | null;
}): ProviderIntelligenceFact[] {
  const facts: ProviderIntelligenceFact[] = [];
  const date = input.accountIntelligence?.last_case_date ?? null;

  if (input.organizationName) {
    const fact = makeFact({
      sourceType: "organization_account",
      date,
      confidence: "high",
      category: "organizational",
      label: "Organization",
      excerpt: input.organizationName,
      fieldKey: "organization.name",
    });
    if (fact) facts.push(fact);
  }

  if (input.accountIntelligence) {
    for (const insight of input.accountIntelligence.insights.slice(0, 6)) {
      const fact = makeFact({
        sourceType: "organization_account",
        date,
        confidence: "medium",
        category: "organizational",
        label: "Account intelligence insight",
        excerpt: insight,
        fieldKey: "account_intelligence.insights",
      });
      if (fact) facts.push(fact);
    }

    if (input.accountIntelligence.top_surgeon) {
      const fact = makeFact({
        sourceType: "organization_account",
        date,
        confidence: "medium",
        category: "organizational",
        label: "Top surgeon at account",
        excerpt: `${input.accountIntelligence.top_surgeon.name} (${input.accountIntelligence.top_surgeon.case_count} cases)`,
        fieldKey: "account_intelligence.top_surgeon",
      });
      if (fact) facts.push(fact);
    }
  }

  return facts;
}

export function sortTimelineFacts(facts: ProviderIntelligenceFact[]): ProviderIntelligenceFact[] {
  return [...facts].sort((a, b) => {
    const dateA = a.date ?? "";
    const dateB = b.date ?? "";
    if (dateA && dateB && dateA !== dateB) return dateB.localeCompare(dateA);
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    return a.sourceType.localeCompare(b.sourceType);
  });
}

/** Reset counter between test runs. */
export function resetProviderIntelligenceFactCounter(): void {
  factCounter = 0;
}

export const OBSERVATION_CASE_INTEL_FIELD_KEYS = PROVIDER_OBSERVATION_CASE_INTEL_SELECT.split(", ")
  .map((item) => item.trim())
  .filter(Boolean);
