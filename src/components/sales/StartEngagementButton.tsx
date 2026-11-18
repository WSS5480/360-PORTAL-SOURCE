"use client";

import { BeginCallButton } from "@/components/sales/BeginCallButton";
import { ENGAGEMENT_DETAIL_START_ENGAGEMENT_LABEL } from "@/lib/surgical-sales/engagements/engagementLifecycle";

/** Starts a planned engagement (PLANNED → ACTIVE) then opens the active workspace. */
export function StartEngagementButton({
  engagementId,
  className,
  disabled,
  onError,
}: {
  engagementId: string;
  className?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
}) {
  return (
    <BeginCallButton
      engagementId={engagementId}
      label={ENGAGEMENT_DETAIL_START_ENGAGEMENT_LABEL}
      className={className}
      disabled={disabled}
      navigateOnBegin
      onError={onError}
    />
  );
}
