"use client";

import React from "react";
import type { IntelligenceSaveConfirmationGroup } from "@/lib/surgical-sales/intelligenceSaveConfirmation";

export function IntelligenceSaveConfirmation({
  groups,
  title,
  className = "",
}: {
  groups: IntelligenceSaveConfirmationGroup[];
  /** When omitted, only per-destination blocks are shown. */
  title?: string | null;
  className?: string;
}) {
  if (groups.length === 0) return null;

  return (
    <section
      className={`intel-save-confirmation${className ? ` ${className}` : ""}`}
      aria-label={title ?? "Where your updates were saved"}
    >
      {title ? <h3 className="intel-save-confirmation-title">{title}</h3> : null}
      <div className="intel-save-confirmation-groups">
        {groups.map((group) => (
          <div key={group.destination} className="intel-save-confirmation-group">
            <h4 className="intel-save-confirmation-heading">{group.heading}</h4>
            <ul className="intel-save-confirmation-list">
              {group.lines.map((line) => (
                <li key={`${group.destination}-${line}`}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
