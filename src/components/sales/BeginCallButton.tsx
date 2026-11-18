"use client";

import { useRouter } from "next/navigation";
import React from "react";
import {
  beginEngagementCallClient,
  buildBeginCallHref,
} from "@/lib/surgical-sales/engagements/beginEngagementCallClient";
import { ENGAGEMENT_BEGIN_CALL_LABEL } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { userFacingError } from "@/lib/errors/userFacingError";

type BeginCallButtonProps = {
  engagementId: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  navigateOnBegin?: boolean;
  style?: React.CSSProperties;
  onBegun?: () => void | Promise<void>;
  onError?: (message: string) => void;
};

export function BeginCallButton({
  engagementId,
  label = ENGAGEMENT_BEGIN_CALL_LABEL,
  className,
  disabled = false,
  navigateOnBegin = true,
  style,
  onBegun,
  onError,
}: BeginCallButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function handleClick() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const result = await beginEngagementCallClient(engagementId);
      if (!result.ok) {
        onError?.(result.message);
        return;
      }
      if (onBegun) await onBegun();
      if (navigateOnBegin) {
        router.push(buildBeginCallHref(engagementId));
      }
    } catch (e: unknown) {
      onError?.(userFacingError(e, "Could not start engagement"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      disabled={disabled || busy}
      onClick={() => void handleClick()}
    >
      {busy ? "Starting…" : label}
    </button>
  );
}
