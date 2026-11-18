"use client";

import {
  formatIntelligenceFieldAttributionDisplay,
  isHelpfulFieldAttribution,
  type IntelligenceFieldAttribution,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

export function ProviderIntelligenceFieldAttribution({
  meta,
  variant = "detail",
}: {
  meta: IntelligenceFieldAttribution | null | undefined;
  variant?: "detail" | "brief";
}) {
  if (!isHelpfulFieldAttribution(meta)) return null;

  const display = formatIntelligenceFieldAttributionDisplay(meta);
  if (variant === "brief") {
    if (!display.briefLine) return null;
    return (
      <p className="provider-intel-attribution provider-intel-attribution--brief">
        {display.briefLine}
      </p>
    );
  }

  const lines = [display.sourceLine, display.authorLine, display.validatedLine].filter(
    Boolean,
  ) as string[];
  if (lines.length === 0) return null;

  return (
    <div className="provider-intel-attribution" aria-label="Signal attribution">
      {lines.map((line) => (
        <span key={line} className="provider-intel-attribution-line">
          {line}
        </span>
      ))}
    </div>
  );
}
