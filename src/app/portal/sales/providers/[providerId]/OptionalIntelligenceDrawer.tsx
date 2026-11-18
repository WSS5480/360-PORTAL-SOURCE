"use client";

import React from "react";
import { createPortal } from "react-dom";
import {
  OPTIONAL_INTELLIGENCE_CATEGORIES,
  OPTIONAL_INTELLIGENCE_SECTION_LEAD,
  OPTIONAL_INTELLIGENCE_SECTION_TITLE,
  isOptionalIntelligenceSupportContactCategory,
  resolveOptionalIntelligenceInitialValue,
  type OptionalIntelligenceCategoryId,
} from "@/lib/surgical-sales/optionalIntelligenceCategories";
import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";
import { persistOptionalIntelligence } from "@/lib/surgical-sales/persistOptionalIntelligence";
import { providerQuickSignalCaptureCss } from "./providerQuickSignalCaptureCss";
import { userFacingError } from "@/lib/errors/userFacingError";

function dedupeRelatedContacts(contacts: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const byKey = new Map<string, Record<string, unknown>>();
  for (const contact of contacts) {
    const id = String(contact.id ?? "").trim();
    const name = [String(contact.first_name ?? ""), String(contact.last_name ?? "")]
      .filter(Boolean)
      .join(" ")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    const key = id || name;
    if (key && !byKey.has(key)) byKey.set(key, contact);
  }
  return [...byKey.values()];
}

export function OptionalIntelligenceDrawer({
  open,
  contact,
  providerId,
  initialCategoryId = "procedure_interests",
  onClose,
  onProviderUpdated,
  onLaunchSupportContacts,
  relatedContacts = [],
}: {
  open: boolean;
  contact: Record<string, unknown>;
  providerId: string;
  initialCategoryId?: OptionalIntelligenceCategoryId;
  onClose: () => void;
  onProviderUpdated?: (provider: Record<string, unknown>) => void | Promise<void>;
  onLaunchSupportContacts?: () => void;
  relatedContacts?: Array<Record<string, unknown>>;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [categoryId, setCategoryId] =
    React.useState<OptionalIntelligenceCategoryId>(initialCategoryId);
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    if (initialCategoryId === "staff_contacts") {
      onLaunchSupportContacts?.();
      return;
    }
    setCategoryId(initialCategoryId);
    setError(null);
  }, [open, initialCategoryId, onLaunchSupportContacts]);

  React.useEffect(() => {
    if (!open || isOptionalIntelligenceSupportContactCategory(categoryId)) return;
    setValue(resolveOptionalIntelligenceInitialValue(categoryId, contact));
  }, [open, categoryId, contact]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const category =
    OPTIONAL_INTELLIGENCE_CATEGORIES.find((entry) => entry.id === categoryId) ??
    OPTIONAL_INTELLIGENCE_CATEGORIES[0];
  const isSupportContactCategory = isOptionalIntelligenceSupportContactCategory(category.id);
  const uniqueRelatedContacts = React.useMemo(() => dedupeRelatedContacts(relatedContacts), [relatedContacts]);

  function selectCategory(entryId: OptionalIntelligenceCategoryId) {
    if (isOptionalIntelligenceSupportContactCategory(entryId)) {
      onLaunchSupportContacts?.();
      return;
    }
    setCategoryId(entryId);
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      const provider = await persistOptionalIntelligence({
        providerId,
        categoryId: category.id,
        value,
      });
      await onProviderUpdated?.(provider);
      onClose();
    } catch (err) {
      setError(userFacingError(err, "Could not save field context."));
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
        onClick={(event) => {
          if (event.target === event.currentTarget && !busy) onClose();
        }}
      >
        <div
          className="provider-intel-quick-signal-drawer provider-intel-quick-signal-drawer--mapping"
          role="dialog"
          aria-modal="true"
          aria-labelledby="optional-intelligence-drawer-title"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="provider-intel-quick-signal-head">
            <div className="provider-intel-quick-signal-head-row">
              <div>
                <h2 id="optional-intelligence-drawer-title" className="provider-intel-quick-signal-title">
                  {BRIEF.addFieldContext}
                </h2>
                <p className="provider-intel-quick-signal-kicker">{OPTIONAL_INTELLIGENCE_SECTION_TITLE}</p>
              </div>
              <button
                type="button"
                className="provider-intel-quick-signal-close"
                aria-label="Close"
                disabled={busy}
                onClick={onClose}
              >
                ×
              </button>
            </div>
            <p className="provider-intel-quick-signal-desc">{OPTIONAL_INTELLIGENCE_SECTION_LEAD}</p>
          </header>

          <div className="provider-intel-quick-signal-body optional-intel-drawer-body">
            <div className="optional-intel-drawer-categories" role="listbox" aria-label="Categories">
              {OPTIONAL_INTELLIGENCE_CATEGORIES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="option"
                  aria-selected={entry.id === category.id}
                  className={`optional-intel-drawer-category${entry.id === category.id ? " optional-intel-drawer-category--active" : ""}`}
                  disabled={busy}
                  onClick={() => selectCategory(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            {isSupportContactCategory ? (
              <div className="optional-intel-drawer-support-contact">
                <p className="optional-intel-drawer-field-helper">{category.helper}</p>
                <p className="optional-intel-drawer-support-contact-copy">
                  Support contacts are structured CRM records — not free-text notes. Use the support
                  contact form to create and link people to this provider and organization.
                </p>
                {uniqueRelatedContacts.length > 0 ? (
                  <ul className="optional-intel-drawer-support-contact-list">
                    {uniqueRelatedContacts.map((row) => {
                      const name = [String(row.first_name ?? ""), String(row.last_name ?? "")]
                        .filter(Boolean)
                        .join(" ")
                        .trim();
                      return (
                        <li key={String(row.id ?? name)}>
                          {name || "Contact"}
                          {String(row.title ?? row.role_type ?? "").trim()
                            ? ` · ${String(row.title ?? row.role_type ?? "").trim()}`
                            : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                <button
                  type="button"
                  className="provider-intel-quick-signal-primary optional-intel-drawer-support-contact-btn"
                  disabled={busy}
                  data-testid="optional-intelligence-launch-support-contact"
                  onClick={onLaunchSupportContacts}
                >
                  Add support contact
                </button>
              </div>
            ) : (
              <label className="optional-intel-drawer-field">
                <span className="optional-intel-drawer-field-label">{category.label}</span>
                <span className="optional-intel-drawer-field-helper">{category.helper}</span>
                <textarea
                  value={value}
                  disabled={busy}
                  rows={6}
                  className="optional-intel-drawer-textarea"
                  placeholder="Optional note for the team"
                  onChange={(event) => setValue(event.target.value)}
                />
              </label>
            )}

            {error ? (
              <p className="provider-intel-quick-signal-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <footer className="provider-intel-quick-signal-foot">
            <button type="button" className="provider-intel-quick-signal-secondary" disabled={busy} onClick={onClose}>
              Cancel
            </button>
            {!isSupportContactCategory ? (
              <button
                type="button"
                className="provider-intel-quick-signal-primary"
                disabled={busy || !value.trim()}
                data-testid="optional-intelligence-save"
                onClick={() => void handleSave()}
              >
                {busy ? "Saving…" : "Save to provider intelligence"}
              </button>
            ) : null}
          </footer>
        </div>
      </div>
    </>,
    document.body,
  );
}
