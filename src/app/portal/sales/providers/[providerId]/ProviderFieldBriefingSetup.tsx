"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import {
  FIELD_BRIEFING_EMPTY_BODY,
  FIELD_BRIEFING_EMPTY_TITLE,
  FIELD_BRIEFING_TOUCH_OPTIONS,
  buildFieldBriefingNewEngagementHref,
  providerFieldBriefingTabHref,
} from "@/lib/surgical-sales/providerFieldBriefingTouch";

export function ProviderFieldBriefingSetup({
  providerId,
  organizationId,
  newEngagementHref,
}: {
  providerId: string;
  organizationId?: string | null;
  newEngagementHref: string;
}) {
  const router = useRouter();

  const selectTouch = (touchId: (typeof FIELD_BRIEFING_TOUCH_OPTIONS)[number]["id"]) => {
    router.replace(providerFieldBriefingTabHref(providerId, { touch: touchId }));
  };

  return (
    <div className="pfb-setup" aria-label="Start field briefing">
      <p className="pfb-setup-title">{FIELD_BRIEFING_EMPTY_TITLE}</p>
      <p className="pfb-setup-body">{FIELD_BRIEFING_EMPTY_BODY}</p>

      <div className="pfb-setup-actions">
        <Link href={newEngagementHref} className="pfb-setup-primary">
          Create engagement
        </Link>
      </div>

      <p className="pfb-setup-divider">
        <span>or choose a touch type</span>
      </p>

      <ul className="pfb-setup-touches">
        {FIELD_BRIEFING_TOUCH_OPTIONS.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className="pfb-setup-touch"
              onClick={() => selectTouch(option.id)}
            >
              <span className="pfb-setup-touch-label">{option.label}</span>
              <span className="pfb-setup-touch-desc">{option.description}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="pfb-setup-hint">
        Preview a briefing before scheduling, or{" "}
        <Link
          href={buildFieldBriefingNewEngagementHref({
            providerId,
            organizationId,
            engagementType: "intro_call",
          })}
        >
          start with intro call
        </Link>
        .
      </p>
    </div>
  );
}
