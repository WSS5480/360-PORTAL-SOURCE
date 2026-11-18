/**
 * Deterministic validation, canonicalization, and dedupe for GPT Universal Facts output.
 * Rules-only post-processing — no model calls.
 */

import { quoteIsAnchoredInDictation } from "@/lib/surgical-sales/debriefDictationEvidence";
import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { titleCaseProduct } from "@/lib/surgical-sales/sharedIntelligence/extractProductMention";
import { isValidProductName } from "@/lib/surgical-sales/sharedIntelligence/productCatalog";
import { dedupeUniversalFacts } from "@/lib/surgical-sales/sharedIntelligence/dedupeIntelligenceSignals";
import { shouldRejectAssignedProviderContactRole } from "@/lib/surgical-sales/sharedIntelligence/providerContactRolePolicy";
import { normalizeSchedulerPersonName } from "@/lib/surgical-sales/sharedIntelligence/schedulerContactExtractionPolicy";
import { defaultAssertionForDeclaredSource } from "@/lib/surgical-sales/universalExtractor/assertionModel";
import {
  evidenceAppearsInNote,
  fragmentIsNegatedAbsence,
  fragmentIsUncertain,
  scoreConfidence,
} from "@/lib/surgical-sales/universalExtractor/evidenceGrounding";
import { resolveConceptForGptRow } from "@/lib/surgical-sales/universalExtractor/gptUniversalFactExtractionSchema";
import type { GptUniversalFactRow } from "@/lib/surgical-sales/universalExtractor/gptUniversalFactExtractionSchema";
import type {
  UniversalDeclaredSourceType,
  UniversalSurgicalFact,
} from "@/lib/surgical-sales/universalExtractor/types";

export type GptUniversalFactRejection = {
  row: GptUniversalFactRow;
  reason: string;
};

export type ValidateGptUniversalFactsResult = {
  facts: UniversalSurgicalFact[];
  suppressed_facts: UniversalSurgicalFact[];
  rejections: GptUniversalFactRejection[];
};

function cleanEvidence(raw: string): string {
  return raw.trim().replace(/^["'""]+|["'""]+$/g, "").replace(/\s+/g, " ").trim();
}

function roleLabelFromEvidence(text: string): string {
  if (/\bor\s+manager\b/i.test(text)) return "OR Manager";
  if (/\boffice manager\b/i.test(text)) return "Office Manager";
  if (/\bor coordinator\b|\bor scheduling coordinator\b/i.test(text)) return "OR Coordinator";
  if (/\bcredentialing\s+(?:contact|coordinator)\b/i.test(text)) return "Credentialing Contact";
  if (/\bscrub\s+(?:tech|technician|nurse)\b/i.test(text)) return "Scrub Tech";
  if (/\bcirculat(?:or|ing nurse)\b/i.test(text)) return "Circulator";
  return "Key Contact";
}

function isRoleOnlyPersonName(name: string): boolean {
  return /\b(?:or manager|office manager|materials management|coordinator|scheduler|staff|team)\b/i.test(name.trim());
}

function buildContactLabel(row: GptUniversalFactRow): string {
  const rawName = String(row.person_name ?? "").trim();
  const name = isRoleOnlyPersonName(rawName) ? "" : normalizeSchedulerPersonName(rawName);
  const role = String(row.role ?? "").trim() || roleLabelFromEvidence(`${row.normalized_label} ${row.evidence_text}`);
  if (name) return `${name} · ${role}`;
  return role || row.normalized_label.trim();
}

function buildProcedureLabel(row: GptUniversalFactRow): string {
  const procedure = String(row.procedure_name ?? "").trim();
  if (row.category === "clinical_growth_signal") {
    const focus = procedure || row.normalized_label.replace(/\s*·.*$/, "").trim();
    if (/increasing|volume|growing|more common/i.test(row.normalized_label)) {
      return row.normalized_label.trim();
    }
    return focus ? `${focus} · Increasing procedure volume` : row.normalized_label.trim();
  }
  if (procedure) return procedure;
  return row.normalized_label.trim();
}

function prefixLabelForGptCategory(row: GptUniversalFactRow, label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;

  switch (row.category) {
    case "operational_priority":
      return /^workflow priority:/i.test(trimmed) ? trimmed : `Workflow priority: ${trimmed}`;
    case "evaluation_sequencing":
      return /^commercial disposition:/i.test(trimmed) ? trimmed : `Commercial disposition: ${trimmed}`;
    case "relationship_signal":
      return /^relationship:/i.test(trimmed) ? trimmed : `Relationship: ${trimmed}`;
    case "commercial_disposition":
      if (/^relationship:/i.test(trimmed)) return trimmed;
      return /^commercial disposition:/i.test(trimmed) ? trimmed : `Commercial disposition: ${trimmed}`;
    case "operational_concern":
      return /^operational concern:/i.test(trimmed) ? trimmed : `Operational concern: ${trimmed}`;
    case "staff_influence":
    case "staff_workflow":
      return /^staff workflow:/i.test(trimmed) ? trimmed : `Staff workflow: ${trimmed}`;
    case "technology_modality": {
      // Prefer value-first labels ("Robotic · Technique / Modality") so review
      // normalization never turns category-first strings into "/ : Robotic".
      const modality =
        trimmed.match(/\b(robotic|laparoscopic|open)\b/i)?.[1] ??
        trimmed.replace(/^technique\s*\/\s*modality\s*:?\s*/i, "").trim();
      if (modality && /^(robotic|laparoscopic|open)$/i.test(modality)) {
        const token = modality.charAt(0).toUpperCase() + modality.slice(1).toLowerCase();
        return `${token} · Technique / Modality`;
      }
      if (/^[A-Za-z].*·\s*Technique\s*\/\s*Modality$/i.test(trimmed)) return trimmed;
      return trimmed.replace(/^technique\s*\/\s*modality\s*:?\s*/i, "").trim()
        ? `${trimmed.replace(/^technique\s*\/\s*modality\s*:?\s*/i, "").trim()} · Technique / Modality`
        : "Technique / Modality preference noted";
    }
    default:
      return trimmed;
  }
}

function canonicalNormalizedLabel(row: GptUniversalFactRow, concept: UniversalSurgicalFact["concept"]): string {
  if (concept === "contact_role") return buildContactLabel(row);
  if (concept === "current_product" || concept === "competitor_product") {
    const product = titleCaseProduct(String(row.product_name ?? row.normalized_label).trim());
    return concept === "competitor_product" ? `Competitor product: ${product}` : product;
  }
  if (
    concept === "procedure_volume_trend" ||
    concept === "procedure_focus" ||
    concept === "technology_preference"
  ) {
    return buildProcedureLabel(row);
  }
  return prefixLabelForGptCategory(row, row.normalized_label.trim());
}

function gptRowToUniversalFact(input: {
  row: GptUniversalFactRow;
  transcript: string;
  declared_source_type: UniversalDeclaredSourceType;
  suppressed: boolean;
  rejectionReason?: string;
}): UniversalSurgicalFact | null {
  const evidence = cleanEvidence(input.row.evidence_text);
  if (!evidence) return null;

  const concept = resolveConceptForGptRow(input.row);
  const normalized_label = canonicalNormalizedLabel(input.row, concept);
  const negated = fragmentIsNegatedAbsence(evidence);
  const uncertain = fragmentIsUncertain(evidence);
  const assertion_level = defaultAssertionForDeclaredSource(input.declared_source_type);

  const fact: UniversalSurgicalFact = {
    concept,
    normalized_label,
    assertion_level,
    source_type: input.declared_source_type,
    evidence_text: evidence,
    confidence: scoreConfidence(evidence, uncertain, input.row.confidence === "high"),
    negated,
    uncertain,
    ...(rowProduct(input.row, concept) ? { product_mentioned: rowProduct(input.row, concept) } : {}),
    ...(rowPerson(input.row, concept) ? { person_mentioned: rowPerson(input.row, concept) } : {}),
    ...(input.rejectionReason || input.row.rejection_reason
      ? {
          notes: [input.rejectionReason, input.row.rejection_reason].filter(Boolean).join(" — "),
        }
      : {}),
  };

  if (input.suppressed) {
    return { ...fact, notes: fact.notes ?? "Suppressed by validation" };
  }

  return fact;
}

function rowProduct(row: GptUniversalFactRow, concept: UniversalSurgicalFact["concept"]): string | undefined {
  if (concept !== "current_product" && concept !== "competitor_product" && concept !== "product_interest") {
    return undefined;
  }
  const product = String(row.product_name ?? "").trim();
  return product ? titleCaseProduct(product) : undefined;
}

function rowPerson(row: GptUniversalFactRow, concept: UniversalSurgicalFact["concept"]): string | undefined {
  if (concept !== "contact_role") return undefined;
  const rawName = String(row.person_name ?? "").trim();
  if (isRoleOnlyPersonName(rawName)) return undefined;
  const name = normalizeSchedulerPersonName(rawName);
  return name || undefined;
}

function evidenceIsGrounded(evidence: string, transcript: string): boolean {
  if (evidenceAppearsInNote(evidence, transcript)) return true;
  return quoteIsAnchoredInDictation(evidence, transcript);
}

function evidenceDirectlyStatesGptProductUsed(input: {
  evidence: string;
  productName: string;
}): boolean {
  const product = input.productName
    .trim()
    .replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
    .replace(/\s+/g, String.raw`\s+`);
  if (!product) return false;

  const directUsagePatterns = [
    new RegExp(String.raw`\b(?:used|using|uses|trialed|trialled|implanted|placed|deployed|opened)\s+(?:the\s+)?${product}\b`, "i"),
    new RegExp(String.raw`\b(?:used|using|uses|trialed|trialled|implanted|placed|deployed|opened)\b[^.!?]{0,80}\b${product}\b`, "i"),
    new RegExp(String.raw`\b${product}\b[^.!?]{0,48}\b(?:was|were|is|in\s+use|used|trialed|trialled|implanted|placed|deployed)\b`, "i"),
    new RegExp(String.raw`\b${product}\b[^.!?]{0,48}\b(?:in|during|for|on)\s+(?:the\s+)?(?:case|procedure|surgery)\b`, "i"),
  ];

  return directUsagePatterns.some((pattern) => pattern.test(input.evidence));
}

function evidenceDisqualifiesProductUsage(evidence: string): boolean {
  return /\b(?:asked|question|questions|interested|interest|curious|wanted more information|future|future evaluations?|evaluation|evaluate|trial\s+in\s+a\s+future|compare|compared|compares|comparison|works?\s+with|training required|training.*staff|commitments?|commitment|no commitments?|no formal evaluation|wasn't evaluating|not evaluating)\b/i.test(
    evidence,
  );
}

export function validateAndNormalizeGptUniversalFacts(input: {
  rows: GptUniversalFactRow[];
  transcript: string;
  declared_source_type: UniversalDeclaredSourceType;
  providerName?: string | null;
}): ValidateGptUniversalFactsResult {
  const transcript = input.transcript.trim();
  const facts: UniversalSurgicalFact[] = [];
  const suppressed_facts: UniversalSurgicalFact[] = [];
  const rejections: GptUniversalFactRejection[] = [];

  for (const row of input.rows) {
    const evidence = cleanEvidence(row.evidence_text);

    if (!row.should_persist) {
      rejections.push({
        row,
        reason: row.rejection_reason?.trim() || "Model marked should_persist=false",
      });
      const suppressed = gptRowToUniversalFact({
        row,
        transcript,
        declared_source_type: input.declared_source_type,
        suppressed: true,
        rejectionReason: row.rejection_reason ?? "should_persist=false",
      });
      if (suppressed) suppressed_facts.push(suppressed);
      continue;
    }

    if (!evidence || evidence.length < 8) {
      rejections.push({ row, reason: "Missing or too-short evidence_text" });
      continue;
    }

    if (!evidenceIsGrounded(evidence, transcript)) {
      rejections.push({ row, reason: "Evidence not anchored in transcript" });
      const suppressed = gptRowToUniversalFact({
        row,
        transcript,
        declared_source_type: input.declared_source_type,
        suppressed: true,
        rejectionReason: "Evidence not anchored in transcript",
      });
      if (suppressed) suppressed_facts.push(suppressed);
      continue;
    }

    if (fragmentIsNegatedAbsence(evidence)) {
      rejections.push({ row, reason: "Negated absence statement" });
      const suppressed = gptRowToUniversalFact({
        row,
        transcript,
        declared_source_type: input.declared_source_type,
        suppressed: true,
        rejectionReason: "Negated absence statement",
      });
      if (suppressed) suppressed_facts.push({ ...suppressed, negated: true });
      continue;
    }

    if (row.category === "scheduler_contact") {
      const rawName = String(row.person_name ?? "").trim();
      const normalizedName = isRoleOnlyPersonName(rawName)
        ? ""
        : normalizeSchedulerPersonName(rawName);
      // Validate after suffix stripping so "Lettuce Today" → "Lettuce" can still be
      // rejected as the assigned provider, and temporal junk alone is implausible.
      if (
        !isRoleOnlyPersonName(rawName) &&
        !isPlausiblePersonName(normalizedName || rawName)
      ) {
        rejections.push({ row, reason: "scheduler_contact person_name is not a plausible person name" });
        const suppressed = gptRowToUniversalFact({
          row,
          transcript,
          declared_source_type: input.declared_source_type,
          suppressed: true,
          rejectionReason: "Implausible scheduler contact name",
        });
        if (suppressed) suppressed_facts.push(suppressed);
        continue;
      }
      const name = isRoleOnlyPersonName(rawName)
        ? roleLabelFromEvidence(`${row.normalized_label} ${row.evidence_text}`)
        : normalizedName;
      if (!name) {
        rejections.push({ row, reason: "scheduler_contact requires person_name" });
        continue;
      }
    }

    if (row.category === "product_interest") {
      const productName = String(row.product_name ?? "").trim();
      if (
        productName &&
        (evidenceDisqualifiesProductUsage(evidence) ||
          evidenceDirectlyStatesGptProductUsed({ evidence, productName }))
      ) {
        rejections.push({ row, reason: "product_interest cannot attach to current/incumbent product usage evidence" });
        const suppressed = gptRowToUniversalFact({
          row,
          transcript,
          declared_source_type: input.declared_source_type,
          suppressed: true,
          rejectionReason: "Product interest misclassified from current usage",
        });
        if (suppressed) suppressed_facts.push(suppressed);
        continue;
      }
    }

    if (
      (row.category === "product_usage" || row.category === "competitor_usage") &&
      !String(row.product_name ?? "").trim()
    ) {
      rejections.push({ row, reason: "Product fact requires product_name" });
      continue;
    }

    if (
      (row.category === "product_usage" || row.category === "competitor_usage") &&
      !isValidProductName(String(row.product_name ?? "").trim())
    ) {
      rejections.push({ row, reason: "Generic equipment descriptor — not a product/vendor name" });
      continue;
    }

    if (row.category === "product_usage" || row.category === "competitor_usage") {
      const productName = String(row.product_name ?? "").trim();
      if (
        evidenceDisqualifiesProductUsage(evidence) ||
        !evidenceDirectlyStatesGptProductUsed({ evidence, productName })
      ) {
        rejections.push({ row, reason: "Product usage requires direct observed use evidence" });
        const suppressed = gptRowToUniversalFact({
          row,
          transcript,
          declared_source_type: input.declared_source_type,
          suppressed: true,
          rejectionReason: "Product usage requires direct observed use evidence",
        });
        if (suppressed) suppressed_facts.push(suppressed);
        continue;
      }
    }

    if (
      row.category === "competitor_usage" &&
      /\balternative solutions?\b/i.test(`${row.normalized_label} ${row.evidence_text}`) &&
      !/\b(?:used|implant|product|screw|plate|substitut|switch(?:ed|ing)?)\b/i.test(row.evidence_text)
    ) {
      rejections.push({ row, reason: "Commercial alternative solutions — not competitor product usage" });
      continue;
    }

    const fact = gptRowToUniversalFact({
      row,
      transcript,
      declared_source_type: input.declared_source_type,
      suppressed: false,
    });
    if (!fact || !fact.normalized_label.trim()) continue;

    if (
      shouldRejectAssignedProviderContactRole({
        concept: fact.concept,
        person_mentioned: fact.person_mentioned,
        normalized_label: fact.normalized_label,
        evidence_text: fact.evidence_text,
        providerName: input.providerName,
      })
    ) {
      rejections.push({ row, reason: "Assigned provider must not be stored as contact_role" });
      const suppressed = gptRowToUniversalFact({
        row,
        transcript,
        declared_source_type: input.declared_source_type,
        suppressed: true,
        rejectionReason: "Assigned provider contact_role suppressed",
      });
      if (suppressed) suppressed_facts.push(suppressed);
      continue;
    }

    facts.push(fact);
  }

  return {
    facts: dedupeUniversalFacts(facts),
    suppressed_facts: dedupeUniversalFacts(suppressed_facts),
    rejections,
  };
}
