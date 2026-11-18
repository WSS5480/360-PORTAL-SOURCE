"use client";

import {
  buildObservationAiExtractedInsightsView,
  OBSERVATION_AI_EXTRACT_INTRO,
} from "@/lib/surgical-sales/observationAiExtractedInsights";

export function CaseObservationAiExtractedInsights({ caseRow }: { caseRow: Record<string, unknown> }) {
  const view = buildObservationAiExtractedInsightsView(caseRow);

  return (
    <section
      className={`case-obs-ai-extract${view.hasAnyContent ? " case-obs-ai-extract--active" : " case-obs-ai-extract--pending"}`}
      aria-labelledby="case-obs-ai-extract-title"
    >
      <header className="case-obs-ai-extract-head">
        <div>
          <h3 id="case-obs-ai-extract-title" className="case-obs-ai-extract-title">
            From observation notes
          </h3>
          <p className="case-obs-ai-extract-lead">{OBSERVATION_AI_EXTRACT_INTRO}</p>
        </div>
        {view.extractedAt ? (
          <p className="case-obs-ai-extract-updated">
            Updated{" "}
            {new Date(view.extractedAt).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        ) : null}
      </header>

      <div className="case-obs-ai-extract-grid" role="list">
        {view.sections.map((section) => (
          <article
            key={section.id}
            className={`case-obs-ai-extract-card${section.hasItems ? " case-obs-ai-extract-card--filled" : " case-obs-ai-extract-card--empty"}`}
            role="listitem"
            aria-label={section.title}
          >
            <h4 className="case-obs-ai-extract-card-title">{section.title}</h4>
            {section.hasItems ? (
              <ul className="case-obs-ai-extract-list">
                {section.items.map((item) => (
                  <li key={`${section.id}-${item}`} className="case-obs-ai-extract-item">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="case-obs-ai-extract-placeholder">{section.placeholder}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
