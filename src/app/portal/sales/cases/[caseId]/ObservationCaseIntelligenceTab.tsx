"use client";

import React from "react";
import {
  buildObservationRepPresentationView,
  OBSERVATION_REP_SECTIONS,
} from "@/lib/surgical-sales/buildObservationRepPresentationView";
import { GENERATE_DEBRIEF_LABEL } from "@/lib/surgical-sales/observationProgramGate";
import {
  buildObservationCaseIdentity,
  formatCaseIntelligenceContextLine,
  formatCaseIntelligenceSectionTitle,
} from "@/lib/surgical-sales/buildCaseIdentity";
import {
  groupRepFriendlyIntelligenceItems,
  type RepFriendlyIntelligenceItem,
  repFriendlyGroupsHaveItems,
} from "@/lib/surgical-sales/repFriendlyIntelligenceGroups";
import { PlanProviderDebriefCta } from "./PlanProviderDebriefCta";
import { observationFieldExecutionCss } from "./observationFieldExecutionCss";
import { observationCaseIntelligenceTabCss } from "./observationCaseIntelligenceTabCss";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

type ActivityRow = {
  id: string;
  activity_type: string;
  body: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
};

type BriefingPriority = "primary" | "secondary" | "tertiary";

type InsightChipKind = "product" | "provider" | "workflow" | "staff" | "contact" | "opportunity" | "general";

type BriefingSectionConfig = {
  id: string;
  title: string;
  items: Array<RepFriendlyIntelligenceItem & { id: string; text: string; quote?: string }>;
  emptyMessage?: string;
  testId: string;
  variant: "default" | "learn" | "current";
  priority: BriefingPriority;
  headExtra?: React.ReactNode;
};

/** Classify chips for color coding only — label text comes from the presentation layer unchanged. */
function classifyInsightChip(text: string): InsightChipKind {
  const value = text.toLowerCase();
  if (/\bwas used|observed|mesh|product|biotissue|competitor|graft/i.test(value)) return "product";
  if (/\bscheduling contact|key contact|coordinator|scheduler\b| — /.test(value)) return "contact";
  if (/provider|frustration|concern|open to|receptive|continued discussion/i.test(value)) return "provider";
  if (/visualization|fixation|workflow delay|pace slowed|turnover|utilization|instrument|bottleneck/i.test(value))
    return "workflow";
  if (/staff|verify product|packaging|supply|readiness|team communication|retention/i.test(value)) return "staff";
  if (/product-fit|opportunity/i.test(value)) return "opportunity";
  return "general";
}

function heroKicker(variant: BriefingSectionConfig["variant"], captured: boolean, contextLine?: string): string {
  if (variant === "current") {
    return contextLine ? `What you noted today · ${contextLine}` : "What you noted today";
  }
  if (variant === "learn") return captured ? "Follow up on your next visit" : "What to focus on";
  return "What we already know";
}

function briefingListVariant(
  variant: BriefingSectionConfig["variant"],
  priority: BriefingPriority,
): "focus" | "known" | "missing" {
  if (variant === "default") return "known";
  if (priority === "primary") return "focus";
  return "missing";
}

function evidenceAreaTone(status: string): "known" | "early" | "missing" {
  if (status === "validated" || status === "supported") return "known";
  if (status === "missing") return "missing";
  return "early";
}

function formatCaseTypeLabel(raw: unknown): string {
  const value = String(raw ?? "observation").trim().replace(/_/g, " ");
  if (!value) return "Case";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCaseStatusLabel(input: {
  caseRow: Record<string, unknown>;
  currentCaseComplete: boolean;
}): string {
  if (input.currentCaseComplete) return "Completed";
  const status = String(input.caseRow.status ?? "").trim().toLowerCase();
  if (status === "confirmed" || status === "scheduled") return "In progress";
  if (status) return status.charAt(0).toUpperCase() + status.slice(1);
  return "In progress";
}

function activityHasPendingIntelligence(activity: ActivityRow): boolean {
  const metadata = activity.metadata_json;
  if (!metadata || typeof metadata !== "object") return false;
  return metadata.intelligence_processing === true && !metadata.ai_extraction;
}

function normalizeProductDisplayKey(raw: unknown): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/^(?:current|competitor|alternative)\s+product:\s*/i, "")
    .replace(
      /\b(?:was|were|is|are|used|using|during|the|case|product|competitor|alternative|discussed|evaluating|evaluated)\b/g,
      " ",
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isGenericImplantNoun(name: string): boolean {
  return /^(mesh|graft|implant|device|system|product)$/i.test(name.trim());
}

function productNameFromItem(item: RepFriendlyIntelligenceItem): string {
  const explicit = String(item.productMentioned ?? "").trim();
  if (explicit && !isGenericImplantNoun(explicit)) return explicit;

  const text = item.text.trim();
  const fromText =
    text.match(/^(?:current product|competitor product|alternative product discussed|evaluating):\s*(.+)$/i)?.[1]?.trim() ||
    text.match(/^competitor product\s+(.+?)\s+was\s+used\b/i)?.[1]?.trim() ||
    text.match(/^(.+?)\s+was\s+used\s+during\s+the\s+case\b/i)?.[1]?.trim() ||
    "";
  if (fromText && !isGenericImplantNoun(fromText)) return fromText;
  return "";
}

function productPresentationKind(item: RepFriendlyIntelligenceItem): "current" | "evaluating" | "alternative" | "competitor" | null {
  const concept = String(item.concept ?? "").trim().toLowerCase();
  const text = item.text.toLowerCase();
  const evidence = String(item.evidenceText ?? item.quote ?? item.sourceNoteText ?? "").toLowerCase();
  const blob = `${text} ${evidence}`;
  const used = /\b(?:used|using|uses|in use|implanted|placed|deployed)\b/.test(blob);
  const evaluated = /\b(?:evaluated|evaluating|trialed|trialled|trialing|trialling|demoed)\b/.test(blob);
  const discussed = /\b(?:discussed|asked|question|interested|interest|considering|curious|open to)\b/.test(blob);
  const explicitlyCompetitive =
    /\b(?:competitor|competing|competitive|incumbent|versus|vs\.?|compared|against)\b/.test(evidence) ||
    /\b(?:competing|competitive|incumbent|versus|vs\.?|compared|against)\b/.test(text);

  if (concept === "current_product") return "current";
  if (evaluated) return "evaluating";
  if (!used && discussed) return "alternative";
  if (used && !explicitlyCompetitive) return "current";
  if (concept === "competitor_product" && explicitlyCompetitive) return "competitor";
  if (concept === "product_interest" && discussed) return "alternative";
  return null;
}

function productPresentationText(kind: NonNullable<ReturnType<typeof productPresentationKind>>, product: string): string {
  if (kind === "current") return `Current product: ${product}`;
  if (kind === "evaluating") return `Evaluating: ${product}`;
  if (kind === "alternative") return `Alternative product discussed: ${product}`;
  return `Competitor product: ${product}`;
}

function canonicalProductDisplayKey(key: string, allKeys: Set<string>): string {
  const compatible = [...allKeys].filter((candidate) => candidate === key || candidate.includes(key) || key.includes(candidate));
  return compatible.sort((a, b) => b.length - a.length)[0] ?? key;
}

function normalizeObservationCurrentItems(items: BriefingSectionConfig["items"]): BriefingSectionConfig["items"] {
  const normalized = items.map((item) => {
    const product = productNameFromItem(item);
    const kind = product ? productPresentationKind(item) : null;
    if (!product || !kind) return item;
    return {
      ...item,
      text: productPresentationText(kind, product),
      concept: kind === "current" ? "current_product" : item.concept,
      productMentioned: product,
    };
  });

  const productRanks = { current: 4, evaluating: 3, alternative: 2, competitor: 1 } as const;
  const productKeys = new Set(
    normalized
      .map((item) => normalizeProductDisplayKey(productNameFromItem(item)))
      .filter(Boolean),
  );
  const productWinners = new Map<string, { item: (typeof normalized)[number]; rank: number }>();

  for (const item of normalized) {
    const product = productNameFromItem(item);
    const kind = product ? productPresentationKind(item) : null;
    const key = normalizeProductDisplayKey(product);
    if (!key || !kind) continue;
    const displayKey = canonicalProductDisplayKey(key, productKeys);
    const rank = productRanks[kind];
    const existing = productWinners.get(displayKey);
    if (!existing || rank > existing.rank) productWinners.set(displayKey, { item, rank });
  }

  const emittedProducts = new Set<string>();
  const result: BriefingSectionConfig["items"] = [];
  for (const item of normalized) {
    const product = productNameFromItem(item);
    const kind = product ? productPresentationKind(item) : null;
    const key = normalizeProductDisplayKey(product);
    if (key && kind) {
      const displayKey = canonicalProductDisplayKey(key, productKeys);
      const winner = productWinners.get(displayKey)?.item;
      if (winner !== item || emittedProducts.has(displayKey)) continue;
      emittedProducts.add(displayKey);
    }
    result.push(item);
  }

  return result;
}

function evidenceSourceLabel(sourceType?: string | null): string {
  const source = String(sourceType ?? "").trim().toLowerCase();
  if (source.includes("debrief")) return "Debrief";
  if (source.includes("observation")) return "Observation";
  if (source.includes("field")) return "Field Note";
  return "Field Note";
}

function evidenceEntriesForItem(
  item: RepFriendlyIntelligenceItem & {
    verification?: { verificationStatus?: string };
  },
): string[] {
  const entries = [
    ...(item.supportingEvidence ?? []),
    item.evidenceText ?? "",
    item.quote ?? "",
  ]
    .flatMap((entry) => String(entry ?? "").split(/\s+\|\s+/))
    .map((entry) => entry.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ObservationItemEvidenceDisclosure({
  item,
}: {
  item: RepFriendlyIntelligenceItem & {
    verification?: { verificationStatus?: string };
  };
}) {
  const entries = evidenceEntriesForItem(item);
  if (entries.length === 0) return null;

  const confidence = item.verification?.verificationStatus;
  const label = entries.length > 1 ? `Evidence (${entries.length})` : "Evidence";
  return (
    <details className="case-obs-intel-evidence">
      <summary className="case-obs-intel-evidence__summary">{label}</summary>
      <div className="case-obs-intel-evidence__body">
        <p className="case-obs-intel-evidence__heading">Evidence</p>
        {entries.map((entry, index) => (
          <article key={`${item.id ?? item.text}-evidence-${index}`} className="case-obs-intel-evidence__item">
            <p className="case-obs-intel-evidence__meta">
              <span>{evidenceSourceLabel(item.sourceType)}</span>
              {confidence ? <span>{confidence}</span> : null}
            </p>
            <blockquote className="case-obs-intel-evidence__quote">&ldquo;{entry}&rdquo;</blockquote>
          </article>
        ))}
      </div>
    </details>
  );
}

function BriefingSection({
  title,
  items,
  emptyMessage,
  testId,
  variant,
  priority,
  headExtra,
  captured = false,
  contextLine,
}: Omit<BriefingSectionConfig, "id"> & { captured?: boolean; contextLine?: string }) {
  const isHero = priority === "primary";
  const listVariant = briefingListVariant(variant, priority);
  const displayItems = variant === "current" ? normalizeObservationCurrentItems(items) : items;
  const groupedItems = variant === "current" ? groupRepFriendlyIntelligenceItems(displayItems) : [];
  const hasGroupedItems = variant === "current" ? repFriendlyGroupsHaveItems(groupedItems) : false;
  const hasDisplayItems = variant === "current" ? hasGroupedItems : displayItems.length > 0;
  const displayTitle = variant === "current" ? title.replace(/\s+—\s+.+$/, "") : title;

  return (
    <section
      className={`case-obs-intel-panel case-obs-intel-panel--${variant} case-obs-intel-panel--${priority}`}
      aria-labelledby={`${testId}-title`}
      data-testid={testId}
      data-priority={priority}
    >
      {isHero ? <p className="case-obs-intel-panel__kicker">{heroKicker(variant, captured, contextLine)}</p> : null}
      <div className="case-obs-intel-panel-head">
        <div className="case-obs-intel-panel-head-main">
          <h2 id={`${testId}-title`} className="case-obs-intel-title">
            {displayTitle}
          </h2>
          {hasDisplayItems && isHero ? (
            <span className="case-obs-intel-count-badge" aria-label={`${items.length} items`}>
              {variant === "current" ? groupedItems.reduce((sum, group) => sum + group.items.length, 0) : items.length}
            </span>
          ) : null}
        </div>
        {headExtra}
      </div>

      {!hasDisplayItems ? (
        <div
          className={`case-obs-intel-empty-wrap${variant === "current" ? " case-obs-intel-empty-wrap--awaiting" : ""}`}
        >
          {variant === "current" ? (
            <svg className="case-obs-intel-empty-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M8 4h8l2 4v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8l2-4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : null}
          <p className="case-obs-intel-empty">{emptyMessage ?? "Nothing to show yet."}</p>
        </div>
      ) : variant === "current" ? (
        <div className="case-obs-intel-group-stack" aria-label={`${displayTitle} findings`}>
          {groupedItems
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.id} className={`case-obs-intel-group case-obs-intel-group--${group.id}`}>
                <div className="case-obs-intel-group-head">
                  <h3 className="case-obs-intel-group-title">{group.title}</h3>
                  <p className="case-obs-intel-group-description">{group.description}</p>
                </div>
                <ul className="case-obs-intel-chip-grid case-obs-intel-chip-grid--current">
                  {group.items.map((item) => {
                    const chipKind = classifyInsightChip(item.text);
                    return (
                      <li key={item.id ?? `${group.id}-${item.text}`}>
                        <div className={`case-obs-intel-chip case-obs-intel-chip--${chipKind}`}>
                          <div className="case-obs-intel-chip-main">
                            <span className="case-obs-intel-chip-dot" aria-hidden="true" />
                            <span className="case-obs-intel-chip-label">{item.text}</span>
                          </div>
                          <ObservationItemEvidenceDisclosure item={item} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      ) : (
        <ul
          className={`case-obs-case-brief-list case-obs-case-brief-list--${listVariant}`}
          aria-label={title}
        >
          {displayItems.map((item) => (
            <li key={item.id} className="case-obs-case-brief-list-item">
              <span className="case-obs-case-brief-icon" aria-hidden="true" />
              {item.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ObservationCaseIntelligenceTab({
  caseId,
  caseRow,
  activities,
  providerContact,
  priorCases,
  disabled,
  onDebriefError,
  intelligenceProcessingStartedAtMs,
  universalFactsReadModel,
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  activities?: ActivityRow[];
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
  disabled?: boolean;
  onDebriefError?: (message: string) => void;
  intelligenceProcessingStartedAtMs?: number | null;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}) {
  const presentation = React.useMemo(
    () =>
      buildObservationRepPresentationView({
        caseRow,
        activities,
        providerContact,
        priorCases,
        universalFactsReadModel,
      }),
    [activities, caseRow, priorCases, providerContact, universalFactsReadModel],
  );

  const { learningView: view, debriefReadiness } = presentation;
  const progressPercent = Math.round(
    (debriefReadiness.progressCompleted / debriefReadiness.progressTotal) * 100,
  );
  const caseTypeLabel = formatCaseTypeLabel(caseRow.case_type);
  const statusLabel = formatCaseStatusLabel({ caseRow, currentCaseComplete: view.currentCaseComplete });
  const noteCount = view.currentCaseHasCapturedNotes ? 1 : 0;
  const hasCapturedNotes = view.currentCaseHasCapturedNotes;
  const activityIntelligenceUpdating = React.useMemo(
    () => (activities ?? []).some(activityHasPendingIntelligence),
    [activities],
  );
  const intelligenceUpdating = activityIntelligenceUpdating || Boolean(intelligenceProcessingStartedAtMs);
  const caseIdentity = React.useMemo(
    () =>
      buildObservationCaseIdentity({
        caseRow,
        providerContact,
        priorCases,
        activities,
      }),
    [activities, caseRow, priorCases, providerContact],
  );
  const sectionContextLine = formatCaseIntelligenceContextLine(caseIdentity);

  const briefingSections: BriefingSectionConfig[] = React.useMemo(() => {
    const stillNeedSection: BriefingSectionConfig = {
      id: "still-need",
      title: hasCapturedNotes
        ? formatCaseIntelligenceSectionTitle("Follow Up Next Visit", caseIdentity)
        : formatCaseIntelligenceSectionTitle("What We Still Need to Learn", caseIdentity),
      items: presentation.stillNeedToLearn,
      emptyMessage: presentation.stillNeedToLearnEmptyMessage,
      testId: "case-intelligence-still-need",
      variant: "learn",
      priority: hasCapturedNotes ? "secondary" : "primary",
    };

    const knownSection: BriefingSectionConfig = {
      id: "known",
      title: formatCaseIntelligenceSectionTitle("What We Know", caseIdentity),
      items: presentation.whatWeKnow,
      emptyMessage: presentation.whatWeKnowEmptyMessage,
      testId: "case-intelligence-what-we-know",
      variant: "default",
      priority: hasCapturedNotes ? "tertiary" : "secondary",
    };

    const thisObservationSection: BriefingSectionConfig = {
      id: "this-observation",
      title: presentation.thisObservation.title,
      items: presentation.thisObservation.items,
      emptyMessage: presentation.thisObservation.emptyMessage,
      testId: "case-intelligence-this-observation",
      variant: "current",
      priority: hasCapturedNotes ? "primary" : "tertiary",
      headExtra:
        hasCapturedNotes && presentation.thisObservation.showInProgressNote ? (
          <span className="case-obs-intel-pending-pill">In progress</span>
        ) : null,
    };

    const focusNextSection: BriefingSectionConfig | null =
      hasCapturedNotes && presentation.focusForNextObservation.length > 0
        ? {
            id: "focus-next",
            title: formatCaseIntelligenceSectionTitle(OBSERVATION_REP_SECTIONS.focusNext, caseIdentity),
            items: presentation.focusForNextObservation,
            testId: "case-intelligence-focus-next",
            variant: "learn",
            priority: "tertiary",
          }
        : null;

    return hasCapturedNotes
      ? [
          thisObservationSection,
          ...(presentation.stillNeedToLearn.length > 0 ? [stillNeedSection] : []),
          ...(focusNextSection ? [focusNextSection] : []),
          ...(presentation.whatWeKnow.length > 0 ? [knownSection] : []),
        ]
      : [stillNeedSection, knownSection, thisObservationSection];
  }, [caseIdentity, hasCapturedNotes, presentation]);

  return (
    <div
      className={`case-obs-intel case-obs-intel--${hasCapturedNotes ? "captured" : "pre-capture"}`}
      data-testid="case-intelligence-tab"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `${observationFieldExecutionCss}\n${observationCaseIntelligenceTabCss}`,
        }}
      />

      {intelligenceUpdating ? (
        <div className="case-obs-intel-updating" role="status" aria-live="polite">
          <span className="case-obs-intel-updating__spinner" aria-hidden="true" />
          <span className="case-obs-intel-updating__copy">
            <strong>
              Building intelligence
              <span className="case-obs-intel-loading-dots" aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </strong>
            <span>We are extracting findings from your latest note. This page will update automatically when ready.</span>
          </span>
        </div>
      ) : null}

      <section className="case-obs-intel-command" aria-label="Case status summary" data-testid="case-intelligence-status-summary">
        <div className="case-obs-intel-command__surface">
          <div className="case-obs-intel-command__head">
            <p className="case-obs-intel-command__kicker">
              Observation summary{sectionContextLine ? ` · ${sectionContextLine}` : ""}
            </p>
            <div className="case-obs-intel-command__badges">
              <span className="case-obs-intel-badge case-obs-intel-badge--type">{caseTypeLabel}</span>
              <span
                className={`case-obs-intel-badge case-obs-intel-badge--${view.currentCaseComplete ? "complete" : "progress"}`}
              >
                {statusLabel}
              </span>
              {noteCount > 0 ? (
                <span className="case-obs-intel-badge case-obs-intel-badge--notes">
                  {noteCount === 1 ? "1 note" : `${noteCount} notes`}
                </span>
              ) : null}
              {intelligenceUpdating ? (
                <span className="case-obs-intel-badge case-obs-intel-badge--updating">Updating</span>
              ) : null}
            </div>
          </div>
          <dl className="case-obs-intel-command__metrics">
            <div className="case-obs-intel-command__metric">
              <dt className="case-obs-intel-command__metric-label">Program</dt>
              <dd className="case-obs-intel-command__metric-value">
                {presentation.statusSummary.programCasesLabel}
              </dd>
            </div>
            <div className="case-obs-intel-command__metric">
              <dt className="case-obs-intel-command__metric-label">Evidence</dt>
              <dd className="case-obs-intel-command__metric-value">{presentation.debriefReadiness.headline}</dd>
            </div>
            {presentation.statusSummary.programInProgressNote ? (
              <div className="case-obs-intel-command__metric">
                <dt className="case-obs-intel-command__metric-label">Status</dt>
                <dd className="case-obs-intel-command__metric-value">
                  {presentation.statusSummary.programInProgressNote}
                </dd>
              </div>
            ) : (
              <div className="case-obs-intel-command__metric">
                <dt className="case-obs-intel-command__metric-label">Notes</dt>
                <dd className="case-obs-intel-command__metric-value">
                  {hasCapturedNotes ? "Captured" : "Awaiting capture"}
                </dd>
              </div>
            )}
          </dl>
          <p className="case-obs-intel-command__note">{presentation.statusSummary.maturityNote}</p>
        </div>
      </section>

      <div className="case-obs-intel-briefing" data-testid="case-intelligence-briefing">
        {briefingSections.map((section) => (
          <BriefingSection
            key={section.id}
            {...section}
            captured={hasCapturedNotes}
            contextLine={section.id === "this-observation" ? sectionContextLine : undefined}
          />
        ))}
      </div>

      <details
        className="case-obs-intel-readiness"
        data-testid="case-intelligence-readiness"
        aria-label="Debrief readiness"
        open={presentation.debriefReadiness.openDetailsByDefault}
      >
        <summary className="case-obs-intel-readiness__summary">
          <span className="case-obs-intel-readiness__title">{presentation.debriefReadiness.title}</span>
          <span
            className={`case-obs-intel-readiness__badge pov-state--badge case-obs-intel-readiness__badge--${view.debriefReadinessPhase} ${
              view.debriefReadinessPhase === "ready"
                ? "pov-state--confirmed"
                : view.debriefReadinessPhase === "nearly_ready"
                  ? "pov-state--needs"
                  : "pov-state--learning"
            }`}
          >
            {presentation.debriefReadiness.headline}
          </span>
          <span className="case-obs-intel-readiness__toggle">Details</span>
        </summary>
        <div className="case-obs-intel-readiness__body">
          <div className="case-obs-intel-readiness__program">
            <p className="case-obs-intel-readiness__section-label">
              {presentation.debriefReadiness.programUnlockLabel}
            </p>
            <p className="case-obs-intel-readiness__program-count">
              {presentation.debriefReadiness.programCasesLabel}
            </p>
            <div
              className="case-obs-intel-progress"
              role="progressbar"
              aria-valuenow={debriefReadiness.progressCompleted}
              aria-valuemin={0}
              aria-valuemax={debriefReadiness.progressTotal}
              aria-label={debriefReadiness.programCasesLabel}
            >
              <div className="case-obs-intel-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="case-obs-intel-goal">
              <span className="case-obs-intel-goal-label">Program goal</span>
              {presentation.debriefReadiness.programGoal}
            </p>
          </div>

          <div className="case-obs-intel-readiness__evidence" data-testid="case-intelligence-evidence-coverage">
            <p className="case-obs-intel-readiness__section-label">
              {presentation.debriefReadiness.evidenceCoverageLabel}
            </p>
            <p className="case-obs-intel-readiness__evidence-headline">
              {presentation.debriefReadiness.headline}
            </p>
          </div>

          {presentation.evidenceProgress.items.length > 0 ? (
            <div
              className="case-obs-intel-readiness__areas"
              data-testid="case-intelligence-evidence-progress"
            >
              <p className="case-obs-intel-readiness__section-label">
                {presentation.evidenceProgress.title}
              </p>
              <p className="case-obs-intel-areas-lead">{presentation.evidenceProgress.lead}</p>
              <ul className="case-obs-intel-area-list" aria-label={presentation.evidenceProgress.title}>
                {presentation.evidenceProgress.items.map((item) => {
                  const tone = evidenceAreaTone(item.status);
                  return (
                    <li key={item.id} className="case-obs-intel-area-item">
                      <span className="case-obs-intel-area-label">{item.label}</span>
                      <span className={`case-obs-intel-area-status case-obs-intel-area-status--${tone}`}>
                        {item.statusLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {presentation.debriefReadiness.reasons.length > 0 ? (
            <div className="case-obs-intel-readiness__gaps">
              <p className="case-obs-intel-readiness__section-label">Why</p>
              <ul className="case-obs-intel-gap-list">
                {presentation.debriefReadiness.reasons.map((reason) => (
                  <li key={reason} className="case-obs-intel-gap-item">
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="case-obs-intel-readiness__next">
            <p className="case-obs-intel-readiness__section-label">Next step</p>
            <p className="case-obs-intel-readiness__detail">{presentation.debriefReadiness.nextStep}</p>
          </div>

          {view.debriefUnlocked ? (
            <div className="case-obs-intel-readiness__actions">
              <PlanProviderDebriefCta
                caseId={caseId}
                disabled={disabled}
                label={GENERATE_DEBRIEF_LABEL}
                onError={onDebriefError}
                className="case-obs-intel-generate-btn pov-state--primary pov-state--btn"
              />
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
