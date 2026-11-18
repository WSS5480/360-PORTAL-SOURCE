"use client";

import Link from "next/link";
import React from "react";
import SalesCrmConfirmModal from "@/components/sales/SalesCrmConfirmModal";
import RemovePersonModal from "@/components/sales/RemovePersonModal";
import {
  assessProviderHardDeleteFromProfile,
  type ProviderHardDeleteAssessment,
} from "@/lib/surgical-sales/providerLifecyclePolicy";
import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import type { ProviderRemoveScope } from "@/lib/surgical-sales/providerRemoveScope";
import { userFacingError } from "@/lib/errors/userFacingError";

function useCloseOnOutsideClick(open: boolean, onClose: () => void, ref: React.RefObject<HTMLDivElement | null>) {
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, ref]);
}

export function ProviderActionsMenu({
  providerId,
  contact,
  engagements = [],
  cases = [],
  activityTimeline = [],
  clinicalDiscoveryAnswers = [],
  editHref,
  archived = false,
  hiddenFromProviders = false,
  onProviderUpdated,
  onProviderRemoved,
}: {
  providerId: string;
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  activityTimeline?: Array<Record<string, unknown>>;
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];
  editHref: string;
  archived?: boolean;
  hiddenFromProviders?: boolean;
  onProviderUpdated: () => void | Promise<void>;
  onProviderRemoved: () => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const [confirmRestore, setConfirmRestore] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const personName = contactDisplayName(contact as Parameters<typeof contactDisplayName>[0]) || "this provider";
  const removedFromLists = archived || hiddenFromProviders;

  const retention = React.useMemo(
    (): ProviderHardDeleteAssessment =>
      assessProviderHardDeleteFromProfile({
        contact,
        engagements,
        cases,
        activityTimeline,
        clinicalDiscoveryAnswers,
      }),
    [activityTimeline, cases, clinicalDiscoveryAnswers, contact, engagements],
  );

  useCloseOnOutsideClick(menuOpen, () => setMenuOpen(false), menuRef);

  async function restoreProvider() {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-contacts/${encodeURIComponent(providerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: false }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "");
      setConfirmRestore(false);
      setMenuOpen(false);
      await onProviderUpdated();
    } catch (e: unknown) {
      setActionError(userFacingError(e, "We could not restore this provider. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function removeProvider(scope: ProviderRemoveScope) {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "");
      setConfirmRemove(false);
      setConfirmDelete(false);
      setMenuOpen(false);
      if (scope === "delete" || scope === "everywhere") {
        onProviderRemoved();
        return;
      }
      await onProviderUpdated();
    } catch (e: unknown) {
      setActionError(userFacingError(e, "We could not remove this provider. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  function renderItem(
    label: string,
    opts: {
      href?: string;
      onClick?: () => void;
      disabled?: boolean;
      title?: string;
      danger?: boolean;
    },
  ) {
    const className = `provider-act-menu-item${opts.danger ? " provider-act-menu-item--danger" : ""}${
      opts.disabled ? " provider-act-menu-item--disabled" : ""
    }`;

    if (opts.href && !opts.disabled) {
      return (
        <Link
          key={label}
          href={opts.href}
          className={className}
          role="menuitem"
          title={opts.title}
          onClick={() => setMenuOpen(false)}
        >
          {label}
        </Link>
      );
    }

    return (
      <button
        key={label}
        type="button"
        className={className}
        role="menuitem"
        disabled={opts.disabled || busy}
        title={opts.title}
        onClick={() => {
          if (opts.disabled || busy) return;
          opts.onClick?.();
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <>
      <div className="provider-hd-actions" ref={menuRef}>
        <Link href={editHref} className="provider-hd-actions-trigger">
          Edit
        </Link>
        {removedFromLists ? (
          <button
            type="button"
            className="provider-hd-actions-trigger"
            disabled={busy}
            onClick={() => setConfirmRestore(true)}
          >
            Restore
          </button>
        ) : (
          <button
            type="button"
            className="provider-hd-actions-trigger provider-hd-actions-trigger--remove"
            disabled={busy}
            onClick={() => setConfirmRemove(true)}
          >
            Remove
          </button>
        )}
        {retention.hardDeleteAllowed && !removedFromLists ? (
          <>
            <button
              type="button"
              className="provider-hd-actions-trigger"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="More provider actions"
              disabled={busy}
              onClick={() => setMenuOpen((open) => !open)}
            >
              More
              <span className="provider-act-more-chevron" aria-hidden>
                {menuOpen ? "▴" : "▾"}
              </span>
            </button>
            {menuOpen ? (
              <div className="provider-act-menu provider-hd-actions-menu" role="menu" aria-label="More provider actions">
                {renderItem("Delete provider", {
                  onClick: () => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  },
                  danger: true,
                })}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <RemovePersonModal
        open={confirmRemove}
        personName={personName}
        isProvider
        hardDeleteAllowed={retention.hardDeleteAllowed}
        busy={busy}
        error={actionError}
        onClose={() => {
          if (!busy) {
            setConfirmRemove(false);
            setActionError(null);
          }
        }}
        onConfirm={removeProvider}
      />

      <SalesCrmConfirmModal
        open={confirmDelete}
        title="Delete provider?"
        message="Delete this provider? This cannot be undone."
        confirmLabel="Delete"
        danger
        busy={busy}
        error={actionError}
        onClose={() => {
          if (!busy) {
            setConfirmDelete(false);
            setActionError(null);
          }
        }}
        onConfirm={() => void removeProvider("delete")}
      />

      <SalesCrmConfirmModal
        open={confirmRestore}
        title="Restore provider?"
        message="Restore this provider? They will appear again in Providers, Contacts, and organization lists."
        confirmLabel="Restore"
        busy={busy}
        error={actionError}
        onClose={() => {
          if (!busy) {
            setConfirmRestore(false);
            setActionError(null);
          }
        }}
        onConfirm={restoreProvider}
      />
    </>
  );
}
