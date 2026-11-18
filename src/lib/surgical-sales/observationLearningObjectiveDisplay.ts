/**
 * Rep-facing display mapping for observation learning objectives.
 * Translates internal ontology / gap topics into natural language for UI only.
 * Does not modify extraction, categories, evidence, confidence, or prioritization.
 */

import {
  isOntologyDisplayLabel,
  translateFindingLabelToRepLanguage,
} from "@/lib/surgical-sales/observationIntelligenceDisplayLabels";

/** Normalized ontology keys → rep-facing topic phrases for learning objectives. */
const LEARNING_OBJECTIVE_TOPIC_MAP: Record<string, string> = {
  uncertainty_stocked_products: "product availability issues",
  uncertainty_stocked_product: "product availability issues",
  stocked_products: "product availability issues",
  product_availability: "product availability verification",
  product_availability_verification: "product availability verification",
  workflow_burden: "workflow delays",
  workflow_delay: "workflow delays",
  workflow_delays: "workflow delays",
  staff_workflow_familiarity: "staff familiarity with the workflow",
  staff_familiarity: "staff familiarity with the workflow",
  provider_clinical_frustration: "provider frustration during procedures",
  provider_frustration: "provider frustration during procedures",
  clinical_frustration: "provider frustration during procedures",
  visualization_fixation_workflow: "extra visualization time before fixation",
  visualization_fixation: "extra visualization time before fixation",
  visualization_before_fixation: "extra visualization time before fixation",
  staff_friction: "staff workflow friction",
  staff_workflow_friction: "staff workflow friction",
  product_fit_opportunity: "product openings",
  product_fit: "product openings",
};

const ONTOLOGY_TOPIC_PATTERN =
  /\b(uncertainty|staff burden|staff workflow|provider concern|clinical frustration|stocked products|workflow burden)\b|_/i;

export function normalizeLearningObjectiveTopicKey(topic: string): string {
  return topic
    .trim()
    .toLowerCase()
    .replace(/[^\w\s/]+/g, " ")
    .replace(/[/\s]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function lookupMappedTopic(key: string): string | null {
  if (LEARNING_OBJECTIVE_TOPIC_MAP[key]) {
    return LEARNING_OBJECTIVE_TOPIC_MAP[key];
  }

  if (key.startsWith("uncertainty_")) {
    const subKey = key.slice("uncertainty_".length);
    if (LEARNING_OBJECTIVE_TOPIC_MAP[`uncertainty_${subKey}`]) {
      return LEARNING_OBJECTIVE_TOPIC_MAP[`uncertainty_${subKey}`];
    }
    if (/stock|product|avail|suppl/.test(subKey)) {
      return "product availability issues";
    }
  }

  if (/stocked_product|product_avail|verify_product/.test(key)) {
    return "product availability issues";
  }

  if (/workflow_burden|workflow_delay|^delay$/.test(key)) {
    return "workflow delays";
  }

  if (/staff.*familiar|workflow_familiar/.test(key)) {
    return "staff familiarity with the workflow";
  }

  if (/provider.*frustr|clinical_frustr/.test(key)) {
    return "provider frustration during procedures";
  }

  if (/visuali.*fixation|fixation.*visuali/.test(key)) {
    return "extra visualization time before fixation";
  }

  return null;
}

function inferLabelForTopic(topic: string): string {
  const trimmed = topic.trim();
  if (!trimmed) return trimmed;

  const withOntologyPrefix = (() => {
    const key = normalizeLearningObjectiveTopicKey(trimmed);
    if (/uncertainty|stock|avail|suppl|verify/.test(key)) {
      return trimmed.match(/^uncertainty/i) ? trimmed : `Uncertainty ${trimmed}`;
    }
    if (/staff.*familiar|familiarity/.test(key)) {
      return trimmed.match(/^staff workflow/i) ? trimmed : `Staff workflow: ${trimmed}`;
    }
    if (/provider|clinical.*frustr|frustration/.test(key)) {
      return trimmed.match(/^provider concern/i) ? trimmed : `Provider concern: ${trimmed}`;
    }
    if (/workflow|burden|delay/.test(key)) {
      return trimmed.match(/^staff burden/i) ? trimmed : `Staff burden: ${trimmed}`;
    }
    return trimmed;
  })();

  const translated = translateFindingLabelToRepLanguage(withOntologyPrefix, {
    mode: "established_pattern",
  });

  if (translated && translated !== trimmed && !isOntologyDisplayLabel(translated) && !ONTOLOGY_TOPIC_PATTERN.test(translated)) {
    return translated;
  }

  return trimmed;
}

/** Map a raw engine gap / repeat-evidence topic to rep-facing language. */
export function translateLearningObjectiveTopic(topic: string): string {
  const trimmed = topic.trim();
  if (!trimmed) return trimmed;

  const key = normalizeLearningObjectiveTopicKey(trimmed);
  const mapped = lookupMappedTopic(key);
  if (mapped) return mapped;

  const fromLabel = inferLabelForTopic(trimmed);
  const fromLabelKey = normalizeLearningObjectiveTopicKey(fromLabel);
  const remapped = lookupMappedTopic(fromLabelKey);
  if (remapped) return remapped;

  if (!ONTOLOGY_TOPIC_PATTERN.test(fromLabel) && !isOntologyDisplayLabel(fromLabel)) {
    return fromLabel.toLowerCase();
  }

  if (/product|stock|avail|suppl|verify/.test(key)) {
    return "product availability issues";
  }
  if (/workflow|delay|burden/.test(key)) {
    return "workflow delays";
  }
  if (/provider|frustr|clinical/.test(key)) {
    return "provider frustration during procedures";
  }
  if (/staff|familiar/.test(key)) {
    return "staff familiarity with the workflow";
  }

  return "this observation pattern";
}

function consistencyVerb(translatedTopic: string): "occur" | "happens" {
  return /\b(issues|delays|frustrations|problems|concerns|openings|verification|friction)\b/i.test(
    translatedTopic,
  )
    ? "occur"
    : "happens";
}

/** Full rep-facing line for repeat-evidence briefing objectives. */
export function formatRepeatEvidenceConsistencyObjective(rawTopic: string): string {
  const topic = translateLearningObjectiveTopic(rawTopic);
  const key = normalizeLearningObjectiveTopicKey(rawTopic);

  if (/product availability/i.test(topic)) {
    return "Watch whether staff still need to verify product availability before cases start";
  }
  if (/workflow delay/i.test(topic) || /workflow_burden|workflow_delay/.test(key)) {
    return "Watch whether workflow delays keep slowing cases";
  }
  if (/visualization|fixation/.test(topic + key)) {
    return "Determine whether extra visualization time before fixation happens consistently across cases";
  }
  if (/provider frustration/i.test(topic)) {
    return "Watch whether provider frustration shows up again during cases";
  }
  if (/staff familiarity/i.test(topic)) {
    return "Determine whether staff familiarity with the workflow holds across cases";
  }

  const verb = consistencyVerb(topic);
  return `Determine whether ${topic} ${verb} consistently across cases`;
}

/** Rep-facing line when a supplemental gap asks for cross-case repeat confirmation. */
export function formatRepeatEvidenceCrossCaseObjective(rawTopic: string): string {
  const topic = translateLearningObjectiveTopic(rawTopic);
  const verb = /\b(issues|delays|frustrations|openings|problems|concerns)\b/i.test(topic)
    ? "keep"
    : "keeps";
  return `Watch whether ${topic} ${verb} showing up across cases`;
}

/** Guard for tests — true when copy still exposes raw ontology topic tokens. */
export function containsOntologyLearningObjectiveLabel(text: string): boolean {
  return (
    /\buncertainty[_\s]+stocked[_\s]+products\b/i.test(text) ||
    /\bstaff burden:|staff workflow:|provider concern:/i.test(text) ||
    /\bworkflow_burden\b/i.test(text) ||
    /\bprovider_clinical_frustration\b/i.test(text) ||
    isOntologyDisplayLabel(text)
  );
}
