"use client";

import {
  buildObservationAiExtractedInsightsView,
  OBSERVATION_AI_EXTRACT_INTRO,
} from "@/lib/surgical-sales/observationAiExtractedInsights";
import { caseObservationWorkflowIntelCss } from "./caseObservationWorkflowIntelCss";

export function CaseObservationAiSummary({ caseRow }: { caseRow: Record<string, unknown> }) {
  const view = buildObservationAiExtractedInsightsView(caseRow);
  const populated = view.sections.filter((section) => section.hasItems);

  return (
    <section className="case-obs-overview-section case-obs-overview-section--ai" aria-labelledby="case-obs-ai-title">
      <style dangerouslySetInnerHTML={{ __html: caseObservationWorkflowIntelCss }} />
      <h3 id="case-obs-ai-title" className="case-obs-overview-section-title">
        AI observation summary
      </h3>
      {!view.hasAnyContent ? (
        <p className="case-obs-overview-empty">
          Capture live notes above — structured insights will appear here and on Workflow when ready.
        </p>
      ) : (
        <>
          {view.extractedAt ? (
            <p className="case-obs-overview-ai-updated">
              Updated{" "}
              {new Date(view.extractedAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          ) : null}
          <p className="case-obs-overview-ai-hint">{OBSERVATION_AI_EXTRACT_INTRO}</p>
          <div className="case-obs-workflow-intel-categories case-obs-workflow-intel-categories--overview">
            {populated.map((section) => (
              <section key={section.id} className="case-obs-workflow-intel-category" aria-label={section.title}>
                <h4 className="case-obs-workflow-intel-category-title">{section.title}</h4>
                <ul className="case-obs-workflow-intel-list">
                  {section.items.map((item) => (
                    <li key={`${section.id}-${item}`} className="case-obs-workflow-intel-item">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
