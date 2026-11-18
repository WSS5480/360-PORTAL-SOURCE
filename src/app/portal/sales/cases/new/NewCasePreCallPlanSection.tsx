"use client";

import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import { PreCallPlanFieldsForm } from "@/components/sales/PreCallPlanFieldsForm";
import { CaseProviderIntelligenceSnapshot } from "@/app/portal/sales/cases/[caseId]/CaseProviderIntelligenceSnapshot";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  buildPreCallPlanPatch,
  countPreCallPlanFilled,
  PRE_CALL_PLAN_DESCRIPTION,
  PRE_CALL_PLAN_LABEL,
  type PreCallPlanContext,
  type PreCallPlanFieldKey,
} from "@/lib/surgical-sales/preCallPlanFields";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import type { NewCaseProviderContext } from "./NewCaseProviderPanel";

const LS_PRE_CALL_DRAFT_KEY = "surgical-new-case:v1:preCallDraft";

export type NewCasePreCallDraft = Record<PreCallPlanFieldKey, string>;

export function loadLocalPreCallDraft(providerId: string, accountId: string): NewCasePreCallDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${LS_PRE_CALL_DRAFT_KEY}:${providerId}:${accountId}`);
    if (!raw) return null;
    return JSON.parse(raw) as NewCasePreCallDraft;
  } catch {
    return null;
  }
}

export function saveLocalPreCallDraft(providerId: string, accountId: string, draft: NewCasePreCallDraft) {
  try {
    localStorage.setItem(`${LS_PRE_CALL_DRAFT_KEY}:${providerId}:${accountId}`, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function clearLocalPreCallDraft(providerId: string, accountId: string) {
  try {
    localStorage.removeItem(`${LS_PRE_CALL_DRAFT_KEY}:${providerId}:${accountId}`);
  } catch {
    /* ignore */
  }
}

export function buildPreCallPlanPayloadFromDraft(
  draft: NewCasePreCallDraft,
  context: PreCallPlanContext,
): Record<string, string | null> {
  const withDefaults = { ...draft };
  if (!String(withDefaults.pre_call_hospital_name ?? "").trim() && context.hospitalDefault) {
    withDefaults.pre_call_hospital_name = context.hospitalDefault;
  }
  if (!String(withDefaults.pre_call_surgeon_name ?? "").trim() && context.surgeonDefault) {
    withDefaults.pre_call_surgeon_name = context.surgeonDefault;
  }
  return buildPreCallPlanPatch(withDefaults);
}

type ContactLike = { first_name?: string | null; last_name?: string | null; email?: string | null };

export function NewCasePreCallPlanSection({
  providerContext,
  surgeonId,
  accountName,
  draft,
  onDraftChange,
  disabled,
  onSaveDraft,
  draftSaving,
  draftSavedFlash,
}: {
  providerContext: NewCaseProviderContext;
  surgeonId: string;
  accountName: string;
  draft: NewCasePreCallDraft;
  onDraftChange: (draft: NewCasePreCallDraft) => void;
  disabled?: boolean;
  onSaveDraft?: () => void;
  draftSaving?: boolean;
  draftSavedFlash?: boolean;
}) {
  const context = React.useMemo(
    (): PreCallPlanContext => ({
      hospitalDefault: accountName,
      surgeonDefault: contactDisplayName(providerContext.provider as ContactLike),
    }),
    [accountName, providerContext.provider],
  );

  const intelligence = React.useMemo(
    () => buildProviderIntelligenceSnapshot(providerContext.provider, surgeonId),
    [providerContext.provider, surgeonId],
  );

  const pseudoCaseRow = React.useMemo(() => {
    const patch = buildPreCallPlanPayloadFromDraft(draft, context);
    return { ...patch } as Record<string, unknown>;
  }, [draft, context]);

  const progress = countPreCallPlanFilled(pseudoCaseRow, context);
  const providerName = contactDisplayName(providerContext.provider as ContactLike);

  const setField = (key: PreCallPlanFieldKey, value: string) => {
    onDraftChange({ ...draft, [key]: value });
  };

  return (
    <section className="new-case-card new-case-pre-call-plan">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div className="new-case-title">{PRE_CALL_PLAN_LABEL}</div>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)", lineHeight: 1.45, maxWidth: 520 }}>
            {PRE_CALL_PLAN_DESCRIPTION} Saved on the engagement when you schedule the case — not on the provider profile.
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)" }} aria-live="polite">
          {progress.filled}/{progress.total} filled
        </span>
      </div>

      <CaseProviderIntelligenceSnapshot
        intelligence={intelligence}
        providerContact={providerContext.provider}
        providerId={surgeonId}
        providerName={providerName}
        caseId=""
        hasLinkedProvider
        embedded
      />

      <PreCallPlanFieldsForm draft={draft} onChange={setField} context={context} disabled={disabled} />

      {onSaveDraft ? (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <button type="button" style={sc.btnSecondary} disabled={disabled || draftSaving} onClick={onSaveDraft}>
            {draftSaving ? "Saving draft…" : "Save draft case with engagement plan"}
          </button>
          {draftSavedFlash ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-700)" }}>Draft case saved</span>
          ) : null}
          <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.35 }}>
            Creates a draft case and links an engagement that owns this pre-call plan.
          </span>
        </div>
      ) : null}
    </section>
  );
}
