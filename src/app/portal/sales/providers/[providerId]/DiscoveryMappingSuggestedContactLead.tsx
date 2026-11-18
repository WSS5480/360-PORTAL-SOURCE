"use client";

import React from "react";
import type { DiscoveryMappingSuggestedContactLead } from "@/lib/surgical-sales/buildDiscoveryMappingCardIntelligence";

export function DiscoveryMappingSuggestedContactLeadPanel({
  lead,
  busy,
  onSelect,
  onAdd,
  onNotConfirmed,
}: {
  lead: DiscoveryMappingSuggestedContactLead;
  busy?: boolean;
  onSelect: () => void;
  onAdd: () => void;
  onNotConfirmed: () => void;
}) {
  return (
    <section
      className="stage-mapping-suggested-contact"
      aria-label="Suggested contact lead"
    >
      <p className="stage-mapping-suggested-contact-kicker">Suggested contact lead</p>
      <p className="stage-mapping-suggested-contact-name">{lead.name}</p>
      <p className="stage-mapping-suggested-contact-hint">{lead.hint}</p>
      <div className="stage-mapping-suggested-contact-actions">
        <button
          type="button"
          className="stage-mapping-choice stage-mapping-choice--primary"
          disabled={busy}
          onClick={onSelect}
        >
          Select {lead.name}
        </button>
        <button
          type="button"
          className="stage-mapping-choice"
          disabled={busy}
          onClick={onAdd}
        >
          Add {lead.name} as contact
        </button>
        <button
          type="button"
          className="stage-mapping-choice"
          disabled={busy}
          onClick={onNotConfirmed}
        >
          Not confirmed
        </button>
      </div>
    </section>
  );
}
