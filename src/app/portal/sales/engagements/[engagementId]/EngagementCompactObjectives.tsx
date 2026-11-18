"use client";

import Link from "next/link";
import { engagementPathwayIntelligenceSectionLabel } from "@/lib/surgical-sales/pathwayStageIntelligenceLabels";

export function EngagementCompactObjectives({
  objectives,
  prepareHref,
  engagementType = "intro_call",
}: {
  objectives: { label: string; summary: string }[];
  prepareHref: string;
  engagementType?: string;
}) {
  if (objectives.length === 0) return null;

  const sectionLabel = engagementPathwayIntelligenceSectionLabel(engagementType);

  return (
    <section className="edm-record-section edm-record-section--compact" aria-labelledby="edm-key-objectives-title">
      <div className="edm-record-section-head">
        <h3 id="edm-key-objectives-title" className="edm-record-section-title">
          {sectionLabel}
        </h3>
        <Link href={prepareHref} className="edm-record-section-link">
          Edit in briefing
        </Link>
      </div>
      <ul className="edm-record-compact-list">
        {objectives.map((item) => (
          <li key={item.label} className="edm-record-compact-item">
            <span className="edm-record-compact-label">{item.label}</span>
            {item.summary ? <span className="edm-record-compact-meta">{item.summary}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
