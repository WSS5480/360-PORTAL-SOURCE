"use client";

import Link from "next/link";
import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import type { NewCaseOperationalReadinessView } from "@/lib/surgical-sales/buildNewCaseOperationalReadiness";
import type { NewCaseSaveBlocker } from "@/lib/surgical-sales/newSurgicalCasePageLogic";

const saveActionsCss = `
.new-case-save-actions{display:grid;gap:8px;padding-top:2px}
.new-case-save-guidance{margin:0;padding:8px 9px;border-radius:8px;border:1px solid color-mix(in srgb,var(--warning) 28%,var(--border));background:color-mix(in srgb,var(--warning) 7%,var(--surface));display:grid;gap:4px}
.new-case-save-guidance-title{margin:0;font-size:10px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:color-mix(in srgb,var(--foreground) 70%,var(--muted));line-height:1.3}
.new-case-save-guidance-list{margin:0;padding:0 0 0 16px;display:grid;gap:3px}
.new-case-save-guidance-list li{font-size:11px;line-height:1.35;color:color-mix(in srgb,var(--foreground) 82%,var(--muted));font-weight:650}
.new-case-save-helper{margin:0;font-size:10px;line-height:1.35;color:var(--muted);font-weight:650}
.new-case-save-btn-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.new-case-save-btn-row .new-case-save-primary{flex:1;min-width:min(100%,200px)}
.new-case-save-draft-flash{margin:0;font-size:10px;font-weight:700;color:#047857;line-height:1.3}
@media (max-width:700px){
  .new-case-save-btn-row{flex-direction:column;align-items:stretch}
  .new-case-save-btn-row .new-case-save-secondary{align-self:flex-start}
}`;

export function NewCaseFormSaveActions({
  saveCta,
  saveBlockers,
  showGuidance,
  busy,
  draftSaving,
  draftSavedFlash,
  loadBusy,
  onSaveDraft,
  onSaveScheduled,
}: {
  saveCta: NewCaseOperationalReadinessView["saveCta"];
  saveBlockers: NewCaseSaveBlocker[];
  showGuidance: boolean;
  busy: boolean;
  draftSaving: boolean;
  draftSavedFlash: boolean;
  loadBusy: boolean;
  onSaveDraft: () => void;
  onSaveScheduled: () => void;
}) {
  const scheduledBlocked = saveBlockers.some((b) => b.id !== "notes_phi") || saveCta.disabled;
  const primaryBusyLabel =
    saveCta.mode === "draft"
      ? "Saving draft…"
      : saveCta.mode === "completed"
        ? "Saving completed case…"
      : /product support/i.test(saveCta.label)
        ? "Saving product support case…"
        : "Saving observation case…";
  const primaryLabel = busy ? primaryBusyLabel : saveCta.label;

  return (
    <div className="new-case-save-actions">
      <style dangerouslySetInnerHTML={{ __html: saveActionsCss }} />
      {showGuidance && saveBlockers.length > 0 ? (
        <div className="new-case-save-guidance" role="alert" aria-live="polite">
          <p className="new-case-save-guidance-title">Before you save</p>
          <ul className="new-case-save-guidance-list">
            {saveBlockers.map((blocker) => (
              <li key={blocker.id}>{blocker.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="new-case-save-helper">{saveCta.helperText}</p>
      {draftSavedFlash ? <p className="new-case-save-draft-flash">Draft saved — you can finish scheduling later.</p> : null}
      <div className="new-case-save-btn-row">
        <Link href="/portal/sales/cases" className="new-case-save-secondary" style={{ ...sc.linkBrand, fontSize: 12, fontWeight: 750 }}>
          Back to cases
        </Link>
        <button
          type="button"
          className="new-case-btn-ghost new-case-save-secondary"
          style={{ ...sc.btnGhost, fontSize: 12, fontWeight: 750 }}
          disabled={loadBusy || busy || draftSaving}
          onClick={onSaveDraft}
        >
          {draftSaving ? "Saving draft…" : "Save draft"}
        </button>
        <button
          type="button"
          className="surgical-new-case-submit new-case-submit new-case-btn-primary new-case-save-primary"
          disabled={busy || loadBusy || draftSaving || scheduledBlocked}
          onClick={saveCta.mode === "draft" ? onSaveDraft : onSaveScheduled}
          style={sc.btnPrimary}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
