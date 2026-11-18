"use client";

import React from "react";
import type { CredentialingPlatformRecord } from "@/lib/surgical-sales/credentialingPlatforms";
import { platformMatchesCredentialingName } from "@/lib/surgical-sales/credentialingPlatforms";
import { FACILITY_CREDENTIALING_UI } from "@/lib/surgical-sales/facilityCredentialingIntelligence";
import { credentialingPlatformPickerCss } from "@/app/portal/sales/providers/[providerId]/credentialingPlatformPickerCss";
import { userFacingError } from "@/lib/errors/userFacingError";

type CreateFormState = {
  name: string;
  aliases: string;
  notes: string;
};

export function CredentialingPlatformPicker({
  valueId,
  valueName,
  disabled,
  onSelect,
}: {
  valueId: string;
  valueName: string;
  disabled?: boolean;
  onSelect: (platform: CredentialingPlatformRecord) => void;
}) {
  const [query, setQuery] = React.useState(valueName);
  const [platforms, setPlatforms] = React.useState<CredentialingPlatformRecord[]>([]);
  const [open, setOpen] = React.useState(false);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateFormState>({
    name: "",
    aliases: "",
    notes: "",
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setQuery(valueName);
  }, [valueName]);

  React.useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams();
          if (query.trim()) params.set("q", query.trim());
          const res = await fetch(`/api/portal/sales/credentialing-platforms?${params.toString()}`, {
            cache: "no-store",
          });
          const payload = (await res.json()) as {
            ok?: boolean;
            platforms?: CredentialingPlatformRecord[];
            error?: string;
          };
          if (!cancelled && res.ok && payload.platforms) {
            setPlatforms(payload.platforms);
          }
        } catch {
          /* non-blocking */
        }
      })();
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setShowCreateForm(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function openCreateForm(prefillName = "") {
    setCreateForm({
      name: prefillName,
      aliases: "",
      notes: "",
    });
    setShowCreateForm(true);
    setOpen(true);
    setError(null);
  }

  async function createPlatform(input: CreateFormState) {
    const trimmedName = input.name.trim().replace(/\s+/g, " ");
    if (!trimmedName || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/sales/credentialing-platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          aliases: input.aliases,
          notes: input.notes,
        }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        platform?: CredentialingPlatformRecord;
        error?: string;
      };
      if (!res.ok || !payload.platform) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Could not save service.");
      }
      onSelect(payload.platform);
      setQuery(payload.platform.name);
      setOpen(false);
      setShowCreateForm(false);
    } catch (e: unknown) {
      setError(userFacingError(e, "Could not save service."));
    } finally {
      setBusy(false);
    }
  }

  const trimmedQuery = query.trim();
  const exactMatch = platforms.some((platform) => platformMatchesCredentialingName(platform, trimmedQuery));
  const dropdownOpen = open || showCreateForm;

  return (
    <div className="cred-platform-picker" ref={containerRef}>
      <style dangerouslySetInnerHTML={{ __html: credentialingPlatformPickerCss }} />
      <label className="stage-mapping-meta-field stage-mapping-meta-field--full">
        <span className="cred-platform-label">{FACILITY_CREDENTIALING_UI.platformLabel}</span>
        <p className="cred-platform-helper">{FACILITY_CREDENTIALING_UI.platformHelper}</p>
        <input
          className="cred-platform-input"
          value={query}
          disabled={disabled || busy}
          placeholder={FACILITY_CREDENTIALING_UI.platformSearchPlaceholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setShowCreateForm(false);
          }}
        />
      </label>

      {dropdownOpen ? (
        <div className="cred-platform-dropdown">
          {showCreateForm ? (
            <form
              className="cred-platform-create-form"
              onSubmit={(e) => {
                e.preventDefault();
                void createPlatform(createForm);
              }}
            >
              <label className="cred-platform-create-field">
                <span>{FACILITY_CREDENTIALING_UI.createPlatformNameLabel}</span>
                <input
                  value={createForm.name}
                  disabled={disabled || busy}
                  autoFocus
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label className="cred-platform-create-field">
                <span>{FACILITY_CREDENTIALING_UI.createPlatformAliasesLabel}</span>
                <input
                  value={createForm.aliases}
                  disabled={disabled || busy}
                  placeholder={FACILITY_CREDENTIALING_UI.createPlatformAliasesPlaceholder}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, aliases: e.target.value }))}
                />
              </label>
              <label className="cred-platform-create-field">
                <span>{FACILITY_CREDENTIALING_UI.createPlatformNotesLabel}</span>
                <textarea
                  value={createForm.notes}
                  disabled={disabled || busy}
                  rows={2}
                  placeholder={FACILITY_CREDENTIALING_UI.createPlatformNotesPlaceholder}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </label>
              <div className="cred-platform-create-actions">
                <button
                  type="button"
                  className="cred-platform-create-btn"
                  disabled={disabled || busy}
                  onClick={() => {
                    setShowCreateForm(false);
                    setOpen(false);
                  }}
                >
                  {FACILITY_CREDENTIALING_UI.createPlatformCancel}
                </button>
                <button
                  type="submit"
                  className="cred-platform-create-btn cred-platform-create-btn--primary"
                  disabled={disabled || busy || !createForm.name.trim()}
                >
                  {FACILITY_CREDENTIALING_UI.createPlatformSave}
                </button>
              </div>
            </form>
          ) : (
            <>
              <ul className="cred-platform-list" role="listbox">
                {platforms.map((platform) => (
                  <li key={platform.id}>
                    <button
                      type="button"
                      className={`cred-platform-option${valueId === platform.id ? " cred-platform-option--selected" : ""}`}
                      disabled={disabled || busy}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onSelect(platform);
                        setQuery(platform.name);
                        setOpen(false);
                      }}
                    >
                      {platform.name}
                    </button>
                  </li>
                ))}
                {platforms.length === 0 && !trimmedQuery ? (
                  <li className="cred-platform-empty">Type to search credentialing services…</li>
                ) : null}
                {platforms.length === 0 && trimmedQuery ? (
                  <li className="cred-platform-empty">No matching services found.</li>
                ) : null}
              </ul>
              <div className="cred-platform-actions">
                {trimmedQuery && !exactMatch ? (
                  <button
                    type="button"
                    className="cred-platform-option cred-platform-option--create"
                    disabled={disabled || busy}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void createPlatform({ name: trimmedQuery, aliases: "", notes: "" })}
                  >
                    + {FACILITY_CREDENTIALING_UI.createPlatformQuick} “{trimmedQuery}”{" "}
                    {FACILITY_CREDENTIALING_UI.createPlatformQuickSuffix}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="cred-platform-option cred-platform-option--create"
                  disabled={disabled || busy}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => openCreateForm("")}
                >
                  + {FACILITY_CREDENTIALING_UI.createPlatformForm}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {error ? <p className="cred-platform-error">{error}</p> : null}
    </div>
  );
}
