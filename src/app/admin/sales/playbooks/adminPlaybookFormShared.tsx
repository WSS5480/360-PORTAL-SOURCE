"use client";

import Link from "next/link";
import React from "react";
import {
  ENGAGEMENT_TYPE_LABELS,
  formatEngagementType,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  PRE_CALL_PLAN_PRODUCT_LINES,
  type PreCallPlanProductLine,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import {
  PRE_CALL_PLAN_TEMPLATE_STATUSES,
  PRE_CALL_PLAN_TEMPLATE_STATUS_LABELS,
  type PreCallPlanTemplateStatus,
} from "@/lib/surgical-sales/preCallPlanTemplateStatus";

export type PlaybookFormValues = {
  name: string;
  description: string;
  productLine: PreCallPlanProductLine | "";
  engagementType: EngagementType | "";
  status: PreCallPlanTemplateStatus;
  smartObjective: string;
  openingStatement: string;
  probes: string;
  toolsResources: string;
  valueHypothesis: string;
  plannedClose: string;
  suggestedNextStep: string;
};

export const EMPTY_PLAYBOOK_FORM: PlaybookFormValues = {
  name: "",
  description: "",
  productLine: "",
  engagementType: "intro_call",
  status: "active",
  smartObjective: "",
  openingStatement: "",
  probes: "",
  toolsResources: "",
  valueHypothesis: "",
  plannedClose: "",
  suggestedNextStep: "",
};

export function playbookFormToPayload(values: PlaybookFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    productLine: values.productLine,
    engagementType: values.engagementType,
    status: values.status,
    smartObjective: values.smartObjective.trim() || null,
    openingStatement: values.openingStatement.trim() || null,
    probes: values.probes.trim() || null,
    toolsResources: values.toolsResources.trim() || null,
    valueHypothesis: values.valueHypothesis.trim() || null,
    plannedClose: values.plannedClose.trim() || null,
    suggestedNextStep: values.suggestedNextStep.trim() || null,
  };
}

const FIELD_ROWS: { key: keyof PlaybookFormValues; label: string; rows: number; helper?: string }[] = [
  {
    key: "smartObjective",
    label: "SMART objective",
    rows: 3,
    helper: "Specific, measurable outcome for this interaction.",
  },
  { key: "openingStatement", label: "Opening statement", rows: 3 },
  { key: "probes", label: "Probes / questions", rows: 5 },
  { key: "toolsResources", label: "Tools / resources", rows: 3 },
  { key: "valueHypothesis", label: "Value hypothesis", rows: 3 },
  { key: "plannedClose", label: "Planned close", rows: 3 },
  {
    key: "suggestedNextStep",
    label: "Strategic notes",
    rows: 3,
    helper: "Follow-up, observation path, or coordinator notes.",
  },
];

export function AdminPlaybookForm({
  values,
  onChange,
  disabled,
}: {
  values: PlaybookFormValues;
  onChange: (next: PlaybookFormValues) => void;
  disabled?: boolean;
}) {
  function set<K extends keyof PlaybookFormValues>(key: K, value: PlaybookFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>Name *</span>
          <input
            value={values.name}
            disabled={disabled}
            onChange={(e) => set("name", e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>Product line *</span>
          <select
            value={values.productLine}
            disabled={disabled}
            onChange={(e) => set("productLine", e.target.value as PreCallPlanProductLine)}
            style={inputStyle}
          >
            <option value="">Select…</option>
            {PRE_CALL_PLAN_PRODUCT_LINES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>Engagement type *</span>
          <select
            value={values.engagementType}
            disabled={disabled}
            onChange={(e) => set("engagementType", e.target.value as EngagementType)}
            style={inputStyle}
          >
            <option value="">Select…</option>
            {Object.entries(ENGAGEMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>Status</span>
          <select
            value={values.status}
            disabled={disabled}
            onChange={(e) => set("status", e.target.value as PreCallPlanTemplateStatus)}
            style={inputStyle}
          >
            {PRE_CALL_PLAN_TEMPLATE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PRE_CALL_PLAN_TEMPLATE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 800 }}>Description</span>
        <textarea
          rows={2}
          value={values.description}
          disabled={disabled}
          onChange={(e) => set("description", e.target.value)}
          style={textareaStyle}
          placeholder="When reps should use this playbook…"
        />
      </label>

      <div style={{ display: "grid", gap: 14 }}>
        {FIELD_ROWS.map((field) => (
          <label key={field.key} style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>{field.label}</span>
            {field.helper ? <span style={{ fontSize: 11, opacity: 0.7 }}>{field.helper}</span> : null}
            <textarea
              rows={field.rows}
              value={values[field.key]}
              disabled={disabled}
              onChange={(e) => set(field.key, e.target.value)}
              style={textareaStyle}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function AdminPlaybookEditorShell({
  title,
  subtitle,
  backHref,
  children,
  footer,
  error,
  message,
}: {
  title: string;
  subtitle?: string;
  backHref: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  error?: string | null;
  message?: string | null;
}) {
  return (
    <div style={{ padding: 16, maxWidth: 920 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={backHref} style={{ fontSize: 13, fontWeight: 800, color: "var(--brand-600)" }}>
          ← Sales playbooks
        </Link>
        <h1 style={{ margin: "10px 0 4px", fontSize: 24, fontWeight: 950 }}>{title}</h1>
        {subtitle ? <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>{subtitle}</p> : null}
      </div>
      {error ? (
        <p style={{ color: "crimson", fontSize: 13, marginBottom: 12 }} role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p style={{ color: "var(--brand-700)", fontSize: 13, marginBottom: 12 }} role="status">
          {message}
        </p>
      ) : null}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 18,
        }}
      >
        {children}
      </div>
      {footer ? <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>{footer}</div> : null}
    </div>
  );
}

export function AdminPlaybookSaveButton({
  busy,
  label = "Save playbook",
  onClick,
}: {
  busy?: boolean;
  label?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" disabled={busy} onClick={onClick} style={primaryBtn}>
      {busy ? "Saving…" : label}
    </button>
  );
}

export function valuesFromPlaybook(playbook: {
  name: string;
  description?: string | null;
  productLine: PreCallPlanProductLine;
  engagementType: EngagementType;
  status: PreCallPlanTemplateStatus;
  smartObjective?: string | null;
  openingStatement?: string | null;
  probes?: string | null;
  toolsResources?: string | null;
  valueHypothesis?: string | null;
  plannedClose?: string | null;
  suggestedNextStep?: string | null;
}): PlaybookFormValues {
  return {
    name: playbook.name,
    description: playbook.description ?? "",
    productLine: playbook.productLine,
    engagementType: playbook.engagementType,
    status: playbook.status,
    smartObjective: playbook.smartObjective ?? "",
    openingStatement: playbook.openingStatement ?? "",
    probes: playbook.probes ?? "",
    toolsResources: playbook.toolsResources ?? "",
    valueHypothesis: playbook.valueHypothesis ?? "",
    plannedClose: playbook.plannedClose ?? "",
    suggestedNextStep: playbook.suggestedNextStep ?? "",
  };
}

export function scopeLabel(isSystemTemplate: boolean) {
  return isSystemTemplate ? "Company" : "User";
}

export function engagementLabel(type: string) {
  return formatEngagementType(type) || type.replace(/_/g, " ");
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  fontSize: 14,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  fontFamily: "inherit",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  background: "var(--brand-600)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};
