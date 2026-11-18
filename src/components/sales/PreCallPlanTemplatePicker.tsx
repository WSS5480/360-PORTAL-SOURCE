"use client";

import React from "react";
import { preCallPlanTemplateFlowCss } from "@/components/sales/preCallPlanTemplateFlowCss";
import { SALES_STAGE_LABEL, type SalesStage } from "@/lib/sales/stages";
import { applyPreCallPlanTemplateToDraft } from "@/lib/surgical-sales/preCallPlanTemplateApply";
import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import {
  templateEngagementLabel,
  templateIncludedSections,
  templateObjectiveSummary,
  templateTagLabels,
} from "@/lib/surgical-sales/preCallPlanTemplateCard";
import { dedupePreCallPlanTemplates } from "@/lib/surgical-sales/preCallPlanTemplateDedupe";
import {
  collectFilterOptions,
  formatFilterSlugLabel,
  groupTemplatesForPicker,
  type ScoredTemplate,
  type TemplateSuggestContext,
} from "@/lib/surgical-sales/preCallPlanTemplateSuggest";
import { ENGAGEMENT_TYPE_LABELS } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  PRE_CALL_PLAN_PRODUCT_LINES,
  PRE_CALL_PLAN_TEMPLATE_ENGAGEMENT_TYPES_MVP,
  type PreCallPlanProductLine,
  type PreCallPlanTemplateEngagementType,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";

import { PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS } from "@/lib/surgical-sales/preCallPlanStrategicTemplateMapping";
import { userFacingError } from "@/lib/errors/userFacingError";

const PREVIEW_FIELDS = PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS.map((m) => ({
  key: m.templateKey,
  label: m.label,
}));

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

function TemplateCard({
  template,
  selected,
  suggested,
  suggestReasons,
  dense,
  onPreview,
  onUse,
  onToggleFavorite,
}: {
  template: PreCallPlanTemplate;
  selected: boolean;
  suggested?: boolean;
  suggestReasons?: string[];
  dense?: boolean;
  onPreview: () => void;
  onUse: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
  const sections = dense ? [] : templateIncludedSections(template);
  const tags = dense ? [] : templateTagLabels(template);

  return (
    <article
      className={`pcp-tcard${selected ? " pcp-tcard--selected" : ""}${suggested ? " pcp-tcard--suggested" : ""}${dense ? " pcp-tcard--dense" : ""}`}
    >
      <div className="pcp-tcard-top">
        <h4 className="pcp-tcard-name">{template.name}</h4>
        <button
          type="button"
          className="pcp-tcard-fav"
          aria-label={template.isFavorite ? "Remove favorite" : "Favorite"}
          onClick={onToggleFavorite}
        >
          {template.isFavorite ? "★" : "☆"}
        </button>
      </div>
      <div className="pcp-tcard-meta">
        <span className="pcp-tcard-pill pcp-tcard-pill--product">{template.productLine}</span>
        <span className="pcp-tcard-pill">{templateEngagementLabel(template)}</span>
        {!dense && template.isSystemTemplate ? (
          <span className="pcp-tcard-pill pcp-tcard-pill--muted">Playbook</span>
        ) : !dense ? (
          <span className="pcp-tcard-pill pcp-tcard-pill--muted">Mine</span>
        ) : null}
      </div>
      <p className="pcp-tcard-objective">{templateObjectiveSummary(template, dense ? 72 : 120)}</p>
      {sections.length > 0 ? (
        <p className="pcp-tcard-sections">
          <span className="pcp-tcard-sections-label">Includes</span> {sections.join(" · ")}
        </p>
      ) : null}
      {tags.length > 0 ? (
        <div className="pcp-tcard-tags">
          {tags.map((tag) => (
            <span key={tag} className="pcp-tcard-tag">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {!dense && suggestReasons && suggestReasons.length > 0 ? (
        <p className="pcp-tcard-suggest">{suggestReasons.slice(0, 2).join(" · ")}</p>
      ) : null}
      <div className="pcp-tcard-actions">
        <button type="button" className="pcp-tcard-preview" onClick={onPreview}>
          Preview
        </button>
        <button type="button" className="pcp-tcard-use" onClick={onUse}>
          Use template
        </button>
      </div>
    </article>
  );
}

function SuggestedCarousel({
  items,
  scored,
  selectedId,
  dense,
  onPreview,
  onUse,
  onToggleFavorite,
}: {
  items: PreCallPlanTemplate[];
  scored: Map<string, ScoredTemplate>;
  selectedId: string | null;
  dense?: boolean;
  onPreview: (t: PreCallPlanTemplate) => void;
  onUse: (t: PreCallPlanTemplate) => void;
  onToggleFavorite: (t: PreCallPlanTemplate, e: React.MouseEvent) => void;
}) {
  return (
    <section className="pcp-suggested" aria-label="Suggested templates">
      <div className="pcp-suggested-head">
        <h3 className="pcp-suggested-title">Suggested for you</h3>
        <span className="pcp-suggested-count">{items.length}</span>
      </div>
      <div className="pcp-suggested-track">
        {items.map((t) => {
          const scoreRow = scored.get(t.id);
          return (
            <div key={t.id} className="pcp-suggested-slide">
              <TemplateCard
                template={t}
                selected={selectedId === t.id}
                suggested
                dense={dense}
                suggestReasons={scoreRow?.reasons}
                onPreview={() => onPreview(t)}
                onUse={() => onUse(t)}
                onToggleFavorite={(e) => onToggleFavorite(t, e)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TemplateCardGrid({
  items,
  selectedId,
  scored,
  dense,
  onPreview,
  onUse,
  onToggleFavorite,
}: {
  items: PreCallPlanTemplate[];
  selectedId: string | null;
  scored?: Map<string, ScoredTemplate>;
  dense?: boolean;
  onPreview: (t: PreCallPlanTemplate) => void;
  onUse: (t: PreCallPlanTemplate) => void;
  onToggleFavorite: (t: PreCallPlanTemplate, e: React.MouseEvent) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="pcp-tcard-grid" role="list">
      {items.map((t) => (
        <TemplateCard
          key={t.id}
          template={t}
          selected={selectedId === t.id}
          suggested={scored?.has(t.id)}
          dense={dense}
          suggestReasons={scored?.get(t.id)?.reasons}
          onPreview={() => onPreview(t)}
          onUse={() => onUse(t)}
          onToggleFavorite={(e) => onToggleFavorite(t, e)}
        />
      ))}
    </div>
  );
}

export function PreCallPlanTemplatePicker({
  currentDraft,
  onApply,
  initialProductLine,
  initialEngagementType,
  suggestContext,
  embedded,
  showSkip,
  onSkip,
  hideEngagementTypeFilter = Boolean(initialEngagementType),
  wizardMinimal,
}: {
  currentDraft: Record<PreCallPlanFieldKey, string>;
  onApply: (next: Record<PreCallPlanFieldKey, string>, templateId: string) => void;
  initialProductLine?: PreCallPlanProductLine | "";
  initialEngagementType?: PreCallPlanTemplateEngagementType | "";
  suggestContext?: TemplateSuggestContext;
  embedded?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
  hideEngagementTypeFilter?: boolean;
  /** Wizard browse: search + compact list only; no carousel, pills, or card grid. */
  wizardMinimal?: boolean;
}) {
  const [search, setSearch] = React.useState("");
  const [productLine, setProductLine] = React.useState<PreCallPlanProductLine | "">(initialProductLine ?? "");
  const [engagementType, setEngagementType] = React.useState<PreCallPlanTemplateEngagementType | "">(
    initialEngagementType ?? "",
  );
  const [stageFilter, setStageFilter] = React.useState<SalesStage | "">("");
  const [specialtyFilter, setSpecialtyFilter] = React.useState("");
  const [procedureFilter, setProcedureFilter] = React.useState("");
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);
  const [templates, setTemplates] = React.useState<PreCallPlanTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<PreCallPlanTemplate | null>(null);
  const [applyMode, setApplyMode] = React.useState<"overwrite" | "fill_empty">("overwrite");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const suggestDefaultsApplied = React.useRef(false);

  React.useEffect(() => {
    setProductLine(initialProductLine ?? "");
    setEngagementType(initialEngagementType ?? "");
  }, [initialProductLine, initialEngagementType]);

  React.useEffect(() => {
    suggestDefaultsApplied.current = false;
  }, [
    suggestContext?.productLine,
    suggestContext?.opportunityProductLine,
    suggestContext?.providerSpecialty,
    suggestContext?.opportunityStage,
    suggestContext?.crmEngagementType,
    suggestContext?.organizationName,
    suggestContext?.organizationType,
  ]);

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
          setErr(userFacingError(e, "We could not load templates. Please try again."));
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

  React.useEffect(() => {
    if (loading || !suggestContext || suggestDefaultsApplied.current || templates.length === 0) return;
    const grouping = groupTemplatesForPicker(
      templates,
      suggestContext,
      {
        productLine: "",
        engagementType: "",
        stage: "",
        specialtySlug: "",
        procedureSlug: "",
        searchQ: "",
        favoritesOnly: false,
      },
      matchesSearch,
    );
    if (grouping.defaultFilters.productLine) setProductLine(grouping.defaultFilters.productLine);
    if (grouping.defaultFilters.engagementType) setEngagementType(grouping.defaultFilters.engagementType);
    if (grouping.defaultFilters.stage) setStageFilter(grouping.defaultFilters.stage);
    suggestDefaultsApplied.current = true;
  }, [loading, suggestContext, templates]);

  const searchQ = search.trim().toLowerCase();
  const filterOptions = React.useMemo(() => collectFilterOptions(templates), [templates]);
  const advancedFilterCount = [procedureFilter, specialtyFilter, stageFilter].filter(Boolean).length;

  const grouping = React.useMemo(
    () =>
      groupTemplatesForPicker(
        templates,
        suggestContext,
        {
          productLine,
          engagementType,
          stage: stageFilter,
          specialtySlug: specialtyFilter,
          procedureSlug: procedureFilter,
          searchQ,
          favoritesOnly,
        },
        matchesSearch,
      ),
    [
      templates,
      suggestContext,
      productLine,
      engagementType,
      stageFilter,
      specialtyFilter,
      procedureFilter,
      searchQ,
      favoritesOnly,
    ],
  );

  const scoredMap = React.useMemo(() => {
    const m = new Map<string, ScoredTemplate>();
    for (const s of grouping.suggested) m.set(s.template.id, s);
    return m;
  }, [grouping.suggested]);

  const suggestedIds = React.useMemo(
    () => new Set(grouping.suggested.map((s) => s.template.id)),
    [grouping.suggested],
  );

  const mainGridTemplates = React.useMemo(() => {
    const list = [...grouping.generic, ...grouping.remainder];
    return list.filter((t) => !suggestedIds.has(t.id));
  }, [grouping.generic, grouping.remainder, suggestedIds]);

  const suggestedTemplates = grouping.suggested.map((s) => s.template);

  async function toggleFavorite(template: PreCallPlanTemplate, e: React.MouseEvent) {
    e.stopPropagation();
    const method = template.isFavorite ? "DELETE" : "POST";
    const res = await fetch(
      `/api/portal/sales/pre-call-plan-templates/${encodeURIComponent(template.id)}/favorite`,
      { method },
    );
    const j = (await res.json()) as { ok?: boolean };
    if (res.ok && j.ok) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, isFavorite: !t.isFavorite } : t)),
      );
      if (preview?.id === template.id) {
        setPreview((p) => (p ? { ...p, isFavorite: !p.isFavorite } : p));
      }
    }
  }

  function openPreview(t: PreCallPlanTemplate) {
    setSelectedId(t.id);
    setPreview(t);
  }

  function applyTemplate(t: PreCallPlanTemplate) {
    onApply(applyPreCallPlanTemplateToDraft(currentDraft, t, applyMode), t.id);
    setPreview(null);
  }

  const rootClass = [
    embedded ? "pcp-template-embedded pcp-template-picker pcp-template-picker--embedded" : "pcp-template-picker",
    wizardMinimal ? "pcp-template-picker--wizard-minimal" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (preview) {
    return (
      <div className={`${rootClass} pcp-template-picker--preview`}>
        <style dangerouslySetInnerHTML={{ __html: preCallPlanTemplateFlowCss }} />
        <header className="pcp-template-preview-head">
          <button type="button" className="pcp-template-preview-back" onClick={() => setPreview(null)}>
            ← Back
          </button>
          <h3 className="pcp-template-preview-title">{preview.name}</h3>
        </header>
        <div className="pcp-template-body pcp-template-body--preview">
          {PREVIEW_FIELDS.map(({ key, label }) => {
            const text = String(preview[key] ?? "").trim();
            if (!text) return null;
            return (
              <div key={key} className="pcp-template-preview-block">
                <div className="pcp-template-preview-label">{label}</div>
                <p className="pcp-template-preview-text">{text}</p>
              </div>
            );
          })}
          <label className="pcp-template-fill-mode">
            <input
              type="checkbox"
              checked={applyMode === "fill_empty"}
              onChange={(e) => setApplyMode(e.target.checked ? "fill_empty" : "overwrite")}
            />
            <span>Only fill empty fields</span>
          </label>
        </div>
        <footer className="pcp-template-foot pcp-template-foot--sticky">
          <button type="button" className="pcp-template-foot-primary" onClick={() => applyTemplate(preview)}>
            Use template
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className={rootClass}>
      <style dangerouslySetInnerHTML={{ __html: preCallPlanTemplateFlowCss }} />
      <div className="pcp-template-body pcp-template-body--browse">
        {err ? (
          <p className="pcp-template-alert" role="alert">
            {err}
          </p>
        ) : null}

        {grouping.contextSummary ? (
          <p className="pcp-template-context-line" role="status">
            Matching <strong>{grouping.contextSummary}</strong>
          </p>
        ) : null}

        {!wizardMinimal && !loading && suggestedTemplates.length > 0 ? (
          <SuggestedCarousel
            items={suggestedTemplates}
            scored={scoredMap}
            selectedId={selectedId}
            dense={embedded}
            onPreview={openPreview}
            onUse={applyTemplate}
            onToggleFavorite={toggleFavorite}
          />
        ) : null}

        <div className="pcp-template-search-wrap">
          <input
            type="search"
            className="pcp-template-search"
            placeholder="Search playbooks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search templates"
            enterKeyHint="search"
          />
        </div>

        {!wizardMinimal ? (
          <div className="pcp-template-chips-row">
            <div className="pcp-template-pills" role="tablist" aria-label="Product line">
              <button
                type="button"
                role="tab"
                aria-selected={!productLine}
                className={`pcp-template-pill${!productLine ? " pcp-template-pill--active" : ""}`}
                onClick={() => setProductLine("")}
              >
                All products
              </button>
              {PRE_CALL_PLAN_PRODUCT_LINES.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={productLine === p}
                  className={`pcp-template-pill${productLine === p ? " pcp-template-pill--active" : ""}`}
                  onClick={() => setProductLine(productLine === p ? "" : p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!wizardMinimal && !hideEngagementTypeFilter ? (
          <div className="pcp-template-chips-row">
            <div className="pcp-template-pills" role="tablist" aria-label="Engagement type">
              <button
                type="button"
                role="tab"
                aria-selected={!engagementType}
                className={`pcp-template-pill${!engagementType ? " pcp-template-pill--active" : ""}`}
                onClick={() => setEngagementType("")}
              >
                All types
              </button>
              {PRE_CALL_PLAN_TEMPLATE_ENGAGEMENT_TYPES_MVP.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={engagementType === t}
                  className={`pcp-template-pill${engagementType === t ? " pcp-template-pill--active" : ""}`}
                  onClick={() => setEngagementType(engagementType === t ? "" : t)}
                >
                  {ENGAGEMENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="pcp-template-results-head">
          <span className="pcp-template-results-count">
            {loading ? "Loading…" : `${grouping.displayCount} playbook${grouping.displayCount === 1 ? "" : "s"}`}
          </span>
          <label className="pcp-template-fav-toggle">
            <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
            Favorites
          </label>
        </div>

        {loading ? <p className="pcp-template-loading">Loading playbooks…</p> : null}

        {wizardMinimal && !loading ? (
          <ul className="pcp-wizard-minimal-list" role="list">
            {[...suggestedTemplates, ...mainGridTemplates]
              .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
              .slice(0, 12)
              .map((t) => (
                <li key={t.id}>
                  <div className="pcp-wizard-minimal-row">
                    <div className="pcp-wizard-minimal-text">
                      <span className="pcp-wizard-minimal-name">{t.name}</span>
                      <span className="pcp-wizard-minimal-meta">{t.productLine}</span>
                    </div>
                    <button type="button" className="pcp-wizard-minimal-use" onClick={() => applyTemplate(t)}>
                      Use
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        ) : null}

        {!wizardMinimal && !loading ? (
          <TemplateCardGrid
            items={mainGridTemplates}
            selectedId={selectedId}
            scored={scoredMap}
            dense={embedded}
            onPreview={openPreview}
            onUse={applyTemplate}
            onToggleFavorite={toggleFavorite}
          />
        ) : null}

        {!loading && grouping.displayCount === 0 ? (
          <p className="pcp-template-empty-compact">No playbooks match. Clear a filter or try another search.</p>
        ) : null}

        <details className="pcp-template-more-filters">
          <summary className="pcp-template-more-filters-summary">
            <span>More filters</span>
            {advancedFilterCount > 0 ? (
              <span className="pcp-template-more-filters-badge" aria-label={`${advancedFilterCount} active filters`}>
                {advancedFilterCount}
              </span>
            ) : null}
          </summary>
          <div className="pcp-template-more-filters-panel">
            <div className="pcp-template-filter-selects">
              <label>
                Specialty
                <select value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}>
                  <option value="">All specialties</option>
                  {filterOptions.specialtySlugs.map((slug) => (
                    <option key={slug} value={slug}>
                      {formatFilterSlugLabel(slug)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Stage
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter((e.target.value || "") as SalesStage | "")}
                >
                  <option value="">All stages</option>
                  {filterOptions.stageSlugs.map((slug) => (
                    <option key={slug} value={slug}>
                      {SALES_STAGE_LABEL[slug as SalesStage] ?? formatFilterSlugLabel(slug)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Procedure focus
                <select value={procedureFilter} onChange={(e) => setProcedureFilter(e.target.value)}>
                  <option value="">All procedures</option>
                  {filterOptions.procedureSlugs.map((slug) => (
                    <option key={slug} value={slug}>
                      {formatFilterSlugLabel(slug)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </details>
      </div>

      {showSkip && onSkip ? (
        <footer className="pcp-template-foot pcp-template-foot--sticky">
          <button type="button" className="pcp-template-foot-skip" onClick={onSkip}>
            Continue without template
          </button>
        </footer>
      ) : null}
    </div>
  );
}
