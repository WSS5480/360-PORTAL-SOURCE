"use client";

import React from "react";
import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";
import {
  buildAccessIntelligenceSection,
  buildBackgroundIntelligenceSections,
  type BackgroundIntelligenceSectionId,
} from "@/lib/surgical-sales/backgroundIntelligenceSections";
import { backgroundIntelligenceSectionsCss } from "@/components/sales/backgroundIntelligenceSectionsCss";

export function BackgroundIntelligenceSections({
  contact,
  caseRow,
  defaultOpenSection,
  compact = false,
  accessOnly = false,
  lead = "Reference only — not a rep task list unless a scheduled case is blocked.",
  className,
}: {
  contact: Record<string, unknown>;
  caseRow?: Record<string, unknown> | null;
  defaultOpenSection?: BackgroundIntelligenceSectionId | null;
  compact?: boolean;
  /** Provider record — show only collapsed Access Intelligence. */
  accessOnly?: boolean;
  lead?: string | null;
  className?: string;
}) {
  const sections = React.useMemo(
    () =>
      accessOnly
        ? [buildAccessIntelligenceSection({ contact, caseRow })]
        : buildBackgroundIntelligenceSections({ contact, caseRow }),
    [accessOnly, contact, caseRow],
  );

  return (
    <div
      className={`bg-intel-sections${compact ? " bg-intel-sections--compact" : ""}${className ? ` ${className}` : ""}`}
      aria-label={accessOnly ? BRIEF.accessStatus : BRIEF.supplementaryBriefing}
    >
      <style dangerouslySetInnerHTML={{ __html: backgroundIntelligenceSectionsCss }} />
      {lead ? <p className="bg-intel-sections-lead">{lead}</p> : null}
      {sections.map((section) => (
        <details
          key={section.id}
          className="bg-intel-section"
          open={defaultOpenSection === section.id}
        >
          <summary className="bg-intel-section-summary">{section.title}</summary>
          <div className="bg-intel-section-body">
            {section.items.map((item) => (
              <article key={item.id} className="bg-intel-item">
                <p className="bg-intel-item-label">{item.label}</p>
                <p className="bg-intel-item-summary">{item.summary}</p>
                <p className="bg-intel-item-meta">
                  {item.confidence} · {item.source}
                </p>
              </article>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

