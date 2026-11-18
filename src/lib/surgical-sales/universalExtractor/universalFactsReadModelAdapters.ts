import { normalizeNextActionDisplayTitle } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefNextActionDisplay";
import type { CaseBriefingKind } from "@/lib/surgical-sales/caseIntelligenceSignals";
import { containsOntologyDisplayLabel } from "@/lib/surgical-sales/observationIntelligenceDisplayLabels";
import {
  sanitizeRepFacingCopy,
  type RepFindingCountStyle,
} from "@/lib/surgical-sales/observationRepPresentationCopy";
import { staffEfficiencyRepLabel } from "@/lib/surgical-sales/staffEfficiencyRepLabels";
import type { ObservationRepListItem } from "@/lib/surgical-sales/buildObservationRepPresentationView";
import { isObservationCaseComplete } from "@/lib/surgical-sales/observationProgramGate";
import { formatDebriefPrepareConceptRepLabel } from "@/lib/surgical-sales/universalExtractor/debriefPrepareConceptDisplay";
import type {
  UniversalFactExtractionRun,
  UniversalSurgicalFactRow,
} from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { shouldRejectAssignedProviderContactRole } from "@/lib/surgical-sales/sharedIntelligence/providerContactRolePolicy";
import { isUniversalFactNonDisplayMetaConcept } from "@/lib/surgical-sales/universalExtractor/universalNonDisplayConcepts";

/** Surgical concepts eligible for Phase 1 read-model replacement (excludes pathway/commercial-only). */
export const UNIVERSAL_FACTS_SURGICAL_READ_CONCEPTS = [
  "visualization_or_access_issue",
  "sizing_or_fit_issue",
  "inventory_availability_issue",
  "workflow_or_timing_issue",
  "placement_or_positioning_issue",
  "training_or_familiarity_issue",
  "product_performance_issue",
  "staff_workflow",
  "case_outcome",
  "no_issue_or_routine",
  "current_product",
  "competitor_product",
  "provider_sentiment",
  "product_interest",
  "support_needed",
  "requested_item",
  "unavailable_item",
  "alternative_used",
  "procedure_volume_trend",
  "procedure_focus",
  "technology_preference",
  "contact_role",
  "next_action",
  "access_pathway",
  "credentialing_requirement",
] as const;

/**
 * Internal routing prefixes the GPT validator stamps onto normalized labels
 * (e.g. "Relationship:", "Workflow priority:"). They drive downstream routing
 * but must be stripped — not substituted — before display, otherwise the chip
 * shows the raw tag or a doubled word ("Provider provider …"). Universal: the
 * prefixes are category tags, not domain copy.
 */
const UF_INTERNAL_LABEL_PREFIX_RE =
  /^(?:relationship|workflow priority|commercial disposition|operational concern|staff workflow|technique \/ modality|access pathway|next step recommended)\s*:\s*/i;

export function stripInternalUfLabelPrefix(label: string | null | undefined): string {
  return String(label ?? "")
    .replace(UF_INTERNAL_LABEL_PREFIX_RE, "")
    .trim();
}

function capitalizeFirst(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export type UniversalFactsReadModelPayload = {
  caseRuns?: UniversalFactExtractionRun[];
  programRuns?: UniversalFactExtractionRun[];
  providerRuns?: UniversalFactExtractionRun[];
};

/** Program-level UF runs for debrief prepare — loader returns providerRuns today. */
export function resolveDebriefPrepareProgramRuns(
  readModel?: UniversalFactsReadModelPayload | null,
): UniversalFactExtractionRun[] {
  if (!readModel) return [];
  if (readModel.programRuns?.length) return readModel.programRuns;
  if (readModel.providerRuns?.length) return readModel.providerRuns;
  return [];
}

export function resolveActiveOperationalNoteIdsFromActivities(
  activities?: Array<{ metadata_json?: Record<string, unknown> | null }>,
): string[] {
  const ids = new Set<string>();
  for (const activity of activities ?? []) {
    const noteId = String(activity.metadata_json?.note_id ?? "").trim();
    if (noteId) ids.add(noteId);
  }
  return [...ids];
}

/** Limit current-case UF read paths to active notes, else the newest capture only. */
export function filterCaseRunsForThisObservation(input: {
  caseRuns: UniversalFactExtractionRun[];
  activeOperationalNoteIds?: string[];
}): UniversalFactExtractionRun[] {
  const runs = input.caseRuns ?? [];
  if (runs.length === 0) return [];

  const activeIds = new Set(
    (input.activeOperationalNoteIds ?? []).map((id) => String(id).trim()).filter(Boolean),
  );

  if (activeIds.size > 0) {
    const linked = runs.filter((run) => {
      const noteId = String(run.operational_note_id ?? "").trim();
      return noteId && activeIds.has(noteId);
    });
    if (linked.length > 0) {
      return [...linked].sort((left, right) =>
        String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")),
      );
    }
  }

  const sorted = [...runs].sort((left, right) =>
    String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")),
  );
  const latest = sorted[0];
  return latest ? [latest] : [];
}

function filterProviderContactRoleFacts(
  facts: UniversalSurgicalFactRow[],
  providerName?: string | null,
): UniversalSurgicalFactRow[] {
  const filtered = facts.filter(
    (fact) =>
      !shouldRejectAssignedProviderContactRole({
        concept: String(fact.concept),
        person_mentioned: fact.person_mentioned,
        normalized_label: fact.normalized_label,
        evidence_text: fact.evidence_text,
        providerName,
      }),
  );

  const bestContactByPerson = new Map<string, UniversalSurgicalFactRow>();
  const contactRoleRank = (fact: UniversalSurgicalFactRow): number => {
    const label = `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`.toLowerCase();
    if (/scheduling|scheduler|coordinator|access|credential|evaluation contact/.test(label)) return 4;
    if (/or manager|office manager/.test(label)) return 3;
    if (/scrub|circulat|surgical tech|nurse/.test(label)) return 2;
    return 1;
  };

  for (const fact of filtered) {
    if (fact.concept !== "contact_role") continue;
    const person = normalizeFactFingerprintText(fact.person_mentioned ?? "");
    if (!person) continue;
    const scope = normalizeFactFingerprintText(String(fact.case_id ?? fact.capture_id ?? ""));
    const key = `${person}:${scope}`;
    const scopedExisting = bestContactByPerson.get(key);
    if (!scopedExisting || contactRoleRank(fact) > contactRoleRank(scopedExisting)) {
      bestContactByPerson.set(key, fact);
    }
  }

  return filtered.filter((fact) => {
    if (fact.concept !== "contact_role") return true;
    const person = normalizeFactFingerprintText(fact.person_mentioned ?? "");
    if (!person) return true;
    const scope = normalizeFactFingerprintText(String(fact.case_id ?? fact.capture_id ?? ""));
    const key = `${person}:${scope}`;
    return bestContactByPerson.get(key)?.id === fact.id;
  });
}

/** Mirrors observationCaseBriefingPresentation.BRIEFING_ENGINE_TERM_PATTERN (avoid circular import). */
const BRIEFING_ENGINE_TERM_PATTERN =
  /\b(repeat evidence|signal captured|early signal|captured signal|validated|supported pattern|confidence|maturity|evidence threshold|pain points?|hypothesis|strengthens?|gather evidence|validate whether|\bsignal\b|\bevidence\b|\bfindings captured|\bintelligence\b)/i;

function isSurgicalReadConcept(concept: string): boolean {
  return (UNIVERSAL_FACTS_SURGICAL_READ_CONCEPTS as readonly string[]).includes(concept);
}

function isEligibleFact(fact: UniversalSurgicalFactRow): boolean {
  return (
    !fact.suppressed &&
    !fact.negated &&
    !fact.uncertain &&
    fact.assertion_level !== "rejected" &&
    isSurgicalReadConcept(String(fact.concept))
  );
}

function flattenFacts(runs: UniversalFactExtractionRun[]): UniversalSurgicalFactRow[] {
  return runs.flatMap((run) => run.facts).filter(isEligibleFact);
}

function programFractionCountPhrase(
  completedCount: number,
  programCompletedCount?: number,
): string {
  if (
    programCompletedCount !== undefined &&
    programCompletedCount >= 2 &&
    completedCount >= 1 &&
    completedCount <= programCompletedCount
  ) {
    return `— seen in ${completedCount} of ${programCompletedCount} observations`;
  }
  if (completedCount >= 3) return `across ${completedCount} completed cases`;
  if (completedCount === 2) return "across 2 completed cases";
  if (completedCount === 1) return "in 1 completed case";
  return "";
}

function appendCountSuffix(base: string, countPhrase: string): string {
  if (!countPhrase) return base;
  if (countPhrase.startsWith("—")) return `${base} ${countPhrase}`;
  return `${base} ${countPhrase}`;
}

/** Higher-priority concepts surface first in the 8-item This Observation cap. */
const THIS_OBSERVATION_CONCEPT_PRIORITY: Record<string, number> = {
  current_product: 0,
  competitor_product: 1,
  product_interest: 2,
  procedure_focus: 3,
  technology_preference: 4,
  sizing_or_fit_issue: 5,
  contact_role: 6,
  next_action: 7,
  provider_sentiment: 8,
  staff_workflow: 9,
  inventory_availability_issue: 10,
  workflow_or_timing_issue: 11,
  case_outcome: 12,
  no_issue_or_routine: 13,
  visualization_or_access_issue: 14,
  product_performance_issue: 14,
  procedure_volume_trend: 15,
  placement_or_positioning_issue: 16,
  training_or_familiarity_issue: 17,
  support_needed: 18,
  requested_item: 19,
  unavailable_item: 20,
  alternative_used: 21,
  access_pathway: 22,
  credentialing_requirement: 23,
};

const THIS_OBSERVATION_ITEM_CAP = 8;

function sortFactsForThisObservation(facts: UniversalSurgicalFactRow[]): UniversalSurgicalFactRow[] {
  return [...facts].sort((left, right) => {
    const leftPriority = THIS_OBSERVATION_CONCEPT_PRIORITY[String(left.concept)] ?? 50;
    const rightPriority = THIS_OBSERVATION_CONCEPT_PRIORITY[String(right.concept)] ?? 50;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return String(left.normalized_label ?? "").localeCompare(String(right.normalized_label ?? ""));
  });
}

const INSTRUMENT_AVAILABILITY_THEME_PATTERN =
  /instrument|inventory|stock|availability|suppl(?:y|ies)|tray|peel pack|not ready|verify.*product|had to (?:check|confirm|look)/i;

function factInstrumentAvailabilityThemeKey(fact: UniversalSurgicalFactRow): string | null {
  const blob = `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`;
  if (!INSTRUMENT_AVAILABILITY_THEME_PATTERN.test(blob)) return null;

  if (
    fact.concept === "inventory_availability_issue" ||
    fact.concept === "workflow_or_timing_issue"
  ) {
    return "theme:instrument-availability";
  }

  return null;
}

function staffEvidenceShowsFriction(blob: string): boolean {
  if (/nobody appeared frustrated|didn't seem angry|not frustrated|no frustration|wasn't frustrated/i.test(blob)) {
    return false;
  }
  return /friction|complaint|workaround|burden|frustrat/.test(blob);
}

function isPositiveStaffEvidence(fact: UniversalSurgicalFactRow): boolean {
  const blob = `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`.toLowerCase();
  return /organized|coordinated|smooth|positive staff|worked smoothly|know what they were doing|worked well|communication|strong|consistent team|retention|satisfaction/.test(
    blob,
  );
}

function formatContactRoleLine(fact: UniversalSurgicalFactRow): string {
  const person = fact.person_mentioned?.trim();
  const label = fact.normalized_label?.trim() ?? "";
  const role =
    label.includes("·") ? label.split("·").slice(1).join("·").trim() : "scheduling contact";
  if (!person && /\b(?:OR Manager|Office Manager|Credentialing Contact|Key Contact)\b/i.test(label)) {
    return label;
  }
  if (person) return `${person} — ${role || "key contact"}`;
  if (label && !containsOntologyDisplayLabel(label)) return sanitizeRepFacingCopy(label);
  return "Key contact identified";
}

function formatProviderSentimentLine(fact: UniversalSurgicalFactRow): string {
  const label = fact.normalized_label?.trim();
  if (label && !containsOntologyDisplayLabel(label)) {
    const cleaned = stripInternalUfLabelPrefix(label).replace(/^provider sentiment:\s*/i, "");
    if (cleaned) return sanitizeRepFacingCopy(capitalizeFirst(cleaned));
  }
  const evidence = fact.evidence_text?.trim();
  if (evidence && evidence.length <= 120 && !containsOntologyDisplayLabel(evidence)) {
    return sanitizeRepFacingCopy(evidence);
  }
  return "Provider disposition noted";
}

function evidenceStatesPriority(evidence: string): boolean {
  return /\b(?:priorit(?:y|ies|ize|ise)|important|big deal|emphasized|emphasised|matters?|meaningful impact)\b/i.test(evidence);
}

function evidenceStatesNoWorkflowDelays(evidence: string): boolean {
  return /\b(?:no|without)\s+(?:other\s+)?workflow\s+delays?\b|\bno\s+delays?\b/i.test(evidence);
}

function evidenceStatesResolvedPriorIssue(evidence: string): boolean {
  return /\b(?:issue|problem|concern|friction)\b[^.!?]{0,80}\b(?:wasn['’]?t|was not|not)\s+present\b|\bless\s+convinced\b[^.!?]{0,80}\bongoing\s+problem\b/i.test(evidence);
}

function staffWorkflowFactIsDisplayable(fact: UniversalSurgicalFactRow): boolean {
  const label = fact.normalized_label?.trim() ?? "";
  const evidence = fact.evidence_text?.trim() ?? "";
  const blob = `${label} ${evidence}`;
  if (/\b(?:staff|team)\s+didn['’]?t\s+seem\s+frustrated\b|\bstaff\s+(?:was|were)\s+not\s+frustrated\b/i.test(evidence)) {
    return false;
  }
  if (/\b(?:delay|delayed|waiting|frustrat|complaint|workaround)\b/i.test(blob)) return true;
  if (/\b(?:staff satisfaction|team satisfaction|retention)\b/i.test(blob)) {
    return /\b(?:staff satisfaction|team satisfaction|retention)\b/i.test(evidence);
  }
  if (/strong team communication|strong communication|communication between the circulat|communication.*surgeon/i.test(blob)) {
    return true;
  }
  if (/consistent team members?|same team members?|familiar team|organized|prepared|knew what they were doing|know what they were doing|worked well together|coordinated team/i.test(evidence)) {
    return true;
  }
  return false;
}

function formatStaffWorkflowLine(fact: UniversalSurgicalFactRow): string | null {
  const blob = `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`.trim();
  const evidence = fact.evidence_text?.trim() ?? "";
  if (/\b(?:delay|delayed|waiting|frustrat|complaint|workaround)\b/i.test(blob)) {
    if (evidence && evidence.length <= 140 && !containsOntologyDisplayLabel(evidence)) {
      return sanitizeRepFacingCopy(`Staff reported: ${evidence.replace(/[.!?]+$/, "")}`);
    }
    return "Staff reported workflow delays or friction";
  }
  if (!staffWorkflowFactIsDisplayable(fact)) return null;
  return staffEfficiencyRepLabel(
    blob,
  );
}

function formatWorkflowTimingLine(fact: UniversalSurgicalFactRow): string | null {
  const label = fact.normalized_label?.trim() ?? "";
  const evidence = fact.evidence_text?.trim() ?? "";
  const blob = `${label} ${evidence}`;

  if (/\bworkflow priority\b/i.test(label) && !evidenceStatesPriority(evidence)) {
    return null;
  }

  if (/\bstaff satisfaction|team satisfaction|retention\b/i.test(blob) && !/\bstaff satisfaction|team satisfaction|retention\b/i.test(evidence)) {
    return null;
  }

  if (/\b(?:overall\s+)?workflow\s+was\s+smooth\b|\broom\s+ran\s+(?:pretty\s+)?efficiently\b|\bcase\s+ran\s+(?:pretty\s+)?smoothly\b/i.test(evidence)) return null;

  if (label && !containsOntologyDisplayLabel(label)) {
    return sanitizeRepFacingCopy(capitalizeFirst(stripInternalUfLabelPrefix(label)));
  }

  if (evidence && evidence.length <= 120 && !containsOntologyDisplayLabel(evidence)) {
    return sanitizeRepFacingCopy(cleanTerminalPunctuation(evidence));
  }

  return "Workflow or timing issue noted";
}

function formatCaseOutcomeLine(fact: UniversalSurgicalFactRow): string | null {
  const label = fact.normalized_label?.trim() ?? "";
  const evidence = fact.evidence_text?.trim() ?? "";
  const blob = `${label} ${evidence}`;

  if (/no workflow delays/i.test(blob)) {
    return evidenceStatesNoWorkflowDelays(evidence) ? "No workflow delays observed today" : null;
  }
  if (/prior workflow issue was not observed|not observed today|was not present|wasn['’]?t present/i.test(blob)) {
    return evidenceStatesResolvedPriorIssue(evidence) ? "Prior workflow issue was not observed today" : null;
  }
  if (/\b(?:overall\s+)?workflow\s+was\s+smooth\b|\broom\s+ran\s+(?:pretty\s+)?efficiently\b|\bcase\s+ran\s+(?:pretty\s+)?smoothly\b/i.test(evidence)) return null;
  if (label && !containsOntologyDisplayLabel(label)) return sanitizeRepFacingCopy(stripInternalUfLabelPrefix(label));
  return null;
}

function formatVisualizationOrAccessLine(fact: UniversalSurgicalFactRow): string {
  const evidence = fact.evidence_text?.trim() ?? "";
  if (/\bpooled\s+fluid|fluid\b/i.test(evidence) && /\b(?:difficult|challenging|hard)\b/i.test(evidence)) {
    return "Difficulty reaching pooled fluid";
  }
  if (/\baccess\s+(?:was\s+)?(?:difficult|challenging|hard)\b/i.test(evidence)) {
    if (/\breposition/i.test(evidence)) return "Access was difficult in tight anatomy; assistant repositioning was needed";
    return "Access difficulty noted in tight anatomy";
  }
  if (/\bvisuali[sz]/i.test(evidence) && /\bdeep|deeper\b/i.test(evidence)) {
    return "Visualization was challenging in deeper portions of the case";
  }
  if (/\breposition/i.test(evidence)) return "Repositioning was needed to maintain access or visualization";
  const label = fact.normalized_label?.trim();
  if (label && !containsOntologyDisplayLabel(label)) return sanitizeRepFacingCopy(stripInternalUfLabelPrefix(label));
  return "Visualization or access challenge noted";
}

function formatSizingOrFitLine(fact: UniversalSurgicalFactRow): string {
  const evidence = fact.evidence_text?.trim() ?? "";
  if (/\blarger\s+size\b/i.test(evidence)) return "Asked about larger size availability";
  if (/\b(?:smaller|different)\s+size\b/i.test(evidence)) return "Asked about size availability";
  if (
    /\b(?:handling|positioning|manipulation)\b[^.!?]{0,100}\b(?:larger|bigger)\s+(?:defects?|ventral hernias?)\b/i.test(evidence) ||
    /\b(?:larger|bigger)\s+(?:defects?|ventral hernias?)\b[^.!?]{0,160}\b(?:conform|contour|flexib|handling|positioning|manipulation|slows?|take\s+longer|takes\s+longer|annoyance)\b/i.test(evidence)
  ) {
    if (/\bslows?\b/i.test(evidence)) return "Handling on bigger defects slows the provider down";
    if (/\btakes?\s+longer\b|\bannoyance\b/i.test(evidence)) {
      return "Product fit concern: Larger defects take longer with current mesh";
    }
    if (/\bcontour\b/i.test(evidence)) return "Product fit concern: Mesh contour on larger defects";
    return "Product fit concern: Conformability on larger defects";
  }
  const label = fact.normalized_label?.trim();
  if (label && !containsOntologyDisplayLabel(label)) return sanitizeRepFacingCopy(stripInternalUfLabelPrefix(label));
  if (evidence && evidence.length <= 140 && !containsOntologyDisplayLabel(evidence)) {
    return sanitizeRepFacingCopy(cleanTerminalPunctuation(evidence));
  }
  return "Sizing or fit question noted";
}

function cleanTerminalPunctuation(text: string): string {
  return text.trim().replace(/[.!?]+$/, "");
}

const PROCEDURE_CONTEXT_ONLY_PATTERN =
  /^(?:colorectal|orthopedic|orthopaedic|cardiac|vascular|thoracic|urology|gynecology|gyn|ent|spine|trauma|hernia|shoulder|knee|hip|pelvic|abdominal|robotic|laparoscopic|open)$/i;

function isProcedureContextOnlyFact(fact: UniversalSurgicalFactRow): boolean {
  if (fact.concept !== "procedure_focus" && fact.concept !== "procedure_volume_trend" && fact.concept !== "technology_preference") {
    return false;
  }
  const label = stripInternalUfLabelPrefix(fact.normalized_label).trim();
  const evidence = fact.evidence_text?.trim() ?? "";
  if (!PROCEDURE_CONTEXT_ONLY_PATTERN.test(label)) return false;
  return !/\b(?:setup|workflow|using|used|current|standardized|standardised|preference|approach)\b/i.test(evidence);
}

function dedupeKeyForThisObservationFact(fact: UniversalSurgicalFactRow, text: string): string {
  const instrumentTheme = factInstrumentAvailabilityThemeKey(fact);
  if (instrumentTheme) return instrumentTheme;

  if (fact.concept === "current_product" || fact.concept === "competitor_product") {
    const product = normalizedProductDedupeKey(fact.product_mentioned ?? "");
    if (product) return `${fact.concept}:product:${product}`;
  }

  if (fact.concept === "staff_workflow") {
    const blob = `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`.toLowerCase();
    if (/consistent team members?|same team|familiar team/.test(blob)) return "staff:consistent-team";
    if (/communication|circulat|scrub tech|surgeon was strong|worked well together/.test(blob)) {
      return "staff:communication";
    }
    if (/staff satisfaction|retention/.test(blob)) return "staff:satisfaction";
    return "staff:positive";
  }

  if (fact.concept === "contact_role") {
    const person = normalizeFactFingerprintText(fact.person_mentioned ?? "");
    const label = normalizeFactFingerprintText(fact.normalized_label ?? "");
    return `contact:${person || label}`;
  }

  const quote = fact.evidence_text?.trim().toLowerCase();
  if (quote && quote.length >= 24) {
    return `quote:${quote.slice(0, 140)}`;
  }

  return text.trim().toLowerCase();
}

function formatCurrentCaseFactLine(fact: UniversalSurgicalFactRow): string | null {
  if (fact.concept === "current_product") {
    const product = fact.product_mentioned?.trim();
    return product ? `${product} was used during the case` : "A product was used during the case";
  }

  if (fact.concept === "competitor_product") {
    const product = fact.product_mentioned?.trim();
    return product
      ? `Competitor product ${product} was used during the case`
      : "A competitor product was used during the case";
  }

  if (fact.concept === "contact_role") {
    return formatContactRoleLine(fact);
  }

  if (fact.concept === "provider_sentiment") {
    return formatProviderSentimentLine(fact);
  }

  if (fact.concept === "staff_workflow") {
    return formatStaffWorkflowLine(fact);
  }

  if (fact.concept === "workflow_or_timing_issue") {
    return formatWorkflowTimingLine(fact);
  }

  if (fact.concept === "case_outcome" || fact.concept === "no_issue_or_routine") {
    return formatCaseOutcomeLine(fact);
  }

  if (fact.concept === "visualization_or_access_issue") {
    return formatVisualizationOrAccessLine(fact);
  }

  if (fact.concept === "sizing_or_fit_issue" || fact.concept === "product_performance_issue") {
    return formatSizingOrFitLine(fact);
  }

  if (fact.concept === "product_interest") {
    const product = fact.product_mentioned?.trim();
    const evidence = fact.evidence_text?.trim();
    const label = fact.normalized_label?.trim();
    const genericProductNoun = Boolean(product && /^(mesh|graft|implant|device|system|product)$/i.test(product));
    const cleanedLabel = label
      ? stripInternalUfLabelPrefix(label)
          .replace(/^product interest:\s*/i, "")
          .trim()
      : "";
    const usageStyleLabel = /\bwas used during the case\b/i.test(cleanedLabel);
    const genericImplantLabel = /^(mesh|graft|implant|device|system|product)$/i.test(cleanedLabel);

    // Named product + short evidence is the clearest interest chip when available.
    if (
      product &&
      !genericProductNoun &&
      evidence &&
      evidence.length <= 140 &&
      !containsOntologyDisplayLabel(evidence)
    ) {
      return sanitizeRepFacingCopy(`${product} interest: ${cleanTerminalPunctuation(evidence)}`);
    }

    // Prefer curated interest labels over raw transcript fragments / generic implant nouns.
    // Skip usage-style labels that leaked onto interest facts.
    if (
      cleanedLabel &&
      !usageStyleLabel &&
      !genericImplantLabel &&
      !containsOntologyDisplayLabel(cleanedLabel)
    ) {
      return sanitizeRepFacingCopy(capitalizeFirst(cleanedLabel));
    }

    // Skip dangling fragments like "We discussed some available clinical data,"
    if (
      evidence &&
      evidence.length <= 140 &&
      !/,\s*$/.test(evidence) &&
      !containsOntologyDisplayLabel(evidence)
    ) {
      return sanitizeRepFacingCopy(cleanTerminalPunctuation(capitalizeFirst(evidence)));
    }
  }

  const label = fact.normalized_label?.trim();
  if (label && !containsOntologyDisplayLabel(label)) {
    const cleaned = stripInternalUfLabelPrefix(label);
    if (cleaned) return sanitizeRepFacingCopy(capitalizeFirst(cleaned));
  }

  const evidence = fact.evidence_text?.trim();
  if (evidence && evidence.length <= 120 && !containsOntologyDisplayLabel(evidence)) {
    return sanitizeRepFacingCopy(evidence);
  }

  return sanitizeRepFacingCopy(formatDebriefPrepareConceptRepLabel(String(fact.concept)));
}

function formatEstablishedConceptLine(input: {
  concept: string;
  sampleLabel: string | null;
  completedCaseCount: number;
  programCompletedCount?: number;
  countStyle?: RepFindingCountStyle;
}): string {
  const base =
    input.sampleLabel && !containsOntologyDisplayLabel(input.sampleLabel)
      ? sanitizeRepFacingCopy(input.sampleLabel)
      : sanitizeRepFacingCopy(formatDebriefPrepareConceptRepLabel(input.concept));

  const countPhrase =
    input.countStyle === "program_fraction"
      ? programFractionCountPhrase(input.completedCaseCount, input.programCompletedCount)
      : programFractionCountPhrase(input.completedCaseCount);

  return appendCountSuffix(base, countPhrase);
}

function formatObservationKnowledgeCountLine(input: {
  line: string;
  observedCaseCount: number;
  programCompletedCount?: number;
  countStyle?: RepFindingCountStyle;
}): string {
  const countPhrase =
    input.countStyle === "program_fraction"
      ? programFractionCountPhrase(input.observedCaseCount, input.programCompletedCount)
      : programFractionCountPhrase(input.observedCaseCount);
  return appendCountSuffix(input.line, countPhrase);
}

function dedupeLines(lines: string[], limit = 6): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase().trim();
    if (!line || seen.has(key)) continue;
    seen.add(key);
    output.push(line);
    if (output.length >= limit) break;
  }
  return output;
}

function conceptSampleLabel(facts: UniversalSurgicalFactRow[], concept?: string): string | null {
  if (concept === "product_interest") {
    const product = facts.map((fact) => fact.product_mentioned?.trim()).find(Boolean);
    if (product) return `Product interest: ${product}`;
    for (const fact of facts) {
      const evidence = fact.evidence_text?.trim();
      if (evidence && /\b(?:asked|question|interested|wanted|information|compare|training|required|compatible)\b/i.test(evidence)) {
        return evidence.length <= 120 ? evidence : "Product interest noted";
      }
    }
    return "Product interest noted";
  }

  for (const fact of facts) {
    const label = fact.normalized_label?.trim();
    if (label && !containsOntologyDisplayLabel(label)) return label;
    const evidence = fact.evidence_text?.trim();
    if (evidence && evidence.length <= 120 && !containsOntologyDisplayLabel(evidence)) {
      return evidence;
    }
  }
  return null;
}

function establishedConceptCounts(
  facts: UniversalSurgicalFactRow[],
  completedCaseIds: Set<string>,
  options?: { requireRepeatedVolatileOperationalFacts?: boolean },
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const concept of new Set(facts.map((fact) => String(fact.concept)))) {
    const conceptFacts = filterValidatedProductUsageFacts(
      facts.filter((fact) => String(fact.concept) === concept && !isProcedureContextOnlyFact(fact)),
    );
    if (conceptFacts.length === 0) continue;
    const validatedCases = new Set(
      conceptFacts
        .filter(
          (fact) =>
            fact.assertion_level === "validated" &&
            fact.case_id &&
            completedCaseIds.has(String(fact.case_id)),
        )
        .map((fact) => String(fact.case_id)),
    );
    const observedCompletedCases = new Set(
      conceptFacts
        .filter(
          (fact) =>
            (fact.assertion_level === "observed" || fact.assertion_level === "case_supported") &&
            fact.case_id &&
            completedCaseIds.has(String(fact.case_id)),
        )
        .map((fact) => String(fact.case_id)),
    );

    const completedCasesForConcept = new Set([...validatedCases, ...observedCompletedCases]);
    const requiresRepeatedCompletedCases =
      Boolean(options?.requireRepeatedVolatileOperationalFacts) &&
      isVolatileOperationalWhatWeKnowConcept(concept);
    const established = requiresRepeatedCompletedCases
      ? completedCasesForConcept.size >= 2
      : validatedCases.size > 0 || observedCompletedCases.size >= 2;
    if (!established) continue;

    counts.set(
      concept,
      requiresRepeatedCompletedCases
        ? completedCasesForConcept.size
        : validatedCases.size > 0 ? validatedCases.size : observedCompletedCases.size,
    );
  }

  return counts;
}

const VOLATILE_OPERATIONAL_WHAT_WE_KNOW_CONCEPTS = new Set([
  "visualization_or_access_issue",
  "sizing_or_fit_issue",
  "inventory_availability_issue",
  "workflow_or_timing_issue",
  "placement_or_positioning_issue",
  "training_or_familiarity_issue",
  "product_performance_issue",
  "staff_workflow",
  "provider_sentiment",
]);

/**
 * Stable theme keys so paraphrased GPT/rules labels roll into one
 * "seen in N of M observations" chip instead of near-duplicate lines.
 */
const OBSERVATION_KNOWLEDGE_THEME_PATTERNS: Array<{ theme: string; re: RegExp }> = [
  {
    theme: "conformability-larger-defects",
    re: /\b(?:conform(?:ability|ed|s)?|handling)\b[\s\S]{0,80}\b(?:larger|bigger)\s+defects?\b|\b(?:larger|bigger)\s+defects?\b[\s\S]{0,80}\b(?:conform|fit|position|handling)\b|\bfit concern\b|\bproduct fit concern\b/i,
  },
  {
    theme: "instrument-availability",
    re: /\b(?:instrument|inventory|stock(?:ed)?|availability|suppl(?:y|ies)|tray|peel pack|backup sizes?|not (?:ready|available|stocked))\b/i,
  },
  {
    theme: "clinical-data-interest",
    re: /\b(?:clinical[- ]data|comparison(?: information)?|published data|incorporation time|product comparison)\b/i,
  },
  {
    theme: "evaluation-interest",
    re: /\b(?:scheduling an evaluation|interested in (?:an )?evaluation|willing to evaluate|trial(?:ing|ling)?|demo(?:ed)?)\b/i,
  },
  {
    theme: "openness-to-alternatives",
    re: /\b(?:open(?:ness)? to alternatives|not locked in|provider openness|interested in (?:alternatives|options|products))\b/i,
  },
  {
    theme: "turnover-efficiency",
    re: /\b(?:turnover|room ran|case flow|efficiency)\b/i,
  },
  {
    theme: "visualization-access",
    re: /\b(?:visualiz(?:e|ation|ing)|exposure|retractor|access before fixation)\b/i,
  },
  {
    theme: "training-familiarity",
    re: /\b(?:training|in-?service|unfamiliar|familiar(?:ity)?|staff education)\b/i,
  },
  {
    theme: "smooth-case-outcome",
    re: /\b(?:went smoothly|case (?:went |was )?smooth|routine case|no (?:issues?|problems?)|smooth coverage)\b/i,
  },
];

function observationKnowledgeThemeKey(fact: UniversalSurgicalFactRow, line: string): string | null {
  const blob = `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""} ${line}`;
  if (fact.concept === "staff_workflow") {
    if (isPositiveStaffEvidence(fact)) return "staff-positive";
    if (staffEvidenceShowsFriction(blob.toLowerCase())) return "staff-friction";
  }
  for (const { theme, re } of OBSERVATION_KNOWLEDGE_THEME_PATTERNS) {
    if (re.test(blob)) return theme;
  }
  return factInstrumentAvailabilityThemeKey(fact)?.replace(/^theme:/, "") ?? null;
}

function observationKnowledgeRollupKey(fact: UniversalSurgicalFactRow, line: string): string {
  const concept = String(fact.concept);
  if (concept === "current_product" || concept === "competitor_product") {
    const product = normalizedProductDedupeKey(fact.product_mentioned ?? "");
    if (product) return `product:${product}`;
  }

  if (concept === "contact_role") {
    const person = normalizeFactFingerprintText(fact.person_mentioned ?? "");
    const label = normalizeFactFingerprintText(fact.normalized_label ?? "");
    return `contact:${person || label || normalizeFactFingerprintText(line)}`;
  }

  if (concept === "product_interest") {
    const product = normalizedProductDedupeKey(fact.product_mentioned ?? "");
    if (product) return `product-interest:${product}`;
  }

  if (concept === "procedure_focus") {
    const focus = normalizeFactFingerprintText(
      stripInternalUfLabelPrefix(fact.normalized_label) || line,
    );
    if (focus) return `procedure-focus:${focus}`;
  }

  const theme = observationKnowledgeThemeKey(fact, line);
  if (theme) return `theme:${theme}`;

  return `${concept}:${normalizeFactFingerprintText(line)}`;
}

function preferRollupDisplayLine(existing: string, candidate: string): string {
  const existingCurated = /^(?:Product |Competitor |Current |Staff |Provider |Evaluation |Product fit|Product comparison|Product availability|Workflow )/i.test(
    existing,
  );
  const candidateCurated = /^(?:Product |Competitor |Current |Staff |Provider |Evaluation |Product fit|Product comparison|Product availability|Workflow )/i.test(
    candidate,
  );
  if (candidateCurated && !existingCurated) return candidate;
  if (existingCurated && !candidateCurated) return existing;
  // Prefer concise titles over long transcript fragments when both are similar length class.
  if (candidate.length < existing.length && candidate.length >= 18) return candidate;
  if (existing.length < candidate.length && existing.length >= 18) return existing;
  return candidate.length > existing.length ? candidate : existing;
}

function observationKnowledgeRollupLines(input: {
  facts: UniversalSurgicalFactRow[];
  completedCaseIdSet: Set<string>;
  programCompletedCount?: number;
  countStyle?: RepFindingCountStyle;
}): string[] {
  const rollups = new Map<
    string,
    { line: string; concept: string; cases: Set<string>; firstSortLabel: string }
  >();

  const eligibleFacts = filterValidatedProductUsageFacts(input.facts).filter(
    (fact) =>
      fact.case_id &&
      input.completedCaseIdSet.has(String(fact.case_id)) &&
      !isProcedureContextOnlyFact(fact),
  );

  for (const fact of eligibleFacts) {
    const line = formatCurrentCaseFactLine(fact);
    if (!line || BRIEFING_ENGINE_TERM_PATTERN.test(line)) continue;
    const key = observationKnowledgeRollupKey(fact, line);
    const existing = rollups.get(key);
    if (existing) {
      existing.cases.add(String(fact.case_id));
      existing.line = preferRollupDisplayLine(existing.line, line);
      continue;
    }
    rollups.set(key, {
      line,
      concept: String(fact.concept),
      cases: new Set([String(fact.case_id)]),
      firstSortLabel: line,
    });
  }

  const lines = [...rollups.values()]
    .sort((left, right) => {
      // Highest case-count first so accumulation survives the display cap.
      if (right.cases.size !== left.cases.size) return right.cases.size - left.cases.size;
      const leftPriority = THIS_OBSERVATION_CONCEPT_PRIORITY[left.concept] ?? 50;
      const rightPriority = THIS_OBSERVATION_CONCEPT_PRIORITY[right.concept] ?? 50;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return left.firstSortLabel.localeCompare(right.firstSortLabel);
    })
    .map((rollup) =>
      formatObservationKnowledgeCountLine({
        line: rollup.line,
        observedCaseCount: rollup.cases.size,
        programCompletedCount: input.programCompletedCount,
        countStyle: input.countStyle,
      }),
    );

  return dedupeLines(lines, 16);
}

function isVolatileOperationalWhatWeKnowConcept(concept: string): boolean {
  return VOLATILE_OPERATIONAL_WHAT_WE_KNOW_CONCEPTS.has(concept);
}

function normalizeFactFingerprintText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizedProductDedupeKey(product: string): string {
  return normalizeFactFingerprintText(product)
    .replace(/\b(?:graft|mesh|implant|system|plate|screw|anchor)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const PRODUCT_USAGE_DISQUALIFIER_RE =
  /\b(?:asked|question|questions|interested|interest|curious|wanted more information|future|future evaluations?|evaluation|evaluate|trial\s+in\s+a\s+future|compare|compared|compares|comparison|works?\s+with|training required|training.*staff|commitments?|commitment|no commitments?|no formal evaluation|wasn't evaluating|not evaluating)\b/i;

function escapeRegExp(text: string): string {
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function compactProductPattern(product: string): string | null {
  const tokens = product
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp);
  if (tokens.length === 0) return null;
  return tokens.join(String.raw`\s+`);
}

export function evidenceDirectlyStatesProductUsed(input: {
  evidence?: string | null;
  productName?: string | null;
}): boolean {
  const evidence = String(input.evidence ?? "").trim();
  const productName = String(input.productName ?? "").trim();
  if (!evidence || !productName) return false;

  const product = compactProductPattern(productName);
  if (!product) return false;

  const directUsagePatterns = [
    new RegExp(String.raw`\b(?:used|using|uses|trialed|trialled|implanted|placed|deployed|opened)\s+(?:the\s+)?${product}\b`, "i"),
    new RegExp(String.raw`\b(?:used|using|uses|trialed|trialled|implanted|placed|deployed|opened)\b[^.!?]{0,80}\b${product}\b`, "i"),
    new RegExp(String.raw`\bcurrent\s+product\s+(?:was|is)\s+(?:the\s+)?${product}\b`, "i"),
    new RegExp(String.raw`\b${product}\b[^.!?]{0,48}\b(?:was|were|is|in\s+use|used|trialed|trialled|implanted|placed|deployed)\b`, "i"),
    new RegExp(String.raw`\bhad\s+(?:the\s+)?${product}\b[^.!?]{0,48}\b(?:in|during|for|on)\s+(?:the\s+)?(?:case|procedure|surgery)\b`, "i"),
    new RegExp(String.raw`\b${product}\b[^.!?]{0,48}\b(?:in|during|for|on)\s+(?:the\s+)?(?:case|procedure|surgery)\b`, "i"),
  ];

  if (directUsagePatterns.some((pattern) => pattern.test(evidence))) return true;

  // Interest/comparison/evaluation language is explicitly not product usage.
  if (PRODUCT_USAGE_DISQUALIFIER_RE.test(evidence)) return false;

  return false;
}

function isProductUsageFactValidated(fact: UniversalSurgicalFactRow): boolean {
  if (fact.concept !== "current_product" && fact.concept !== "competitor_product") return true;
  const product =
    fact.product_mentioned?.trim() ||
    fact.normalized_label?.replace(/^(?:current|competitor)\s+product:\s*/i, "").trim();
  return evidenceDirectlyStatesProductUsed({
    evidence: fact.evidence_text,
    productName: product,
  });
}

function filterValidatedProductUsageFacts(facts: UniversalSurgicalFactRow[]): UniversalSurgicalFactRow[] {
  return facts.filter(isProductUsageFactValidated);
}

function productSpecificityScore(fact: UniversalSurgicalFactRow): number {
  const product = String(fact.product_mentioned ?? "").trim();
  const label = String(fact.normalized_label ?? "").trim();
  return Math.max(product.split(/\s+/).filter(Boolean).length, label.split(/\s+/).filter(Boolean).length);
}

/** Same case + repeated dictation can produce multiple capture runs — keep one fact per fingerprint. */
function crossCaptureFactFingerprint(fact: UniversalSurgicalFactRow): string {
  const instrumentTheme = factInstrumentAvailabilityThemeKey(fact);
  if (instrumentTheme) return instrumentTheme;

  const concept = String(fact.concept);
  const product = normalizedProductDedupeKey(fact.product_mentioned ?? "");
  if ((concept === "current_product" || concept === "competitor_product") && product) {
    return `${concept}|product:${product}`;
  }
  const evidence = normalizeFactFingerprintText(fact.evidence_text ?? "");
  if (evidence.length >= 20) {
    return `${concept}|ev:${evidence.slice(0, 220)}`;
  }
  const label = normalizeFactFingerprintText(fact.normalized_label ?? "");
  const person = normalizeFactFingerprintText(fact.person_mentioned ?? "");
  return `${concept}|lb:${label.slice(0, 140)}|p:${person}`;
}

export function dedupeFactsAcrossCaptures(facts: UniversalSurgicalFactRow[]): UniversalSurgicalFactRow[] {
  const byFingerprint = new Map<string, UniversalSurgicalFactRow>();
  const sorted = [...facts].sort((left, right) =>
    String(left.created_at ?? "").localeCompare(String(right.created_at ?? "")),
  );

  for (const fact of sorted) {
    const fingerprint = crossCaptureFactFingerprint(fact);
    const existing = byFingerprint.get(fingerprint);
    if (
      existing &&
      (fact.concept === "current_product" || fact.concept === "competitor_product") &&
      productSpecificityScore(existing) > productSpecificityScore(fact)
    ) {
      continue;
    }
    byFingerprint.set(fingerprint, fact);
  }

  return [...byFingerprint.values()];
}

function staffWorkflowFactScore(fact: UniversalSurgicalFactRow): number {
  if (!staffWorkflowFactIsDisplayable(fact)) return -1;
  const blob = `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`.toLowerCase();
  if (/communication.*strong|strong.*communication|circulat.*scrub/.test(blob)) return 4;
  if (/consistent team members?|worked well together/.test(blob)) return 3;
  if (/staff satisfaction|retention/.test(blob)) return 2;
  if (/coordinated|smooth|organized/.test(blob)) return 1;
  return 0;
}

function collapseDuplicateStaffWorkflowFacts(facts: UniversalSurgicalFactRow[]): UniversalSurgicalFactRow[] {
  const staffFacts = facts.filter((fact) => fact.concept === "staff_workflow");
  if (staffFacts.length <= 1) return facts;

  const best = [...staffFacts].sort((left, right) => staffWorkflowFactScore(right) - staffWorkflowFactScore(left))[0];
  if (!best) return facts;

  return facts.filter((fact) => fact.concept !== "staff_workflow" || fact.id === best.id);
}

function isCompositeProductFact(fact: UniversalSurgicalFactRow, allFacts: UniversalSurgicalFactRow[]): boolean {
  if (fact.concept !== "current_product" && fact.concept !== "competitor_product") return false;
  const product = fact.product_mentioned?.trim() || fact.normalized_label.replace(/^current product:\s*/i, "").trim();
  if (!/\s+and\s+/i.test(product)) return false;

  const parts = product
    .split(/\s+and\s+/i)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length >= 2);
  if (parts.length < 2) return false;

  const separateProducts = allFacts
    .filter((candidate) => candidate !== fact && candidate.concept === fact.concept)
    .map((candidate) => (candidate.product_mentioned ?? candidate.normalized_label).toLowerCase());

  return parts.every((part) => separateProducts.some((candidate) => candidate.includes(part)));
}

function quoteForThisObservationFact(fact: UniversalSurgicalFactRow, text: string): string | null {
  if (fact.concept === "current_product" || fact.concept === "competitor_product") return null;
  const quote = fact.evidence_text?.trim();
  if (!quote || quote === text) return null;
  if (quote.length > 180) return null;
  return quote;
}

/** Observation Case → This Observation */
export function adaptUniversalFactsToThisObservationItems(input: {
  caseRuns: UniversalFactExtractionRun[];
  caseId: string;
  hasCurrentNotes: boolean;
  activeOperationalNoteIds?: string[];
  providerName?: string | null;
}): ObservationRepListItem[] {
  if (!input.hasCurrentNotes) return [];

  const scopedRuns = filterCaseRunsForThisObservation({
    caseRuns: input.caseRuns,
    activeOperationalNoteIds: input.activeOperationalNoteIds,
  });

  const facts = sortFactsForThisObservation(
    collapseDuplicateStaffWorkflowFacts(
      filterProviderContactRoleFacts(
        dedupeFactsAcrossCaptures(
          flattenFacts(scopedRuns).filter(
            (fact) => String(fact.case_id ?? "") === String(input.caseId),
          ),
        ),
        input.providerName,
      ),
    ),
  );
  const seen = new Set<string>();
  const items: ObservationRepListItem[] = [];
  let staffWorkflowCount = 0;

  for (const fact of facts) {
    if (isUniversalFactNonDisplayMetaConcept(fact.concept)) continue;
    if (fact.concept === "next_action") continue;
    if (isProcedureContextOnlyFact(fact)) continue;
    if (!isProductUsageFactValidated(fact)) continue;
    if (isCompositeProductFact(fact, facts)) continue;
    const text = formatCurrentCaseFactLine(fact);
    if (!text || containsOntologyDisplayLabel(text)) continue;

    if (fact.concept === "staff_workflow") {
      if (staffWorkflowCount >= 1) continue;
      staffWorkflowCount += 1;
    }

    const key = dedupeKeyForThisObservationFact(fact, text);
    if (seen.has(key)) continue;
    seen.add(key);

    const textKey = text.trim().toLowerCase();
    if (seen.has(`text:${textKey}`)) continue;
    seen.add(`text:${textKey}`);

    const quote = quoteForThisObservationFact(fact, text);
    items.push({
      id: `uf-current-${fact.concept}-${items.length}`,
      text,
      evidenceText: fact.evidence_text ?? null,
      sourceNoteText: fact.evidence_text ?? null,
      extractedFactId: fact.id ?? fact.capture_id ?? null,
      concept: String(fact.concept ?? ""),
      sourceType: fact.source_type ?? null,
      productMentioned: fact.product_mentioned ?? null,
      personMentioned: fact.person_mentioned ?? null,
      ...(quote ? { quote } : {}),
    });
    if (items.length >= THIS_OBSERVATION_ITEM_CAP) break;
  }

  return items;
}

export type CurrentCaseUfCaptureSummary = {
  hasProduct: boolean;
  hasVisualization: boolean;
  hasOtherWorkflowIssue: boolean;
  hasPositiveStaff: boolean;
  hasStaffFriction: boolean;
  hasProviderFrustration: boolean;
};

/** Maps current-case UF facts to the same capture flags used by still-need reframing. */
export function summarizeCurrentCaseCapturesFromUfFacts(
  facts: UniversalSurgicalFactRow[],
): CurrentCaseUfCaptureSummary {
  const dedupedFacts = dedupeFactsAcrossCaptures(
    collapseDuplicateStaffWorkflowFacts(facts),
  );
  const summary: CurrentCaseUfCaptureSummary = {
    hasProduct: false,
    hasVisualization: false,
    hasOtherWorkflowIssue: false,
    hasPositiveStaff: false,
    hasStaffFriction: false,
    hasProviderFrustration: false,
  };

  for (const fact of dedupedFacts) {
    if (!isProductUsageFactValidated(fact)) continue;
    const concept = String(fact.concept);
    if (concept === "current_product" || concept === "competitor_product") {
      summary.hasProduct = true;
    } else if (concept === "visualization_or_access_issue") {
      summary.hasVisualization = true;
    } else if (
      concept === "workflow_or_timing_issue" ||
      concept === "inventory_availability_issue" ||
      concept === "placement_or_positioning_issue" ||
      concept === "product_performance_issue"
    ) {
      summary.hasOtherWorkflowIssue = true;
    } else if (concept === "staff_workflow") {
      if (isPositiveStaffEvidence(fact)) summary.hasPositiveStaff = true;
      const blob = `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`.toLowerCase();
      if (staffEvidenceShowsFriction(blob)) {
        summary.hasStaffFriction = true;
      }
    } else if (concept === "provider_sentiment") {
      const blob = `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`.toLowerCase();
      if (
        staffEvidenceShowsFriction(blob) ||
        (/dissatisf|angry|upset|complaint/.test(blob) && !/nobody appeared frustrated|didn't seem angry/i.test(blob))
      ) {
        summary.hasProviderFrustration = true;
      }
    }
  }

  return summary;
}

export function mergeCurrentCaseCaptureSummaries(
  ...summaries: Array<Partial<CurrentCaseUfCaptureSummary>>
): CurrentCaseUfCaptureSummary {
  return summaries.reduce<CurrentCaseUfCaptureSummary>(
    (merged, summary) => ({
      hasProduct: merged.hasProduct || Boolean(summary.hasProduct),
      hasVisualization: merged.hasVisualization || Boolean(summary.hasVisualization),
      hasOtherWorkflowIssue: merged.hasOtherWorkflowIssue || Boolean(summary.hasOtherWorkflowIssue),
      hasPositiveStaff: merged.hasPositiveStaff || Boolean(summary.hasPositiveStaff),
      hasStaffFriction: merged.hasStaffFriction || Boolean(summary.hasStaffFriction),
      hasProviderFrustration: merged.hasProviderFrustration || Boolean(summary.hasProviderFrustration),
    }),
    {
      hasProduct: false,
      hasVisualization: false,
      hasOtherWorkflowIssue: false,
      hasPositiveStaff: false,
      hasStaffFriction: false,
      hasProviderFrustration: false,
    },
  );
}

function flattenEligibleCaseFacts(
  runs: UniversalFactExtractionRun[],
  caseId: string,
): UniversalSurgicalFactRow[] {
  return flattenFacts(runs).filter((fact) => String(fact.case_id ?? "") === String(caseId));
}

export function currentCaseUfFactsFromReadModel(input: {
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  caseId: string;
  activeOperationalNoteIds?: string[];
  providerName?: string | null;
}): UniversalSurgicalFactRow[] {
  const scopedRuns = filterCaseRunsForThisObservation({
    caseRuns: input.universalFactsReadModel?.caseRuns ?? [],
    activeOperationalNoteIds: input.activeOperationalNoteIds,
  });
  return filterProviderContactRoleFacts(
    flattenEligibleCaseFacts(scopedRuns, input.caseId),
    input.providerName,
  );
}

function formatNextActionLine(fact: UniversalSurgicalFactRow): string | null {
  const label = stripInternalUfLabelPrefix(fact.normalized_label).trim();
  if (label && !/next step recommended/i.test(label) && /^reach out\b/i.test(label)) {
    return sanitizeRepFacingCopy(capitalizeFirst(label));
  }

  const evidence = fact.evidence_text?.trim() || label || "";
  if (!evidence || /next step recommended/i.test(evidence)) return null;
  const line = normalizeNextActionDisplayTitle(evidence);
  if (!line) return null;
  return sanitizeRepFacingCopy(line);
}

export function adaptUniversalFactsToFollowUpNextVisitItems(input: {
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  caseId: string;
  activeOperationalNoteIds?: string[];
  providerName?: string | null;
  limit?: number;
}): ObservationRepListItem[] {
  const facts = currentCaseUfFactsFromReadModel(input).filter((fact) => fact.concept === "next_action");
  const items: ObservationRepListItem[] = [];
  const seen = new Set<string>();

  for (const fact of facts) {
    const line = formatNextActionLine(fact);
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: `uf-next-action-${items.length}`,
      text: line,
      evidenceText: fact.evidence_text ?? null,
      sourceNoteText: fact.evidence_text ?? null,
      extractedFactId: fact.id ?? fact.capture_id ?? null,
      concept: String(fact.concept ?? ""),
      sourceType: fact.source_type ?? null,
      productMentioned: fact.product_mentioned ?? null,
      personMentioned: fact.person_mentioned ?? null,
    });
    if (items.length >= (input.limit ?? 3)) break;
  }

  return items;
}

export function adaptUniversalFactsToFollowUpNextVisitLines(input: {
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  caseId: string;
  activeOperationalNoteIds?: string[];
  providerName?: string | null;
  limit?: number;
}): string[] {
  return adaptUniversalFactsToFollowUpNextVisitItems(input).map((item) => item.text);
}

const BRIEFING_PRODUCT_CONCEPTS = ["current_product", "competitor_product"] as const;

const BRIEFING_WORKFLOW_CONCEPTS = [
  "visualization_or_access_issue",
  "workflow_or_timing_issue",
  "inventory_availability_issue",
  "placement_or_positioning_issue",
  "training_or_familiarity_issue",
  "sizing_or_fit_issue",
  "product_performance_issue",
] as const;

const BRIEFING_PAIN_CONCEPTS = ["provider_sentiment"] as const;

const BRIEFING_STAFF_POSITIVE_CONCEPTS = ["staff_workflow", "case_outcome"] as const;

function briefingPriorCountSuffix(completedCount: number): string {
  if (completedCount >= 3) return ` across ${completedCount} completed observations`;
  if (completedCount === 2) return " across 2 completed observations";
  if (completedCount === 1) return " in 1 completed observation";
  return "";
}

function appendBriefingPriorCount(base: string, completedCount: number): string {
  return `${base}${briefingPriorCountSuffix(completedCount)}`;
}

function pickStrongestEstablishedConcept(
  established: Map<string, number>,
  concepts: readonly string[],
): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const concept of concepts) {
    const count = established.get(concept) ?? 0;
    if (count > bestCount) {
      best = concept;
      bestCount = count;
    }
  }
  return best;
}

function isPositiveStaffFact(facts: UniversalSurgicalFactRow[]): boolean {
  const blob = facts
    .map((fact) => `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`)
    .join(" ")
    .toLowerCase();
  return /organized|coordinated|smooth|positive staff|worked smoothly|know what they were doing|routine|went fine|went smoothly/.test(
    blob,
  );
}

function isNegativeStaffFact(facts: UniversalSurgicalFactRow[]): boolean {
  const blob = facts
    .map((fact) => `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`)
    .join(" ")
    .toLowerCase();
  return /friction|complaint|workaround|burden|delay|confus|frustrat/.test(blob);
}

function formatBriefingProductLine(
  concept: string,
  facts: UniversalSurgicalFactRow[],
  completedCount: number,
): string {
  const product = facts.map((fact) => fact.product_mentioned?.trim()).find(Boolean);
  if (concept === "competitor_product") {
    const base = product
      ? `Competitor product ${product} has been seen in use`
      : "Competitor product use has been noted";
    return appendBriefingPriorCount(base, completedCount);
  }
  const base = product ? `${product} has been seen in use` : "Product use has been noted";
  return appendBriefingPriorCount(base, completedCount);
}

function formatBriefingWorkflowLine(
  concept: string,
  facts: UniversalSurgicalFactRow[],
  completedCount: number,
): string {
  if (concept === "visualization_or_access_issue") {
    return appendBriefingPriorCount(
      "Extra visualization or evaluation time was noted during the case",
      completedCount,
    );
  }
  if (concept === "workflow_or_timing_issue") {
    return appendBriefingPriorCount("Case flow slowed due to workflow delays", completedCount);
  }
  if (concept === "inventory_availability_issue") {
    return appendBriefingPriorCount(
      "Staff had to verify products were stocked before the case could proceed",
      completedCount,
    );
  }

  const sample = conceptSampleLabel(facts);
  if (sample) {
    const display = sample.replace(/\s+observed$/i, "").trim();
    if (display) {
      const capitalized = display.charAt(0).toUpperCase() + display.slice(1);
      return appendBriefingPriorCount(`${capitalized} has been noted`, completedCount);
    }
  }

  const fallback = sanitizeRepFacingCopy(formatDebriefPrepareConceptRepLabel(concept));
  return appendBriefingPriorCount(`${fallback} has been noted`, completedCount);
}

function formatBriefingPainLine(
  concept: string,
  facts: UniversalSurgicalFactRow[],
  completedCount: number,
): string {
  if (concept === "provider_sentiment") {
    return appendBriefingPriorCount("Provider expressed frustration during the case", completedCount);
  }
  if (concept === "product_performance_issue") {
    return appendBriefingPriorCount("Product did not perform as expected during the case", completedCount);
  }

  const sample = conceptSampleLabel(facts);
  if (sample) {
    const display = sample.replace(/\s+observed$/i, "").trim();
    const capitalized = display.charAt(0).toUpperCase() + display.slice(1);
    return appendBriefingPriorCount(`${capitalized} has been noted`, completedCount);
  }

  return appendBriefingPriorCount(
    `${sanitizeRepFacingCopy(formatDebriefPrepareConceptRepLabel(concept))} has been noted`,
    completedCount,
  );
}

function formatBriefingStaffPositiveLine(
  concept: string,
  facts: UniversalSurgicalFactRow[],
  completedCount: number,
): string {
  const sample = conceptSampleLabel(facts);
  if (concept === "staff_workflow" && sample) {
    const base = staffEfficiencyRepLabel(sample);
    return appendBriefingPriorCount(base, completedCount);
  }
  if (concept === "case_outcome") {
    return appendBriefingPriorCount("Case went smoothly", completedCount);
  }
  return appendBriefingPriorCount("Staff appeared organized", completedCount);
}

/** Briefing → Known So Far (prior completed cases only; curated; max 4 lines). */
export function adaptUniversalFactsToBriefingKnownSoFarLines(input: {
  programRuns: UniversalFactExtractionRun[];
  priorCompletedCaseIds: string[];
  briefingKind: CaseBriefingKind;
  programCompletedCount?: number;
}): string[] {
  if (input.briefingKind === "baseline" || input.briefingKind === "support") {
    return [];
  }

  const priorCaseIdSet = new Set(input.priorCompletedCaseIds.map(String));
  if (priorCaseIdSet.size === 0) return [];

  const priorFacts = flattenFacts(input.programRuns).filter(
    (fact) => fact.case_id && priorCaseIdSet.has(String(fact.case_id)),
  );
  if (priorFacts.length === 0) return [];

  const established = establishedConceptCounts(priorFacts, priorCaseIdSet);
  if (established.size === 0) return [];

  const known: string[] = [];
  const seen = new Set<string>();
  const push = (line: string | null, conceptKey?: string) => {
    if (!line || BRIEFING_ENGINE_TERM_PATTERN.test(line)) return;
    const key = (conceptKey ?? line).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    known.push(line);
  };

  const productConcept = pickStrongestEstablishedConcept(established, BRIEFING_PRODUCT_CONCEPTS);
  if (productConcept) {
    const facts = filterValidatedProductUsageFacts(
      priorFacts.filter((fact) => String(fact.concept) === productConcept),
    );
    push(
      formatBriefingProductLine(productConcept, facts, established.get(productConcept) ?? 0),
      `product:${productConcept}`,
    );
  }

  const workflowConcept =
    established.has("visualization_or_access_issue") && established.get("visualization_or_access_issue")
      ? "visualization_or_access_issue"
      : pickStrongestEstablishedConcept(
          established,
          BRIEFING_WORKFLOW_CONCEPTS.filter((concept) => concept !== "product_performance_issue"),
        );
  if (workflowConcept) {
    const facts = priorFacts.filter((fact) => String(fact.concept) === workflowConcept);
    push(
      formatBriefingWorkflowLine(workflowConcept, facts, established.get(workflowConcept) ?? 0),
      `workflow:${workflowConcept}`,
    );
  }

  const painConcept =
    pickStrongestEstablishedConcept(established, BRIEFING_PAIN_CONCEPTS) ??
    (established.has("product_performance_issue") ? "product_performance_issue" : null);
  if (painConcept) {
    const facts = priorFacts.filter((fact) => String(fact.concept) === painConcept);
    push(
      formatBriefingPainLine(painConcept, facts, established.get(painConcept) ?? 0),
      painConcept,
    );
  }

  for (const concept of BRIEFING_STAFF_POSITIVE_CONCEPTS) {
    if (known.length >= 4) break;
    const count = established.get(concept) ?? 0;
    if (count <= 0) continue;
    const facts = priorFacts.filter((fact) => String(fact.concept) === concept);
    if (!isPositiveStaffFact(facts) || isNegativeStaffFact(facts)) continue;
    push(
      formatBriefingStaffPositiveLine(concept, facts, count),
      `staff-positive:${concept}`,
    );
    break;
  }

  return known.slice(0, 4);
}

export function priorCompletedObservationCaseIds(input: {
  caseRow: Record<string, unknown>;
  priorCases?: Array<Record<string, unknown>>;
}): string[] {
  const currentCaseId = String(input.caseRow.id ?? "").trim();
  return completedObservationCaseIds(input).filter((caseId) => caseId !== currentCaseId);
}

/** Observation Case → What We Know */
export function adaptUniversalFactsToWhatWeKnowLines(input: {
  programRuns: UniversalFactExtractionRun[];
  completedCaseIds: string[];
  programCompletedCount?: number;
  countStyle?: RepFindingCountStyle;
  providerName?: string | null;
}): string[] {
  const facts = filterProviderContactRoleFacts(
    flattenFacts(input.programRuns),
    input.providerName,
  );
  const completedCaseIdSet = new Set(input.completedCaseIds.map(String));
  return observationKnowledgeRollupLines({
    facts,
    completedCaseIdSet,
    programCompletedCount: input.programCompletedCount,
    countStyle: input.countStyle,
  });
}

/** Provider Intelligence → Signals Captured (+ Emerging Signals case chips via rollup). */
export function adaptUniversalFactsToCapturedSignals(input: {
  providerRuns: UniversalFactExtractionRun[];
  completedCaseIds: string[];
  programCompletedCount: number;
  currentCaseHasCapturedNotes: boolean;
  primaryCaseComplete: boolean;
  thisObservationLines: string[];
  providerName?: string | null;
}): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  const push = (line: string) => {
    const key = line.toLowerCase().trim();
    if (!line || seen.has(key)) return;
    seen.add(key);
    lines.push(line);
  };

  if (input.currentCaseHasCapturedNotes) {
    for (const line of input.thisObservationLines) {
      push(line);
    }
  }

  if (input.programCompletedCount <= 0) {
    return lines.slice(0, 6);
  }

  const establishedLines = adaptUniversalFactsToWhatWeKnowLines({
    programRuns: input.providerRuns,
    completedCaseIds: input.completedCaseIds,
    programCompletedCount: input.programCompletedCount,
    providerName: input.providerName,
  });

  for (const line of establishedLines) {
    push(line);
  }

  return lines.slice(0, 10);
}

export function resolveReadModelSection<T>(
  adapted: T[],
  fallback: () => T[],
): T[] {
  return adapted.length > 0 ? adapted : fallback();
}

export function completedObservationCaseIds(input: {
  caseRow: Record<string, unknown>;
  priorCases?: Array<Record<string, unknown>>;
  programCases?: Array<Record<string, unknown>>;
}): string[] {
  const rows = input.programCases ?? [input.caseRow, ...(input.priorCases ?? [])];
  return rows
    .filter((row) => isObservationCaseComplete(row))
    .map((row) => String(row.id ?? "").trim())
    .filter(Boolean);
}
