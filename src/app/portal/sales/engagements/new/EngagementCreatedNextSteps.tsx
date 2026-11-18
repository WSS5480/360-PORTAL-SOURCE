"use client";

import Link from "next/link";
import {
  buildEngagementAddNoteHref,
  buildProviderOverviewHref,
  PROVIDER_OVERVIEW_LABEL,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { buildEngagementPrimaryAction } from "@/lib/surgical-sales/engagements/engagementWorkflowState";

export function EngagementCreatedNextSteps({
  engagementId,
  providerId,
  saveMode,
  providerLabel,
  typeLabel,
}: {
  engagementId: string;
  providerId: string;
  saveMode: "draft" | "final";
  providerLabel: string;
  typeLabel: string;
}) {
  const primary = buildEngagementPrimaryAction({
    engagementId,
    state: "planned",
    engagementType: typeLabel.toLowerCase().includes("intro") ? "intro_call" : undefined,
  });
  const trimmedProviderId = providerId.trim();
  const providerOverviewHref = trimmedProviderId ? buildProviderOverviewHref(trimmedProviderId) : null;
  const noteHref = trimmedProviderId ? buildEngagementAddNoteHref(trimmedProviderId) : primary.href;

  const title = saveMode === "draft" ? "Draft saved" : "Engagement saved";
  const lead =
    saveMode === "draft"
      ? `Your ${typeLabel} draft with ${providerLabel || "this provider"} is ready.`
      : `Your ${typeLabel} with ${providerLabel || "this provider"} is on the calendar.`;

  return (
    <section className="ew-save-success" aria-labelledby="ew-save-success-title">
      <header className="ew-save-success-hero">
        <p className="ew-save-success-kicker">Next steps</p>
        <h2 id="ew-save-success-title" className="ew-save-success-title">
          {title}
        </h2>
        <p className="ew-save-success-lead">{lead}</p>
        <p className="ew-save-success-hint">
          Start with <strong>{primary.label}</strong> for the field briefing. After the touch, use{" "}
          <strong>Debrief</strong> to capture outcome and intelligence.
        </p>
      </header>

      <div className="ew-save-success-actions" role="group" aria-label="What to do next">
        <Link href={primary.href} className="ew-save-success-btn ew-save-success-btn--primary">
          {primary.label}
        </Link>
        {providerOverviewHref ? (
          <Link href={providerOverviewHref} className="ew-save-success-btn ew-save-success-btn--secondary">
            {PROVIDER_OVERVIEW_LABEL}
          </Link>
        ) : null}
        <Link href={noteHref} className="ew-save-success-btn ew-save-success-btn--secondary">
          Add Note
        </Link>
      </div>
    </section>
  );
}
