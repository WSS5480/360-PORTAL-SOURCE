"use client";

import { useRouter } from "next/navigation";
import React from "react";
import {
  buildPrepareMissionHref,
  openPrepareMissionClient,
} from "@/lib/surgical-sales/engagements/openPrepareMissionClient";
import { ENGAGEMENT_PREPARE_MISSION_LABEL } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { userFacingError } from "@/lib/errors/userFacingError";

type PrepareMissionButtonProps = {
  engagementId: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  /** When true, navigates after open without waiting for parent reload. */
  navigateOnOpen?: boolean;
  style?: React.CSSProperties;
  onOpened?: () => void | Promise<void>;
  onError?: (message: string) => void;
};

export function PrepareMissionButton({
  engagementId,
  label = ENGAGEMENT_PREPARE_MISSION_LABEL,
  className,
  disabled = false,
  navigateOnOpen = true,
  style,
  onOpened,
  onError,
}: PrepareMissionButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function handleClick() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const result = await openPrepareMissionClient(engagementId);
      if (!result.ok) {
        onError?.(result.message);
        return;
      }
      if (onOpened) await onOpened();
      if (navigateOnOpen) {
        router.push(buildPrepareMissionHref(engagementId));
      }
    } catch (e: unknown) {
      onError?.(userFacingError(e, "Could not open field briefing"));
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
      {busy ? "Opening…" : label}
    </button>
  );
}
