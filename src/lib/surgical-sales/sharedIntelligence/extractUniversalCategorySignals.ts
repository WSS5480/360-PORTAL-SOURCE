/**
 * Specialty-agnostic Universal Fact category signals — workflow, access, relationship,
 * contact role, next steps, and product dissatisfaction.
 */

import { normalizeSchedulerPersonName } from "@/lib/surgical-sales/sharedIntelligence/schedulerContactExtractionPolicy";
import { shouldRejectAssignedProviderContactRole } from "@/lib/surgical-sales/sharedIntelligence/providerContactRolePolicy";
import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import {
  formatSchedulingPreferenceFromEvidence,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDisplayRefinement";
import {
  techniqueModalityLabelsFromText,
  selectProcedurePatternsForText,
} from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";
import {
  DEBRIEF_KNOWN_PRODUCTS,
  resolveKnownProduct,
} from "@/lib/surgical-sales/sharedIntelligence/productCatalog";
import type {
  UniversalCanonicalConcept,
  UniversalConfidenceLevel,
} from "@/lib/surgical-sales/universalExtractor/types";

export type UniversalCategorySignal = {
  concept: UniversalCanonicalConcept;
  normalized_label: string;
  evidence_text: string;
  confidence: UniversalConfidenceLevel;
  product_mentioned?: string;
  person_mentioned?: string;
  notes?: string;
};

function pushUnique(
  target: UniversalCategorySignal[],
  seen: Set<string>,
  signal: UniversalCategorySignal,
): void {
  const key = `${signal.concept}:${signal.normalized_label.toLowerCase()}:${signal.evidence_text.slice(0, 80).toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);
  target.push(signal);
}

function roleLabelFromContactEvidence(text: string): string {
  if (/\bscrub\s+(?:tech|technician|nurse)\b/i.test(text)) return "Scrub Tech";
  if (/\bcirculat(?:or|ing nurse)\b/i.test(text)) return "Circulator";
  if (/\b(?:surgical tech|or tech)\b/i.test(text)) return "Surgical Tech";
  if (/\bor\s+manager\b/i.test(text)) return "OR Manager";
  if (/\boffice manager\b/i.test(text)) return "Office Manager";
  if (/\bevaluation\b/i.test(text)) return "Evaluation Contact";
  if (/\bor coordinator\b|\bor scheduling coordinator\b|\bhospital or scheduling\b/i.test(text)) {
    return "OR Coordinator";
  }
  if (/\bcredentialing\s+(?:contact|coordinator)\b/i.test(text) && !/\bschedul/i.test(text)) {
    return "Credentialing Contact";
  }
  return "Scheduling Coordinator";
}

function extractSchedulerContact(text: string): { name: string; role: string } | null {
  const blockedContactNames = new Set([
    "she",
    "he",
    "they",
    "we",
    "it",
    "the",
    "his",
    "her",
    "their",
    "office",
    "team",
    "hospital",
    "mentioned",
    "noted",
    "said",
    "appears",
  ]);

  const patterns = [
    /\b(?:noted|mentioned|said)\s+that\s+([A-Z][a-z]+)\b[^.!?]{0,72}?\b(?:handles?|coordinat(?:es|ing)?|runs?|involved in)\b[^.!?]{0,48}\b(?:scheduling|coordination|schedules?|access)\b/i,
    // "Jessica mentioned … observation if scheduling works out"
    /\b([A-Z][a-z]+)\s+(?:mentioned|said|noted)\b[^.!?]{0,160}\b(?:observation|scheduling|schedules?)\b/i,
    /\b([A-Z][a-z]+),\s*(?:the\s+)?(?:(?:surgery|or|case)\s+)?(?:scheduler|scheduling coordinator)\b/i,
    /\b(?:met|spoke with|introduced to)\s+([A-Z][a-z]+)\b[^.!?]{0,120}?\b(?:interested|interest)\b[^.!?]{0,72}?\bschedul(?:e|ing)\b/i,
    /\b(?:met|spoke with|introduced to)\s+([A-Z][a-z]+)\b[^.!?]{0,96}?\b(?:schedul|coordinat|access|physician)\b/i,
    /\b([A-Z][a-z]+)\b[^.!?]{0,80}?\bcoordinated\b[^.!?]{0,80}?\b(?:observation|case|ready|arrived)\b/i,
    /\b([A-Z][a-z]+)\b[^.!?]{0,48}?\basked me to\s+reach out\b/i,
    /\b([A-Z][a-z]+)\b[^.!?]{0,64}?\bat the front desk\b[^.!?]{0,80}?\b(?:asked|said|told)\b/i,
    /\b([A-Z][a-z]+)\b[^.!?]{0,96}?\b(?:handles?|helps\s+with|help\s+coordinat(?:e|es|ing)?|coordinat(?:es|ing)?|runs?|involved in|may\s+coordinat(?:e|es|ing)?|appears\s+to\s+be)\b[^.!?]{0,64}\b(?:scheduling|coordination|schedules?|access|scheduling contact|credentialing|product evaluation|evaluation)\b/i,
    /\b([A-Z][a-z]+)\b[^.!?]{0,48}?\b(?:is|appears\s+to\s+be)\b[^.!?]{0,24}\bscheduling contact\b/i,
    /\b([A-Z][a-z]+)\b[^.!?]{0,48}?\b(?:is|appears\s+to\s+be)\b[^.!?]{0,24}\bscheduling coordinator\b/i,
    /\b([A-Z][a-z]+)\b[^.!?]{0,48}?\b(?:is|as)\b[^.!?]{0,24}\b(?:office manager|or coordinator|credentialing contact)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const rawName = match?.[1]?.trim();
    if (!rawName) continue;

    const parts = rawName.split(/\s+/).filter(Boolean);
    if (parts.some((part) => blockedContactNames.has(part.toLowerCase()))) continue;

    const name = normalizeSchedulerPersonName(rawName);
    if (!name || !isPlausiblePersonName(name)) continue;
    if (name) return { name, role: roleLabelFromContactEvidence(text) };
  }

  return null;
}

function extractNamedSurgicalStaffContact(text: string): { name: string; role: string } | null {
  const blockedContactNames = new Set([
    "the",
    "a",
    "an",
    "this",
    "that",
    "worked",
    "works",
    "working",
    "commented",
    "confirmed",
    "suggested",
    "setup",
    "staff",
    "team",
    "case",
    "or",
    "scrub",
    "tech",
    "circulator",
  ]);
  // Name capture must stay case-sensitive. A trailing `/i` flag lets verbs like "worked"
  // match `[A-Z][a-z]+` and become junk contacts ("Worked — Scrub Tech").
  const staffRole = String.raw`(?:[Ss]crub|[Ss]urgical|[Oo][Rr])\s+(?:[Tt]ech(?:nician)?|[Nn]urse)|[Cc]irculator`;
  const match =
    text.match(new RegExp(String.raw`\b([A-Z][a-z]+),\s*(?:the\s+)?(${staffRole})\b`)) ??
    text.match(new RegExp(String.raw`\b([A-Z][a-z]+)\b[^.!?]{0,48}\b(${staffRole})\b`));
  const rawName = match?.[1]?.trim();
  if (!rawName) return null;
  if (blockedContactNames.has(rawName.toLowerCase())) return null;
  // Reject lowercase verb captures if a case-insensitive pattern ever reappears.
  if (rawName[0] !== rawName[0]?.toUpperCase()) return null;
  const name = normalizeSchedulerPersonName(rawName);
  if (!name || !isPlausiblePersonName(name)) return null;
  return { name, role: roleLabelFromContactEvidence(match?.[0] ?? text) };
}

function excerptEvidence(text: string, pattern: RegExp): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const match = sentences.find((sentence) => pattern.test(sentence));
  return (match ?? text).trim().slice(0, 240);
}

function knownProductMentioned(text: string): string | undefined {
  return DEBRIEF_KNOWN_PRODUCTS.find((product) =>
    new RegExp(`\\b${product.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(text),
  );
}

const GENERIC_IMPLANT_NOUNS = new Set(["mesh", "graft", "implant", "device", "system", "product"]);

function productInterestCandidate(text: string): string | undefined {
  const known = knownProductMentioned(text);
  if (known && evidenceDescribesCurrentProductUsage(text, known)) return undefined;

  if (known) return known;

  // "our mesh" / "your graft" can be an interest target. Bare "the mesh" is almost always
  // the current implant noun and must not become "Alternative product discussed: mesh".
  const ownProductMatch = text.match(/\b(our|your|the)\s+(mesh|graft|implant|device|system|product)\b/i);
  if (ownProductMatch?.[1] && ownProductMatch[2]) {
    const determiner = ownProductMatch[1].toLowerCase();
    const noun = ownProductMatch[2].toLowerCase();
    if ((determiner === "our" || determiner === "your") && GENERIC_IMPLANT_NOUNS.has(noun)) {
      return noun;
    }
  }

  const showedMatch = text.match(
    /\b(?:showed|presented|pitched|demo(?:ed)?)\s+(?:him|her|them|(?:the\s+)?(?:surgeon|provider|doctor))\s+(?:the\s+)?([A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){0,2})(?:\s+graft)?\b/,
  );
  if (showedMatch?.[1]) {
    const resolved = resolveKnownProduct(showedMatch[1]);
    if (resolved.productName) return resolved.productName;
  }

  const properNameMatch =
    text.match(
      /\b(?:discussed|asked\s+(?:how|whether|if)|questions?\s+about|interested\s+in|curious\s+about)\s+([A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){0,2})\b/,
    ) ??
    text.match(/\basked\b[^.!?]{0,80}\babout\s+([A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){0,2})\b/);
  const properName = properNameMatch?.[1]?.trim();
  if (properName) {
    const resolved = resolveKnownProduct(properName);
    if (resolved.productName) return resolved.productName;
  }

  const descriptorMatch = text.match(
    /\basked\s+whether\s+(?:a|an|the)\s+([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*){0,3})\s+(?:could|would|can|works?|is|was)\b/i,
  );
  const descriptor = descriptorMatch?.[1]?.trim();
  if (descriptor && /\b(?:option|device|product|implant|system|tool|instrument|tray|setup)\b/i.test(descriptor)) {
    return descriptor.toLowerCase();
  }

  return undefined;
}

function evidenceDescribesCurrentProductUsage(text: string, productName?: string): boolean {
  const blob = text.trim();
  if (!blob) return false;
  if (!productName) {
    return (
      /\b(?:currently|still)\s+using\b|\b(?:using|uses?|used)\s+(?:the\s+)?(?:same\s+)?(?:mesh|product|graft|implant|device)\b|\b(?:primary|standard|incumbent)\b[^.!?]{0,48}\b(?:mesh|product|graft|implant|device)\b/i.test(
        blob,
      )
    );
  }
  const escaped = productName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  // Require the product itself to be the object of usage — not merely co-mentioned
  // in a note that also says "used Bard Soft Mesh" while pitching AmchoPlast.
  return (
    new RegExp(
      String.raw`\b(?:currently|still)\s+(?:using|uses?)\s+(?:the\s+)?${escaped}\b|\b(?:using|uses?|used|implanted|placed)\s+(?:the\s+)?${escaped}\b|\b${escaped}\b[^.!?]{0,40}\b(?:was|were)?\s*(?:used|implanted|placed)\b|\b(?:primary|standard|incumbent)\b[^.!?]{0,32}\b${escaped}\b`,
      "i",
    ).test(blob)
  );
}

function shouldSuppressProductInterestForCurrentUsage(input: {
  evidence: string;
  product?: string;
  fullText?: string;
}): boolean {
  const evidence = input.evidence.trim();
  const product = input.product?.trim();
  if (product && evidenceDescribesCurrentProductUsage(evidence, product)) return true;
  if (product && input.fullText && evidenceDescribesCurrentProductUsage(input.fullText, product)) {
    // Interest signal in one sentence should not inherit a competitor product named only as current usage elsewhere.
    if (!new RegExp(`\\b${product.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(evidence)) {
      return true;
    }
  }
  return false;
}

function evidenceIsProductQuestionOnly(text: string): boolean {
  return (
    /\b(?:asked|question|questions|whether|if|how|compatible|works?\s+with|training\s+required|learning curve|required\s+for\s+staff)\b/i.test(
      text,
    ) &&
    !/\b(?:staff|team|circulat|scrub|nurse|tech)\b[^.!?]{0,80}\b(?:was|were|is|are|seemed|appeared|felt|reported|requested)\b[^.!?]{0,80}\b(?:unfamiliar|confused|training|in-?service|learning curve|struggl|extra time|took extra time)\b/i.test(
      text,
    )
  );
}

function pushNextActionSignals(
  target: UniversalCategorySignal[],
  seen: Set<string>,
  evidence: string,
): void {
  const text = evidence.trim();
  if (!text) return;

  const isRepOfferedCompound =
    /^i told\b/i.test(text) &&
    /\band\b/i.test(text) &&
    /\b(?:bring|share|send|set up|schedule)\b/i.test(text);

  const segments = isRepOfferedCompound
    ? [text]
    : text
        .split(/\s+\band\b\s+/i)
        .map((segment) => segment.trim())
        .filter((segment) =>
          /\b(?:send|share|email|text|follow(?:ing)?\s+up|schedule|coordinate|observe|bring|set up)\b/i.test(
            segment,
          ),
        );
  const actions = segments.length > 1 ? segments : [text];

  for (const action of actions) {
    const label = /\b(?:email|send|share)\b[^.!?]{0,100}\b(?:clinical data|published)\b/i.test(action)
      ? "Email the published clinical data"
      : /\b(?:email|send)\b[^.!?]{0,100}\b(?:available\s+|possible\s+|proposed\s+)?dates?\b/i.test(action) ||
          /\basked me to email\b[^.!?]{0,100}\bdates?\b/i.test(action)
        ? "Email proposed dates"
        : /\bsend\b[^.!?]{0,80}\b(?:available\s+)?dates?\b/i.test(action)
          ? "Send available dates"
          : "Next step recommended";
    pushUnique(target, seen, {
      concept: "next_action",
      normalized_label: label,
      evidence_text: action,
      confidence: "high",
    });
  }
}

function extractCurrentSetupDescriptor(text: string): string | null {
  if (/\bcurrent setup\b[^.!?]{0,80}\b(?:standardized|standardised|standard|routine|consistent)\b/i.test(text)) {
    return "standardized setup";
  }

  const standardApproachMatch = text.match(
    /\b(?:still|currently)\s+using\s+(?:his|her|their|the)\s+((?:standard|usual|typical)\s+[^.!?]{0,120}?\b(?:approach|setup|workflow|technique|fixation)[^.!?]{0,40})/i,
  );
  const standardApproach = standardApproachMatch?.[1]
    ?.trim()
    .replace(/[.!?;:,]+$/g, "")
    .replace(/\s+/g, " ");
  if (standardApproach) return standardApproach;

  const match = text.match(
    /\b(?:currently|still)\s+(?:using|uses?)\s+((?:(?!\b(?:but|and|while|because|when|if|asked|said|mentioned)\b)[A-Za-z0-9-]+\s*){2,8})/i,
  );
  const descriptor = match?.[1]
    ?.trim()
    .replace(/[.!?;:,]+$/g, "")
    .replace(/\s+/g, " ");
  if (!descriptor) return null;
  if (knownProductMentioned(descriptor)) return null;
  if (!/\b(?:suction|irrigation|setup|instrument|instruments|instrumentation|tool|device|system)\b/i.test(descriptor)) {
    return null;
  }
  return descriptor;
}

function pushContactRoleSignal(
  target: UniversalCategorySignal[],
  seen: Set<string>,
  signal: UniversalCategorySignal,
  providerName?: string | null,
): void {
  if (
    shouldRejectAssignedProviderContactRole({
      concept: signal.concept,
      person_mentioned: signal.person_mentioned,
      normalized_label: signal.normalized_label,
      evidence_text: signal.evidence_text,
      providerName,
    })
  ) {
    return;
  }
  pushUnique(target, seen, signal);
}

export function extractUniversalCategorySignals(
  text: string,
  options?: { providerName?: string | null },
): UniversalCategorySignal[] {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 8) return [];

  const signals: UniversalCategorySignal[] = [];
  const seen = new Set<string>();
  const currentSetupDescriptor = extractCurrentSetupDescriptor(trimmed);

  if (currentSetupDescriptor) {
    pushUnique(signals, seen, {
      concept: "workflow_or_timing_issue",
      normalized_label: `Current setup: ${currentSetupDescriptor}`,
      evidence_text: excerptEvidence(trimmed, /\b(?:currently|still)\s+(?:using|uses?)\b/i),
      confidence: "high",
    });
  }

  const currentUsageProduct = knownProductMentioned(trimmed);
  const currentKnownProductUsage = Boolean(
    currentUsageProduct && evidenceDescribesCurrentProductUsage(trimmed, currentUsageProduct),
  );

  if (
    /\b(?:still\s+using|using|uses?)\b[^.!?]{0,80}\b(?:standard|current)\s+product\b/i.test(trimmed) ||
    /\b(?:standard|current)\s+(?:mesh|product)\b/i.test(trimmed) ||
    currentKnownProductUsage
  ) {
    const product = currentKnownProductUsage ? currentUsageProduct : undefined;
    pushUnique(signals, seen, {
      concept: "current_product",
      normalized_label: product ? `Current product: ${product}` : "Current product standard noted",
      evidence_text: excerptEvidence(trimmed, /\b(?:still\s+using|standard|current|using|used)\b/i),
      confidence: product ? "high" : "medium",
      product_mentioned: product,
    });
  }

  if (/\b(?:instrumentation|implant|tray|screw|plate).{0,40}(?:availability|available|unavailable|frustrat)/i.test(trimmed)) {
    pushUnique(signals, seen, {
      concept: "inventory_availability_issue",
      normalized_label: "Instrumentation availability concern",
      evidence_text: trimmed,
      confidence: "medium",
    });
  }

  if (
    /\b(?:inventory|availability|supply|stock|backorder|delay|delayed|waiting on|getting)\b/i.test(trimmed) &&
    (/\b(?:graft|implant|product|tray|screw|plate|mesh|device|instrument|supplies)\b/i.test(trimmed) ||
      /\b(?:inventory|availability|supply|stock|backorder|waiting on|getting)\b[^.!?]{0,80}\b[A-Z][A-Za-z0-9-]{2,}\b/.test(
        trimmed,
      ))
  ) {
    pushUnique(signals, seen, {
      concept: "inventory_availability_issue",
      normalized_label: "Product availability issue",
      evidence_text: excerptEvidence(trimmed, /\b(?:inventory|availability|supply|stock|backorder|delay|waiting on|getting)\b/i),
      confidence: "high",
    });
  }

  if (
    /\b(?:getting|running|ran)\s+low\s+on\s+(?:inventory|stock|supplies)\b/i.test(trimmed) ||
    /\b(?:inventory|stock|supplies)\b[^.!?]{0,40}\b(?:low|short|limited|running low)\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "inventory_availability_issue",
      normalized_label: "Inventory running low",
      evidence_text: excerptEvidence(trimmed, /\b(?:inventory|stock|supplies|running low|getting low)\b/i),
      confidence: "high",
    });
  }

  if (
    /\b(?:wanted|wants?|asked|needs?|enjoys?|values?|prefers?|likes?)\b[^.!?]{0,120}\b(?:published|clinical)\b[^.!?]{0,80}\b(?:outcome|data|evidence)/i.test(
      trimmed,
    ) ||
    /\b(?:published|clinical)\b[^.!?]{0,80}\b(?:outcome|data|evidence)\b[^.!?]{0,120}\b(?:before|prior to)\b[^.!?]{0,80}\b(?:consider|chang|evaluat|switch|forming|form)\b/i.test(
      trimmed,
    ) ||
    /\b(?:interested|seemed interested)\b[^.!?]{0,140}\b(?:published|clinical)\b[^.!?]{0,80}\b(?:outcome|data|evidence)/i.test(
      trimmed,
    ) ||
    /\breviewing\s+published\s+clinical\s+evidence\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "product_interest",
      normalized_label: "Product interest: Values published clinical evidence",
      evidence_text: excerptEvidence(trimmed, /\b(?:published|clinical|outcome|evidence|consider|chang|interested|enjoys?|values?)\b/i),
      confidence: "high",
    });
  }

  if (
    /\b(?:comfortable with|happy with|satisfied with)\b[^.!?]{0,80}\b(?:the\s+)?(?:products?|mesh|current)\b/i.test(
      trimmed,
    ) ||
    /\b(?:isn't|is not|not)\s+actively\s+looking\b/i.test(trimmed) ||
    /\bnot\s+(?:looking|interested)\s+(?:to\s+)?(?:make\s+a\s+)?change\b/i.test(trimmed) ||
    /\bisn't\s+actively\s+looking\s+to\s+make\s+a\s+change\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "provider_sentiment",
      normalized_label: "Commercial disposition: Not actively looking to change products",
      evidence_text: excerptEvidence(
        trimmed,
        /\b(?:comfortable with|happy with|satisfied with|actively looking|make a change)\b/i,
      ),
      confidence: "high",
    });
  }

  if (
    /\b(?:compare|compares|comparison|versus|vs\.?|how\s+(?:our|your|the)\s+.+\s+compares?|clinical data|data we talked about)\b/i.test(trimmed) &&
    (/\b(?:our|your|product|graft|implant|device|mesh|incorporation|outcomes?|clinical data)\b/i.test(trimmed) ||
      Boolean(productInterestCandidate(trimmed)))
  ) {
    const product = productInterestCandidate(trimmed);
    pushUnique(signals, seen, {
      concept: "product_interest",
      normalized_label: product ? `Product interest: ${product}` : "Product comparison or clinical-data interest",
      evidence_text: excerptEvidence(trimmed, /\b(?:compare|compares|comparison|clinical data|incorporation)\b/i),
      confidence: "high",
      product_mentioned: product,
    });
  }

  if (
    productInterestCandidate(trimmed) &&
    /\basked\b[^.!?]{0,80}\b(?:questions?\s+about|about)\b[^.!?]{0,80}\b(?:compare|compares|compared|comparison)\b/i.test(
      trimmed,
    )
  ) {
    const product = productInterestCandidate(trimmed);
    pushUnique(signals, seen, {
      concept: "product_interest",
      normalized_label: product ? `Product interest: ${product}` : "Product comparison interest",
      evidence_text: excerptEvidence(trimmed, /\basked\b/i),
      confidence: "high",
      product_mentioned: product,
    });
  }

  if (
    productInterestCandidate(trimmed) &&
    /\basked whether\b[^.!?]{0,120}\b(?:works?|compatible|existing|setup|suction|learning curve|assistants?|training|required|staff|available|larger size|smaller size|size)\b/i.test(trimmed)
  ) {
    const product = productInterestCandidate(trimmed);
    pushUnique(signals, seen, {
      concept: "product_interest",
      normalized_label: product ? `Product interest: ${product}` : "Product setup or learning-curve question",
      evidence_text: excerptEvidence(trimmed, /\basked whether\b/i),
      confidence: "high",
      product_mentioned: product,
    });
  }

  if (
    productInterestCandidate(trimmed) &&
    /\btraining\s+required\s+for\s+staff\b|\btraining\b[^.!?]{0,80}\bstaff\b/i.test(trimmed)
  ) {
    const product = productInterestCandidate(trimmed);
    pushUnique(signals, seen, {
      concept: "product_interest",
      normalized_label: product ? `Product training question: ${product}` : "Product training question",
      evidence_text: excerptEvidence(trimmed, /\btraining\b/i),
      confidence: "high",
      product_mentioned: product,
    });
  }

  if (
    productInterestCandidate(trimmed) &&
    /\b(?:interested in|curious about)\b[^.!?]{0,120}\b(?:curved design|design|feature|gets around anatomy|around anatomy)\b/i.test(trimmed)
  ) {
    const product = productInterestCandidate(trimmed);
    pushUnique(signals, seen, {
      concept: "product_interest",
      normalized_label: product ? `Product interest: ${product}` : "Product feature interest",
      evidence_text: excerptEvidence(trimmed, /\b(?:interested in|curious about)\b/i),
      confidence: "high",
      product_mentioned: product,
    });
  }

  if (
    productInterestCandidate(trimmed) &&
    /\b(?:discussed|asked|questions?\s+about|interested\s+in|curious\s+about)\b/i.test(trimmed) &&
    /\b(?:compare|compares|comparison|works?|compatible|setup|learning curve|feature|option|alternative|handling|current|available|size|information)\b/i.test(trimmed)
  ) {
    const product = productInterestCandidate(trimmed);
    pushUnique(signals, seen, {
      concept: "product_interest",
      normalized_label: product ? `Product interest: ${product}` : "Product interest",
      evidence_text: excerptEvidence(trimmed, /\b(?:discussed|asked|questions?\s+about|interested|curious)\b/i),
      confidence: "high",
      product_mentioned: product,
    });
  }

  if (
    /\b(?:interested|interest|asked|wanted|wants?|would\s+like)\b[^.!?]{0,160}\b(?:alternatives?|products?)\b[^.!?]{0,160}\b(?:easier\s+handling|handling|larger\s+defects?|conformability|flexibility|compare)\b/i.test(trimmed) ||
    /\b(?:products?|alternatives?)\b[^.!?]{0,160}\b(?:designed\s+to\s+handle|easier\s+handling|better\s+conformability)\b[^.!?]{0,160}\b(?:larger\s+defects?|compare|interested)\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "product_interest",
      normalized_label: "Product interest: alternatives for larger defects",
      evidence_text: excerptEvidence(trimmed, /\b(?:interested|alternatives?|products?|easier\s+handling|larger defects?|compare)\b/i),
      confidence: "high",
    });
  }

  if (
    /\b(?:open|receptive|willing)\b[^.!?]{0,120}\b(?:new|different|alternative)\s+(?:technology|technologies|products?|options?|solutions?)\b/i.test(trimmed) ||
    /\b(?:new|different|alternative)\s+(?:technology|technologies|products?|options?|solutions?)\b[^.!?]{0,120}\b(?:solves?|addresses?|fixes?)\s+(?:a\s+)?problem\b/i.test(trimmed) ||
    /\binterested\s+in\s+learning\s+about\s+new\s+technology\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "product_interest",
      normalized_label: /\b(?:solves?\s+(?:a\s+)?problem|meaningful\s+clinical\s+benefit|clinical benefit)\b/i.test(trimmed)
        ? "Product interest: open to new technology if it offers clinical benefit"
        : "Product interest: open to new technology",
      evidence_text: excerptEvidence(trimmed, /\b(?:open|receptive|willing|interested|new technology|new products?|solves?|clinical benefit)\b/i),
      confidence: "high",
    });
  }

  if (
    /\binterested\b[^.!?]{0,80}\bschedul(?:e|ing)\b[^.!?]{0,80}\bevaluation\b/i.test(trimmed) ||
    /\bevaluation\b[^.!?]{0,80}\b(?:next month|schedul(?:e|ing))\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "product_interest",
      normalized_label: "Commercial disposition: Evaluation scheduling interest",
      evidence_text: excerptEvidence(trimmed, /\b(?:interested|evaluation|schedule|scheduling)\b/i),
      confidence: "high",
    });
    pushUnique(signals, seen, {
      concept: "next_action",
      normalized_label: "Schedule product evaluation",
      evidence_text: excerptEvidence(trimmed, /\b(?:interested|evaluation|schedule|scheduling)\b/i),
      confidence: "high",
    });
  }

  if (
    productInterestCandidate(trimmed) &&
    /\b(?:showed|presented|pitched|demo(?:ed)?)\s+(?:him|her|them|(?:the\s+)?(?:surgeon|provider|doctor))\b/i.test(
      trimmed,
    )
  ) {
    const product = productInterestCandidate(trimmed);
    pushUnique(signals, seen, {
      concept: "product_interest",
      normalized_label: product ? `Product interest: ${product}` : "Product interest: shown after case",
      evidence_text: excerptEvidence(trimmed, /\b(?:showed|presented|pitched|demo(?:ed)?)\b/i),
      confidence: "high",
      product_mentioned: product,
    });
  }

  if (
    /\bwilling to evaluate\b/i.test(trimmed) ||
    /\bevaluate\b[^.!?]{0,100}\bduring another observation\b/i.test(trimmed)
  ) {
    const product = productInterestCandidate(trimmed);
    pushUnique(signals, seen, {
      concept: "product_interest",
      normalized_label: product
        ? `Commercial disposition: Willing to evaluate ${product}`
        : "Commercial disposition: Willing to evaluate on later observation",
      evidence_text: excerptEvidence(trimmed, /\b(?:willing to evaluate|evaluate|another observation)\b/i),
      confidence: "high",
      product_mentioned: product,
    });
  }

  if (
    /\bwishes?\b[^.!?]{0,120}\bconform(?:s|ed)?\b[^.!?]{0,120}\b(?:larger|large)\s+defects?\b/i.test(
      trimmed,
    ) ||
    /\bwishes?\b[^.!?]{0,140}\b(?:more|greater|little\s+more)\s+flexibility\b/i.test(trimmed) ||
    /\bconform(?:s|ed)?\b[^.!?]{0,120}\b(?:larger|large)\s+defects?\b/i.test(trimmed) ||
    /\bcontour(?:s|ed)?\b[^.!?]{0,120}\b(?:larger|large)\s+defects?\b/i.test(trimmed) ||
    /\bpositioning\b[^.!?]{0,80}\bmesh\b[^.!?]{0,80}\b(?:larger|large)\s+defects?\b[^.!?]{0,80}\bawkward\b/i.test(trimmed) ||
    /\b(?:would\s+like|wants?|asked\s+for)\b[^.!?]{0,100}\b(?:more|greater|little\s+more)\s+flexibility\b/i.test(trimmed) ||
    /\balternatives?\b[^.!?]{0,120}\b(?:easier\s+handling|handling)\b[^.!?]{0,120}\b(?:larger|large)\s+defects?\b/i.test(trimmed) ||
    /\b(?:larger|large)\s+defects?\b[^.!?]{0,160}\b(?:take|takes|taking|took)\s+longer\b[^.!?]{0,160}\b(?:mesh|implant|product)\b[^.!?]{0,80}\b(?:doesn['’]?t|does not|didn['’]?t|did not)\s+(?:contour|conform)\b/i.test(trimmed) ||
    /\bbiggest\s+annoyance\b[^.!?]{0,160}\b(?:current setup|mesh|implant|product|larger defects?)\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "sizing_or_fit_issue",
      normalized_label: "Product fit concern: Conformability on larger defects",
      evidence_text: excerptEvidence(trimmed, /\b(?:wishes?|would\s+like|flexibility|positioning|larger defects?|contour|annoyance|alternatives?)\b/i),
      confidence: "high",
    });
  }

  if (
    /\b(?:issue|problem|delay|friction)\b[^.!?]{0,80}\b(?:wasn['’]?t|was not|not)\s+present\b/i.test(trimmed) ||
    /\bless\s+convinced\b[^.!?]{0,80}\bongoing\s+problem\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "case_outcome",
      normalized_label: "Prior workflow issue was not observed today",
      evidence_text: excerptEvidence(trimmed, /\b(?:issue|problem|less convinced)\b/i),
      confidence: "high",
    });
  }

  if (
    /\bno\s+other\s+workflow\s+delays?\b/i.test(trimmed) ||
    /\broom\s+ran\s+(?:pretty\s+)?efficiently\b/i.test(trimmed) ||
    /\boverall\s+workflow\s+was\s+smooth\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "case_outcome",
      normalized_label: "No workflow delays observed today",
      evidence_text: excerptEvidence(trimmed, /\b(?:workflow delays?|room ran)\b/i),
      confidence: "high",
    });
  }

  if (/\boperating room efficiency\b|\bor efficiency\b|\broom efficiency\b/i.test(trimmed)) {
    pushUnique(signals, seen, {
      concept: "workflow_or_timing_issue",
      normalized_label: "OR efficiency concern",
      evidence_text: trimmed,
      confidence: "medium",
    });
  }

  if (/\bturnover times?\b|\bturnover delays?\b|\btime between cases\b/i.test(trimmed)) {
    pushUnique(signals, seen, {
      concept: "workflow_or_timing_issue",
      normalized_label: "Workflow priority: Turnover time importance",
      evidence_text: trimmed,
      confidence: "medium",
    });
  }

  if (/\bworkflow efficiency\b.*\bpriorit/i.test(trimmed) ||
    /\b(?:consistency|efficiency).{0,40}\bimportant priorities\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "workflow_or_timing_issue",
      normalized_label: "Workflow priority: Workflow efficiency priority",
      evidence_text: trimmed,
      confidence: "medium",
    });
  }

  if (/\bstaff satisfaction\b|\bteam satisfaction\b/i.test(trimmed)) {
    pushUnique(signals, seen, {
      concept: "workflow_or_timing_issue",
      normalized_label: "Workflow priority: Staff satisfaction importance",
      evidence_text: trimmed,
      confidence: "medium",
    });
  }

  if (
    /\b(?:scrub|circulat|nurse|resident|\bpa\b|physician assistant|surgical tech|or team)\b/i.test(
      trimmed,
    ) &&
    /\b(?:influence|workflow|preference|concern|setup|case flow|turnover|delay|delayed|waiting|complaint|frustrat|said|reported)\b/i.test(
      trimmed,
    )
  ) {
    pushUnique(signals, seen, {
      concept: "staff_workflow",
      normalized_label: "Staff workflow: Team influence on case flow",
      evidence_text: trimmed,
      confidence: "medium",
    });
  }

  if (
    /\b(?:unfamiliar|training|in-?service|learning curve|setup took extra time|took extra time)\b/i.test(trimmed) &&
    /\b(?:staff|team|circulat|scrub|nurse|tech|tray|setup|layout)\b/i.test(trimmed) &&
    !evidenceIsProductQuestionOnly(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "training_or_familiarity_issue",
      normalized_label: "Training or familiarity issue",
      evidence_text: excerptEvidence(trimmed, /\b(?:unfamiliar|training|in-?service|learning curve|setup took extra time|took extra time)\b/i),
      confidence: "high",
    });
  }

  if (
    /\b(?:spent|took|needed|required)\s+(?:extra\s+)?time\b[^.!?]{0,120}\b(?:better view|visuali[sz]ation|visuali[sz]e|exposure|access)\b/i.test(
      trimmed,
    ) ||
    /\b(?:better view|visuali[sz]ation|visuali[sz]e|exposure|access)\b[^.!?]{0,120}\b(?:before|during)\b[^.!?]{0,80}\b(?:fixation|placement|placing|cleanup)\b/i.test(
      trimmed,
    ) ||
    /\bvisuali[sz]e\b[^.!?]{0,120}\bbefore\s+committing\s+to\s+fixation\b[^.!?]{0,120}\bextra\s+OR\s+time\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "visualization_or_access_issue",
      normalized_label: "Extra time improving visualization before fixation",
      evidence_text: excerptEvidence(trimmed, /\b(?:extra\s+time|better view|visuali[sz]ation|exposure|access)\b/i),
      confidence: "high",
    });
  }

  if (
    /\b(?:block time|or throughput|case throughput|same.?day trauma|multiple trauma cases|staffing constraint)\b/i.test(
      trimmed,
    )
  ) {
    pushUnique(signals, seen, {
      concept: "workflow_or_timing_issue",
      normalized_label: "Operational concern: OR throughput constraint",
      evidence_text: trimmed,
      confidence: "medium",
    });
  }

  if (/\breferral volume\b/i.test(trimmed) && /\b(?:strong|increasing|growing|more)\b/i.test(trimmed)) {
    pushUnique(signals, seen, {
      concept: "procedure_volume_trend",
      normalized_label: "Referral volume · Increasing procedure volume",
      evidence_text: trimmed,
      confidence: "medium",
    });
  }

  if (
    /\b(?:robotic|laparoscopic|minimally invasive|mis approach|open)\b/i.test(trimmed) &&
    /\b(?:prefer|preference|most of|primarily|standard approach|approach|modality|perform(?:s|ed|ing)?)\b/i.test(trimmed)
  ) {
    const procedureFocusLabels = selectProcedurePatternsForText(trimmed)
      .filter(({ concept }) => concept === "procedure_focus" || concept === "procedure_volume_trend")
      .map(({ procedure, dipHint }) => `${procedure} ${dipHint}`.toLowerCase());
    const techniques = techniqueModalityLabelsFromText(trimmed);
    if (techniques.length === 0) {
      pushUnique(signals, seen, {
        concept: "technology_preference",
        normalized_label: "Technique / Modality preference noted",
        evidence_text: trimmed,
        confidence: "medium",
      });
    } else {
      for (const technique of techniques) {
        // Skip a modality only when it is already encoded in the procedure label
        // (keep Laparoscopic when focus is "Robotic ventral hernia repair").
        const alreadyInProcedure = procedureFocusLabels.some((label) =>
          label.includes(technique.toLowerCase()),
        );
        if (alreadyInProcedure) continue;
        pushUnique(signals, seen, {
          concept: "technology_preference",
          normalized_label: `${technique} · Technique / Modality`,
          evidence_text: trimmed,
          confidence: "medium",
        });
      }
    }
  }

  const schedulingPreference = formatSchedulingPreferenceFromEvidence(trimmed);
  if (schedulingPreference) {
    pushUnique(signals, seen, {
      concept: "workflow_or_timing_issue",
      normalized_label: schedulingPreference,
      evidence_text: excerptEvidence(trimmed, /\b(?:tuesday|thursday|monday|wednesday|friday|morning|easiest)\b/i),
      confidence: "high",
    });
  }

  if (
    /\bfrustrat/i.test(trimmed) &&
    /\b(?:product|instrumentation|implant|device|performance)\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "product_performance_issue",
      normalized_label: "Product performance concern",
      evidence_text: trimmed,
      confidence: "medium",
    });
  }

  if (
    /\b(?:observ(?:e|ation)|case observation)\b[^.!?]{0,80}\b(?:approved|cleared|allowed|okay|okayed|green light|can observe)\b/i.test(trimmed) ||
    /\b(?:receptive|not opposed|open to).{0,60}(?:observ|observe)/i.test(trimmed) ||
    /\bobservation access\b/i.test(trimmed) ||
    (/\bobserv/i.test(trimmed) && /\b(?:approve|approved|approval|opposed|receptive|possible|usually not a problem|work through|coordinate|coordinating|credentialing|required|cleared|allowed|denied|declined)\b/i.test(trimmed))
  ) {
    pushUnique(signals, seen, {
      concept: "access_pathway",
      normalized_label: "Observation access interest",
      evidence_text: excerptEvidence(trimmed, /\b(?:observation access|approve|opposed|work through|future observation)\b/i),
      confidence: "medium",
    });
  }

  if (
    /\b(?:observe|observation|case observation)\b[^.!?]{0,80}\b(?:before|prior to)\b[^.!?]{0,60}\b(?:(?:any|a|an|the)\s+)?(?:product|formal)\s+(?:evaluation|trial|discussion)\b/i.test(
      trimmed,
    ) ||
    /\b(?:product|formal)\s+(?:evaluation|trial)\b[^.!?]{0,80}\b(?:after|following)\b[^.!?]{0,60}\b(?:observe|observation|observing a case)\b/i.test(
      trimmed,
    ) ||
    /\bobserv(?:e|ing)\s+a case\b[^.!?]{0,80}\bbefore\b[^.!?]{0,60}\b(?:detailed|product|alternative|evaluation|trial)\b/i.test(
      trimmed,
    ) ||
    /\b(?:not|doesn['’]?t|does not)\s+seem\s+locked\s+into\b/i.test(trimmed) ||
    /\bnot\s+locked\s+into\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "provider_sentiment",
      normalized_label: /\blocked\s+into\b/i.test(trimmed)
        ? "Relationship: provider openness to alternatives"
        : "Observation before product evaluation",
      evidence_text: excerptEvidence(
        trimmed,
        /\b(?:observe|observation|evaluation|trial|locked into|before)\b/i,
      ),
      confidence: "medium",
    });
  }

  if (
    /\b(?:receptive|not opposed|open to|seemed open|seemed interested|enthusiastic|positive|friendly|willing to continue|would like to compare|compare approaches)\b/i.test(
      trimmed,
    ) ||
    /\bopen to continuing\b|\bcontinue the (?:relationship|conversation)\b|\binterested in continuing discussions\b|\bfuture discussions\b/i.test(
      trimmed,
    )
  ) {
    pushUnique(signals, seen, {
      concept: "provider_sentiment",
      normalized_label: "Provider open to continued discussion",
      evidence_text: excerptEvidence(
        trimmed,
        /\b(?:receptive|open to|seemed open|seemed interested|would like to compare|future discussions)\b/i,
      ),
      confidence: "medium",
    });
  }

  if (
    /\b(?:circulat|scrub|surgeon|team members?)\b/i.test(trimmed) &&
    /\b(?:communication|worked well|strong|consistent team|smooth)\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "staff_workflow",
      normalized_label: "Strong team communication",
      evidence_text: excerptEvidence(trimmed, /\b(?:communication|worked well|consistent team)\b/i),
      confidence: "medium",
    });
  }

  if (
    /\b(?:staff satisfaction|team satisfaction|retention)\b/i.test(trimmed) &&
    /\b(?:priorit|ongoing|important)\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "staff_workflow",
      normalized_label: "Staff satisfaction and retention priorities",
      evidence_text: excerptEvidence(trimmed, /\b(?:staff satisfaction|retention)\b/i),
      confidence: "medium",
    });
  }

  const evaluationContact = trimmed.match(
    /\b(?:spoke with|met with|talked with|introduced to)\s+([A-Z][a-z]+)\b[^.!?]{0,140}\b(?:interested|interest)\b[^.!?]{0,80}\bevaluation\b/i,
  );
  if (evaluationContact?.[1]) {
    const name = normalizeSchedulerPersonName(evaluationContact[1]);
    if (name && isPlausiblePersonName(name)) {
      pushContactRoleSignal(
        signals,
        seen,
        {
          concept: "contact_role",
          normalized_label: `${name} · Evaluation Contact`,
          evidence_text: excerptEvidence(trimmed, new RegExp(`\\b${name}\\b`, "i")),
          confidence: "high",
          person_mentioned: name,
        },
        options?.providerName,
      );
    }
  }

  const schedulerContact = extractSchedulerContact(trimmed);
  if (schedulerContact) {
    pushContactRoleSignal(
      signals,
      seen,
      {
        concept: "contact_role",
        normalized_label: `${schedulerContact.name} · ${schedulerContact.role}`,
        evidence_text: excerptEvidence(trimmed, new RegExp(`\\b${schedulerContact.name}\\b`, "i")),
        confidence: "high",
        person_mentioned: schedulerContact.name,
      },
      options?.providerName,
    );
  }

  const surgicalStaffContact = extractNamedSurgicalStaffContact(trimmed);
  if (surgicalStaffContact && isPlausiblePersonName(surgicalStaffContact.name)) {
    pushContactRoleSignal(
      signals,
      seen,
      {
        concept: "contact_role",
        normalized_label: `${surgicalStaffContact.name} · ${surgicalStaffContact.role}`,
        evidence_text: excerptEvidence(trimmed, new RegExp(`\\b${surgicalStaffContact.name}\\b`, "i")),
        confidence: "high",
        person_mentioned: surgicalStaffContact.name,
      },
      options?.providerName,
    );
  }

  const roleOnlyContact = trimmed.match(/\b((?:OR|office)\s+manager)\b/i);
  if (roleOnlyContact?.[1]) {
    const role = roleLabelFromContactEvidence(roleOnlyContact[1]);
    pushUnique(signals, seen, {
      concept: "contact_role",
      normalized_label: role,
      evidence_text: excerptEvidence(trimmed, /\b(?:OR|office)\s+manager\b/i),
      confidence: "medium",
    });
  }

  // Unnamed scheduler still matters for access ("the scheduler… best contact").
  if (
    !schedulerContact &&
    /\b(?:the\s+)?scheduler\b/i.test(trimmed) &&
    /\b(?:best contact|scheduling contact|arranging|future observations?|reach(?:ing)?\s+out|stopped by|confirmed)\b/i.test(
      trimmed,
    )
  ) {
    pushUnique(signals, seen, {
      concept: "contact_role",
      normalized_label: "Scheduling Coordinator",
      evidence_text: excerptEvidence(
        trimmed,
        /\b(?:scheduler|best contact|arranging|future observations?|reach(?:ing)?\s+out)\b/i,
      ),
      confidence: "medium",
    });
  }

  if (
    /\bbest contact\b/i.test(trimmed) &&
    /\b(?:arranging|scheduling|future observations?|observations?)\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "access_pathway",
      normalized_label: "Scheduler identified as best contact for future observations",
      evidence_text: excerptEvidence(trimmed, /\bbest contact\b/i),
      confidence: "high",
    });
  }

  const nextStepMatch = trimmed.match(/\b(?:my |best )?next step is to\b[^.!?]{0,160}/i);
  const nextStepsMatch =
    nextStepMatch?.[0] ??
    trimmed.match(/\basked me to email\b[^.!?]{0,160}/i)?.[0] ??
    trimmed.match(/\basked me to send\b[^.!?]{0,160}/i)?.[0] ??
    trimmed.match(
      /\bi told (?:him|her|them|(?:the )?(?:provider|surgeon|doctor|dr\.?\s+[a-z]+))\b[^.!?]{0,160}/i,
    )?.[0] ??
    trimmed.match(/\bneed\s+to\b[^.!?]{0,200}/i)?.[0] ??
    trimmed.match(/\bnext steps? (?:are|were|will be|is) to\b[^.!?]{0,200}/i)?.[0] ??
    trimmed.match(/\b(?:send|share|email|text)\s+(?:him|her|them|the provider|the surgeon|dr\.?\s+[A-Z][a-z]+)?\s*[^.!?]{0,120}?\b(?:clinical data|data|paper|study|studies|comparison|materials?|product information|information|dates?|available)\b[^.!?]{0,80}/i)?.[0] ??
    trimmed.match(/\bfollow(?:ing)?\s+up\s+(?:with\s+)?[^.!?]{0,120}/i)?.[0] ??
    trimmed.match(/\bother\s+than\s+following\s+up\s+with\b[^.!?]{0,120}/i)?.[0];
  if (nextStepsMatch) {
    pushNextActionSignals(signals, seen, nextStepsMatch);
  }

  // Additional next steps when the primary matcher already fired on a different clause.
  const emailClinicalMatch = trimmed.match(/\basked me to email\b[^.!?]{0,160}/i)?.[0];
  if (emailClinicalMatch && emailClinicalMatch !== nextStepsMatch) {
    pushNextActionSignals(signals, seen, emailClinicalMatch);
  }
  const sendDatesMatch = trimmed.match(/\basked me to send\b[^.!?]{0,160}\bdates?\b[^.!?]{0,80}/i)?.[0];
  if (sendDatesMatch && sendDatesMatch !== nextStepsMatch) {
    pushNextActionSignals(signals, seen, sendDatesMatch);
  }

  const timedOutreachMatch = trimmed.match(
    /\b(?:asked me to |asked to |told me to |suggested\s+)?reach(?:ing)?\s+out\b[^.!?]{0,80}\b((?:in\s+about\s+)?(?:\d+|one|two|three|four|five|six|a\s+couple(?:\s+of)?)\s+weeks?)\b[^.!?]{0,120}/i,
  );
  if (timedOutreachMatch?.[0]) {
    const when = (timedOutreachMatch[1] ?? "soon").trim().replace(/\s+/g, " ");
    pushUnique(signals, seen, {
      concept: "next_action",
      normalized_label: when.toLowerCase().startsWith("in ")
        ? `Reach out ${when}`
        : `Reach out in ${when}`,
      evidence_text: timedOutreachMatch[0].trim(),
      confidence: "high",
    });
  }

  if (
    /\bwilling to evaluate\b/i.test(trimmed) ||
    /\bevaluate\b[^.!?]{0,100}\bduring another observation\b/i.test(trimmed)
  ) {
    pushUnique(signals, seen, {
      concept: "next_action",
      normalized_label: "Evaluate on a later observation if evidence looks compelling",
      evidence_text: excerptEvidence(trimmed, /\b(?:willing to evaluate|evaluate|another observation|compelling)\b/i),
      confidence: "high",
    });
  }

  return signals.filter((signal) => {
    if (signal.concept !== "product_interest") return true;
    return !shouldSuppressProductInterestForCurrentUsage({
      evidence: signal.evidence_text,
      product: signal.product_mentioned,
      fullText: trimmed,
    });
  });
}

/** Guard against commercial-language false positives for product substitution facts. */
export function fragmentExpressesProductSubstitution(fragment: string): boolean {
  const evidence = fragment.trim();
  if (!/\balternative\b/i.test(evidence)) return false;
  if (/\balternative solutions?\b/i.test(evidence)) return false;
  return /\b(?:used|implant|product|screw|plate|substitut|item)\b/i.test(evidence);
}
