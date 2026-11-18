/**
 * TEST-ONLY stand-in for OpenAI debrief fact extraction in regression tests.
 * Production uses runOpenAiDebriefFactExtraction — never import this outside tests/regression runner.
 */

import { debriefExplicitProductFitConnection } from "@/lib/surgical-sales/debriefIntelligenceCategories";
import { quoteIsAnchoredInDictation } from "@/lib/surgical-sales/debriefDictationEvidence";
import { extractPreservedNamedEntities } from "@/lib/surgical-sales/namedEntityPreservation";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";

const PLATFORM_NAMES_RE =
  /\b(?:intellicentrics|symplr|reptrax|vendormate|symplr|green\s*security|ghx)\b/i;

const UNCERTAINTY_RE =
  /\b(?:could be wrong|might be wrong|not sure|unsure|wasn'?t\s+sure|was not sure|don't know|do not know|unclear|unknown|maybe|probably|possibly|think (?:he|she|they) said|whether\s+that)\b/i;

import { extractNormalizedClinicalIntelligenceFromSentence } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { supplementAtomicFactsWithProductIntelligence } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductIntelligenceExtraction";
export function buildRegressionAtomicFactsFromDictation(dictation: string): DebriefAtomicFact[] {
  const text = dictation.trim();
  if (!text) return [];

  const facts: DebriefAtomicFact[] = [];
  const seen = new Set<string>();
  const add = (fact: DebriefAtomicFact) => {
    const key = `${fact.fact_type}|${fact.entity}|${fact.attribute}|${fact.value}|${fact.evidence}`.toLowerCase();
    if (seen.has(key)) return;
    if (!quoteIsAnchoredInDictation(fact.evidence.replace(/^["']|["']$/g, ""), text)) return;
    seen.add(key);
    facts.push(fact);
  };

  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 12);
  let lastPerson = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    const names = extractPreservedNamedEntities(trimmed).map((e) => e.name);
    const person = names[0] ?? "";
    if (person) lastPerson = person;

    if (/\bobserv/i.test(trimmed)) {
      const negatedApproval = /\b(?:no|not)\b[^.]{0,40}\b(?:approved|cleared)\b/i.test(trimmed);
      if (/\b(?:approved|cleared|permission|can observe)\b/i.test(trimmed) && !negatedApproval) {
        add({
          fact_type: "observation_access",
          entity: "",
          attribute: "status",
          value: "approved",
          confidence: "high",
          evidence: trimmed,
        });
      } else if (
        /\b(?:not opposed|wasn'?t opposed|wasn'?t denied|seems possible|open to|usually not a problem|not a problem|no objections?|willing to discuss|(?:generally|usually|typically) possible|should be possible)\b/i.test(
          trimmed,
        )
      ) {
        add({
          fact_type: "observation_access",
          entity: "",
          attribute: "status",
          value: "interested",
          confidence: "medium",
          evidence: trimmed,
        });
      } else if (/\b(?:denied|not allowed|won't allow)\b/i.test(trimmed)) {
        add({
          fact_type: "observation_access",
          entity: "",
          attribute: "status",
          value: "denied",
          confidence: "high",
          evidence: trimmed,
        });
      } else {
        add({
          fact_type: "observation_access",
          entity: "",
          attribute: "status",
          value: "mentioned",
          confidence: "medium",
          evidence: trimmed,
        });
      }
    }

    if (
      /\b(?:get into a case|into a case|observe a case|into the or)\b/i.test(trimmed) &&
      /\b(?:probably|possible|not opposed|wasn'?t denied|once we get through)\b/i.test(trimmed)
    ) {
      add({
        fact_type: "observation_access",
        entity: "",
        attribute: "status",
        value: "interested",
        confidence: "medium",
        evidence: trimmed,
      });
    }

    if (/\bcredential/i.test(trimmed) || /\bvendor\s+approv/i.test(trimmed)) {
      if (UNCERTAINTY_RE.test(trimmed) || /\b(?:platform|system)\s+(?:is\s+)?unknown\b/i.test(trimmed)) {
        add({
          fact_type: "credentialing",
          entity: "",
          attribute: "platform",
          value: "unknown",
          confidence: "medium",
          evidence: trimmed,
        });
      } else if (PLATFORM_NAMES_RE.test(trimmed)) {
        const platform = trimmed.match(PLATFORM_NAMES_RE)?.[0] ?? "";
        add({
          fact_type: "credentialing",
          entity: platform,
          attribute: "platform",
          value: UNCERTAINTY_RE.test(trimmed) ? "unconfirmed" : "confirmed",
          confidence: UNCERTAINTY_RE.test(trimmed) ? "medium" : "high",
          evidence: trimmed,
        });
      } else {
        add({
          fact_type: "credentialing",
          entity: "",
          attribute: "requirement",
          value: "discussed",
          confidence: "medium",
          evidence: trimmed,
        });
      }
    }

    if (
      /\b(?:@[a-z0-9.-]+\.[a-z]{2,}|\(\d{3}\)|\d{3}[-.\s]\d{3})\b/i.test(trimmed) &&
      (person || lastPerson)
    ) {
      const contactName = person || lastPerson;
      add({
        fact_type: "workflow_contact",
        entity: contactName,
        attribute: "contact_info",
        value: "Contact details mentioned",
        confidence: "high",
        evidence: trimmed,
      });
    }

    if (/\bschedul/i.test(trimmed)) {
      if (person) {
        add({
          fact_type: "workflow_contact",
          entity: person,
          attribute: "role",
          value: "Scheduling Coordinator",
          confidence: "medium",
          evidence: trimmed,
        });
      } else {
        add({
          fact_type: "scheduling",
          entity: "",
          attribute: "process",
          value: "discussed",
          confidence: "medium",
          evidence: trimmed,
        });
      }
    }

    if (person && /\b(?:handles?|coordinates?|schedules?|manages?|runs?|said|bringing up|mentioned)\b/i.test(trimmed)) {
      const hasContactInfo = /\b(?:@[a-z0-9.-]+\.[a-z]{2,}|\(\d{3}\)|\d{3}[-.\s]\d{3})\b/i.test(trimmed);
      add({
        fact_type: "workflow_contact",
        entity: person,
        attribute: "role",
        value: /\bschedul/i.test(trimmed) ? "Scheduling Coordinator" : "Workflow participant",
        confidence: hasContactInfo ? "high" : "medium",
        evidence: trimmed,
      });
    }

    if (/\b(?:office first|work through the office|vendor approval)\b/i.test(trimmed)) {
      add({
        fact_type: "facility_intelligence",
        entity: "",
        attribute: "access_pathway",
        value: "Office or vendor approval required before observation",
        confidence: "medium",
        evidence: trimmed,
      });
    }

    if (debriefExplicitProductFitConnection(trimmed)) {
      add({
        fact_type: "product_fit",
        entity: /\bACSIS\b/i.test(trimmed) ? "ACSIS" : "",
        attribute: "discussion",
        value: "product fit discussed",
        confidence: "medium",
        evidence: trimmed,
      });
    }

    for (const normalized of extractNormalizedClinicalIntelligenceFromSentence(trimmed)) {
      add({
        fact_type: "clinical_focus",
        entity: "",
        attribute: normalized.signal,
        value: normalized.storageValue,
        confidence: "medium",
        evidence: trimmed,
      });
    }

    if (/\b(?:trust|receptive|relationship|warm|resistant|open)\b/i.test(trimmed)) {
      add({
        fact_type: "relationship",
        entity: "",
        attribute: "tone",
        value: "relationship discussed",
        confidence: "medium",
        evidence: trimmed,
      });
    }

    if (/\b(?:need to|follow[- ]?up|next step|should|will call|figure out|identify)\b/i.test(trimmed)) {
      add({
        fact_type: "follow_up",
        entity: "",
        attribute: "action",
        value: trimmed.replace(/\.$/, ""),
        confidence: "medium",
        evidence: trimmed,
      });
    }
  }

  return supplementAtomicFactsWithProductIntelligence(facts, text);
}
