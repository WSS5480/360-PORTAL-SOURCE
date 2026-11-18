"use client";



import React from "react";

import { createPortal } from "react-dom";

import { assignProviderSupportContact } from "@/lib/surgical-sales/assignProviderSupportContact";
import {
  confirmProviderCandidateContact,
  listActiveSuggestedContacts,
} from "@/lib/surgical-sales/candidateContactIntelligence";

import type { DiscoverySupportContactSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";

import { discoverySupportContactPrimaryDbKey } from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";

import {

  SCHEDULING_OWNER_INTELLIGENCE_DB_KEY,

  buildSchedulerSupportContactDraft,

} from "@/lib/surgical-sales/rapidDiscoverySupportContact";

import { providerQuickSignalCaptureCss } from "./providerQuickSignalCaptureCss";

import { rapidDiscoverySupportContactCss } from "./rapidDiscoverySupportContactCss";

import {

  RapidDiscoverySupportContactPanel,

  supportContactDraftReady,

} from "./RapidDiscoverySupportContactPanel";
import { userFacingError } from "@/lib/errors/userFacingError";

function normalizeContactNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
function contactNameKey(contact: Record<string, unknown>): string {
  return normalizeContactNameKey(
    [String(contact.first_name ?? ""), String(contact.last_name ?? "")]
      .filter(Boolean)
      .join(" "),
  );
}


export function SchedulingOwnerSupportContactDrawer({

  open,

  providerId,

  providerLabel,

  organizationId,

  organizationName,

  relatedContacts,

  contactPool,

  dbKey = SCHEDULING_OWNER_INTELLIGENCE_DB_KEY,

  discoverySignalId,

  title = "Scheduling owner",

  initialMode = "select",

  prefillContactName,

  prefillContactRole,

  prefillNotes,

  providerContact,

  launchOrigin = "provider",

  onClose,

  onSaved,

}: {

  open: boolean;

  providerId: string;

  providerLabel?: string;

  organizationId: string | null;

  organizationName?: string | null;

  relatedContacts: Record<string, unknown>[];

  contactPool: Record<string, unknown>[];

  dbKey?: string;

  discoverySignalId?: DiscoverySupportContactSignalId;

  title?: string;

  initialMode?: "select" | "create";

  prefillContactName?: string | null;

  prefillContactRole?: string | null;

  prefillNotes?: string | null;

  providerContact?: Record<string, unknown>;

  launchOrigin?: "provider" | "organization";

  onClose: () => void;

  onSaved: (provider: Record<string, unknown>) => void | Promise<void>;

}) {

  const resolvedDbKey =

    dbKey ??

    (discoverySignalId ? discoverySupportContactPrimaryDbKey(discoverySignalId) : SCHEDULING_OWNER_INTELLIGENCE_DB_KEY);



  const [mounted, setMounted] = React.useState(false);

  const buildPrefilledDraft = React.useCallback(
    (name?: string | null) => {
      const next = buildSchedulerSupportContactDraft({
        organizationId,
        initialMode,
        prefillContactName: name ?? prefillContactName,
        launchOrigin,
      });
      return {
        ...next,
        jobTitle: prefillContactRole?.trim() || next.jobTitle,
        notes: prefillNotes?.trim() || next.notes,
      };
    },
    [initialMode, launchOrigin, organizationId, prefillContactName, prefillContactRole, prefillNotes],
  );

  const [draft, setDraft] = React.useState(() => buildPrefilledDraft());

  const [busy, setBusy] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);



  React.useEffect(() => setMounted(true), []);



  React.useEffect(() => {

    if (!open) return;

    setDraft(buildPrefilledDraft());

    setError(null);

  }, [open, buildPrefilledDraft]);



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



  const pool = React.useMemo(() => {

    const byId = new Map<string, Record<string, unknown>>();

    for (const c of [...relatedContacts, ...contactPool]) {

      const id = String(c.id ?? "").trim();

      if (id) byId.set(id, c);

    }

    return [...byId.values()];

  }, [relatedContacts, contactPool]);



  const suggestedIntelligenceContacts = React.useMemo(

    () => (providerContact ? listActiveSuggestedContacts(providerContact) : []),

    [providerContact],

  );



  const applySuggestedContact = React.useCallback((name: string) => {
    const nextDraft = buildPrefilledDraft(name);
    setDraft({
      ...nextDraft,
      mode: "create",
      contactTypeId: "scheduler",
      roleId: "scheduling_owner",
    });
    setError(null);
  }, [buildPrefilledDraft]);



  async function handleSave() {

    if (!supportContactDraftReady(draft) || busy) return;

    setBusy(true);

    setError(null);

    try {
      const existingSameName =
        draft.mode === "create"
          ? pool.find((contact) => {
              const draftName = normalizeContactNameKey(`${draft.firstName} ${draft.lastName}`);
              return draftName && contactNameKey(contact) === draftName;
            })
          : null;
      const draftToSave = existingSameName
        ? {
            ...draft,
            mode: "select" as const,
            selectedContactId: String(existingSameName.id ?? ""),
          }
        : draft;

      const { provider, linked } = await assignProviderSupportContact({

        providerId,

        dbKey: resolvedDbKey,

        draft: draftToSave,

        discoverySignalId,

        sourceLabel: discoverySignalId ? "Discovery intelligence" : "Provider overview",

        validate: true,

      });

      const savedNameKey = existingSameName ? contactNameKey(existingSameName) : normalizeContactNameKey(`${draft.firstName} ${draft.lastName}`);
      const matchedCandidate = suggestedIntelligenceContacts.find(
        (candidate) => normalizeContactNameKey(candidate.contact_name) === savedNameKey,
      );
      if (matchedCandidate) {
        await confirmProviderCandidateContact({
          providerId,
          candidateId: matchedCandidate.id,
          linkedContactId: String(linked.contact.id ?? "").trim() || null,
        });
      }

      await onSaved(provider);

      onClose();

    } catch (e: unknown) {

      setError(userFacingError(e, "Could not save support contact."));

    } finally {

      setBusy(false);

    }

  }



  if (!mounted || !open) return null;



  return createPortal(

    <>

      <style>{providerQuickSignalCaptureCss}</style>

      <style>{rapidDiscoverySupportContactCss}</style>

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

          aria-labelledby="scheduling-owner-drawer-title"

          onClick={(e) => e.stopPropagation()}

        >

          <header className="provider-intel-quick-signal-head">

            <div className="provider-intel-quick-signal-head-row">

              <h2 id="scheduling-owner-drawer-title" className="provider-intel-quick-signal-title">

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

            <p className="provider-intel-quick-signal-kicker">

              Link operational contacts by title, affiliation, and workflow role

            </p>

          </header>



          <div className="provider-intel-quick-signal-body">

            {suggestedIntelligenceContacts.length > 0 ? (

              <section className="rd-support-suggested-contacts" style={{ marginBottom: 14 }}>

                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>

                  Suggested contacts

                </div>

                <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>

                  Identified from field intelligence — not yet linked as support contacts.

                </p>

                <div style={{ display: "grid", gap: 6 }}>

                  {suggestedIntelligenceContacts.map((candidate) => (

                    <div

                      key={candidate.id}

                      style={{

                        display: "flex",

                        alignItems: "center",

                        justifyContent: "space-between",

                        gap: 8,

                        padding: "8px 10px",

                        borderRadius: 8,

                        border: "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",

                        background: "color-mix(in srgb, var(--brand-600) 6%, var(--surface))",

                      }}

                    >

                      <div style={{ minWidth: 0 }}>

                        <div style={{ fontSize: 13, fontWeight: 800 }}>{candidate.contact_name}</div>

                        {candidate.contact_role ? (

                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{candidate.contact_role}</div>

                        ) : null}

                      </div>

                      <button

                        type="button"

                        className="provider-intel-quick-signal-cancel"

                        disabled={busy}

                        onClick={() => applySuggestedContact(candidate.contact_name)}

                      >

                        Use suggestion

                      </button>

                    </div>

                  ))}

                </div>

              </section>

            ) : null}



            <RapidDiscoverySupportContactPanel

              dbKey={resolvedDbKey}

              providerId={providerId}

              providerLabel={providerLabel}

              organizationId={organizationId}

              organizationName={organizationName}

              existingContacts={pool}

              draft={draft}

              onDraftChange={setDraft}

              disabled={busy}

              defaultExpanded

              layout="drawer"

              discoverySignalId={discoverySignalId}

              title="Support contact"

              hint="Saved to key relationships and this briefing row"

              initialSearch={prefillContactName ?? undefined}

              suggestedWorkflowIds={["observation_scheduling_owner"]}

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

              className="provider-intel-quick-signal-save"

              onClick={() => void handleSave()}

              disabled={busy || !supportContactDraftReady(draft)}

            >

              {busy ? "Saving…" : "Save & link"}

            </button>

          </footer>

        </div>

      </div>

    </>,

    document.body,

  );

}
