"use client";

import React from "react";
import { preCallPlanTemplateFlowCss } from "@/components/sales/preCallPlanTemplateFlowCss";
import { PRE_CALL_PLAN_FIELD_CONFIGS, type PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import {
  PRE_CALL_PLAN_PRODUCT_LINES,
  PRE_CALL_PLAN_TEMPLATE_ENGAGEMENT_TYPES_MVP,
  PRE_CALL_PLAN_TEMPLATE_ENGAGEMENT_LABELS,
  type PreCallPlanProductLine,
  type PreCallPlanTemplateEngagementType,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import { userFacingError } from "@/lib/errors/userFacingError";

const SAVE_FIELD_KEYS: PreCallPlanFieldKey[] = [
  "observation_goal",
  "pre_observation_impact_opening_statement",
  "pre_observation_probes",
  "pre_observation_tools_resources",
  "pre_observation_value_hypothesis",
  "pre_observation_planned_close",
  "pre_observation_additional_notes",
];

export function SavePreCallPlanTemplateSheet({
  open,
  onClose,
  draft,
  defaultProductLine,
  defaultEngagementType,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  draft: Record<PreCallPlanFieldKey, string>;
  defaultProductLine?: PreCallPlanProductLine | "";
  defaultEngagementType?: PreCallPlanTemplateEngagementType | "";
  onSaved?: (templateId: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [productLine, setProductLine] = React.useState<PreCallPlanProductLine | "">(defaultProductLine ?? "");
  const [engagementType, setEngagementType] = React.useState<PreCallPlanTemplateEngagementType | "">(
    defaultEngagementType ?? "",
  );
  const [editDraft, setEditDraft] = React.useState<Record<PreCallPlanFieldKey, string>>(draft);
  const [suggestedNextStep, setSuggestedNextStep] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setEditDraft(draft);
    setName("");
    setDescription("");
    setProductLine(defaultProductLine ?? "");
    setEngagementType(defaultEngagementType ?? "");
    setSuggestedNextStep("");
    setErr(null);
  }, [open, draft, defaultProductLine, defaultEngagementType]);

  async function save() {
    if (!name.trim()) {
      setErr("Name is required.");
      return;
    }
    if (!productLine || !engagementType) {
      setErr("Select product line and engagement type.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/portal/sales/pre-call-plan-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          procedureFocus: description.trim() || null,
          description: description.trim() || null,
          productLine,
          engagementType,
          smartObjective: editDraft.observation_goal?.trim() || null,
          openingStatement: editDraft.pre_observation_impact_opening_statement?.trim() || null,
          probes: editDraft.pre_observation_probes?.trim() || null,
          toolsResources: editDraft.pre_observation_tools_resources?.trim() || null,
          valueHypothesis: editDraft.pre_observation_value_hypothesis?.trim() || null,
          plannedClose: editDraft.pre_observation_planned_close?.trim() || null,
          suggestedNextStep: suggestedNextStep.trim() || null,
        }),
      });
      const j = (await res.json()) as { ok?: boolean; template?: { id: string }; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Save failed");
      if (j.template?.id) onSaved?.(j.template.id);
      onClose();
    } catch (e: unknown) {
      setErr(userFacingError(e, "We could not save your changes. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: preCallPlanTemplateFlowCss }} />
      <div className="pcp-template-backdrop" role="presentation" onClick={onClose}>
        <div
          className="pcp-template-sheet pcp-template-sheet--modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pcp-save-template-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="pcp-template-head">
            <div>
              <h2 id="pcp-save-template-title">Save as template</h2>
              <p>Edit fields before saving. Templates are private to you unless duplicated from a playbook.</p>
            </div>
            <button type="button" className="pcp-template-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </header>

          <div className="pcp-template-body">
            {err ? (
              <p className="pcp-template-alert" role="alert">
                {err}
              </p>
            ) : null}

            <label className="case-pre-call-plan-field" style={{ display: "grid", gap: 6, marginBottom: 12 }}>
              <span className="case-pre-call-plan-label">Template name *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)" }}
              />
            </label>

            <label className="case-pre-call-plan-field" style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <span className="case-pre-call-plan-label">Product line *</span>
              <select
                value={productLine}
                disabled={busy}
                onChange={(e) => setProductLine(e.target.value as PreCallPlanProductLine)}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", width: "100%", boxSizing: "border-box" }}
              >
                <option value="">Select…</option>
                {PRE_CALL_PLAN_PRODUCT_LINES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="case-pre-call-plan-field" style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <span className="case-pre-call-plan-label">Engagement type *</span>
              <select
                value={engagementType}
                disabled={busy}
                onChange={(e) => setEngagementType(e.target.value as PreCallPlanTemplateEngagementType)}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", width: "100%", boxSizing: "border-box" }}
              >
                <option value="">Select…</option>
                {PRE_CALL_PLAN_TEMPLATE_ENGAGEMENT_TYPES_MVP.map((t) => (
                  <option key={t} value={t}>
                    {PRE_CALL_PLAN_TEMPLATE_ENGAGEMENT_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>

            <label className="case-pre-call-plan-field" style={{ display: "grid", gap: 6, marginBottom: 12 }}>
              <span className="case-pre-call-plan-label">Description</span>
              <textarea
                rows={2}
                value={description}
                disabled={busy}
                onChange={(e) => setDescription(e.target.value)}
                style={{ resize: "vertical", padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
              />
            </label>

            {SAVE_FIELD_KEYS.map((key) => {
              const cfg = PRE_CALL_PLAN_FIELD_CONFIGS.find((f) => f.key === key);
              if (!cfg) return null;
              return (
                <label key={key} className="case-pre-call-plan-field" style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                  <span className="case-pre-call-plan-label">{cfg.label}</span>
                  <textarea
                    rows={cfg.rows}
                    value={editDraft[key] ?? ""}
                    disabled={busy}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    style={{ resize: "vertical", padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
                  />
                </label>
              );
            })}

            <label className="case-pre-call-plan-field" style={{ display: "grid", gap: 6 }}>
              <span className="case-pre-call-plan-label">Suggested next step</span>
              <textarea
                rows={3}
                value={suggestedNextStep}
                disabled={busy}
                onChange={(e) => setSuggestedNextStep(e.target.value)}
                style={{ resize: "vertical", padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
              />
            </label>
          </div>

          <footer className="pcp-template-foot pcp-template-foot--sticky">
            <div className="pcp-template-foot-inner">
              <div className="pcp-template-foot-row">
                <button type="button" onClick={onClose} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className="primary" disabled={busy} onClick={() => void save()}>
                  {busy ? "Saving…" : "Save template"}
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
