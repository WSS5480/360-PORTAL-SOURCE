"use client";

import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { CaseObservationAiExtractedInsights } from "./CaseObservationAiExtractedInsights";
import { CaseObservationReadinessSummary } from "./CaseObservationReadinessSummary";
import { CaseObservationTabShell } from "./CaseObservationWorkspacePlaceholder";
import { caseObservationWorkflowTabCss } from "./caseObservationWorkflowTabCss";

export function CaseObservationWorkflowTab({
  caseId,
  caseRow,
  operationalContext,
  providerContact,
  planning,
  providerId,
  disabled,
  onCasePatched,
  onMessage,
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  operationalContext?: CaseOperationalContextView | null;
  providerContact?: Record<string, unknown> | null;
  planning?: ProviderPlanningCompletion | null;
  providerId?: string | null;
  disabled?: boolean;
  onCasePatched: (savedCase: Record<string, unknown>) => void;
  onMessage: (message: string) => void;
}) {
  return (
    <CaseObservationTabShell kicker="Workflow">
      <style dangerouslySetInnerHTML={{ __html: caseObservationWorkflowTabCss }} />
      <p className="case-obs-workflow-intro">
        What you know, what to confirm, and the best questions to ask next — surfaced from your notes, not a CRM checklist.
      </p>
      <div className="case-obs-workflow-sections">
        <CaseObservationReadinessSummary
          caseRow={caseRow}
          operationalContext={operationalContext}
          providerContact={providerContact}
          planning={planning}
          providerId={providerId}
        />
        <CaseObservationAiExtractedInsights caseRow={caseRow} />
      </div>
    </CaseObservationTabShell>
  );
}
