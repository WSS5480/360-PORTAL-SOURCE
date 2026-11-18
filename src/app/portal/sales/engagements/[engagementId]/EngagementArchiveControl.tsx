"use client";

import { useRouter } from "next/navigation";
import React from "react";
import SalesCrmConfirmModal from "@/components/sales/SalesCrmConfirmModal";
import {
  ENGAGEMENT_DELETE_CONFIRM_MESSAGE,
  ENGAGEMENT_DELETE_LABEL,
  ENGAGEMENT_RESTORE_CONFIRM_MESSAGE,
  ENGAGEMENT_RESTORE_LABEL,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { formatPortalApiError } from "@/lib/utils/formatPortalApiError";

export function EngagementArchiveControl({
  engagementId,
  archived,
  redirectHref,
  disabled = false,
  className = "engagement-record-danger-btn",
  triggerLabel,
  autoOpen = false,
  hideTrigger = false,
  onError,
  onBusyChange,
  onArchived,
  onDismiss,
}: {
  engagementId: string;
  archived: boolean;
  redirectHref: string;
  disabled?: boolean;
  className?: string;
  triggerLabel?: string;
  autoOpen?: boolean;
  hideTrigger?: boolean;
  onError?: (message: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
  onArchived?: () => void | Promise<void>;
  onDismiss?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  async function confirm() {
    setBusy(true);
    onBusyChange?.(true);
    onError?.(null);
    setErr(null);
    try {
      const res = await fetch(`/api/portal/sales/engagements/${encodeURIComponent(engagementId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(archived ? { restore: true } : { archive: true }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: unknown };
      if (!res.ok || !j.ok) throw new Error(formatPortalApiError(j.error, archived ? "Restore failed" : "Delete failed"));
      setOpen(false);
      if (onArchived) await onArchived();
      if (archived) {
        router.refresh();
      } else {
        router.push(redirectHref);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : archived ? "Restore failed" : "Delete failed";
      setErr(message);
      onError?.(message);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          className={className}
          disabled={disabled || busy}
          onClick={() => {
            setErr(null);
            setOpen(true);
          }}
        >
          {archived
            ? ENGAGEMENT_RESTORE_LABEL
            : (triggerLabel ?? ENGAGEMENT_DELETE_LABEL)}
        </button>
      )}
      <SalesCrmConfirmModal
        open={open}
        title={archived ? "Restore engagement?" : "Delete engagement?"}
        message={archived ? ENGAGEMENT_RESTORE_CONFIRM_MESSAGE : ENGAGEMENT_DELETE_CONFIRM_MESSAGE}
        confirmLabel={archived ? ENGAGEMENT_RESTORE_LABEL : ENGAGEMENT_DELETE_LABEL}
        danger={!archived}
        busy={busy}
        error={err}
        onClose={() => {
          if (!busy) {
            setOpen(false);
            setErr(null);
            onDismiss?.();
          }
        }}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
