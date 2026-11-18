"use client";

import { usePathname } from "next/navigation";
import React from "react";
import { useCaptureIntelligence } from "@/components/sales/captureIntelligence/CaptureIntelligenceHost";
import { LOG_UPDATE_BUTTON_LABEL, LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import { isCaptureIntelligenceExcludedPath } from "@/lib/surgical-sales/captureIntelligenceLaunch";
import { withCaptureLaunchSurface } from "@/lib/surgical-sales/captureIntelligenceLaunch";

export function LogUpdateDesktopButton() {
  const pathname = usePathname() || "";
  const capture = useCaptureIntelligence();

  if (!LOG_UPDATE_UI_ENABLED) return null;
  if (!pathname.startsWith("/portal/sales")) return null;
  if (isCaptureIntelligenceExcludedPath(pathname)) return null;

  return (
    <button
      type="button"
      className="sales-log-update-desktop-btn"
      onClick={() => capture.open(withCaptureLaunchSurface({}, "global"))}
    >
      {LOG_UPDATE_BUTTON_LABEL}
    </button>
  );
}
