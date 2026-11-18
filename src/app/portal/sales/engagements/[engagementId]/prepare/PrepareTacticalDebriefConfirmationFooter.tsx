"use client";

import React from "react";
import { IntelligencePostSaveFooter } from "@/components/sales/intelligenceCapture/IntelligencePostSaveFooter";
import type { TacticalDebriefSaveConfirmation } from "@/lib/surgical-sales/engagements/tacticalDebriefSaveConfirmation";

export function PrepareTacticalDebriefConfirmationFooter({
  confirmation,
  providerId,
  onDone,
}: {
  confirmation: TacticalDebriefSaveConfirmation;
  providerId?: string | null;
  onDone: () => void;
}) {
  return (
    <IntelligencePostSaveFooter
      providerId={providerId}
      actions={confirmation.postTouchActions}
      onReturnToProvider={onDone}
      onActionClick={onDone}
      className="pfm-debrief-post-touch-footer"
      primaryClassName="pfm-debrief-footer-primary"
      actionClassName="pfm-debrief-post-touch-action"
    />
  );
}
