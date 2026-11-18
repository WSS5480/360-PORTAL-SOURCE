"use client";

export function ProviderOverviewDiscoveryApprovalActions({
  onMarkObservationApproved,
}: {
  onMarkObservationApproved: () => void;
}) {
  return (
    <div className="pov-discovery-approval-actions" data-testid="pov-discovery-approval-actions">
      <p className="pov-discovery-approval-actions__copy">
        Secure observation approval before scheduling OR days. Scheduler and credentialing are optional.
      </p>
      <button
        type="button"
        className="pov-discovery-approval-actions__cta"
        data-testid="pov-mark-observation-approved"
        onClick={onMarkObservationApproved}
      >
        Mark Observation Approved
      </button>
    </div>
  );
}
