"use client";



import React from "react";

import { sc } from "@/components/sales/salesCommandUi";

import { PreCallPlanFieldsForm } from "@/components/sales/PreCallPlanFieldsForm";

import {

  buildPreCallPlanDraft,

  buildPreCallPlanPatch,

  countPreCallPlanFilled,

  PRE_CALL_PLAN_DESCRIPTION,

  PRE_CALL_PLAN_LABEL,

  type PreCallPlanContext,

  type PreCallPlanFieldKey,

} from "@/lib/surgical-sales/preCallPlanFields";
import { userFacingError } from "@/lib/errors/userFacingError";



export function CasePreCallPlanPanel({

  caseId,

  caseRow,

  context,

  disabled,

  embedded = false,

  onSaved,

  onError,

}: {

  caseId: string;

  caseRow: Record<string, unknown>;

  context: PreCallPlanContext;

  disabled?: boolean;

  embedded?: boolean;

  onSaved: (savedCase: Record<string, unknown>) => void;

  onError: (message: string) => void;

}) {

  const [draft, setDraft] = React.useState(() => buildPreCallPlanDraft(caseRow, context));

  const [saving, setSaving] = React.useState(false);

  const [savedFlash, setSavedFlash] = React.useState(false);



  React.useEffect(() => {

    setDraft(buildPreCallPlanDraft(caseRow, context));

  }, [caseRow, context.hospitalDefault, context.surgeonDefault]);



  const progress = countPreCallPlanFilled(caseRow, context);



  async function save() {

    setSaving(true);

    setSavedFlash(false);

    try {

      const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}`, {

        method: "PATCH",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(buildPreCallPlanPatch(draft)),

      });

      const j = (await res.json()) as { ok?: boolean; error?: unknown; case?: Record<string, unknown> };

      if (!res.ok || !j.ok || !j.case) {

        throw new Error(typeof j.error === "string" ? j.error : "Could not save pre-call plan");

      }

      onSaved(j.case);

      setSavedFlash(true);

      window.setTimeout(() => setSavedFlash(false), 2400);

    } catch (e: unknown) {

      onError(userFacingError(e, "Could not save pre-call plan"));

    } finally {

      setSaving(false);

    }

  }



  return (

    <section className={embedded ? "case-pre-call-plan case-pre-call-plan--embedded" : "case-pre-call-plan"}>

      {!embedded ? (

        <header className="case-pre-call-plan-head">

          <div>

            <h3 className="case-pre-call-plan-title">{PRE_CALL_PLAN_LABEL}</h3>

            <p className="case-pre-call-plan-sub">{PRE_CALL_PLAN_DESCRIPTION}</p>

          </div>

          <span className="case-pre-call-plan-progress" aria-live="polite">

            {progress.filled}/{progress.total} fields

          </span>

        </header>

      ) : (

        <p className="case-pre-call-plan-sub" style={{ margin: "0 0 10px" }}>

          {PRE_CALL_PLAN_DESCRIPTION}

        </p>

      )}

      <PreCallPlanFieldsForm

        draft={draft}

        onChange={(key, value) =>

          setDraft((prev) => ({ ...prev, [key]: value } as Record<PreCallPlanFieldKey, string>))

        }

        context={context}

        disabled={disabled || saving}

      />

      <div className="case-pre-call-plan-actions">

        <button type="button" style={sc.btnPrimary} disabled={disabled || saving} onClick={() => void save()}>

          {saving ? "Saving…" : "Save pre-call plan"}

        </button>

        {savedFlash ? (

          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-700)" }}>Saved</span>

        ) : null}

        {embedded ? (

          <span className="case-pre-call-plan-progress" aria-live="polite">

            {progress.filled}/{progress.total} fields

          </span>

        ) : null}

      </div>

    </section>

  );

}


