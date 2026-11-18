"use client";

import React from "react";
import type { CaseFieldWatchBriefing } from "@/lib/surgical-sales/caseFieldWatchBriefing";
import { caseFieldWatchBriefingCss } from "@/components/sales/caseFieldWatchBriefingCss";

export function CaseFieldWatchBriefingPanel({
  briefing,
  className,
}: {
  briefing: CaseFieldWatchBriefing;
  className?: string;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: caseFieldWatchBriefingCss }} />
      {briefing.hasItems ? (
        <div className={["case-field-watch", className].filter(Boolean).join(" ")}>
          {briefing.sections.map((section) => (
            <section key={section.category} className="case-field-watch-group" aria-label={section.label}>
              <h3 className="case-field-watch-group-label">{section.label}</h3>
              <ul className="case-field-watch-list">
                {section.items.map((item) => (
                  <li key={item.id} className="case-field-watch-item">
                    <span className="case-field-watch-item-text">{item.text}</span>
                    {item.sourceLabel ? (
                      <span className="case-field-watch-item-source">{item.sourceLabel}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className={["case-field-watch case-field-watch--empty", className].filter(Boolean).join(" ")}>
          {briefing.emptyLines.map((line) => (
            <p key={line} className="case-field-watch-empty-line">
              {line}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
