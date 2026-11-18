"use client";

import React from "react";
import { WHY_THIS_MATTERS_LABEL } from "@/lib/surgical-sales/providerIntelligenceCaptureGuidance";

export function ProviderIntelligenceWhyItMatters({
  text,
  variant = "field",
}: {
  text: string;
  variant?: "section" | "field";
}) {
  if (!text.trim()) return null;

  return (
    <div
      className={`provider-intel-why-it-matters provider-intel-why-it-matters--${variant}`}
      role="note"
    >
      <span className="provider-intel-why-it-matters-label">{WHY_THIS_MATTERS_LABEL}</span>
      <p className="provider-intel-why-it-matters-text">{text}</p>
    </div>
  );
}
