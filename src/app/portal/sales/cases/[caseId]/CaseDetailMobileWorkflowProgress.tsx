"use client";

import type { MobileWorkflowStageRow, ObservationWorkflowStageId } from "./observationWorkflowStages";
import { observationWorkflowRepStatus } from "@/lib/surgical-sales/observationCaseDetailVocabulary";

function StepIndicator({ status }: { status: MobileWorkflowStageRow["status"] }) {
  if (status === "Completed") {
    return (
      <span className="case-wf-progress-dot case-wf-progress-dot--done" aria-hidden>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "In progress") {
    return <span className="case-wf-progress-dot case-wf-progress-dot--active" aria-hidden />;
  }
  return <span className="case-wf-progress-dot" aria-hidden />;
}

export function CaseDetailMobileWorkflowProgress({
  stages,
  onViewWorkflow,
  onStageClick,
  variant = "product_support",
}: {
  stages: MobileWorkflowStageRow[];
  onViewWorkflow: () => void;
  onStageClick: (stageId: ObservationWorkflowStageId) => void;
  variant?: "observation" | "product_support";
}) {
  const completeCount = stages.filter((stage) => stage.status === "Completed").length;
  const activeId = stages.find((stage) => stage.status !== "Completed")?.id ?? stages[stages.length - 1]?.id;
  const kicker = variant === "observation" ? "Workflow" : "Workflow progress";
  const statusLabel = (status: MobileWorkflowStageRow["status"]) =>
    variant === "observation" ? observationWorkflowRepStatus(status) : status;

  return (
    <section className="case-wf-progress" aria-label={variant === "observation" ? "Workflow" : "Workflow progress preview"}>
      <button type="button" className="case-wf-progress-head" onClick={onViewWorkflow}>
        <span className="case-wf-progress-kicker">{kicker}</span>
        <span className="case-wf-progress-summary">
          {variant === "observation"
            ? `${completeCount} of ${stages.length} known`
            : `${completeCount} of ${stages.length} complete`}
        </span>
      </button>
      <ol className="case-wf-progress-list">
        {stages.map((stage) => (
          <li key={stage.id}>
            <button
              type="button"
              className="case-wf-progress-row"
              data-active={stage.id === activeId ? "true" : "false"}
              data-status={stage.status === "Completed" ? "done" : stage.status === "In progress" ? "active" : "pending"}
              onClick={() => onStageClick(stage.id)}
            >
              <StepIndicator status={stage.status} />
              <div className="case-wf-progress-main">
                <div className="case-wf-progress-title">{stage.title}</div>
                <div className="case-wf-progress-meta">
                  <span>{statusLabel(stage.status)}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {stage.filled}/{stage.total}
                  </span>
                </div>
              </div>
              <span className="case-wf-progress-chevron" aria-hidden>
                ›
              </span>
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="case-wf-progress-cta" onClick={onViewWorkflow}>
        View full workflow
      </button>
    </section>
  );
}
