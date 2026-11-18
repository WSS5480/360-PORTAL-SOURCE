"use client";

import React from "react";
import { SUPPORT_CONTACT_INFO_NEEDED_LABEL } from "@/lib/surgical-sales/debriefDetectedContact";

export function SupportContactInfoNeededBadge({ className }: { className?: string }) {
  return (
    <span className={`ai-debrief-contact-missing-badge${className ? ` ${className}` : ""}`}>
      {SUPPORT_CONTACT_INFO_NEEDED_LABEL}
    </span>
  );
}
