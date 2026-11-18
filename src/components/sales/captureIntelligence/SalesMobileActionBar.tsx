"use client";

import { usePathname } from "next/navigation";
import {
  buildCaptureIntelligenceOpenContext,
  useCaptureIntelligence,
} from "@/components/sales/captureIntelligence/CaptureIntelligenceHost";
import { isCaptureIntelligenceExcludedPath } from "@/lib/surgical-sales/captureIntelligenceLaunch";
import { LOG_UPDATE_BUTTON_LABEL, LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";

function parseProviderIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/portal\/sales\/providers\/([^/?]+)/);
  if (!match || match[1] === "new") return null;
  return match[1];
}

export function SalesMobileActionBar() {
  const pathname = usePathname() || "";
  const capture = useCaptureIntelligence();

  if (!LOG_UPDATE_UI_ENABLED) return null;
  if (!pathname.startsWith("/portal/sales")) return null;
  if (isCaptureIntelligenceExcludedPath(pathname)) return null;

  const providerId = parseProviderIdFromPath(pathname);

  function openLogUpdate() {
    if (providerId) {
      capture.open(buildCaptureIntelligenceOpenContext("provider", { providerId }));
      return;
    }
    capture.open(buildCaptureIntelligenceOpenContext("global", {}));
  }

  return (
    <nav className="sales-mobile-action-bar-shell" aria-label="Sales actions">
      <div className="sales-mobile-action-bar sales-mobile-action-bar--single">
        <button
          type="button"
          className="sales-mobile-action-btn sales-mobile-action-btn--primary"
          onClick={openLogUpdate}
        >
          {LOG_UPDATE_BUTTON_LABEL}
        </button>
      </div>
    </nav>
  );
}
