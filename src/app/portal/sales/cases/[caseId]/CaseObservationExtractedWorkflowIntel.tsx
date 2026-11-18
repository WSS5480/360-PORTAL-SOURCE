"use client";

import {
  buildObservationWorkflowIntelView,
  OBSERVATION_WORKFLOW_INTEL_PLACEHOLDER,
} from "@/lib/surgical-sales/observationCaseExtractedWorkflowIntel";
import { caseObservationWorkflowIntelCss } from "./caseObservationWorkflowIntelCss";
import { CaseObservationWorkspacePlaceholder } from "./CaseObservationWorkspacePlaceholder";

export function CaseObservationExtractedWorkflowIntel({
  caseRow,
  embedded = false,
}: {
  caseRow: Record<string, unknown>;
  /** When true, omit outer shell title — parent section provides heading. */
  embedded?: boolean;
}) {
  const view = buildObservationWorkflowIntelView(caseRow);

  if (!view.hasContent) {
    if (embedded) {
      return <p className="case-obs-overview-empty">{OBSERVATION_WORKFLOW_INTEL_PLACEHOLDER}</p>;
    }
    return (
      <CaseObservationWorkspacePlaceholder
        kicker="Workflow intelligence"
        message={OBSERVATION_WORKFLOW_INTEL_PLACEHOLDER}
      />
    );
  }

  return (
    <div className={`case-obs-workflow-intel${embedded ? " case-obs-workflow-intel--embedded" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: caseObservationWorkflowIntelCss }} />
      {!embedded ? (
        <p className="case-obs-workflow-intel-lead">
          Structured signals extracted from observation notes and debrief.
          {view.extractedAt ? (
            <span className="case-obs-workflow-intel-updated">
              {" "}
              Updated{" "}
              {new Date(view.extractedAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          ) : null}
        </p>
      ) : view.extractedAt ? (
        <p className="case-obs-workflow-intel-updated case-obs-workflow-intel-updated--block">
          Updated{" "}
          {new Date(view.extractedAt).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      ) : null}
      <div className="case-obs-workflow-intel-categories">
        {view.categories.map((category) => (
          <section key={category.id} className="case-obs-workflow-intel-category" aria-label={category.title}>
            <h3 className="case-obs-workflow-intel-category-title">{category.title}</h3>
            <ul className="case-obs-workflow-intel-list">
              {category.items.map((item) => (
                <li key={`${category.id}-${item}`} className="case-obs-workflow-intel-item">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
