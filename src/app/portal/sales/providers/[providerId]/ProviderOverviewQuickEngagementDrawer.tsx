"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  buildEngagementCreatePayload,
  ENGAGEMENT_PREPARE_NOW_LABEL,
  ENGAGEMENT_SCHEDULE_FOR_LATER_LABEL,
  resolveHrefAfterEngagementCreate,
  type EngagementBasicsDraft,
  type EngagementCreatePostAction,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { providerQuickSignalCaptureCss } from "./providerQuickSignalCaptureCss";
import { userFacingError } from "@/lib/errors/userFacingError";

export type ProviderOverviewQuickEngagementType = "follow_up";

export function ProviderOverviewQuickEngagementDrawer({
  open,
  engagementType,
  providerId,
  organizationId,
  providerLabel,
  organizationLabel,
  onClose,
  onCreated,
}: {
  open: boolean;
  engagementType: ProviderOverviewQuickEngagementType;
  providerId: string;
  organizationId: string;
  providerLabel: string;
  organizationLabel: string;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [engagementDate, setEngagementDate] = React.useState("");
  const [engagementTime, setEngagementTime] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const title = "Schedule follow-up";
  const kicker = "Lightweight follow-up — date optional, no full engagement wizard.";

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    setEngagementDate("");
    setEngagementTime("");
    setError(null);
  }, [open, engagementType]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  async function handleSave(postCreateAction: EngagementCreatePostAction) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const basics: EngagementBasicsDraft = {
        provider_id: providerId,
        organization_id: organizationId,
        engagement_type: engagementType,
        engagement_date: engagementDate,
        engagement_time: engagementTime,
        opportunity_id: "",
        case_id: "",
        product_line: "",
        source_observation_id: "",
        prep_mode: "",
        intro_call_conversation_focus: "",
      };
      const body = buildEngagementCreatePayload({
        basics,
        workflowDraft: {},
        providerLabel,
        organizationLabel,
        save_mode: "final",
        postCreateAction,
      });
      const res = await fetch("/api/portal/sales/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string; engagement_id?: string };
      if (!res.ok || !j.ok) {
        throw new Error(typeof j.error === "string" ? j.error : "Could not create engagement.");
      }
      if (postCreateAction === "prepare" && j.engagement_id) {
        router.push(resolveHrefAfterEngagementCreate(j.engagement_id, "prepare"));
        return;
      }
      await onCreated();
      onClose();
    } catch (e: unknown) {
      setError(userFacingError(e, "Could not create engagement."));
    } finally {
      setBusy(false);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <style>{providerQuickSignalCaptureCss}</style>
      <div
        className="provider-intel-quick-signal-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="provider-intel-quick-signal-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pov-quick-engagement-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="provider-intel-quick-signal-head">
            <div className="provider-intel-quick-signal-head-row">
              <h2 id="pov-quick-engagement-title" className="provider-intel-quick-signal-title">
                {title}
              </h2>
              <button
                type="button"
                className="provider-intel-quick-signal-close"
                aria-label="Close"
                onClick={onClose}
              >
                ×
              </button>
            </div>
            <p className="provider-intel-quick-signal-kicker">{kicker}</p>
          </header>

          <div className="provider-intel-quick-signal-body">
            <p className="provider-intel-quick-signal-field-label">Engagement type</p>
            <p className="provider-intel-quick-signal-helper">{formatEngagementType(engagementType)}</p>

            <label className="provider-intel-quick-signal-field-label" htmlFor="pov-quick-engagement-date">
              Date (optional)
            </label>
            <input
              id="pov-quick-engagement-date"
              type="date"
              className="provider-intel-notes-input provider-intel-notes-input--rapid"
              value={engagementDate}
              onChange={(e) => setEngagementDate(e.target.value)}
              disabled={busy}
            />

            <label className="provider-intel-quick-signal-field-label" htmlFor="pov-quick-engagement-time">
              Time (optional)
            </label>
            <input
              id="pov-quick-engagement-time"
              type="time"
              className="provider-intel-notes-input provider-intel-notes-input--rapid"
              value={engagementTime}
              onChange={(e) => setEngagementTime(e.target.value)}
              disabled={busy}
            />

            {error ? (
              <p className="provider-intel-quick-signal-helper" style={{ color: "#b91c1c" }}>
                {error}
              </p>
            ) : null}
          </div>

          <footer className="provider-intel-quick-signal-foot">
            <button
              type="button"
              className="provider-intel-quick-signal-cancel"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="provider-intel-quick-signal-cancel"
              onClick={() => void handleSave("save")}
              disabled={busy}
            >
              {busy ? "Saving…" : ENGAGEMENT_SCHEDULE_FOR_LATER_LABEL}
            </button>
            <button
              type="button"
              className="provider-intel-quick-signal-save"
              onClick={() => void handleSave("prepare")}
              disabled={busy}
            >
              {busy ? "Saving…" : ENGAGEMENT_PREPARE_NOW_LABEL}
            </button>
          </footer>
        </div>
      </div>
    </>,
    document.body,
  );
}
