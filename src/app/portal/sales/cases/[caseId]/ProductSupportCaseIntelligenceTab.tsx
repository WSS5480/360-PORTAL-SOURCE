"use client";

import React from "react";
import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import {
  buildProductSupportRepPresentationView,
  type ProductSupportRepListItem,
} from "@/lib/surgical-sales/buildProductSupportRepPresentationView";
import {
  groupRepFriendlyIntelligenceItems,
  repFriendlyGroupsHaveItems,
  summarizeRepFriendlyIntelligenceGroups,
} from "@/lib/surgical-sales/repFriendlyIntelligenceGroups";
import { PRODUCT_SUPPORT_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/productSupportCaseDetailVocabulary";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import { observationFieldExecutionCss } from "./observationFieldExecutionCss";
import { observationCaseIntelligenceTabCss } from "./observationCaseIntelligenceTabCss";

type BriefingPriority = "primary" | "secondary" | "tertiary";

type InsightChipKind = "product" | "provider" | "workflow" | "staff" | "inventory" | "training" | "general";

type BriefingSectionConfig = {
  id: string;
  title: string;
  items: ProductSupportRepListItem[];
  emptyMessage?: string;
  testId: string;
  variant: "default" | "learn" | "current";
  priority: BriefingPriority;
};

function classifyInsightChip(text: string): InsightChipKind {
  const value = text.toLowerCase();
  if (/\binventory|mesh|stock|availability|sizing|kit\b/i.test(value)) return "inventory";
  if (/\btraining|education|in-service|familiar/i.test(value)) return "training";
  if (/\b(product|tray|implant|graft)\b/i.test(value)) return "product";
  if (/\b(surgeon|provider|visualization|exposure)\b/i.test(value)) return "provider";
  if (/\b(delay|turnover|workflow|timing)\b/i.test(value)) return "workflow";
  if (/\b(staff|scrub|circulator|tech)\b/i.test(value)) return "staff";
  return "general";
}

function activityHasPendingIntelligence(activity: {
  metadata_json?: Record<string, unknown>;
}): boolean {
  const metadata = activity.metadata_json;
  if (!metadata || typeof metadata !== "object") return false;
  return metadata.intelligence_processing === true && !metadata.ai_extraction;
}

function heroKicker(variant: BriefingSectionConfig["variant"], captured: boolean, contextLine?: string): string {
  if (variant === "current") {
    return contextLine ? `What you noted today · ${contextLine}` : "What you noted today";
  }
  if (variant === "learn") return captured ? "Worth following up on" : "What to watch for";
  return "From prior cases and profile";
}

function briefingListVariant(
  variant: BriefingSectionConfig["variant"],
  priority: BriefingPriority,
): "focus" | "known" | "missing" {
  if (variant === "default") return "known";
  if (priority === "primary") return "focus";
  return "missing";
}

function BriefingSection({
  title,
  items,
  emptyMessage,
  testId,
  variant,
  priority,
  captured = false,
  contextLine,
}: BriefingSectionConfig & { captured?: boolean; contextLine?: string }) {
  const isHero = priority === "primary";
  const listVariant = briefingListVariant(variant, priority);
  const groupedItems = variant === "current" ? groupRepFriendlyIntelligenceItems(items) : [];
  const hasGroupedItems = variant === "current" ? repFriendlyGroupsHaveItems(groupedItems) : false;
  const hasDisplayItems = variant === "current" ? hasGroupedItems : items.length > 0;
  const groupedSummary = variant === "current" ? summarizeRepFriendlyIntelligenceGroups(groupedItems) : "";

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
            {title}
          </h2>
          {hasDisplayItems && isHero ? (
            <span className="case-obs-intel-count-badge" aria-label={`${items.length} items`}>
              {variant === "current" ? groupedItems.reduce((sum, group) => sum + group.items.length, 0) : items.length}
            </span>
          ) : null}
        </div>
      </div>

      {!hasDisplayItems ? (
        <div
          className={`case-obs-intel-empty-wrap${variant === "current" ? " case-obs-intel-empty-wrap--awaiting" : ""}`}
        >
          <p className="case-obs-intel-empty">{emptyMessage ?? "Nothing to show yet."}</p>
        </div>
      ) : variant === "current" ? (
        <div className="case-obs-intel-group-stack" aria-label={`${title} findings`}>
          <p className="case-obs-intel-generated-summary">{groupedSummary}</p>
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
                        <span className={`case-obs-intel-chip case-obs-intel-chip--${chipKind}`}>
                          <span className="case-obs-intel-chip-dot" aria-hidden="true" />
                          <span className="case-obs-intel-chip-label">{item.text}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      ) : (
        <ul className={`case-obs-case-brief-list case-obs-case-brief-list--${listVariant}`} aria-label={title}>
          {items.map((item) => (
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

export function ProductSupportCaseIntelligenceTab({
  caseRow,
  activities,
  universalFactsReadModel,
  providerContact,
  operationalContext,
  priorCases,
  specialty,
  intelligenceProcessingStartedAtMs,
}: {
  caseRow: Record<string, unknown>;
  activities?: Array<{
    id: string;
    activity_type: string;
    body: string;
    metadata_json?: Record<string, unknown>;
    created_at: string;
  }>;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  providerContact?: Record<string, unknown> | null;
  operationalContext?: CaseOperationalContextView | null;
  priorCases?: Array<Record<string, unknown>>;
  specialty?: string | null;
  intelligenceProcessingStartedAtMs?: number | null;
}) {
  const presentation = React.useMemo(
    () =>
      buildProductSupportRepPresentationView({
        caseRow,
        activities,
        universalFactsReadModel,
        providerContact,
        operationalContext,
        priorCases,
        specialty,
      }),
    [activities, caseRow, operationalContext, priorCases, providerContact, specialty, universalFactsReadModel],
  );

  const { hasCapturedNotes, outcomeBadges, statusSummary } = presentation;
  const activityIntelligenceUpdating = React.useMemo(
    () => (activities ?? []).some(activityHasPendingIntelligence),
    [activities],
  );
  const intelligenceUpdating = activityIntelligenceUpdating || Boolean(intelligenceProcessingStartedAtMs);
  const hasOutcomeBadges = Boolean(
    outcomeBadges.providerReaction || outcomeBadges.caseResult || outcomeBadges.nextStep,
  );

  const briefingSections: BriefingSectionConfig[] = hasCapturedNotes
    ? [
        {
          id: "this-case",
          title: presentation.thisCase.title,
          items: presentation.thisCase.items,
          emptyMessage: presentation.thisCase.emptyMessage,
          testId: "case-ps-intelligence-this-case",
          variant: "current",
          priority: "primary",
        },
        {
          id: "follow-up",
          title: presentation.followUp.title,
          items: presentation.followUp.items,
          emptyMessage: presentation.followUp.emptyMessage,
          testId: "case-ps-intelligence-follow-up",
          variant: "learn",
          priority: "secondary",
        },
        {
          id: "what-we-know",
          title: presentation.whatWeKnow.title,
          items: presentation.whatWeKnow.items,
          emptyMessage: presentation.whatWeKnow.emptyMessage,
          testId: "case-ps-intelligence-what-we-know",
          variant: "default",
          priority: "tertiary",
        },
      ]
    : [
        {
          id: "what-we-know",
          title: presentation.whatWeKnow.title,
          items: presentation.whatWeKnow.items,
          emptyMessage: presentation.whatWeKnow.emptyMessage,
          testId: "case-ps-intelligence-what-we-know",
          variant: "default",
          priority: "primary",
        },
        {
          id: "this-case",
          title: presentation.thisCase.title,
          items: presentation.thisCase.items,
          emptyMessage: presentation.thisCase.emptyMessage,
          testId: "case-ps-intelligence-this-case",
          variant: "current",
          priority: "tertiary",
        },
      ];

  return (
    <div
      className={`case-obs-intel case-obs-intel--${hasCapturedNotes ? "captured" : "pre-capture"}`}
      data-testid="case-ps-intelligence-tab"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `${observationFieldExecutionCss}\n${observationCaseIntelligenceTabCss}\n${productSupportIntelligenceTabCss}`,
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

      <section className="case-obs-intel-command" aria-label="Case status summary" data-testid="case-ps-intelligence-status">
        <div className="case-obs-intel-command__surface">
          <div className="case-obs-intel-command__head">
            <p className="case-obs-intel-command__kicker">
              Product support summary
              {presentation.contextLine ? ` · ${presentation.contextLine}` : ""}
            </p>
            <div className="case-obs-intel-command__badges">
              <span className="case-obs-intel-badge case-obs-intel-badge--type">{statusSummary.caseTypeLabel}</span>
              <span className="case-obs-intel-badge case-obs-intel-badge--progress">{statusSummary.statusLabel}</span>
              {statusSummary.noteCount > 0 ? (
                <span className="case-obs-intel-badge case-obs-intel-badge--notes">
                  {statusSummary.noteCount === 1 ? "1 note" : `${statusSummary.noteCount} notes`}
                </span>
              ) : null}
              {intelligenceUpdating ? (
                <span className="case-obs-intel-badge case-obs-intel-badge--updating">Updating</span>
              ) : null}
            </div>
          </div>

          {hasOutcomeBadges ? (
            <div className="case-ps-intel-outcomes" aria-label="Documented outcomes">
              {outcomeBadges.providerReaction ? (
                <span className="case-ps-intel-outcome-badge case-ps-intel-outcome-badge--reaction">
                  Provider: {outcomeBadges.providerReaction}
                </span>
              ) : null}
              {outcomeBadges.caseResult ? (
                <span className="case-ps-intel-outcome-badge case-ps-intel-outcome-badge--result">
                  Result: {outcomeBadges.caseResult}
                </span>
              ) : null}
              {outcomeBadges.nextStep ? (
                <span className="case-ps-intel-outcome-badge case-ps-intel-outcome-badge--next">
                  Next: {outcomeBadges.nextStep}
                </span>
              ) : null}
            </div>
          ) : null}

          <dl className="case-obs-intel-command__metrics">
            <div className="case-obs-intel-command__metric">
              <dt className="case-obs-intel-command__metric-label">Evidence</dt>
              <dd className="case-obs-intel-command__metric-value">
                {presentation.evidenceCount} item{presentation.evidenceCount === 1 ? "" : "s"}
              </dd>
            </div>
            <div className="case-obs-intel-command__metric">
              <dt className="case-obs-intel-command__metric-label">Notes</dt>
              <dd className="case-obs-intel-command__metric-value">
                {hasCapturedNotes ? "Captured" : "Awaiting capture"}
              </dd>
            </div>
          </dl>
          <p className="case-obs-intel-command__note">{statusSummary.maturityNote}</p>
        </div>
      </section>

      <div className="case-obs-intel-briefing" data-testid="case-ps-intelligence-briefing">
        {briefingSections.map((section) => (
          <BriefingSection
            key={section.id}
            {...section}
            captured={hasCapturedNotes}
            contextLine={section.id === "this-case" ? presentation.contextLine : undefined}
          />
        ))}
      </div>

      <section className="case-obs-intel-panel case-obs-intel-panel--default case-obs-intel-panel--tertiary">
        <h2 className="case-obs-intel-title">{PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.evidenceSources}</h2>
        <p className="case-obs-intel-empty">
          {presentation.evidenceCount} traceable item{presentation.evidenceCount === 1 ? "" : "s"} from field notes,
          this case, and provider history.
        </p>
      </section>
    </div>
  );
}

const productSupportIntelligenceTabCss = `
.case-ps-intel-outcomes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.case-ps-intel-outcome-badge {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
}
.case-ps-intel-outcome-badge--reaction {
  border-color: rgba(52, 211, 153, 0.35);
  background: rgba(16, 185, 129, 0.16);
}
.case-ps-intel-outcome-badge--result {
  border-color: rgba(96, 165, 250, 0.35);
  background: rgba(59, 130, 246, 0.16);
}
.case-ps-intel-outcome-badge--next {
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(245, 158, 11, 0.16);
}
.case-obs-intel-chip--inventory .case-obs-intel-chip-dot { background: #d97706; }
.case-obs-intel-chip--training .case-obs-intel-chip-dot { background: #7c3aed; }
`;
