"use client";

import React from "react";
import { applyPreCallPlanTemplateToDraft } from "@/lib/surgical-sales/preCallPlanTemplateApply";
import {
  buildPreCallPlanTemplateApplySections,
  preCallPlanTemplateApplyConflicts,
  preCallPlanTemplateHasApplyConflicts,
  preCallPlanTemplateSectionsWithContent,
  type PreCallPlanTemplateApplySection,
} from "@/lib/surgical-sales/preCallPlanTemplateApplyAnalysis";
import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import { dedupePreCallPlanTemplates } from "@/lib/surgical-sales/preCallPlanTemplateDedupe";
import {
  groupTemplatesForPicker,
  type ScoredTemplate,
  type TemplateSuggestContext,
} from "@/lib/surgical-sales/preCallPlanTemplateSuggest";
import {
  PRE_CALL_PLAN_PRODUCT_LINES,
  type PreCallPlanProductLine,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import {
  introCallPreparePlaybookDisplayLabel,
  introCallPreparePlaybooksForPicker,
} from "@/lib/surgical-sales/engagements/introCallPreparePlaybooks";
import {
  officeVisit360PreparePlaybookDisplayLabel,
  officeVisit360PreparePlaybooksForPicker,
} from "@/lib/surgical-sales/engagements/officeVisit360PreparePlaybooks";
import {
  applyOfficeVisit360PrepareTemplateToWorkflowDraft,
  buildOfficeVisit360PrepareTemplateApplySections,
  officeVisit360PrepareTemplateHasApplyConflicts,
} from "@/lib/surgical-sales/engagements/officeVisit360PrepareTemplateApply";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { officeVisitTemplateDraftFromWorkflow } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import type { PreCallPlanDraftChangeMeta } from "@/components/sales/PreCallPlanTemplateSection";
import { preparePlaybookAssistantCss } from "./preparePlaybookAssistantCss";
import { userFacingError } from "@/lib/errors/userFacingError";

function matchesProductFilter(t: PreCallPlanTemplate, productLine: PreCallPlanProductLine | ""): boolean {
  if (!productLine) return true;
  return t.productLine === productLine;
}

type PreviewApplySection = {
  draftKey: string;
  label: string;
  templateValue: string | null;
  hasTemplateContent: boolean;
  wouldConflict: boolean;
};

function previewSectionChip(section: PreviewApplySection): {
  label: string;
  className: string;
} {
  if (!section.hasTemplateContent) {
    return { label: "Not in playbook", className: "pfm-playbook-preview-section__chip--empty" };
  }
  if (section.wouldConflict) {
    return { label: "Your content kept", className: "pfm-playbook-preview-section__chip--keep" };
  }
  return { label: "Will fill", className: "pfm-playbook-preview-section__chip--fill" };
}

function PlaybookSheet({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className="pfm-playbook-sheet-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="pfm-playbook-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pfm-playbook-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pfm-playbook-sheet__head">
          <div>
            <h2 id="pfm-playbook-sheet-title" className="pfm-playbook-sheet__title">
              {title}
            </h2>
            {subtitle ? <p className="pfm-playbook-sheet__sub">{subtitle}</p> : null}
          </div>
          <button type="button" className="pfm-playbook-sheet__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="pfm-playbook-sheet__body">{children}</div>
        {footer ? <footer className="pfm-playbook-sheet__foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

function PreviewSections({ sections }: { sections: PreviewApplySection[] }) {
  const withContent = sections.filter((section) => section.hasTemplateContent);
  if (withContent.length === 0) {
    return <p className="pfm-playbook-apply-conflict-note">This playbook has no plan content to apply.</p>;
  }
  return (
    <>
      {withContent.map((section) => {
        const chip = previewSectionChip(section);
        return (
          <article key={section.draftKey} className="pfm-playbook-preview-section">
            <div className="pfm-playbook-preview-section__head">
              <span className="pfm-playbook-preview-section__label">{section.label}</span>
              <span className={`pfm-playbook-preview-section__chip ${chip.className}`}>{chip.label}</span>
            </div>
            <p className="pfm-playbook-preview-section__text">{section.templateValue ?? ""}</p>
          </article>
        );
      })}
      <p className="pfm-playbook-apply-conflict-note">
        Applying fills blank fields only. Fields you already edited are left unchanged unless you choose replace all.
      </p>
    </>
  );
}

export function PreparePlaybookAssistant({
  draft,
  disabled,
  defaultProductLine = "",
  suggestContext,
  introCallMode = false,
  officeVisit360Mode = false,
  officeVisit360WorkflowDraft,
  onSelectedTemplateChange,
  onApply,
}: {
  draft: Record<PreCallPlanFieldKey, string>;
  disabled?: boolean;
  defaultProductLine?: PreCallPlanProductLine | "";
  suggestContext?: TemplateSuggestContext;
  introCallMode?: boolean;
  officeVisit360Mode?: boolean;
  officeVisit360WorkflowDraft?: EngagementWorkflowDraft;
  onSelectedTemplateChange?: (template: PreCallPlanTemplate | null) => void;
  onApply: (next: Record<PreCallPlanFieldKey, string>, meta?: PreCallPlanDraftChangeMeta) => void;
}) {
  const [productLine, setProductLine] = React.useState<PreCallPlanProductLine | "">(defaultProductLine);
  const [selectedId, setSelectedId] = React.useState("");
  const [templates, setTemplates] = React.useState<PreCallPlanTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [applyConfirmOpen, setApplyConfirmOpen] = React.useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    setProductLine(defaultProductLine);
  }, [defaultProductLine]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const res = await fetch("/api/portal/sales/pre-call-plan-templates", { cache: "no-store" });
        const j = (await res.json()) as { ok?: boolean; templates?: PreCallPlanTemplate[]; error?: string };
        if (!res.ok || !j.ok) throw new Error(j.error || "");
        if (!cancelled) setTemplates(dedupePreCallPlanTemplates(j.templates ?? []));
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(userFacingError(e, "We could not load playbooks. Please try again."));
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

  const pathwayPlaybookMode = introCallMode || officeVisit360Mode;

  const filteredTemplates = React.useMemo(() => {
    if (introCallMode) return introCallPreparePlaybooksForPicker(templates);
    if (officeVisit360Mode) return officeVisit360PreparePlaybooksForPicker(templates);
    return templates.filter((t) => matchesProductFilter(t, productLine));
  }, [templates, productLine, introCallMode, officeVisit360Mode]);

  const grouping = React.useMemo(
    () => {
      const pathwayEngagementType = introCallMode ? "intro_call" : "office_visit_360";
      return pathwayPlaybookMode
        ? {
            suggested: [] as ScoredTemplate[],
            generic: [] as PreCallPlanTemplate[],
            remainder: filteredTemplates,
            displayCount: filteredTemplates.length,
            allFiltered: filteredTemplates,
            contextSummary: null,
            defaultFilters: {
              productLine: "" as const,
              engagementType: pathwayEngagementType,
              stage: "" as const,
              specialtySlug: "",
              procedureSlug: "",
            },
          }
        : groupTemplatesForPicker(
            filteredTemplates,
            suggestContext,
            {
              productLine,
              engagementType: "",
              stage: "",
              specialtySlug: "",
              procedureSlug: "",
              searchQ: "",
              favoritesOnly: false,
            },
            () => true,
          );
    },
    [filteredTemplates, suggestContext, productLine, pathwayPlaybookMode, introCallMode],
  );

  const suggestedIds = React.useMemo(
    () => new Set(grouping.suggested.map((s) => s.template.id)),
    [grouping.suggested],
  );

  const sortedPlaybooks = React.useMemo(() => {
    const suggested = grouping.suggested.map((s) => s.template);
    const rest = filteredTemplates
      .filter((t) => !suggestedIds.has(t.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { suggested, rest };
  }, [filteredTemplates, grouping.suggested, suggestedIds]);

  const selectedTemplate = React.useMemo(
    () => filteredTemplates.find((t) => t.id === selectedId) ?? null,
    [filteredTemplates, selectedId],
  );

  React.useEffect(() => {
    if (selectedId && !filteredTemplates.some((t) => t.id === selectedId)) {
      setSelectedId("");
    }
  }, [filteredTemplates, selectedId]);

  React.useEffect(() => {
    onSelectedTemplateChange?.(selectedTemplate);
  }, [selectedTemplate, onSelectedTemplateChange]);

  React.useEffect(() => {
    if (!officeVisit360Mode || filteredTemplates.length !== 1 || selectedId) return;
    setSelectedId(filteredTemplates[0]!.id);
  }, [officeVisit360Mode, filteredTemplates, selectedId]);

  const applySections = React.useMemo(() => {
    if (!selectedTemplate) return [];
    if (officeVisit360Mode && officeVisit360WorkflowDraft) {
      return buildOfficeVisit360PrepareTemplateApplySections(
        officeVisit360WorkflowDraft,
        selectedTemplate,
      );
    }
    return buildPreCallPlanTemplateApplySections(draft, selectedTemplate);
  }, [draft, officeVisit360Mode, officeVisit360WorkflowDraft, selectedTemplate]);

  const applyConflicts = React.useMemo(
    () => {
      if (!selectedTemplate) return [];
      if (officeVisit360Mode && officeVisit360WorkflowDraft) {
        return buildOfficeVisit360PrepareTemplateApplySections(
          officeVisit360WorkflowDraft,
          selectedTemplate,
        ).filter((section) => section.wouldConflict);
      }
      return preCallPlanTemplateApplyConflicts(
        buildPreCallPlanTemplateApplySections(draft, selectedTemplate),
      );
    },
    [draft, officeVisit360Mode, officeVisit360WorkflowDraft, selectedTemplate],
  );

  function commitApply(mode: "fill_empty" | "overwrite") {
    if (!selectedTemplate) return;
    if (officeVisit360Mode && officeVisit360WorkflowDraft) {
      const merged = applyOfficeVisit360PrepareTemplateToWorkflowDraft(
        officeVisit360WorkflowDraft,
        selectedTemplate,
        mode,
      );
      onApply(officeVisitTemplateDraftFromWorkflow(merged), {
        appliedTemplateId: selectedTemplate.id,
        officeVisit360WorkflowDraft: merged,
      });
    } else {
      const next = applyPreCallPlanTemplateToDraft(draft, selectedTemplate, mode);
      onApply(next, { appliedTemplateId: selectedTemplate.id });
    }
    setApplyConfirmOpen(false);
    setReplaceConfirmOpen(false);
    setPreviewOpen(false);
  }

  function handleApplyClick() {
    if (!selectedTemplate || disabled) return;
    const hasConflicts =
      officeVisit360Mode && officeVisit360WorkflowDraft
        ? officeVisit360PrepareTemplateHasApplyConflicts(officeVisit360WorkflowDraft, selectedTemplate)
        : preCallPlanTemplateHasApplyConflicts(draft, selectedTemplate);
    if (hasConflicts) {
      setApplyConfirmOpen(true);
      return;
    }
    commitApply("fill_empty");
  }

  function handlePreviewClick() {
    if (!selectedTemplate || disabled) return;
    setPreviewOpen(true);
  }

  const hasPlaybooks = filteredTemplates.length > 0;
  const actionsDisabled = disabled || loading || !selectedTemplate;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: preparePlaybookAssistantCss }} />
      <section
        className={`pfm-playbook-assistant${pathwayPlaybookMode ? " pfm-playbook-assistant--intro-call" : ""}`}
        aria-label="Playbook assistant"
      >
        <header className="pfm-playbook-assistant__head">
          <p className="pfm-playbook-assistant__kicker">Templates</p>
          <h3 className="pfm-playbook-assistant__title">
            {introCallMode
              ? "Intro call playbooks"
              : officeVisit360Mode
                ? "360 Experience playbook"
                : "Company playbooks"}
          </h3>
          {introCallMode ? (
            <p className="pfm-playbook-assistant__lead">
              Pick the playbook that matches this site&apos;s product focus — or use All products for a pathway-first
              intro.
            </p>
          ) : officeVisit360Mode ? (
            <p className="pfm-playbook-assistant__lead">
              Apply the company-approved template to fill your visit objective and sim lab focus — then edit either
              answer.
            </p>
          ) : null}
        </header>

        {loading ? <p className="pfm-playbook-assistant__loading">Loading playbooks…</p> : null}
        {loadError ? (
          <p className="pfm-playbook-assistant__alert" role="alert">
            {loadError}
          </p>
        ) : null}

        {pathwayPlaybookMode ? (
          <div
            className="pfm-playbook-intro-grid"
            role="listbox"
            aria-label={introCallMode ? "Intro call playbooks" : "360 Experience playbook"}
          >
            {filteredTemplates.map((template) => {
              const selected = selectedId === template.id;
              const displayLabel = introCallMode
                ? introCallPreparePlaybookDisplayLabel(template)
                : officeVisit360PreparePlaybookDisplayLabel(template);
              return (
                <button
                  key={template.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={disabled || loading}
                  className={`pfm-playbook-intro-card${selected ? " is-selected" : ""}`}
                  onClick={() => setSelectedId(template.id)}
                >
                  <span className="pfm-playbook-intro-card__label">{displayLabel}</span>
                  <span className="pfm-playbook-intro-card__desc">{template.description || template.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="pfm-playbook-assistant__grid">
            <label className="pfm-playbook-assistant__field">
              <span className="pfm-playbook-assistant__label">Playbook</span>
              <select
                className="pfm-playbook-assistant__select"
                value={selectedId}
                disabled={disabled || loading || !hasPlaybooks}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Select playbook…</option>
                {sortedPlaybooks.suggested.length > 0 ? (
                  <optgroup label="Suggested">
                    {sortedPlaybooks.suggested.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {sortedPlaybooks.rest.length > 0 ? (
                  <optgroup label={sortedPlaybooks.suggested.length > 0 ? "All playbooks" : "Playbooks"}>
                    {sortedPlaybooks.rest.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>

            <label className="pfm-playbook-assistant__field">
              <span className="pfm-playbook-assistant__label">Product focus</span>
              <select
                className="pfm-playbook-assistant__select"
                value={productLine}
                disabled={disabled || loading}
                onChange={(e) => {
                  setProductLine((e.target.value || "") as PreCallPlanProductLine | "");
                  setSelectedId("");
                }}
              >
                <option value="">All products (optional)</option>
                {PRE_CALL_PLAN_PRODUCT_LINES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="pfm-playbook-assistant__actions">
          <button
            type="button"
            className="pfm-playbook-assistant__btn"
            disabled={actionsDisabled}
            onClick={handlePreviewClick}
          >
            Preview Template
          </button>
          <button
            type="button"
            className="pfm-playbook-assistant__btn pfm-playbook-assistant__btn--primary"
            disabled={actionsDisabled}
            onClick={handleApplyClick}
          >
            Apply Template
          </button>
        </div>

        {!loading && !loadError && !hasPlaybooks ? (
          <p className="pfm-playbook-assistant__alert">
            {introCallMode
              ? "Intro call playbooks are not available yet. Contact your admin if this persists."
              : officeVisit360Mode
                ? "360 Experience playbook is not available yet. Contact your admin if this persists."
                : "No playbooks match this product filter."}
          </p>
        ) : null}
      </section>

      {previewOpen && selectedTemplate ? (
        <PlaybookSheet
          title="Preview template"
          subtitle={selectedTemplate.name}
          onClose={() => setPreviewOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="pfm-playbook-assistant__btn"
                onClick={() => setPreviewOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="pfm-playbook-assistant__btn pfm-playbook-assistant__btn--primary"
                disabled={disabled}
                onClick={() => {
                  setPreviewOpen(false);
                  handleApplyClick();
                }}
              >
                Apply Template
              </button>
            </>
          }
        >
          <PreviewSections sections={applySections} />
        </PlaybookSheet>
      ) : null}

      {applyConfirmOpen && selectedTemplate ? (
        <PlaybookSheet
          title="Some fields already have content"
          subtitle="Choose how to apply this playbook."
          onClose={() => setApplyConfirmOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="pfm-playbook-assistant__btn"
                onClick={() => setApplyConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pfm-playbook-assistant__btn pfm-playbook-assistant__btn--primary"
                disabled={disabled}
                onClick={() => commitApply("fill_empty")}
              >
                Apply only to blank fields
              </button>
              <button
                type="button"
                className="pfm-playbook-assistant__btn pfm-playbook-assistant__btn--danger"
                disabled={disabled}
                onClick={() => {
                  setApplyConfirmOpen(false);
                  setReplaceConfirmOpen(true);
                }}
              >
                Replace all fields…
              </button>
            </>
          }
        >
          <p className="pfm-playbook-apply-conflict-note">
            These sections already have your edits. Blank fields will still be filled when you apply only to blank
            fields.
          </p>
          <ul className="pfm-playbook-apply-conflict-list">
            {applyConflicts.map((s) => (
              <li key={s.draftKey}>{s.label}</li>
            ))}
          </ul>
        </PlaybookSheet>
      ) : null}

      {replaceConfirmOpen && selectedTemplate ? (
        <PlaybookSheet
          title="Replace all plan fields?"
          subtitle={selectedTemplate.name}
          onClose={() => setReplaceConfirmOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="pfm-playbook-assistant__btn"
                onClick={() => {
                  setReplaceConfirmOpen(false);
                  setApplyConfirmOpen(true);
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="pfm-playbook-assistant__btn pfm-playbook-assistant__btn--danger"
                disabled={disabled}
                onClick={() => commitApply("overwrite")}
              >
                Replace all fields
              </button>
            </>
          }
        >
          <p className="pfm-playbook-apply-conflict-note">
            This will overwrite content in every section this playbook provides, including fields you already edited.
          </p>
          <ul className="pfm-playbook-apply-conflict-list">
            {applyConflicts.map((s) => (
              <li key={s.draftKey}>{s.label}</li>
            ))}
          </ul>
        </PlaybookSheet>
      ) : null}
    </>
  );
}
