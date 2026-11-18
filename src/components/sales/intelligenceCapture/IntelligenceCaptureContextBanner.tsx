"use client";

import {
  formatIntelligenceCaptureBanner,
  type IntelligenceCaptureScope,
} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import {
  INTELLIGENCE_CAPTURE_BANNER_KICKER,
  INTELLIGENCE_CAPTURE_LOCKED_HINT,
} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureUx";

export function IntelligenceCaptureContextBanner({
  scope,
  className = "",
}: {
  scope: IntelligenceCaptureScope;
  className?: string;
}) {
  const line = formatIntelligenceCaptureBanner(scope);
  return (
    <div className={`intel-capture-context${className ? ` ${className}` : ""}`} role="status">
      <span className="intel-capture-context-kicker">{INTELLIGENCE_CAPTURE_BANNER_KICKER}</span>
      <p className="intel-capture-context-line">{line}</p>
      {scope.locked ? (
        <p className="intel-capture-context-locked">{INTELLIGENCE_CAPTURE_LOCKED_HINT}</p>
      ) : null}
    </div>
  );
}
