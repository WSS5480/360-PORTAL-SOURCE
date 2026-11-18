"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { planProviderDebriefFromCaseClient } from "@/lib/surgical-sales/engagements/planProviderDebriefFromCaseClient";
import { PLAN_DEBRIEF_HEADER_ACTION_LABEL, PLAN_PROVIDER_DEBRIEF_ACTION_LABEL } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";

export function PlanProviderDebriefCta({
  caseId,
  disabled,
  className,
  label = PLAN_PROVIDER_DEBRIEF_ACTION_LABEL,
  onError,
  onStarted,
  onSuccess,
}: {
  caseId: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  onError?: (message: string) => void;
  onStarted?: () => void;
  onSuccess?: (prepareHref: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function handleClick() {
    if (disabled || busy) return;
    setBusy(true);
    onStarted?.();
    const result = await planProviderDebriefFromCaseClient(caseId);
    setBusy(false);
    if (!result.ok) {
      onError?.(result.message);
      return;
    }
    onSuccess?.(result.result.prepareHref);
    router.push(result.result.prepareHref);
  }

  return (
    <button
      type="button"
      className={className ?? "case-obs-plan-debrief-btn"}
      disabled={disabled || busy}
      onClick={() => void handleClick()}
    >
      {busy ? "Opening Field Briefing…" : label}
    </button>
  );
}
