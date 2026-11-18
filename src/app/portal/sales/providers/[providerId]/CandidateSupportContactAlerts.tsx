"use client";

import React from "react";
import {
  dismissProviderCandidateContact,
  listActiveSuggestedContacts,
  type CandidateContactIntelligence,
} from "@/lib/surgical-sales/candidateContactIntelligence";
import {
  CandidateAcceptScopeModal,
  CandidateEditAcceptModal,
} from "./CandidateContactReviewModals";
import { saveAcceptedCandidateContact } from "./candidateContactReviewHelpers";
import type { SchedulingContactOwnershipType } from "@/lib/surgical-sales/operationalSupportContact";

export function CandidateSupportContactAlerts({
  contact,
  providerId,
  providerLabel,
  organizationId,
  organizationName,
  relatedContacts,
  onProviderUpdated,
}: {
  contact: Record<string, unknown>;
  providerId: string;
  providerLabel: string;
  organizationId: string | null;
  organizationName?: string | null;
  relatedContacts: Record<string, unknown>[];
  onProviderUpdated?: (provider: Record<string, unknown>) => void | Promise<void>;
}) {
  const [contactPool, setContactPool] = React.useState<Record<string, unknown>[]>([]);
  const [acceptCandidate, setAcceptCandidate] = React.useState<CandidateContactIntelligence | null>(null);
  const [editCandidate, setEditCandidate] = React.useState<CandidateContactIntelligence | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const candidates = React.useMemo(() => listActiveSuggestedContacts(contact), [contact]);
  const hasOrganization = Boolean(organizationId);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/portal/sales/surgical-contacts?include_archived=0&contact_kind=support", {
          cache: "no-store",
        });
        const payload = (await res.json()) as { contacts?: Record<string, unknown>[] };
        if (!cancelled && res.ok && Array.isArray(payload.contacts)) {
          setContactPool(payload.contacts);
        }
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (candidates.length === 0) return null;

  const handleDismiss = async (candidate: CandidateContactIntelligence) => {
    if (busyId) return;
    setBusyId(candidate.id);
    try {
      await dismissProviderCandidateContact({ providerId, candidateId: candidate.id });
      const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, {
        cache: "no-store",
      });
      const payload = (await res.json()) as { contact?: Record<string, unknown> };
      if (res.ok && payload.contact) {
        await onProviderUpdated?.(payload.contact);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleAccept = async (candidate: CandidateContactIntelligence, scope: SchedulingContactOwnershipType) => {
    if (busyId) return;
    setBusyId(candidate.id);
    try {
      const provider = await saveAcceptedCandidateContact({
        providerId,
        candidate,
        scope,
        organizationId,
        relatedContacts,
        contactPool,
      });
      setAcceptCandidate(null);
      await onProviderUpdated?.(provider);
    } finally {
      setBusyId(null);
    }
  };

  const handleEditAccept = async (
    candidate: CandidateContactIntelligence,
    input: {
      scope: SchedulingContactOwnershipType;
      contactName: string;
      contactRole: string;
      email: string;
      phone: string;
      notes: string;
    },
  ) => {
    if (busyId) return;
    setBusyId(candidate.id);
    try {
      const provider = await saveAcceptedCandidateContact({
        providerId,
        candidate,
        scope: input.scope,
        organizationId,
        relatedContacts,
        contactPool,
        contactName: input.contactName,
        contactRole: input.contactRole,
        email: input.email,
        phone: input.phone,
        notes: input.notes,
      });
      setEditCandidate(null);
      await onProviderUpdated?.(provider);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <section className="pib-candidate-contacts" aria-label="Suggested support contacts" data-testid="pib-candidate-contacts">
        <header className="pib-candidate-contacts__head">
          <p className="pib-candidate-contacts__kicker">Suggested support contacts</p>
          <p className="pib-candidate-contacts__title">
            {candidates.length === 1
              ? "1 contact mentioned in field notes needs your review"
              : `${candidates.length} contacts mentioned in field notes need your review`}
          </p>
        </header>
        <ul className="pib-candidate-contacts__list">
          {candidates.map((candidate) => (
            <li key={candidate.id} className="pib-candidate-contacts__item">
              <div className="pib-candidate-contacts__copy">
                <p className="pib-candidate-contacts__name">{candidate.contact_name}</p>
                {candidate.contact_role ? (
                  <p className="pib-candidate-contacts__role">{candidate.contact_role}</p>
                ) : null}
                {candidate.source_quote ? (
                  <p className="pib-candidate-contacts__quote">“{candidate.source_quote}”</p>
                ) : null}
              </div>
              <div className="pib-candidate-contacts__actions">
                <button
                  type="button"
                  className="pib-candidate-contacts__cta pib-candidate-contacts__cta--primary"
                  disabled={busyId === candidate.id}
                  onClick={() => setAcceptCandidate(candidate)}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="pib-candidate-contacts__cta"
                  disabled={busyId === candidate.id}
                  onClick={() => setEditCandidate(candidate)}
                >
                  Edit &amp; accept
                </button>
                <button
                  type="button"
                  className="pib-candidate-contacts__cta pib-candidate-contacts__cta--muted"
                  disabled={busyId === candidate.id}
                  onClick={() => void handleDismiss(candidate)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {acceptCandidate ? (
        <CandidateAcceptScopeModal
          candidate={acceptCandidate}
          providerLabel={providerLabel}
          organizationName={organizationName ?? null}
          hasOrganization={hasOrganization}
          busy={busyId === acceptCandidate.id}
          onClose={() => {
            if (busyId !== acceptCandidate.id) setAcceptCandidate(null);
          }}
          onConfirm={(scope) => void handleAccept(acceptCandidate, scope)}
        />
      ) : null}

      {editCandidate ? (
        <CandidateEditAcceptModal
          candidate={editCandidate}
          providerLabel={providerLabel}
          organizationName={organizationName ?? null}
          hasOrganization={hasOrganization}
          busy={busyId === editCandidate.id}
          onClose={() => {
            if (busyId !== editCandidate.id) setEditCandidate(null);
          }}
          onConfirm={(input) => void handleEditAccept(editCandidate, input)}
        />
      ) : null}
    </>
  );
}
