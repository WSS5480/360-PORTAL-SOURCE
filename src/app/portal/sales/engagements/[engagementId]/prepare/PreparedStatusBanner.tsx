import type { EngagementPreparationStatus } from "@/lib/surgical-sales/engagements/engagementPreparationStatus";
import {
  INTRO_CALL_PREPARE_READY_LABEL,
  OFFICE_VISIT_360_PREPARE_READY_LABEL,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";

export function PreparedStatusBanner({
  preparation,
  variant = "default",
}: {
  preparation: EngagementPreparationStatus;
  variant?: "default" | "intro_call" | "office_visit_360";
}) {
  if (!preparation.is_prepared) return null;

  const readyLabel =
    variant === "intro_call"
      ? INTRO_CALL_PREPARE_READY_LABEL
      : variant === "office_visit_360"
        ? OFFICE_VISIT_360_PREPARE_READY_LABEL
        : "Plan saved — ready for visit";

  return (
    <p className="pfm-precall-ready" role="status">
      <span className="pfm-precall-ready__dot" aria-hidden />
      <span className="pfm-precall-ready__label">{readyLabel}</span>
      {preparation.prepared_at_label ? (
        <span className="pfm-precall-ready__when">{preparation.prepared_at_label}</span>
      ) : null}
    </p>
  );
}
