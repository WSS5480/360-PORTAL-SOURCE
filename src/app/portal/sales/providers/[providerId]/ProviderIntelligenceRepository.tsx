"use client";

import Link from "next/link";
import React from "react";
import { sc } from "@/components/sales/salesCommandUi";

import {
  buildProviderIntelligenceKnowledgeDashboardView,
  type FieldBriefingChip,
  type FieldBriefingEvidenceCard,
  type FieldBriefingPerson,
  type FieldBriefingProgress,
  type FieldBriefingPulse,
  type FieldBriefingPulseTone,
} from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import { ProviderFollowUpItemsSection } from "./ProviderFollowUpItemsSection";
import { useProviderFollowUpItems } from "./useProviderFollowUpItems";
import { buildDebriefNarrativeDossierHints } from "@/lib/surgical-sales/engagements/buildDebriefNarrativeIntelligenceHints";
import {
  aggregateProviderDossierItems,
  dossierAggregationBucketKey,
  findDossierAggregationBucketKey,
  formatDossierObservationCount,
  pickPreferredDossierLabel,
} from "@/lib/surgical-sales/providerDossierAggregation";
import { isGenericClinicalFactText } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import {
  isIncompleteSentenceFragment,
  isLowQualityIntelligenceText,
  isRawFragmentUnsuitableForCard,
} from "@/lib/surgical-sales/operationalIntelligenceDisplay";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderDebriefNarrativeContext } from "@/lib/surgical-sales/engagements/loadLatestProviderDebriefNarrative";
import type { ProviderCaseIntelligenceRollup } from "@/lib/surgical-sales/buildProviderObservationIntelligenceRollup";
import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderPathwayExecutionAction } from "@/lib/surgical-sales/providerPathwayExecutionRouting";
import { REP_INTELLIGENCE_VOCAB } from "@/lib/surgical-sales/intelligenceCapture/repIntelligenceVocabulary";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type { ProviderActivityTimelineItem } from "@/lib/surgical-sales/buildProviderActivityTimeline";
import type { ProviderAiSalesBriefing } from "@/lib/surgical-sales/generateProviderAiSalesBriefing";
import {
  countPendingIntelligenceSuggestions,
  readPendingIntelligenceCaptures,
} from "@/lib/surgical-sales/pendingIntelligenceCapture";
import { PendingIntelligenceReviewModal } from "@/components/sales/aiNoteCapture/PendingIntelligenceReviewModal";
import {
  dismissProviderCandidateContact,
  listActiveSuggestedContacts,
  type CandidateContactIntelligence,
} from "@/lib/surgical-sales/candidateContactIntelligence";
import {
  CandidateAcceptScopeModal,
  CandidateEditAcceptModal,
} from "./CandidateContactReviewModals";
import {
  normalizePersonMatchKey,
  saveAcceptedCandidateContact,
} from "./candidateContactReviewHelpers";
import type { SchedulingContactOwnershipType } from "@/lib/surgical-sales/operationalSupportContact";

import {
  ProviderCommandMetricCard,
  type CommandMetricTone,
} from "./ProviderCommandMetricCard";
import { ProviderOrganizationSuggestedContextPanel } from "./ProviderOrganizationSuggestedContextPanel";

type SectionIconKind = "snapshot" | "case" | "people" | "evidence" | "signals" | "timeline";

/** Decorative stroke icons for section identity — purely presentational. */
function SectionIcon({ kind }: { kind: SectionIconKind }) {
  const paths: Record<SectionIconKind, React.ReactNode> = {
    snapshot: (
      <>
        <circle cx="12" cy="12" r="8.25" />
        <circle cx="12" cy="12" r="4.25" />
        <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
    case: (
      <>
        <rect x="5" y="4.5" width="14" height="16" rx="2.5" />
        <path d="M9 4.5v-1a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 3.5v1" />
        <path d="M8.5 12.5h2l1.25-2.75 1.5 5 1.25-2.25h1" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8.5" r="3.25" />
        <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
        <path d="M15.5 5.6a3.25 3.25 0 0 1 0 5.8" />
        <path d="M17.5 14.9c1.8.8 3 2.4 3 4.6" />
      </>
    ),
    evidence: (
      <>
        <circle cx="12" cy="12" r="8.25" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
    timeline: (
      <>
        <path d="M6 5.5h12" />
        <path d="M6 12h8" />
        <path d="M6 18.5h10" />
        <circle cx="17" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="19" cy="18.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="5.5" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
    signals: (
      <>
        <path d="M5 19v-4" />
        <path d="M10 19v-8" />
        <path d="M15 19V7" />
        <path d="M20 19V4" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {paths[kind]}
    </svg>
  );
}

function SectionHead({
  icon,
  kicker,
  title,
  titleId,
  titleClassName = "pib-section-head__title",
  meta,
}: {
  icon: SectionIconKind;
  kicker: string;
  title: string;
  titleId?: string;
  titleClassName?: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="pib-section-head">
      <span className={`pib-section-head__icon pib-section-head__icon--${icon}`} aria-hidden>
        <SectionIcon kind={icon} />
      </span>
      <div className="pib-section-head__copy">
        <p className="pib-section-head__kicker">{kicker}</p>
        <h2 id={titleId} className={titleClassName}>
          {title}
        </h2>
      </div>
      {meta ? <div className="pib-section-head__meta">{meta}</div> : null}
    </div>
  );
}

function personInitials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? "" : "";
  return `${first}${last}`.toUpperCase() || "?";
}

function pulseAccessTone(tone: FieldBriefingPulseTone): CommandMetricTone {
  if (tone === "success") return "ready";
  if (tone === "warning" || tone === "progress") return "progress";
  return "open";
}

function chipTone(variant: FieldBriefingChip["tone"]): CommandMetricTone {
  if (variant === "known") return "ready";
  if (variant === "gap") return "learning";
  return "action";
}

type ProviderDossierGroupId =
  | "workflow"
  | "products"
  | "friction"
  | "people-access";

type ProviderDossierItem = {
  id: string;
  text: string;
  detail?: string | null;
  chip?: FieldBriefingChip | null;
  evidenceCard?: FieldBriefingEvidenceCard | null;
  evidenceItems?: ProviderDossierItem[];
  observationCount?: number;
};

type ProviderDossierGroup = {
  id: ProviderDossierGroupId;
  title: string;
  description: string;
  items: ProviderDossierItem[];
};

const GENERIC_PROVIDER_DOSSIER_PATTERNS = [
  /^(?:pain point|pain-point)\s+captured\.?$/i,
  /^clinical\s+interest\s+identified\.?$/i,
  /^clinical\s+signal\s+captured\.?$/i,
  /^product\s+signal\s+captured\.?$/i,
  /^workflow\s+signal\s+captured\.?$/i,
  /^intelligence\s+captured\.?$/i,
  /^fact\s+captured\.?$/i,
  /^potential evaluation pathway$/i,
  /^observation access opportunity$/i,
  /^interested in observation$/i,
  /^observation approval confirmed$/i,
  /^scheduler contact captured$/i,
  /^credentialing required$/i,
  /^product fit may relate to visualization\/fixation workflow$/i,
  /^acsis fit may relate to suction access in tight anatomy$/i,
  /^debrief not ready yet$/i,
];

function normalizeDossierText(value: string): string {
  return value
    .toLowerCase()
    .replace(/^product interest:\s*/i, "")
    .replace(/^provider interest in\s+/i, "")
    .replace(/\s+centers on\s+/i, " ")
    .replace(/^product preference centers on\s+/i, "")
    .replace(/^workflow fit signal:\s*/i, "")
    .replace(/^competitor product\s+/i, "")
    .replace(/^current product:\s*/i, "")
    .replace(/\bwas used during the case\b/gi, "")
    .replace(/\bused during the case\b/gi, "")
    .replace(/\s+[-–—]\s+seen in .+$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isGenericDossierText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return GENERIC_PROVIDER_DOSSIER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function chipHasEvidence(chip: FieldBriefingChip): boolean {
  return Boolean(chip.evidenceQuote?.trim() || chip.evidenceSource?.trim() || chip.evidenceCapturedAt?.trim());
}

type DossierEvidenceEntry = {
  source: string | null;
  date: string | null;
  quote: string;
};

function dossierEvidenceLeaves(item: ProviderDossierItem): ProviderDossierItem[] {
  return item.evidenceItems?.length ? item.evidenceItems.flatMap(dossierEvidenceLeaves) : [item];
}

function dossierEvidenceLeafCopy(item: ProviderDossierItem): ProviderDossierItem {
  return {
    id: item.id,
    text: item.text,
    detail: item.detail,
    chip: item.chip,
    evidenceCard: item.evidenceCard,
  };
}

function normalizeEvidenceQuoteKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[“”"'.!?()[\]{}]/g, "")
    .replace(/\btodays?\b/g, "today")
    .replace(/\s+/g, " ")
    .trim();
}

function formatEvidenceDateLabel(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return trimmed;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function dossierEvidenceEntriesForItem(item: ProviderDossierItem): DossierEvidenceEntry[] {
  const entries: DossierEvidenceEntry[] = [];
  const chipQuote = item.chip?.evidenceQuote?.trim();
  if (chipQuote) {
    entries.push({
      source: signalSourceLabel(item.chip?.evidenceSource),
      date: formatEvidenceDateLabel(item.chip?.evidenceCapturedAt),
      quote: chipQuote,
    });
  }

  const cardQuote = item.evidenceCard ? quoteForEvidenceCard(item.evidenceCard) : null;
  if (cardQuote) {
    entries.push({
      source: item.evidenceCard?.sourceTypeLabel ?? null,
      date: item.evidenceCard?.sourceDateLabel ?? item.evidenceCard?.dateLabel ?? null,
      quote: cardQuote,
    });
  }

  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = normalizeEvidenceQuoteKey(entry.quote);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function DossierEvidenceDisclosure({
  items,
  evidenceEntryFilter,
}: {
  items: ProviderDossierItem[];
  evidenceEntryFilter?: (entry: DossierEvidenceEntry) => boolean;
}) {
  const seen = new Set<string>();
  let entries = items.flatMap(dossierEvidenceLeaves).flatMap(dossierEvidenceEntriesForItem).filter((entry) => {
    if (evidenceEntryFilter && !evidenceEntryFilter(entry)) return false;
    const key = normalizeEvidenceQuoteKey(entry.quote);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (entries.length > 1) {
    entries = entries.filter((entry) => {
      if (!/^(?:current product|competitor product|product interest|workflow fit signal):/i.test(entry.quote.trim())) {
        return true;
      }
      const product = entry.quote.match(/:\s*([^.;"\n]+)/)?.[1]?.trim().toLowerCase();
      if (!product) return false;
      return !entries.some((other) => other !== entry && other.quote.toLowerCase().includes(product));
    });
  }
  if (entries.length === 0) return null;

  return (
    <details className="pib-fact-evidence">
      <summary className="pib-fact-evidence__summary">
        {entries.length > 1 ? `Evidence (${entries.length})` : "Evidence"}
      </summary>
      <div className="pib-fact-evidence__body">
        <p className="pib-fact-evidence__heading">Evidence</p>
        {entries.map((entry, index) => (
          <article key={`${entry.quote}-${index}`} className="pib-fact-evidence__item">
            <p className="pib-fact-evidence__meta">
              {entry.source ? <span>{entry.source}</span> : null}
              {entry.date ? <span>{entry.date}</span> : null}
            </p>
            <blockquote className="pib-fact-evidence__quote">&ldquo;{entry.quote}&rdquo;</blockquote>
          </article>
        ))}
      </div>
    </details>
  );
}

function CandidateEvidenceDisclosure({ candidate }: { candidate: CandidateContactIntelligence }) {
  const quote = candidate.source_quote?.trim();
  if (!quote) return null;
  return (
    <details className="pib-fact-evidence pib-fact-evidence--people">
      <summary className="pib-fact-evidence__summary">Evidence</summary>
      <div className="pib-fact-evidence__body">
        <p className="pib-fact-evidence__heading">Evidence</p>
        <article className="pib-fact-evidence__item">
          <p className="pib-fact-evidence__meta">
            {candidate.source_reference ? <span>{signalSourceLabel(candidate.source_reference)}</span> : null}
            {candidate.captured_at ? <span>{formatEvidenceDateLabel(candidate.captured_at)}</span> : null}
          </p>
          <blockquote className="pib-fact-evidence__quote">&ldquo;{quote}&rdquo;</blockquote>
        </article>
      </div>
    </details>
  );
}

function isUnsuitableDossierText(text: string, evidenceQuote?: string | null): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (isGenericDossierText(trimmed)) return true;
  if (isIncompleteSentenceFragment(trimmed)) return true;
  if (isLowQualityIntelligenceText(trimmed)) return true;
  if (isRawFragmentUnsuitableForCard(trimmed, evidenceQuote)) return true;
  if (/^during an actual\b/i.test(trimmed)) return true;
  if (/\bbefore making any decisions\b/i.test(trimmed) && trimmed.split(/\s+/).length <= 14) return true;
  if (/^(?:jessica|he|she|they|provider|dr\.)\s+(?:mentioned|said|still wants|looked over)\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

function synthesizeDossierOperationalLine(cleaned: string): string | null {
  if (
    /\b(?:observe|observation|actual case)\b/i.test(cleaned) &&
    /\b(?:before|prior to)\b/i.test(cleaned) &&
    /\b(?:decision|evaluation|trial|product)\b/i.test(cleaned)
  ) {
    return "Prefers to observe during a live case before making product decisions.";
  }
  if (/\brobotic ventral hernia repair\b/i.test(cleaned) && /\b(?:two weeks|observation|opportunity|scheduling)\b/i.test(cleaned)) {
    return "Robotic ventral hernia repair case in ~2 weeks may be an observation opportunity.";
  }
  if (/\blarger ventral defects?\b/i.test(cleaned) && /\b(?:volume|increasing|higher volume)\b/i.test(cleaned)) {
    return "Higher volume of larger ventral defects lately.";
  }
  if (/\bposition(?:ing)?\b/i.test(cleaned) && /\b(?:laparoscop|defect|mesh)\b/i.test(cleaned)) {
    return "Focused on products that are easier to position laparoscopically in larger defects.";
  }
  return null;
}

function cleanTranscriptPhrasing(value: string): string {
  return value
    .replace(/^product interest:\s*/i, "")
    .replace(/^workflow fit signal:\s*/i, "")
    .replace(/^staff reported:\s*/i, "")
    .replace(/\b(?:he|she|they|provider|rep)\s+(?:said|asked|mentioned|reported|told us|noted)\s+(?:that\s+)?/gi, "")
    .replace(/\b(?:i|we)\s+(?:will|should|need to|plan to|can)\b[^.!?]*[.!?]?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeProductInterestStatement(text: string): string | null {
  const cleaned = cleanTranscriptPhrasing(text)
    .replace(/^product interest:\s*/i, "")
    .replace(/^acsis interest:\s*/i, "")
    .trim();
  if (!cleaned) return null;
  if (/^observation interest$/i.test(cleaned) || /^interested in observation$/i.test(cleaned)) {
    return null;
  }
  if (/^ACSIS\b/i.test(cleaned)) {
    const remainder = cleaned.replace(/^ACSIS\s*/i, "").replace(/^interest\s*/i, "").trim();
    return remainder ? `Provider interest in ACSIS centers on ${remainder}.` : "Provider has active interest in ACSIS.";
  }
  if (/^wants published outcomes/i.test(cleaned) || /^comparative clinical data interest$/i.test(cleaned)) {
    return `Provider ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}.`;
  }
  return `Product preference centers on ${cleaned}.`;
}

function normalizeProductFactStatement(text: string): string | null {
  const cleaned = cleanTranscriptPhrasing(text).replace(/[.!?]+$/, "").trim();
  if (!cleaned) return null;
  if (/competitor identified/i.test(cleaned)) return "A competitor product is in the current product picture.";
  if (/^current product identified:/i.test(text)) {
    return `Current product: ${cleanProductNameForDossier(cleaned.replace(/^current product identified\s*:?\s*/i, ""))}.`;
  }
  if (/^current product:/i.test(text)) {
    return `Current product: ${cleanProductNameForDossier(cleaned.replace(/^current product\s*:?\s*/i, ""))}.`;
  }
  if (/^competitor product/i.test(text)) {
    return `Current product: ${cleanProductNameForDossier(cleaned.replace(/^competitor product\s*:?\s*/i, ""))}.`;
  }
  return null;
}

function cleanProductNameForDossier(raw: string): string {
  return raw
    .replace(/^(?:current|competitor)\s+product\s*:?\s*/i, "")
    .replace(/^[\s:–—-]+/, "")
    .replace(/[.!?]+$/, "")
    .trim();
}

function productNameFromDossierText(text: string): string | null {
  if (/^a competitor product is in the current product picture\.?$/i.test(text.trim())) return null;
  const usedRollup = text.match(/^(.+?)\s+was used during\b/i)?.[1]?.trim();
  if (usedRollup) return cleanProductNameForDossier(usedRollup);
  const usedCurrent = text.match(/^(.+?)\s+(?:was\s+)?used during (?:the )?case(?:\s+in\s+\d+\s+completed case)?\s+is part of the current product mix\.?$/i)?.[1]?.trim();
  if (usedCurrent) return cleanProductNameForDossier(usedCurrent);
  const current = text.match(/^(.+?)\s+is part of the current product mix\.?$/i)?.[1]?.trim();
  if (current) return cleanProductNameForDossier(current);
  const currentProduct = text.match(/^current product:\s*(.+?)\.?$/i)?.[1]?.trim();
  if (currentProduct) return cleanProductNameForDossier(currentProduct);
  const identified = text.match(/^current product identified:\s*(.+?)\.?$/i)?.[1]?.trim();
  if (identified) return cleanProductNameForDossier(identified);
  const competitor = text.match(/^(.+?)\s+is the competitor product on file\.?$/i)?.[1]?.trim();
  if (competitor) return cleanProductNameForDossier(competitor);
  const used = text.match(/^(.+?)\s+(?:was\s+)?used during (?:the )?case(?:\s+in\s+\d+\s+completed case)?\.?$/i)?.[1]?.trim();
  if (used) return cleanProductNameForDossier(used);
  const captured = text.match(/^(.+?)\s+was captured in the current case note/i)?.[1]?.trim();
  if (captured) return cleanProductNameForDossier(captured);
  return null;
}

function productNameFromDossierItem(item: ProviderDossierItem): string | null {
  const textProduct = productNameFromDossierText(item.text);
  if (textProduct) return textProduct;

  for (const entry of dossierEvidenceEntriesForItem(item)) {
    const current = entry.quote.match(/\bcurrent product:\s*([^.;"\n]+)/i)?.[1]?.trim();
    if (current) return cleanProductNameForDossier(current);
    const used = entry.quote.match(/\b(?:used|using)\s+([A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){0,4}\s+(?:Mesh|Graft|Implant|System))\b/i)?.[1]?.trim();
    if (used) return cleanProductNameForDossier(used);
  }

  return null;
}

function normalizeProductNameKey(raw: string): string {
  return cleanProductNameForDossier(raw)
    .toLowerCase()
    .replace(/\b(?:current|competitor|product|picture|file|used|during|case|captured|note|completed|in|the|is|was|on)\b/g, " ")
    .replace(/\d+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function productKeysReferToSameProduct(left: string, right: string): boolean {
  if (left === right) return true;
  const leftWords = left.split(/\s+/).filter(Boolean);
  const rightWords = right.split(/\s+/).filter(Boolean);
  if (leftWords.length === 0 || rightWords.length === 0) return false;
  const leftSet = new Set(leftWords);
  const rightSet = new Set(rightWords);
  return leftWords.every((word) => rightSet.has(word)) || rightWords.every((word) => leftSet.has(word));
}

function canonicalProductDossierItems(items: ProviderDossierItem[]): ProviderDossierItem[] {
  const productItems = items.filter((item) => productNameFromDossierItem(item));
  if (productItems.length === 0) return items;

  const byProduct = new Map<string, ProviderDossierItem[]>();
  for (const item of productItems) {
    const product = productNameFromDossierItem(item);
    if (!product) continue;
    const key = normalizeProductNameKey(product);
    if (!key) continue;
    const existingKey = [...byProduct.keys()].find((candidate) => productKeysReferToSameProduct(candidate, key));
    if (existingKey) {
      const canonicalKey = key.length > existingKey.length ? key : existingKey;
      const existingItems = byProduct.get(existingKey) ?? [];
      if (canonicalKey !== existingKey) byProduct.delete(existingKey);
      byProduct.set(canonicalKey, [...existingItems, item]);
    } else {
      byProduct.set(key, [item]);
    }
  }

  const replacements = new Map<ProviderDossierItem, ProviderDossierItem>();
  const duplicates = new Set<ProviderDossierItem>();
  for (const groupedItems of byProduct.values()) {
    const displayProduct =
      groupedItems
        .map((item) => productNameFromDossierItem(item) ?? "")
        .sort((a, b) => b.length - a.length)[0] ?? "";
    const base = groupedItems[0];
    if (!base || !displayProduct) continue;
    replacements.set(base, {
      ...base,
      text: `Current product: ${displayProduct}.`,
      evidenceItems: groupedItems.flatMap(dossierEvidenceLeaves),
    });
    for (const duplicate of groupedItems.slice(1)) duplicates.add(duplicate);
  }

  return items.filter((item) => !duplicates.has(item)).map((item) => replacements.get(item) ?? item);
}

function normalizeDossierDisplayText(text: string, groupId: ProviderDossierGroupId): string | null {
  const cleaned = cleanTranscriptPhrasing(text)
    .replace(/[.!?]+$/, "")
    .trim();
  if (!cleaned) return null;

  const synthesized = synthesizeDossierOperationalLine(cleaned);
  if (synthesized) return synthesized;

  if (isUnsuitableDossierText(cleaned)) return null;
  if (/^(?:send|share|email|text|call|follow up|schedule)\b/i.test(cleaned)) return null;

  if (/^product interest:/i.test(text) || /\binterest\b/i.test(cleaned)) {
    return normalizeProductInterestStatement(cleaned);
  }

  if (groupId === "products") {
    const productFact = normalizeProductFactStatement(text);
    if (productFact) return productFact;
  }

  const productUsed = cleaned.match(/^(.+?)\s+(?:was\s+)?used during (?:the )?case$/i);
  if (productUsed?.[1]) {
    return `Current product: ${productUsed[1].trim()}.`;
  }

  if (/challenge|friction|delay|pooled|tight|visualization|fixation|suction|setup/i.test(cleaned)) {
    const sentence = cleaned
      .replace(/^challenge\s+/i, "")
      .replace(/^current setup:\s*/i, "")
      .trim();
    const normalized = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    return normalized.endsWith(".") ? normalized : `${normalized}.`;
  }

  if (groupId === "people-access") return cleaned;

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1) + ".";
}

function evidenceCardDisplayTexts(card: FieldBriefingEvidenceCard): string[] {
  const labels = card.intelligenceImpacts.map((item) => item.label.trim()).filter(Boolean);
  const mapped = card.mappedFieldLabel?.trim();
  const title = card.title.trim();
  const candidates = labels.length > 0 ? labels : [mapped || title].filter(Boolean);
  return candidates.filter((candidate) => {
    if (!candidate || /intro call|debrief|field note|observation note|source/i.test(candidate)) return false;
    if (/^\d+\s+of\s+\d+\s+observation cases complete|case note captured/i.test(candidate)) return false;
    if (/^observation interest$/i.test(candidate) || /^observation approval confirmed$/i.test(candidate)) {
      return false;
    }
    if (isGenericDossierText(candidate)) return false;
    return true;
  });
}

function groupForDossierText(text: string): ProviderDossierGroupId {
  if (/scheduler|credential|approval|access|contact|relationship|coordinator/i.test(text)) {
    return "people-access";
  }
  if (/^current product|^competitor product|product interest|provider interest|product preference|preference|interest|mesh|graft|acsis|device/i.test(text)) {
    return "products";
  }
  if (/challenge|friction|pain|delay|pooled|tight|visualization|fixation|suction|setup|bottleneck/i.test(text)) {
    return "friction";
  }
  if (/product|competitor|preference|interest|mesh|graft|acsis|device/i.test(text)) {
    return "products";
  }
  return "workflow";
}

function isGenericSchedulerDossierItem(item: ProviderDossierItem): boolean {
  const text = item.text.trim();
  return /^(?:scheduler|scheduling|coordinator|contact|access)\s+(?:contact\s+)?(?:captured|referenced|identified|known|details\s+incomplete|decision\s+required)$/i.test(
    text,
  ) || /^contact\s+(?:details\s+incomplete|decision\s+required)$/i.test(text);
}

function isNamedSchedulerDossierItem(item: ProviderDossierItem): boolean {
  const text = item.text.trim();
  if (!/\b(?:scheduler|scheduling|coordinator|coordination)\b/i.test(text)) return false;
  const namePart = text.split(/\s+[—-]\s+/)[0]?.trim() ?? "";
  return /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}$/.test(namePart);
}

function contactFieldHasEvidenceMeta(contact: Record<string, unknown>, fieldKey: string): boolean {
  const metaMap = contact.provider_intelligence_field_metadata;
  if (!metaMap || typeof metaMap !== "object") return false;
  const meta = (metaMap as Record<string, { evidence_text?: string }>)[fieldKey];
  return Boolean(String(meta?.evidence_text ?? "").trim());
}

function pushEvidenceBackedContactIntelligence(
  contact: Record<string, unknown> | undefined,
  push: (
    groupId: ProviderDossierGroupId,
    item: ProviderDossierItem,
    options?: { allowGeneric?: boolean },
  ) => void,
): void {
  if (!contact) return;

  const workflowPain = String(contact.provider_workflow_pain_points ?? "").trim();
  if (
    fieldHasIntelligenceSignal("provider_workflow_pain_points", workflowPain) &&
    !isGenericDossierText(workflowPain) &&
    !isGenericClinicalFactText(workflowPain)
  ) {
    push("friction", { id: "contact-workflow-pain", text: workflowPain });
  }

  const procedureFocus = String(contact.provider_procedure_focus ?? "").trim();
  if (
    fieldHasIntelligenceSignal("provider_procedure_focus", procedureFocus) &&
    contactFieldHasEvidenceMeta(contact, "provider_procedure_focus") &&
    !isGenericDossierText(procedureFocus) &&
    !isGenericClinicalFactText(procedureFocus)
  ) {
    push("workflow", { id: "contact-procedure-focus", text: procedureFocus });
  }

  const productInterests = String(contact.provider_product_interests ?? "").trim();
  if (
    fieldHasIntelligenceSignal("provider_product_interests", productInterests) &&
    contactFieldHasEvidenceMeta(contact, "provider_product_interests") &&
    !isGenericDossierText(productInterests)
  ) {
    push("products", {
      id: "contact-product-interests",
      text: productInterests.startsWith("Product interest:")
        ? productInterests
        : `Product interest: ${productInterests}`,
    });
  }

  const competitiveProducts = String(contact.provider_competitive_products ?? "").trim();
  if (
    fieldHasIntelligenceSignal("provider_competitive_products", competitiveProducts) &&
    contactFieldHasEvidenceMeta(contact, "provider_competitive_products") &&
    !isGenericDossierText(competitiveProducts)
  ) {
    for (const product of competitiveProducts
      .split(/[,;·|]/)
      .map((part) => part.trim())
      .filter(Boolean)) {
      push("products", {
        id: `contact-current-product-${normalizeDossierText(product)}`,
        text: `Current product: ${product}.`,
      });
    }
  }

  const schedulingDays = String(contact.provider_observation_best_days_case_types ?? "").trim();
  if (
    fieldHasIntelligenceSignal("provider_observation_best_days_case_types", schedulingDays) &&
    contactFieldHasEvidenceMeta(contact, "provider_observation_best_days_case_types") &&
    !isGenericDossierText(schedulingDays)
  ) {
    push("workflow", { id: "contact-scheduling-preference", text: schedulingDays });
  }
}

function collapseGenericPeopleAccessItems(groups: ProviderDossierGroup[]): void {
  const peopleAccess = groups.find((group) => group.id === "people-access");
  if (!peopleAccess) return;
  const hasNamedScheduler = peopleAccess.items.some(isNamedSchedulerDossierItem);
  if (!hasNamedScheduler) return;
  peopleAccess.items = peopleAccess.items.filter((item) => !isGenericSchedulerDossierItem(item));
}

export function buildProviderDossierGroups(input: {
  emergingSignals: FieldBriefingChip[];
  commercialMeaning: FieldBriefingChip[];
  keyPeople: FieldBriefingPerson[];
  caseIntelligence: ProviderCaseIntelligenceRollup | null;
  evidenceCards: FieldBriefingEvidenceCard[];
  contact?: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  narrativeFallback?: string | null;
}): ProviderDossierGroup[] {
  const groups: ProviderDossierGroup[] = [
    {
      id: "workflow",
      title: "Current Workflow",
      description: "Stable workflow facts that describe how this provider currently operates.",
      items: [],
    },
    {
      id: "products",
      title: "Products & Preferences",
      description: "Products, product preferences, and durable product interest.",
      items: [],
    },
    {
      id: "friction",
      title: "Challenges & Friction",
      description: "Repeated problems, constraints, or product-fit openings worth remembering.",
      items: [],
    },
    {
      id: "people-access",
      title: "People & Access",
      description: "Who matters for access and what is known about the pathway.",
      items: [],
    },
  ];
  const byId = new Map(groups.map((group) => [group.id, group]));
  const aggregatedItems = new Map<string, ProviderDossierItem>();

  const push = (
    groupId: ProviderDossierGroupId,
    item: ProviderDossierItem,
    options?: { allowGeneric?: boolean },
  ) => {
    const text = normalizeDossierDisplayText(item.text, groupId);
    if (!text) return;
    if (
      isUnsuitableDossierText(
        text,
        item.chip?.evidenceQuote ?? item.evidenceCard?.excerpt ?? item.evidenceCard?.sourceQuote,
      )
    ) {
      return;
    }
    if (!options?.allowGeneric && isGenericDossierText(text)) return;
    const personName = groupId === "people-access" ? text.split(/\s+[—-]\s+/)[0]?.trim() : null;
    const bucketKey =
      findDossierAggregationBucketKey({
        groupId,
        text,
        buckets: aggregatedItems,
      }) ??
      (personName
        ? `${groupId}:person:${normalizeDossierText(personName)}`
        : dossierAggregationBucketKey(groupId, text));
    if (!bucketKey) return;
    const existing = aggregatedItems.get(bucketKey);
    if (existing) {
      const incomingLeaf = dossierEvidenceLeafCopy({ ...item, text, detail: null });
      existing.evidenceItems = [
        ...(existing.evidenceItems ?? [dossierEvidenceLeafCopy(existing)]),
        incomingLeaf,
      ];
      existing.text = pickPreferredDossierLabel(existing.text, text);
      existing.observationCount = (existing.evidenceItems ?? []).length;
      return;
    }
    const normalizedItem = { ...item, text, detail: null, observationCount: 1 };
    aggregatedItems.set(bucketKey, normalizedItem);
    byId.get(groupId)?.items.push(normalizedItem);
  };

  for (const chip of input.emergingSignals) {
    if (isGenericClinicalFactText(chip.text)) continue;
    if (!chipHasEvidence(chip) && !chip.id.startsWith("case-signal")) continue;
    const text = chip.text.trim();
    const item = {
      id: `signal-${chip.id}`,
      text,
      detail: chip.description,
      chip,
    };
    if (/^product interest:/i.test(text)) {
      push("products", item);
    } else if (/scheduler|credential|approval|access|observation/i.test(text)) {
      push("people-access", item, { allowGeneric: /scheduler|credential/i.test(text) });
    } else if (/challenge|friction|pain|delay|pooled|tight|visualization|fixation|suction|setup/i.test(text)) {
      push("friction", item);
    } else if (/current product|competitor product|product mix|used during/i.test(text)) {
      push("products", item);
    } else {
      push(groupForDossierText(text), item);
    }
  }

  for (const chip of input.commercialMeaning) {
    if (!chipHasEvidence(chip)) continue;
    if (/product interest|provider interest|product preference|preference/i.test(chip.text)) continue;
    if (!/challenge|friction|pain|delay|pooled|tight|visualization|fixation|suction|setup/i.test(chip.text)) continue;
    push("friction", {
      id: `takeaway-${chip.id}`,
      text: chip.text,
      detail: chip.description,
      chip,
    });
  }

  for (const card of input.evidenceCards) {
    for (const text of evidenceCardDisplayTexts(card)) {
      push(groupForDossierText(text), {
        id: `evidence-${card.id}-${normalizeDossierText(text)}`,
        text,
        evidenceCard: card,
      });
    }
  }

  for (const person of input.keyPeople) {
    if (person.role.toLowerCase().includes("provider")) continue;
    push(
      "people-access",
      {
        id: `person-${person.id}`,
        text: `${person.name} — ${person.role}`,
        detail: person.missingInfo ?? person.whyTheyMatter,
      },
      { allowGeneric: true },
    );
  }

  const narrativeHints = buildDebriefNarrativeDossierHints({
    engagements: input.engagements,
    narrativeFallback: input.narrativeFallback,
  });
  if (narrativeHints) {
    if (narrativeHints.procedureFocus) {
      push("workflow", {
        id: "narrative-procedure-focus",
        text: narrativeHints.procedureFocus,
      });
    }
    for (const product of narrativeHints.currentProducts) {
      push("products", {
        id: `narrative-product-${normalizeDossierText(product)}`,
        text: `Current product: ${product}.`,
      });
    }
    for (const interest of narrativeHints.productInterests) {
      push("products", {
        id: `narrative-interest-${normalizeDossierText(interest)}`,
        text: interest.startsWith("Product interest:") ? interest : `Product interest: ${interest}`,
      });
    }
    for (const note of narrativeHints.workflowNotes) {
      push("workflow", {
        id: `narrative-workflow-${normalizeDossierText(note)}`,
        text: note,
      });
    }
    for (const friction of narrativeHints.positioningFrictions) {
      push("friction", {
        id: `narrative-friction-${normalizeDossierText(friction)}`,
        text: friction,
      });
    }
  }

  pushEvidenceBackedContactIntelligence(input.contact, push);

  collapseGenericPeopleAccessItems(groups);
  const productGroup = byId.get("products");
  if (productGroup) {
    productGroup.items = canonicalProductDossierItems(productGroup.items);
  }

  for (const group of groups) {
    group.items = aggregateProviderDossierItems(group.items, group.id);
  }

  return groups.some((group) => group.items.length > 0) ? groups : [];
}

function milestoneStateClass(
  state: FieldBriefingProgress["accessSteps"][number]["state"],
): string {
  if (state === "known") return "pib-access-milestone--complete";
  if (state === "partial") return "pib-access-milestone--current";
  return "pib-access-milestone--upcoming";
}

function providerAccessIsEstablished(progress: FieldBriefingProgress): boolean {
  return (
    progress.completionPercent >= 100 ||
    (progress.accessSteps.length > 0 && progress.accessSteps.every((step) => step.state === "known")) ||
    (progress.missingCount === 0 && progress.completionPercent >= 90)
  );
}

function AccessPathwaySection({
  progress,
  onExecutePathwayAction,
}: {
  progress: FieldBriefingProgress;
  onExecutePathwayAction?: (action: ProviderPathwayExecutionAction) => void;
}) {
  const accessEstablished = providerAccessIsEstablished(progress);

  if (accessEstablished) {
    return (
      <div className="pib-access-pathway" aria-label="Access established">
        <div className="pib-access-pathway__head">
          <h3 className="pib-access-pathway__title">Access Established</h3>
          <span className="pib-access-pathway__summary">{progress.completionLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pib-access-pathway" aria-label="Access pathway">
      <div className="pib-access-pathway__head">
        <h3 className="pib-access-pathway__title">{REP_INTELLIGENCE_VOCAB.accessPathway}</h3>
        <span className="pib-access-pathway__summary">{progress.completionLabel}</span>
      </div>
      <div className="pib-access-pathway__progress">
        <div className="pib-access-pathway__progress-bar" aria-hidden>
          <span
            className="pib-access-pathway__progress-fill"
            style={{ width: `${progress.completionPercent}%` }}
          />
        </div>
        <span className="pib-access-pathway__progress-value">{progress.completionPercent}%</span>
      </div>
      <ol className="pib-access-milestones">
        {progress.accessSteps.map((step) => {
          const pillClass = `pib-access-milestone ${milestoneStateClass(step.state)}`;

          if (step.actionable && step.action && onExecutePathwayAction) {
            return (
              <li key={step.id}>
                <button
                  type="button"
                  className={`${pillClass} pib-access-milestone-btn`}
                  title={step.actionLabel ?? step.label}
                  aria-label={`${step.label}. ${step.actionLabel ?? "Take action"}`}
                  onClick={() => onExecutePathwayAction(step.action!)}
                >
                  {step.label}
                </button>
              </li>
            );
          }

          return (
            <li key={step.id}>
              <span className={pillClass}>
                {step.label}
                {step.detailLine ? (
                  <span className="pib-access-milestone__detail">{step.detailLine}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function AccessPathwayPanel({
  progress,
  onExecutePathwayAction,
}: {
  progress: FieldBriefingProgress;
  onExecutePathwayAction?: (action: ProviderPathwayExecutionAction) => void;
}) {
  return (
    <section
      className="pov-cc-summary mc-surface mc-surface--raised"
      aria-labelledby="pib-access-title"
      data-testid="provider-access-pathway"
    >
      <SectionHead
        icon="snapshot"
        kicker="Access"
        title="Access Pathway"
        titleId="pib-access-title"
        titleClassName="pov-cc-summary__title pib-section-head__title"
      />
      <AccessPathwaySection progress={progress} onExecutePathwayAction={onExecutePathwayAction} />
    </section>
  );
}

function IntelligenceSnapshotSection({
  pulse,
  progress,
  onExecutePathwayAction,
}: {
  pulse: FieldBriefingPulse;
  progress: FieldBriefingProgress;
  onExecutePathwayAction?: (action: ProviderPathwayExecutionAction) => void;
}) {
  const unknownTone: CommandMetricTone = pulse.biggestUnknown ? "learning" : "open";

  return (
    <section
      className="pov-cc-intel-zone pov-cc-command-zone"
      aria-label="Intelligence snapshot"
      data-testid="provider-intelligence-reference"
    >
      <SectionHead
        icon="snapshot"
        kicker="Intelligence snapshot"
        title="Snapshot"
        titleClassName="pov-cc-intel-zone__title pib-section-head__title"
      />
      <div className="pov-cc-command-grid">
        <ProviderCommandMetricCard
          label={REP_INTELLIGENCE_VOCAB.biggestUnknown}
          value={pulse.biggestUnknown ?? REP_INTELLIGENCE_VOCAB.noCriticalUnknownsFlagged}
          detailLine={pulse.biggestUnknownSource}
          tone={unknownTone}
        />
        <ProviderCommandMetricCard
          label="Key relationship"
          value={
            pulse.mostImportantRelationship?.name ?? REP_INTELLIGENCE_VOCAB.noKeyRelationshipsIdentified
          }
          detailLine={
            pulse.mostImportantRelationship
              ? [pulse.mostImportantRelationship.role, pulse.mostImportantRelationshipSource]
                  .filter(Boolean)
                  .join(" · ")
              : null
          }
          tone={pulse.mostImportantRelationship ? "action" : "open"}
        />
        {pulse.strongestCommercialSignal ? (
          <ProviderCommandMetricCard
            label={REP_INTELLIGENCE_VOCAB.topOpportunity}
            value={pulse.strongestCommercialSignal}
            detailLine={pulse.strongestCommercialSignalSource}
            tone="action"
          />
        ) : null}
        <ProviderCommandMetricCard
          label="Access pathway"
          value={pulse.accessPathwayStatus}
          detailLine={pulse.accessPathwaySource}
          tone={pulseAccessTone(pulse.accessPathwayTone)}
        />
      </div>
      <AccessPathwaySection progress={progress} onExecutePathwayAction={onExecutePathwayAction} />
    </section>
  );
}

function CaseIntelligenceRollupCard({ rollup }: { rollup: ProviderCaseIntelligenceRollup }) {
  return (
    <section
      className="pov-cc-summary mc-surface mc-surface--raised"
      aria-labelledby="pib-case-intel-title"
      data-testid="provider-case-intelligence-rollup"
    >
      <div className="pib-case-intel__header">
        <div className="pib-section-head">
          <span className="pib-section-head__icon pib-section-head__icon--case" aria-hidden>
            <SectionIcon kind="case" />
          </span>
          <div className="pib-section-head__copy">
            <h2 id="pib-case-intel-title" className="pov-cc-summary__title pib-section-head__title">
              Cases
            </h2>
            <p className="pib-case-intel__subtitle">{rollup.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="pib-case-intel__status-row">
        <span className="pib-case-intel__pill">{rollup.maturityPill}</span>
        <span className="pib-case-intel__maturity">{rollup.evidenceMaturityLabel}</span>
      </div>

      <div className="pib-case-intel__grid">
        <article className="pov-cc-command-card pov-cc-command-card--ready">
          <h3 className="pov-cc-command-card__label">Observation History</h3>
          <p className="pov-cc-command-card__value">{rollup.observationProgressLabel}</p>
          <p className="pov-cc-command-card__detail">{rollup.capturedNotesLabel}</p>
        </article>

        <article className="pov-cc-command-card pov-cc-command-card--progress">
          <h3 className="pov-cc-command-card__label">Observed Trends</h3>
          <p className="pov-cc-command-card__value">{rollup.evidenceMaturityLabel}</p>
          <p className="pov-cc-command-card__detail">Case intelligence is summarized in the provider dossier below.</p>
        </article>
      </div>

      {rollup.detailsHref ? (
        <Link href={rollup.detailsHref} className="pov-cc-summary__link">
          {rollup.detailsLabel}
        </Link>
      ) : null}
    </section>
  );
}

function ProviderWhatWeKnowDossierSection({
  groups,
}: {
  groups: ProviderDossierGroup[];
}) {
  const visibleGroups = groups.filter((group) => group.items.length > 0);
  const factCount = visibleGroups.reduce((total, group) => total + group.items.length, 0);

  if (visibleGroups.length === 0) return null;

  return (
    <section
      className="pov-cc-summary mc-surface mc-surface--raised pib-dossier-section"
      aria-labelledby="pib-dossier-title"
      data-testid="provider-what-we-know-dossier"
    >
      <SectionHead
        icon="signals"
        kicker="Provider dossier"
        title="What We Know"
        titleId="pib-dossier-title"
        titleClassName="pov-cc-summary__title pib-section-head__title"
        meta={<span className="pib-evidence-count">{factCount} {factCount === 1 ? "fact" : "facts"}</span>}
      />
      <div className="pib-case-intel__grid">
        {visibleGroups.map((group) => (
          <ProviderDossierGroupCard key={group.id} group={group} />
        ))}
      </div>
    </section>
  );
}

function readableList(items: string[], limit = 3): string {
  const values = items.map((item) => item.replace(/[.!?]+$/, "").trim()).filter(Boolean).slice(0, limit);
  if (values.length === 0) return "";
  if (values.length === 1) return values[0]!;
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function ProviderDossierGroupCard({ group }: { group: ProviderDossierGroup }) {
  const isProductGroup = group.id === "products";
  const displayItems = isProductGroup ? canonicalProductDossierItems(group.items) : group.items;
  const countLabel = `${displayItems.length} ${displayItems.length === 1 ? "fact" : "facts"}`;
  return (
    <article className={`pov-cc-command-card pov-cc-command-card--ready pib-dossier-card pib-dossier-card--${group.id}`}>
      <div className="pib-dossier-card__head">
        <h3 className="pov-cc-command-card__label">{group.title}</h3>
        <span className="pib-dossier-card__count">{countLabel}</span>
      </div>
      <ul className="pib-case-intel__signal-list">
        {displayItems.map((item) => {
          const observationLabel = formatDossierObservationCount(item.observationCount ?? 1);
          return (
          <li key={item.id} className="pib-case-intel__signal">
            {item.text}
            {observationLabel ? (
              <span className="pib-dossier-card__obs-count"> · {observationLabel}</span>
            ) : null}
            {item.detail ? <span className="pov-cc-command-card__detail"> {item.detail}</span> : null}
            <DossierEvidenceDisclosure items={item.evidenceItems ?? [item]} />
          </li>
          );
        })}
      </ul>
    </article>
  );
}

function ProviderAiSummarySection({
  summary,
}: {
  summary?: ProviderAiSalesBriefing | null;
}) {
  if (!summary?.text) return null;
  return (
    <section className="pov-cc-summary mc-surface mc-surface--raised" data-testid="provider-ai-summary">
      <details className="pib-ai-summary-details" data-testid="provider-ai-summary-details">
        <summary>
          <SectionHead
            icon="snapshot"
            kicker="Sales briefing"
            title="AI Summary"
            titleClassName="pov-cc-summary__title pib-section-head__title"
            meta={
              <span className="pib-ai-summary-details__meta">
                <span className="pib-access-confirmed-badge" data-testid="provider-ai-summary-cache-badge">
                  {summary.engagementCount} engagements · {summary.evidenceCount} evidence items
                </span>
                <span className="pib-evidence-chevron" aria-hidden />
              </span>
            }
          />
        </summary>
        <p className="pov-cc-command-card__detail">{summary.text}</p>
      </details>
    </section>
  );
}

const SIGNAL_QUOTE_STOP_WORDS = new Set([
  "and",
  "are",
  "case",
  "cases",
  "captured",
  "contact",
  "current",
  "during",
  "interest",
  "observation",
  "product",
  "provider",
  "required",
  "signal",
  "the",
  "was",
  "with",
]);

function signalMatchTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !SIGNAL_QUOTE_STOP_WORDS.has(token));
}

function quoteForEvidenceCard(card: FieldBriefingEvidenceCard): string | null {
  return card.sourceQuote?.trim() || card.excerpt?.trim() || null;
}

function findSupportingEvidenceForSignal(
  chip: FieldBriefingChip,
  evidenceCards: FieldBriefingEvidenceCard[],
): FieldBriefingEvidenceCard | null {
  if (chip.evidenceQuote?.trim()) return null;

  const tokens = signalMatchTokens(`${chip.text} ${chip.description ?? ""}`);
  if (tokens.length === 0) return null;

  let best: { card: FieldBriefingEvidenceCard; score: number } | null = null;
  for (const card of evidenceCards) {
    const quote = quoteForEvidenceCard(card);
    if (!quote) continue;
    const haystack = [
      card.title,
      card.sourceTypeLabel,
      card.mappedFieldLabel,
      card.excerpt,
      card.sourceQuote,
      ...card.intelligenceImpacts.map((impact) => impact.label),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
    if (score > (best?.score ?? 0)) best = { card, score };
  }

  return best && best.score > 0 ? best.card : null;
}

function attachVisibleQuotesToSignals(
  chips: FieldBriefingChip[],
  evidenceCards: FieldBriefingEvidenceCard[],
): FieldBriefingChip[] {
  if (evidenceCards.length === 0) return chips;
  return chips.map((chip) => {
    if (chip.evidenceQuote?.trim()) return chip;
    const card = findSupportingEvidenceForSignal(chip, evidenceCards);
    if (!card) return chip;
    const quote = quoteForEvidenceCard(card);
    if (!quote) return chip;
    return {
      ...chip,
      evidenceQuote: quote,
      evidenceSource: chip.evidenceSource ?? card.sourceTypeLabel ?? card.title,
      evidenceCapturedAt: chip.evidenceCapturedAt ?? null,
    };
  });
}

function signalSourceLabel(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (/field[-_\s]?note/i.test(trimmed)) return "Field Note";
  if (/(?:universal|metadata|db_|source_|capture_id|pending:|engagement:|provider:)/i.test(trimmed)) {
    return "Saved field note";
  }
  return trimmed.replace(/_/g, " ");
}

function SignalsColumn({
  title,
  sectionId,
  emptyMessage,
  variant,
  chips,
  onExecutePathwayAction,
  onShowEvidence,
}: {
  title: string;
  sectionId: string;
  emptyMessage: string;
  variant: FieldBriefingChip["tone"];
  chips: FieldBriefingChip[];
  onExecutePathwayAction?: (action: ProviderPathwayExecutionAction) => void;
  onShowEvidence?: (chip: FieldBriefingChip) => void;
}) {
  const tone = chipTone(variant);

  return (
    <div className={`pib-signals-col pib-signals-col--${variant}`} aria-labelledby={sectionId}>
      <h3 id={sectionId} className="pib-signals-col__title">
        <span className="pib-signals-col__dot" aria-hidden />
        {title}
        <span className="pib-signals-col__count">{chips.length}</span>
      </h3>
      {chips.length === 0 ? (
        <p className="pib-signals-col__empty">{emptyMessage}</p>
      ) : (
        <ul className="pib-signals-col__list">
          {chips.map((chip) => {
            const card = (
              <article
                className={`pov-cc-command-card pov-cc-command-card--${tone}${chip.highlight ? " pov-cc-command-card--highlight" : ""}`}
              >
                <p className="pov-cc-command-card__value">{chip.text}</p>
                {chip.description ? (
                  <p className="pov-cc-command-card__detail">{chip.description}</p>
                ) : null}
                {chip.actionLabel ? (
                  <p className="pib-signal-card__action">{chip.actionLabel}</p>
                ) : null}
              </article>
            );

            const actionable = variant === "gap" && chip.action && onExecutePathwayAction;
            const evidenceActionable = variant !== "gap" && onShowEvidence;
            const displayCard =
              evidenceActionable && !chip.actionLabel ? (
                <article
                  className={`pov-cc-command-card pov-cc-command-card--${tone}${chip.highlight ? " pov-cc-command-card--highlight" : ""}`}
                >
                  <p className="pov-cc-command-card__value">{chip.text}</p>
                  {chip.description ? (
                    <p className="pov-cc-command-card__detail">{chip.description}</p>
                  ) : null}
                  <p className="pib-signal-card__action">View quote</p>
                </article>
              ) : (
                card
              );

            return (
              <li key={`${chip.id}:${chip.text}`}>
                {actionable ? (
                  <button
                    type="button"
                    className="pib-signal-card-btn"
                    onClick={() => onExecutePathwayAction(chip.action!)}
                    aria-label={`${chip.text}. ${chip.actionLabel ?? "Take action"}`}
                  >
                    {card}
                  </button>
                ) : evidenceActionable ? (
                  <button
                    type="button"
                    className="pib-signal-card-btn"
                    onClick={() => onShowEvidence(chip)}
                    aria-label={`${chip.text}. View quote`}
                  >
                    {displayCard}
                  </button>
                ) : (
                  card
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const KEY_PEOPLE_COMPACT_LIMIT = 3;

function personNeedsConfirmation(person: FieldBriefingPerson): boolean {
  if (person.missingInfo) return true;
  if (person.status === "referenced" || person.status === "partial") return true;
  return person.statusLabel.toLowerCase().includes("not captured");
}

function personStatusClass(person: FieldBriefingPerson): string {
  if (person.missingInfo) return "pib-people-status--missing";
  if (personNeedsConfirmation(person)) return "pib-people-status--needs";
  return "pib-people-status--confirmed";
}

function personStatusText(person: FieldBriefingPerson): string {
  if (person.missingInfo) return person.missingInfo;
  if (person.status === "referenced") return "Needs confirmation";
  if (person.statusLabel.toLowerCase().includes("not captured")) return "Needs confirmation";
  return person.statusLabel;
}

function personFromCandidate(candidate: CandidateContactIntelligence): FieldBriefingPerson {
  const role = candidate.contact_role?.trim() || "Mentioned contact";
  return {
    id: `candidate-${candidate.id}`,
    name: candidate.contact_name,
    role,
    importance: /schedul|coordinator|credential|access/i.test(`${role} ${candidate.workflow_role ?? ""}`)
      ? "critical"
      : "medium",
    importanceLabel: /schedul|coordinator|credential|access/i.test(`${role} ${candidate.workflow_role ?? ""}`)
      ? "Critical"
      : "Medium",
    status: "referenced",
    statusLabel: "Mentioned in field note",
    missingInfo: "Needs confirmation",
    whyTheyMatter: "Mentioned in field intelligence. Confirm whether this person should be added.",
    phone: null,
    email: null,
    href: null,
  };
}

function KeyPeopleSection({
  people,
  candidateContacts = [],
  busyCandidateId,
  onAcceptCandidate,
  onEditCandidate,
  onDismissCandidate,
}: {
  people: FieldBriefingPerson[];
  candidateContacts?: CandidateContactIntelligence[];
  busyCandidateId?: string | null;
  onAcceptCandidate?: (candidate: CandidateContactIntelligence) => void;
  onEditCandidate?: (candidate: CandidateContactIntelligence) => void;
  onDismissCandidate?: (candidate: CandidateContactIntelligence) => void;
}) {
  const candidateByName = React.useMemo(() => {
    const next = new Map<string, CandidateContactIntelligence>();
    for (const candidate of candidateContacts) {
      next.set(normalizePersonMatchKey(candidate.contact_name), candidate);
    }
    return next;
  }, [candidateContacts]);
  const rows = React.useMemo(() => {
    const used = new Set(people.map((person) => normalizePersonMatchKey(person.name)));
    const candidateOnly = candidateContacts
      .filter((candidate) => !used.has(normalizePersonMatchKey(candidate.contact_name)))
      .map(personFromCandidate);
    return [...people, ...candidateOnly];
  }, [candidateContacts, people]);
  const needsCount = rows.filter((person) => personNeedsConfirmation(person)).length;
  const visible = rows.slice(0, KEY_PEOPLE_COMPACT_LIMIT);
  const overflow = rows.length - visible.length;

  return (
    <section
      className="pib-people-section mc-surface mc-surface--raised"
      aria-labelledby="pib-people-title"
      data-testid="provider-key-people"
    >
      <div className="pib-people-section__head">
        <SectionHead
          icon="people"
          kicker="Relationship map"
          title="Relationship Map"
          titleId="pib-people-title"
          titleClassName="pib-section-head__title"
          meta={
            <span className="pib-people-summary">
              {rows.length} mapped
              {needsCount > 0 ? ` · ${needsCount} need confirmation` : ""}
            </span>
          }
        />
      </div>

      <ol className="pib-people-list" aria-label="Key people at this account">
        {visible.map((person) => {
          const candidate = candidateByName.get(normalizePersonMatchKey(person.name)) ?? null;
          const showCandidateActions = Boolean(candidate && personNeedsConfirmation(person));
          const row = (
            <article
              className={`pib-people-row pib-people-row--${person.importance}${personNeedsConfirmation(person) ? " pib-people-row--needs-attention" : ""}`}
            >
              <span className={`pib-people-avatar pib-people-avatar--${person.importance}`} aria-hidden>
                {personInitials(person.name)}
              </span>

              <div className="pib-people-body">
                <div className="pib-people-body__top">
                  <h3 className="pib-people-name">{person.name}</h3>
                  <span className={`pib-people-status ${personStatusClass(person)}`}>
                    {personStatusText(person)}
                  </span>
                </div>
                <p className="pib-people-role">
                  <span className="pib-people-role__label">{person.role}</span>
                  {person.importance === "critical" ? (
                    <span className="pib-people-importance pib-people-importance--critical">
                      {person.importanceLabel}
                    </span>
                  ) : person.importance === "high" ? (
                    <span className="pib-people-importance pib-people-importance--high">
                      {person.importanceLabel}
                    </span>
                  ) : null}
                </p>
                <p className="pib-people-why">{person.whyTheyMatter}</p>
                {showCandidateActions && candidate ? <CandidateEvidenceDisclosure candidate={candidate} /> : null}
                {person.phone || person.email ? (
                  <div className="pib-people-contact" aria-label="Contact details">
                    {person.phone ? <span className="pib-people-contact__item">{person.phone}</span> : null}
                    {person.email ? <span className="pib-people-contact__item">{person.email}</span> : null}
                  </div>
                ) : null}
                {showCandidateActions && candidate ? (
                  <div className="pib-people-review-actions" aria-label={`Review ${person.name} contact suggestion`}>
                    <button
                      type="button"
                      className="pib-people-review-actions__button pib-people-review-actions__button--primary"
                      disabled={busyCandidateId === candidate.id}
                      onClick={() => onAcceptCandidate?.(candidate)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="pib-people-review-actions__button"
                      disabled={busyCandidateId === candidate.id}
                      onClick={() => onEditCandidate?.(candidate)}
                    >
                      Edit &amp; accept
                    </button>
                    <button
                      type="button"
                      className="pib-people-review-actions__button pib-people-review-actions__button--muted"
                      disabled={busyCandidateId === candidate.id}
                      onClick={() => onDismissCandidate?.(candidate)}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          );

          return (
            <li key={person.id} className="pib-people-list__item">
              {person.href && !showCandidateActions ? (
                <Link href={person.href} className="pib-people-link" data-surgical-press>
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ol>

      {overflow > 0 ? (
        <p className="pib-people-overflow">+{overflow} more stakeholder{overflow === 1 ? "" : "s"} on file</p>
      ) : null}
    </section>
  );
}

function ProviderTimelineSection({ items }: { items: ProviderActivityTimelineItem[] }) {
  return (
    <section className="pov-cc-activity pov-cc-activity--compact mc-surface mc-surface--raised">
      <details className="pib-timeline-details" data-testid="provider-timeline">
        <summary>
          <div className="pov-cc-activity__head pib-evidence-summary-row">
            <SectionHead
              icon="timeline"
              kicker="Timeline"
              title="What Changed"
              titleClassName="pov-cc-activity__title pib-section-head__title"
            />
            <span className="pib-evidence-summary-meta">
              <span className="pov-cc-activity__link pib-evidence-count">
                {items.length} {items.length === 1 ? "entry" : "entries"}
              </span>
              <span className="pib-evidence-chevron" aria-hidden />
            </span>
          </div>
        </summary>

        {items.length > 0 ? (
          <ol className="pib-timeline-feed" aria-label="Provider activity timeline">
            {items.map((item) => (
              <ProviderTimelineItemRow key={item.id} item={item} />
            ))}
          </ol>
        ) : (
          <p className="pib-signals-col__empty">No field activity logged yet.</p>
        )}
      </details>
    </section>
  );
}

function ProviderTimelineItemRow({ item }: { item: ProviderActivityTimelineItem }) {
  const [expanded, setExpanded] = React.useState(false);
  const hasMore = Boolean(item.fullNote && item.fullNote.length > item.preview.length);

  return (
    <li className="pib-timeline-feed__item">
      <div className="pib-timeline-feed__meta">
        <time className="pib-timeline-feed__date">{item.sourceDateLabel}</time>
        <span className="pib-timeline-feed__type">{item.sourceTypeLabel}</span>
        {item.createdBy ? (
          <span className="pib-timeline-feed__actor">{item.createdBy}</span>
        ) : null}
      </div>
      <p className="pib-timeline-feed__title">{item.sourceTitle}</p>
      <p className="pib-timeline-feed__preview">
        &ldquo;{expanded && item.fullNote ? item.fullNote : item.preview}&rdquo;
      </p>
      <div className="pib-timeline-feed__actions">
        {hasMore ? (
          <button type="button" className="pib-timeline-feed__action" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show less" : "View full note"}
          </button>
        ) : null}
        {item.href ? (
          <Link href={item.href} className="pib-timeline-feed__action">
            Open source
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function IntelligenceEvidenceSection({ cards }: { cards: FieldBriefingEvidenceCard[] }) {
  const latestDate = cards.find((card) => card.sourceDateLabel ?? card.dateLabel)?.sourceDateLabel
    ?? cards.find((card) => card.dateLabel)?.dateLabel;

  return (
    <section className="pov-cc-activity pov-cc-activity--compact mc-surface mc-surface--raised">
      <details className="pib-evidence-details" data-testid="provider-intelligence-evidence">
        <summary>
          <div className="pov-cc-activity__head pib-evidence-summary-row">
            <SectionHead
              icon="evidence"
              kicker="Why we believe this"
              title="Intelligence Evidence"
              titleClassName="pov-cc-activity__title pib-section-head__title"
            />
            <span className="pib-evidence-summary-meta">
              <span className="pov-cc-activity__link pib-evidence-count">
                {cards.length} {cards.length === 1 ? "item" : "items"}
                {latestDate ? ` · Last updated ${latestDate}` : ""}
              </span>
              <span className="pib-evidence-chevron" aria-hidden />
            </span>
          </div>
        </summary>

        {cards.length > 0 ? (
          <div className="pib-evidence-card-grid">
            {cards.map((card) => (
              <IntelligenceEvidenceCard key={card.id} card={card} />
            ))}
          </div>
        ) : (
          <p className="pib-signals-col__empty">No saved signal details yet.</p>
        )}
      </details>
    </section>
  );
}

function IntelligenceEvidenceCard({ card }: { card: FieldBriefingEvidenceCard }) {
  const sourceLine = [card.sourceTypeLabel, card.sourceDateLabel].filter(Boolean).join(" · ");
  const quote = card.sourceQuote ?? card.excerpt;

  return (
    <article className="pib-evidence-card">
      <p className="pib-evidence-card__title">{card.title}</p>
      {sourceLine ? (
        <p className="pib-evidence-card__source">
          From: {sourceLine}
        </p>
      ) : card.dateLabel ? (
        <p className="pib-evidence-card__date">{card.dateLabel}</p>
      ) : null}
      {quote ? <p className="pib-evidence-card__excerpt">Quote: &ldquo;{quote}&rdquo;</p> : null}
      {card.intelligenceImpacts.length > 0 ? (
        <div className="pib-evidence-card__extracted">
          <p className="pib-evidence-card__extracted-label">Saved as:</p>
          <ul className="pib-case-intel__signal-list">
            {card.intelligenceImpacts.map((impact, index) => (
              <li key={`${card.id}-${impact.label}-${impact.impact}-${index}`} className="pib-case-intel__signal">
                {impact.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {card.mappedFieldLabel ? (
        <p className="pib-evidence-card__mapped">Profile area: {card.mappedFieldLabel}</p>
      ) : null}
      {card.href ? (
        <Link href={card.href} className="pib-evidence-card__link">
          View source
        </Link>
      ) : null}
      <p className="pib-evidence-card__why">{card.whyItMatters}</p>
    </article>
  );
}

function CapturedSignalsSection({
  emergingSignals,
  needsMoreEvidence,
  evidenceCards,
  onExecutePathwayAction,
  onShowEvidence,
}: {
  emergingSignals: FieldBriefingChip[];
  needsMoreEvidence: FieldBriefingChip[];
  evidenceCards: FieldBriefingEvidenceCard[];
  onExecutePathwayAction?: (action: ProviderPathwayExecutionAction) => void;
  onShowEvidence?: (chip: FieldBriefingChip) => void;
}) {
  const emergingSignalsWithQuotes = React.useMemo(
    () => attachVisibleQuotesToSignals(emergingSignals, evidenceCards),
    [emergingSignals, evidenceCards],
  );

  return (
    <section
      className="pov-cc-summary mc-surface mc-surface--raised"
      aria-label="Captured signals"
      data-testid="provider-captured-signals"
    >
      <SectionHead
        icon="signals"
        kicker="Field readout"
        title="Captured signals"
        titleClassName="pov-cc-summary__title pib-section-head__title"
      />
      <div className="pib-signals-section__grid">
        <SignalsColumn
          title={REP_INTELLIGENCE_VOCAB.emergingSignals}
          sectionId="pib-emerging"
          emptyMessage={REP_INTELLIGENCE_VOCAB.noEmergingSignalsYet}
          variant="known"
          chips={emergingSignalsWithQuotes}
          onShowEvidence={onShowEvidence}
        />
        <SignalsColumn
          title={REP_INTELLIGENCE_VOCAB.needsMoreEvidence}
          sectionId="pib-evidence-gaps"
          emptyMessage={REP_INTELLIGENCE_VOCAB.noEvidenceGapsYet}
          variant="gap"
          chips={needsMoreEvidence}
          onExecutePathwayAction={onExecutePathwayAction}
        />
      </div>
    </section>
  );
}

function IntelligenceSignalEvidenceModal({
  chip,
  onClose,
}: {
  chip: FieldBriefingChip | null;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!chip) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [chip, onClose]);

  if (!chip) return null;

  const quote = chip.evidenceQuote?.trim();
  const source = signalSourceLabel(chip.evidenceSource);
  const capturedLabel = chip.evidenceCapturedAt
    ? new Date(chip.evidenceCapturedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div style={{ ...sc.modalBackdrop, zIndex: 10044 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...sc.modalPanel, maxWidth: "min(480px, calc(100vw - 24px))" }} role="dialog" aria-modal>
        <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 900 }}>{chip.text}</h2>
        {chip.description ? (
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--muted)" }}>{chip.description}</p>
        ) : null}
        <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>
          What was captured
        </p>
        {quote ? (
          <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5 }}>
            &ldquo;{quote}&rdquo;
          </p>
        ) : (
          <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5 }}>
            A supporting quote is not available for this signal yet.
          </p>
        )}
        {source ? (
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--muted)" }}>
            Where it came from: {source}
          </p>
        ) : null}
        {capturedLabel ? (
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--muted)" }}>
            Captured: {capturedLabel}
          </p>
        ) : null}
        <button type="button" style={sc.btnGhost} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export function ProviderIntelligenceRepository({
  contact,
  providerId,
  accountId,
  planning,
  organizationName,
  organizationBaseline,
  engagements,
  cases,
  activityTimeline,
  relatedContacts,
  clinicalDiscoveryAnswers,
  providerAiSummary,
  onExecutePathwayAction,
  onProviderUpdated,
  universalFactsReadModel,
  debriefNarrativeContext,
}: {
  contact: Record<string, unknown>;
  providerId: string;
  accountId?: string | null;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  organizationName?: string | null;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  activityTimeline?: Array<Record<string, unknown>>;
  relatedContacts?: Array<Record<string, unknown>>;
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];
  providerAiSummary?: ProviderAiSalesBriefing | null;
  onExecutePathwayAction?: (action: ProviderPathwayExecutionAction) => void;
  onProviderUpdated?: (provider: Record<string, unknown>) => void | Promise<void>;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  debriefNarrativeContext?: ProviderDebriefNarrativeContext | null;
}) {
  const intelligenceHref = `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=intelligence`;
  const [evidenceChip, setEvidenceChip] = React.useState<FieldBriefingChip | null>(null);
  const [pendingReviewOpen, setPendingReviewOpen] = React.useState(false);
  const [contactPool, setContactPool] = React.useState<Record<string, unknown>[]>([]);
  const [acceptScopeCandidate, setAcceptScopeCandidate] = React.useState<CandidateContactIntelligence | null>(null);
  const [editAcceptCandidate, setEditAcceptCandidate] = React.useState<CandidateContactIntelligence | null>(null);
  const [busyCandidateId, setBusyCandidateId] = React.useState<string | null>(null);
  const [engagementSummaries, setEngagementSummaries] = React.useState(engagements ?? []);

  React.useEffect(() => {
    setEngagementSummaries(engagements ?? []);
  }, [engagements]);

  const pendingCaptures = React.useMemo(
    () => readPendingIntelligenceCaptures(contact),
    [contact],
  );
  const pendingSuggestionCount = React.useMemo(
    () => countPendingIntelligenceSuggestions(contact),
    [contact],
  );
  const candidateContacts = React.useMemo(() => listActiveSuggestedContacts(contact), [contact]);
  const providerLabel = String(contact.display_name ?? contact.full_name ?? "").trim() || "Provider";

  const loadContactPool = React.useCallback(async () => {
    try {
      const res = await fetch("/api/portal/sales/surgical-contacts?include_archived=0&contact_kind=support", {
        cache: "no-store",
      });
      const payload = (await res.json()) as { contacts?: Record<string, unknown>[] };
      if (res.ok && Array.isArray(payload.contacts)) {
        setContactPool(payload.contacts);
      }
    } catch {
      /* non-blocking */
    }
  }, []);

  const openEditAccept = React.useCallback(
    (candidate: CandidateContactIntelligence) => {
      setEditAcceptCandidate(candidate);
      if (contactPool.length === 0) {
        void loadContactPool();
      }
    },
    [contactPool.length, loadContactPool],
  );

  const openAcceptScope = React.useCallback(
    (candidate: CandidateContactIntelligence) => {
      setAcceptScopeCandidate(candidate);
      if (contactPool.length === 0) {
        void loadContactPool();
      }
    },
    [contactPool.length, loadContactPool],
  );

  const confirmAcceptCandidate = React.useCallback(
    async (scope: SchedulingContactOwnershipType) => {
      const candidate = acceptScopeCandidate;
      if (!candidate || busyCandidateId) return;
      setBusyCandidateId(candidate.id);
      try {
        const provider = await saveAcceptedCandidateContact({
          providerId,
          candidate,
          scope,
          organizationId: accountId ?? null,
          relatedContacts: relatedContacts ?? [],
          contactPool,
        });
        setAcceptScopeCandidate(null);
        await onProviderUpdated?.(provider);
      } finally {
        setBusyCandidateId(null);
      }
    },
    [
      acceptScopeCandidate,
      accountId,
      busyCandidateId,
      contactPool,
      onProviderUpdated,
      providerId,
      relatedContacts,
    ],
  );

  const confirmEditAcceptCandidate = React.useCallback(
    async (input: {
      scope: SchedulingContactOwnershipType;
      contactName: string;
      contactRole: string;
      email: string;
      phone: string;
      notes: string;
    }) => {
      const candidate = editAcceptCandidate;
      if (!candidate || busyCandidateId) return;
      setBusyCandidateId(candidate.id);
      try {
        const provider = await saveAcceptedCandidateContact({
          providerId,
          candidate,
          scope: input.scope,
          organizationId: accountId ?? null,
          relatedContacts: relatedContacts ?? [],
          contactPool,
          contactName: input.contactName,
          contactRole: input.contactRole,
          email: input.email,
          phone: input.phone,
          notes: input.notes,
        });
        setEditAcceptCandidate(null);
        await onProviderUpdated?.(provider);
      } finally {
        setBusyCandidateId(null);
      }
    },
    [
      accountId,
      busyCandidateId,
      contactPool,
      editAcceptCandidate,
      onProviderUpdated,
      providerId,
      relatedContacts,
    ],
  );

  const dismissCandidate = React.useCallback(
    async (candidate: CandidateContactIntelligence) => {
      if (busyCandidateId) return;
      setBusyCandidateId(candidate.id);
      try {
        await dismissProviderCandidateContact({ providerId, candidateId: candidate.id });
        const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, {
          cache: "no-store",
        });
        const payload = (await res.json()) as { contact?: Record<string, unknown> };
        if (res.ok && payload.contact) {
          await onProviderUpdated?.(payload.contact);
        }
      } finally {
        setBusyCandidateId(null);
      }
    },
    [busyCandidateId, onProviderUpdated, providerId],
  );

  const view = React.useMemo(
    () =>
      buildProviderIntelligenceKnowledgeDashboardView({
        contact,
        providerId,
        accountId,
        intelligenceHref,
        planning,
        organizationName,
        organizationBaseline,
        engagements: engagementSummaries,
        cases,
        activityTimeline,
        relatedContacts,
        clinicalDiscoveryAnswers,
        universalFactsReadModel,
      }),
    [
      contact,
      providerId,
      accountId,
      intelligenceHref,
      planning,
      organizationName,
      organizationBaseline,
      engagementSummaries,
      cases,
      activityTimeline,
      relatedContacts,
      clinicalDiscoveryAnswers,
      universalFactsReadModel,
    ],
  );
  const dossierEmergingSignals = React.useMemo(
    () => attachVisibleQuotesToSignals(view.emergingSignals, view.fieldEvidence),
    [view.emergingSignals, view.fieldEvidence],
  );
  const dossierGroups = React.useMemo(
    () =>
      buildProviderDossierGroups({
        emergingSignals: dossierEmergingSignals,
        commercialMeaning: view.commercialMeaning,
        keyPeople: view.keyPeople,
        caseIntelligence: view.caseIntelligence,
        evidenceCards: view.fieldEvidence,
        contact,
        engagements: engagementSummaries,
        narrativeFallback: debriefNarrativeContext?.narrative ?? null,
      }),
    [contact, debriefNarrativeContext?.narrative, dossierEmergingSignals, engagementSummaries, view.caseIntelligence, view.commercialMeaning, view.fieldEvidence, view.keyPeople],
  );
  const { followUpItems, toggleFollowUpItem } = useProviderFollowUpItems({
    engagements: engagementSummaries,
    debriefNarrativeContext,
    providerId,
    onEngagementsUpdated: setEngagementSummaries,
    onProviderUpdated,
  });

  return (
    <>
      {pendingSuggestionCount > 0 ? (
        <div className="pib-pending-intelligence-banner mc-surface" role="status">
          <div>
            <p className="pib-pending-intelligence-banner__kicker">Pending review</p>
            <p className="pib-pending-intelligence-banner__title">
              Intelligence suggestions: {pendingSuggestionCount}
            </p>
          </div>
          <button
            type="button"
            className="pib-pending-intelligence-banner__cta"
            onClick={() => setPendingReviewOpen(true)}
          >
            Review now
          </button>
        </div>
      ) : null}

      <PendingIntelligenceReviewModal
        open={pendingReviewOpen}
        providerId={providerId}
        providerLabel={providerLabel}
        organizationId={accountId ?? null}
        captures={pendingCaptures}
        onClose={() => setPendingReviewOpen(false)}
        onCompleted={onProviderUpdated ? () => onProviderUpdated({}) : undefined}
      />

      {acceptScopeCandidate ? (
        <CandidateAcceptScopeModal
          candidate={acceptScopeCandidate}
          providerLabel={providerLabel}
          organizationName={organizationName ?? null}
          hasOrganization={Boolean(accountId)}
          busy={busyCandidateId === acceptScopeCandidate.id}
          onClose={() => {
            if (busyCandidateId !== acceptScopeCandidate.id) setAcceptScopeCandidate(null);
          }}
          onConfirm={(scope) => void confirmAcceptCandidate(scope)}
        />
      ) : null}

      {editAcceptCandidate ? (
        <CandidateEditAcceptModal
          candidate={editAcceptCandidate}
          providerLabel={providerLabel}
          organizationName={organizationName ?? null}
          hasOrganization={Boolean(accountId)}
          busy={busyCandidateId === editAcceptCandidate.id}
          onClose={() => {
            if (busyCandidateId !== editAcceptCandidate.id) setEditAcceptCandidate(null);
          }}
          onConfirm={(input) => void confirmEditAcceptCandidate(input)}
        />
      ) : null}

      {view.organizationSuggestedContext?.hasSuggestions ? (
        <ProviderOrganizationSuggestedContextPanel
          view={view.organizationSuggestedContext}
          providerId={providerId}
          onProviderUpdated={onProviderUpdated}
        />
      ) : null}

      {!view.hasFieldEvidence && view.emptyStateMessage ? (
        <p className="pib-empty-banner mc-surface" role="status">
          {view.emptyStateMessage}
        </p>
      ) : null}

      {view.hasFieldEvidence ? (
        <ProviderAiSummarySection summary={providerAiSummary} />
      ) : null}

      {view.hasFieldEvidence ? (
        <ProviderWhatWeKnowDossierSection groups={dossierGroups} />
      ) : null}

      {followUpItems.length > 0 ? (
        <ProviderFollowUpItemsSection
          items={followUpItems}
          onToggleComplete={(item, completed) => void toggleFollowUpItem(item, completed)}
        />
      ) : null}

      {view.hasFieldEvidence && !providerAccessIsEstablished(view.progress) ? (
        <AccessPathwayPanel progress={view.progress} onExecutePathwayAction={onExecutePathwayAction} />
      ) : null}

      {view.hasFieldEvidence && view.keyPeople.length > 0 ? (
        <KeyPeopleSection
          people={view.keyPeople}
          candidateContacts={candidateContacts}
          busyCandidateId={busyCandidateId}
          onAcceptCandidate={openAcceptScope}
          onEditCandidate={openEditAccept}
          onDismissCandidate={(candidate) => void dismissCandidate(candidate)}
        />
      ) : null}

      {view.caseIntelligence?.visible ? (
        <CaseIntelligenceRollupCard rollup={view.caseIntelligence} />
      ) : null}

      {view.hasFieldEvidence ? <ProviderTimelineSection items={view.providerTimeline} /> : null}

      <IntelligenceSignalEvidenceModal chip={evidenceChip} onClose={() => setEvidenceChip(null)} />
    </>
  );
}
