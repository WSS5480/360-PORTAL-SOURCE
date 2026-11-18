"use client";

import React from "react";
import { buildNewCaseProceduralContextNotes } from "@/lib/surgical-sales/buildNewCaseProceduralContextNotes";

const proceduralContextCss = `
.new-case-procedural-context{margin:0;padding:6px 8px;border-radius:8px;border:1px solid color-mix(in srgb,var(--foreground) 8%,var(--border));background:color-mix(in srgb,var(--surface-2) 30%,var(--surface));display:grid;gap:4px}
.new-case-procedural-context-title{margin:0;font-size:10px;font-weight:800;letter-spacing:.02em;color:color-mix(in srgb,var(--foreground) 72%,var(--muted));line-height:1.3}
.new-case-procedural-context-list{margin:0;padding:0 0 0 14px;display:grid;gap:2px}
.new-case-procedural-context-list li{font-size:10px;line-height:1.35;color:color-mix(in srgb,var(--foreground) 78%,var(--muted));font-weight:600}
`;

export function NewCaseProceduralContextNotes({
  procedureType,
  providerContact,
}: {
  procedureType: string;
  providerContact: Record<string, unknown> | null | undefined;
}) {
  const notes = React.useMemo(
    () =>
      buildNewCaseProceduralContextNotes({
        procedureType,
        contact: providerContact,
        maxItems: 3,
      }),
    [procedureType, providerContact],
  );

  if (notes.length === 0) return null;

  return (
    <div className="new-case-procedural-context" role="note">
      <style dangerouslySetInnerHTML={{ __html: proceduralContextCss }} />
      <p className="new-case-procedural-context-title">Known procedural context</p>
      <ul className="new-case-procedural-context-list">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
