"use client";

import type { ProviderOverviewAccountNotesSection } from "@/lib/surgical-sales/buildProviderOverviewAccountNotes";

function deriveNextMove(section: ProviderOverviewAccountNotesSection): string {
  const open = section.outstandingUnknowns[0];
  if (open) return `Confirm ${open.charAt(0).toLowerCase()}${open.slice(1)}`;
  if (section.latestDiscoveries.length > 0) return "Add anything new from your last touch";
  return "Log what you learn on the next visit";
}

function AccountNotesSectionPanel({ section }: { section: ProviderOverviewAccountNotesSection }) {
  const nextMove = deriveNextMove(section);
  const openLine =
    section.outstandingUnknowns.length > 0
      ? `Still open: ${section.outstandingUnknowns.slice(0, 2).join(", ")}.`
      : null;

  return (
    <details className="pov-notes-section">
      <summary className="pov-notes-section-summary">
        <span className="pov-notes-section-title">{section.title}</span>
        <span className="pov-notes-section-meta">{section.scanMeta}</span>
      </summary>
      <div className="pov-notes-section-body">
        <p className="pov-notes-headline">{section.summary}</p>
        {openLine ? <p className="pov-notes-explanation">{openLine}</p> : null}
        <p className="pov-notes-next">
          <span className="pov-notes-next-label">Next move:</span> {nextMove}
        </p>
      </div>
    </details>
  );
}

export function ProviderOverviewAccountNotes({
  sections,
}: {
  sections: ProviderOverviewAccountNotesSection[];
}) {
  if (sections.length === 0) return null;

  return (
    <div className="pov-notes" aria-label="Account notes by area">
      {sections.map((section) => (
        <AccountNotesSectionPanel key={section.id} section={section} />
      ))}
    </div>
  );
}
