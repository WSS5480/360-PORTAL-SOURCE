"use client";

import React from "react";
import { applyPreCallPlanTemplateToDraft } from "@/lib/surgical-sales/preCallPlanTemplateApply";
import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import { dedupePreCallPlanTemplates } from "@/lib/surgical-sales/preCallPlanTemplateDedupe";
import type { PreparationSpecializationTier } from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";
import {
  groupTemplatesForPicker,
  partitionPrepGuideRecommendations,
  type ScoredTemplate,
  type TemplateSuggestContext,
} from "@/lib/surgical-sales/preCallPlanTemplateSuggest";
import { PreCallPlanTemplatePicker } from "@/components/sales/PreCallPlanTemplatePicker";
import { ENGAGEMENT_TYPE_LABELS } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { PreCallPlanTemplateEngagementType } from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import { userFacingError } from "@/lib/errors/userFacingError";

/** Shown before "More recommendations" when a product focus is active */
const INITIAL_RECOMMENDATIONS = 3;

function matchesSearch(t: PreCallPlanTemplate, q: string): boolean {
  if (!q) return true;
  const hay = [
    t.name,
    t.procedureFocus,
    t.description,
    t.productLine,
    ENGAGEMENT_TYPE_LABELS[t.engagementType],
    ...(t.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function guideMetaLine(t: PreCallPlanTemplate, variant: "primary" | "overlay" | "lightweight"): string {
  const parts: string[] = [];
  if (variant === "overlay" && t.productLine) {
    parts.push(`${t.productLine} template`);
  } else if (variant === "primary" && t.productLine) {
    parts.push(t.productLine);
  }
  const typeLabel = ENGAGEMENT_TYPE_LABELS[t.engagementType];
  if (typeLabel) parts.push(typeLabel);
  if (t.procedureFocus?.trim()) parts.push(t.procedureFocus.trim());
  return parts.join(" · ");
}

function formatGuideReason(scored: ScoredTemplate, variant: "primary" | "overlay" | "lightweight"): string | null {
  const reason = scored.reasons.find((r) => !/^Product line:/i.test(r)) ?? scored.reasons[0];
  if (!reason?.trim()) return null;
  if (variant === "overlay") {
    return reason.replace(/^Product line:\s*/i, "").trim() || null;
  }
  return reason.trim();
}

function PrepGuideRecommendation({
  scored,
  selected,
  disabled,
  variant,
  onApply,
}: {
  scored: ScoredTemplate;
  selected: boolean;
  disabled?: boolean;
  variant: "primary" | "overlay" | "lightweight";
  onApply: () => void;
}) {
  const t = scored.template;
  const reason = formatGuideReason(scored, variant);
  const meta = guideMetaLine(t, variant);

  return (
    <li
      className={`ew-prep-guide-item ew-prep-guide-item--${variant}${selected ? " ew-prep-guide-item--on" : ""}`}
    >
      <div className="ew-prep-guide-main">
        <span className="ew-prep-guide-name">{t.name}</span>
        {meta ? <span className="ew-prep-guide-meta">{meta}</span> : null}
        {reason ? <span className="ew-prep-guide-reason">{reason}</span> : null}
      </div>
      <button type="button" className="ew-prep-guide-btn" disabled={disabled} onClick={onApply}>
        {selected ? "Applied" : "Apply"}
      </button>
    </li>
  );
}

function PrepGuideList({
  items,
  appliedTemplateId,
  disabled,
  variant,
  onApplyTemplate,
}: {
  items: ScoredTemplate[];
  appliedTemplateId: string | null;
  disabled?: boolean;
  variant: "primary" | "overlay" | "lightweight";
  onApplyTemplate: (t: PreCallPlanTemplate) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ul className={`ew-prep-guide-list ew-prep-guide-list--${variant}`} role="list">
      {items.map((scored) => (
        <PrepGuideRecommendation
          key={scored.template.id}
          scored={scored}
          selected={appliedTemplateId === scored.template.id}
          disabled={disabled}
          variant={variant}
          onApply={() => onApplyTemplate(scored.template)}
        />
      ))}
    </ul>
  );
}

export function SuggestedPlaybooksCompact({
  currentDraft,
  suggestContext,
  initialEngagementType,
  appliedTemplateId,
  onApply,
  moreOptionsOpen,
  onMoreOptionsOpenChange,
  prepSpecializationTier,
}: {
  currentDraft: Record<PreCallPlanFieldKey, string>;
  suggestContext: TemplateSuggestContext;
  initialEngagementType: PreCallPlanTemplateEngagementType | "";
  appliedTemplateId: string | null;
  onApply: (next: Record<PreCallPlanFieldKey, string>, templateId: string) => void;
  moreOptionsOpen: boolean;
  onMoreOptionsOpenChange: (open: boolean) => void;
  prepSpecializationTier?: PreparationSpecializationTier;
}) {
  const [templates, setTemplates] = React.useState<PreCallPlanTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [moreRecsOpen, setMoreRecsOpen] = React.useState(false);
  const [optionalOverlaysOpen, setOptionalOverlaysOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const res = await fetch("/api/portal/sales/pre-call-plan-templates", { cache: "no-store" });
        const j = (await res.json()) as { ok?: boolean; templates?: PreCallPlanTemplate[]; error?: string };
        if (!res.ok || !j.ok) throw new Error(j.error || "");
        if (!cancelled) setTemplates(dedupePreCallPlanTemplates(j.templates ?? []));
      } catch (e: unknown) {
        if (!cancelled) {
          setErr(userFacingError(e, "We could not load preparation guides. Please try again."));
          setTemplates([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouping = React.useMemo(
    () =>
      groupTemplatesForPicker(
        templates,
        suggestContext,
        {
          productLine: "",
          engagementType: initialEngagementType || "",
          stage: "",
          specialtySlug: "",
          procedureSlug: "",
          searchQ: "",
          favoritesOnly: false,
        },
        matchesSearch,
      ),
    [templates, suggestContext, initialEngagementType],
  );

  const partition = React.useMemo(
    () => partitionPrepGuideRecommendations(grouping, suggestContext, prepSpecializationTier),
    [grouping, suggestContext, prepSpecializationTier],
  );

  const hasProductFocus = partition.hasProductFocus;
  const primaryRecs = hasProductFocus
    ? partition.workflowGuides.slice(0, INITIAL_RECOMMENDATIONS)
    : [];
  const moreRecs = hasProductFocus ? partition.workflowGuides.slice(INITIAL_RECOMMENDATIONS) : [];
  const overlayCount = partition.productOverlays.length + partition.workflowGuides.length;

  function applyTemplate(t: PreCallPlanTemplate) {
    onApply(applyPreCallPlanTemplateToDraft(currentDraft, t, "overwrite"), t.id);
    onMoreOptionsOpenChange(false);
  }

  if (!hasProductFocus) {
    return (
      <>
        <details
          className="ew-prep-guides ew-prep-guides--optional"
          open={optionalOverlaysOpen}
          onToggle={(e) => setOptionalOverlaysOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="ew-prep-guides-optional-summary">
            <span className="ew-prep-guides-optional-title">Optional workflow overlays</span>
            {overlayCount > 0 ? (
              <span className="ew-prep-guides-optional-count">{overlayCount}</span>
            ) : null}
          </summary>
          <div className="ew-prep-guides-optional-body">
            <p className="ew-prep-guides-helper ew-prep-guides-helper--optional">
              No product direction is selected yet. Use workflow discovery guidance above first — apply a template
              only if you want an optional product-specific starting point.
            </p>

            {err ? (
              <p className="ew-prep-alert" role="alert">
                {err}
              </p>
            ) : null}
            {loading ? (
              <p className="ew-prep-muted ew-prep-guides-status">Loading overlays…</p>
            ) : null}

            {!loading && partition.workflowGuides.length > 0 ? (
              <div className="ew-prep-guides-subsection">
                <p className="ew-prep-guides-subsection-label">Lightweight starters</p>
                <PrepGuideList
                  items={partition.workflowGuides}
                  appliedTemplateId={appliedTemplateId}
                  disabled={loading}
                  variant="lightweight"
                  onApplyTemplate={applyTemplate}
                />
              </div>
            ) : null}

            {!loading && partition.productOverlays.length > 0 ? (
              <div className="ew-prep-guides-subsection">
                <p className="ew-prep-guides-subsection-label">Product workflow overlays</p>
                <PrepGuideList
                  items={partition.productOverlays}
                  appliedTemplateId={appliedTemplateId}
                  disabled={loading}
                  variant="overlay"
                  onApplyTemplate={applyTemplate}
                />
              </div>
            ) : null}

            {!loading && overlayCount === 0 && !err ? (
              <p className="ew-prep-muted ew-prep-guides-empty">
                No close matches — browse all guides in advanced options below.
              </p>
            ) : null}
          </div>
        </details>

        <details
          className="ew-prep-collapsible ew-prep-more-options ew-prep-advanced-options"
          open={moreOptionsOpen}
          onToggle={(e) => onMoreOptionsOpenChange(e.currentTarget.open)}
        >
          <summary className="ew-prep-collapsible-summary">
            <span>Advanced options</span>
            <span className="ew-prep-muted" style={{ fontWeight: 600 }}>
              all guides
            </span>
          </summary>
          <div className="ew-prep-collapsible-body">
            <PreCallPlanTemplatePicker
              embedded
              wizardMinimal
              hideEngagementTypeFilter
              initialEngagementType={initialEngagementType}
              suggestContext={suggestContext}
              currentDraft={currentDraft}
              onApply={(next, templateId) => {
                onApply(next, templateId);
                onMoreOptionsOpenChange(false);
              }}
            />
          </div>
        </details>
      </>
    );
  }

  return (
    <>
      <section className="ew-prep-guides ew-prep-guides--focused" aria-labelledby="ew-prep-guides-title">
        <header className="ew-prep-guides-header ew-prep-guides-header--compact">
          <h3 id="ew-prep-guides-title" className="ew-prep-guides-title ew-prep-guides-title--overlay">
            Product workflow overlays
          </h3>
          <p className="ew-prep-guides-helper ew-prep-guides-helper--overlay">
            Optional templates — apply only if you want a product-specific starting point on top of workflow
            discovery above.
          </p>
        </header>

        {err ? (
          <p className="ew-prep-alert" role="alert">
            {err}
          </p>
        ) : null}
        {loading ? <p className="ew-prep-muted ew-prep-guides-status">Loading recommendations…</p> : null}

        {!loading && primaryRecs.length > 0 ? (
          <PrepGuideList
            items={primaryRecs}
            appliedTemplateId={appliedTemplateId}
            disabled={loading}
            variant="overlay"
            onApplyTemplate={applyTemplate}
          />
        ) : null}

        {!loading && moreRecs.length > 0 ? (
          <details
            className="ew-prep-guides-more"
            open={moreRecsOpen}
            onToggle={(e) => setMoreRecsOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="ew-prep-guides-more-summary">
              More recommendations
              <span className="ew-prep-guides-more-count">{moreRecs.length}</span>
            </summary>
            <PrepGuideList
              items={moreRecs}
              appliedTemplateId={appliedTemplateId}
              disabled={loading}
              variant="overlay"
              onApplyTemplate={applyTemplate}
            />
          </details>
        ) : null}

        {!loading && partition.workflowGuides.length === 0 && !err ? (
          <p className="ew-prep-muted ew-prep-guides-empty">
            No close matches for this context — browse all guides in advanced options below.
          </p>
        ) : null}
      </section>

      <details
        className="ew-prep-collapsible ew-prep-more-options ew-prep-advanced-options"
        open={moreOptionsOpen}
        onToggle={(e) => onMoreOptionsOpenChange(e.currentTarget.open)}
      >
        <summary className="ew-prep-collapsible-summary">
          <span>Advanced options</span>
          <span className="ew-prep-muted" style={{ fontWeight: 600 }}>
            all guides
          </span>
        </summary>
        <div className="ew-prep-collapsible-body">
          <PreCallPlanTemplatePicker
            embedded
            wizardMinimal
            hideEngagementTypeFilter
            initialEngagementType={initialEngagementType}
            suggestContext={suggestContext}
            currentDraft={currentDraft}
            onApply={(next, templateId) => {
              onApply(next, templateId);
              onMoreOptionsOpenChange(false);
            }}
          />
        </div>
      </details>
    </>
  );
}

/** Returns top recommended template for external quick-apply action. */
export function pickTopSuggestedPlaybook(
  templates: PreCallPlanTemplate[],
  suggestContext: TemplateSuggestContext,
  initialEngagementType: PreCallPlanTemplateEngagementType | "",
  prepSpecializationTier?: PreparationSpecializationTier,
): PreCallPlanTemplate | null {
  const grouping = groupTemplatesForPicker(
    templates,
    suggestContext,
    {
      productLine: "",
      engagementType: initialEngagementType || "",
      stage: "",
      specialtySlug: "",
      procedureSlug: "",
      searchQ: "",
      favoritesOnly: false,
    },
    matchesSearch,
  );
  const partition = partitionPrepGuideRecommendations(grouping, suggestContext, prepSpecializationTier);
  if (!partition.hasProductFocus) {
    return partition.workflowGuides[0]?.template ?? null;
  }
  return partition.workflowGuides[0]?.template ?? null;
}
