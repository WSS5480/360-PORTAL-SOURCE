"use client";

import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import {
  buildPreCallPlanDraft,
  buildPreCallPlanPatch,
  PRE_CALL_PLAN_MOBILE_PLANNING_FIELDS,
  preCallPlanDisplayValue,
  type PreCallPlanContext,
  type PreCallPlanFieldKey,
} from "@/lib/surgical-sales/preCallPlanFields";
import { WorkflowFieldSubitems, type WorkflowTextFieldConfig } from "./ObservationWorkflowMobilePanel";
import { userFacingError } from "@/lib/errors/userFacingError";

const MOBILE_FIELD_CONFIGS: WorkflowTextFieldConfig[] = PRE_CALL_PLAN_MOBILE_PLANNING_FIELDS.map((field) => ({
  key: field.key,
  label: field.label,
  helper: field.helper ? `${field.helper} Optional.` : "Optional.",
  rows: field.rows,
}));

export function PreCallPlanMobileWorkflowFields({
  caseId,
  caseRow,
  context,
  disabled,
  onCasePatched,
  onAutosaveError,
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  context: PreCallPlanContext;
  disabled?: boolean;
  onCasePatched: (savedCase: Record<string, unknown>) => void;
  onAutosaveError?: (message: string | null) => void;
}) {
  const [draft, setDraft] = React.useState<Record<PreCallPlanFieldKey, string>>(() =>
    buildPreCallPlanDraft(caseRow, context),
  );
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const latestDraftRef = React.useRef(draft);

  React.useEffect(() => {
    const next = buildPreCallPlanDraft(caseRow, context);
    setDraft(next);
    latestDraftRef.current = next;
    setDirty(false);
  }, [caseRow, context.hospitalDefault, context.surgeonDefault]);

  React.useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  const displayValues = React.useMemo(() => {
    const out = {} as Record<string, string>;
    for (const field of PRE_CALL_PLAN_MOBILE_PLANNING_FIELDS) {
      out[field.key] = preCallPlanDisplayValue({ ...caseRow, ...draft }, field.key, context);
    }
    return out;
  }, [caseRow, context, draft]);

  const saveDraft = React.useCallback(async () => {
    if (disabled || saving) return;
    setSaving(true);
    onAutosaveError?.(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPreCallPlanPatch(latestDraftRef.current)),
      });
      const j = (await res.json()) as { ok?: boolean; error?: unknown; case?: Record<string, unknown> };
      if (!res.ok || !j.ok || !j.case) {
        throw new Error(typeof j.error === "string" ? j.error : "Could not save pre-call plan");
      }
      onCasePatched(j.case);
      setDirty(false);
    } catch (e: unknown) {
      onAutosaveError?.(userFacingError(e, "Could not save pre-call plan"));
    } finally {
      setSaving(false);
    }
  }, [caseId, disabled, onAutosaveError, onCasePatched, saving]);

  React.useEffect(() => {
    if (!dirty || disabled || saving) return;
    const handle = window.setTimeout(() => {
      void saveDraft();
    }, 700);
    return () => window.clearTimeout(handle);
  }, [dirty, disabled, saveDraft, saving, draft]);

  const onChange = (key: string, value: string) => {
    const typedKey = key as PreCallPlanFieldKey;
    setDraft((prev) => {
      const next = { ...prev, [typedKey]: value };
      latestDraftRef.current = next;
      return next;
    });
    setDirty(true);
  };

  return (
    <div className="case-pre-call-mobile">
      <p className="case-pre-call-mobile-intro">
        Plan this specific interaction. Provider intelligence above is read-only context from the profile.
      </p>
      <WorkflowFieldSubitems
        fields={MOBILE_FIELD_CONFIGS}
        values={displayValues}
        onChange={onChange}
        disabled={disabled || saving}
        inputStyle={sc.input}
      />
    </div>
  );
}
