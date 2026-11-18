"use client";

import Link from "next/link";
import React from "react";

import type { OrganizationSuggestedContextView } from "@/lib/surgical-sales/buildOrganizationSuggestedContextForProvider";
import type { OrganizationInheritanceStance } from "@/lib/surgical-sales/organizationIntelligenceInheritance";
import { ORGANIZATION_SUGGESTED_CONTEXT_LABELS } from "@/lib/surgical-sales/scopedIntelligenceItemModel";

export function ProviderOrganizationSuggestedContextPanel({
  view,
  providerId,
  onProviderUpdated,
}: {
  view: OrganizationSuggestedContextView;
  providerId: string;
  onProviderUpdated?: (provider: Record<string, unknown>) => void | Promise<void>;
}) {
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);

  if (!view.hasSuggestions || view.suggestedItems.length === 0) {
    return null;
  }

  async function resolveInheritance(
    intelligenceId: string,
    dbKey: string,
    stance: OrganizationInheritanceStance,
    item: OrganizationSuggestedContextView["suggestedItems"][number],
    action: OrganizationSuggestedContextView["suggestedItems"][number]["actions"][number],
  ) {
    setSubmittingId(intelligenceId);
    try {
      const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_inheritance_resolutions: {
            [dbKey]: {
              stance,
              facility_display_line: item.scopedItem.displayLine,
              facility_value: item.confirmBaselineValue ?? item.scopedItem.displayLine,
              linked_contact_id: action.linkedContactId ?? undefined,
              workflow_role: action.workflowRole ?? undefined,
              relationship_type: action.relationshipType ?? undefined,
            },
          },
        }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        provider?: Record<string, unknown>;
        error?: string;
      };
      if (!res.ok || !payload.provider) {
        throw new Error(payload.error ?? "");
      }
      await onProviderUpdated?.(payload.provider);
    } finally {
      setSubmittingId(null);
    }
  }

  const suggestedOnly = view.suggestedItems;

  return (
    <section
      className="pov-cc-summary mc-surface mc-surface--raised mc-surface--accent-top"
      aria-label={view.panelTitle}
      data-testid="organization-suggested-context-panel"
    >
      <div className="pib-org-suggested-head">
        <p className="pib-org-suggested-kicker">
          {ORGANIZATION_SUGGESTED_CONTEXT_LABELS.panelKicker} · {suggestedOnly.length} to review
        </p>
      </div>
      <h2 className="pov-cc-summary__title">{view.panelTitle}</h2>
      <p className="pib-org-suggested-subtext">{view.panelSubtext}</p>
      <ul className="pib-org-suggested-list">
        {suggestedOnly.map((item) => (
          <li key={item.intelligenceId} className="pib-org-suggested-item">
            <div>
              <p className="pib-org-suggested-item__title">{item.title}</p>
              <p className="pib-org-suggested-item__detail">
                {item.cardDescription ?? item.detailLine}
              </p>
            </div>
            {item.actions.length > 0 ? (
              <div className="pib-org-suggested-item__actions">
                {item.actions.map((action) => {
                  if (action.id === "view_organization" && action.organizationHref) {
                    return (
                      <Link
                        key={action.id}
                        href={action.organizationHref}
                        className="mc-cta mc-cta--surface"
                      >
                        {action.label}
                      </Link>
                    );
                  }

                  if (
                    (action.id === "confirm" || action.id === "not_applicable") &&
                    action.dbKey &&
                    action.stance
                  ) {
                    return (
                      <button
                        key={action.id}
                        type="button"
                        className={
                          action.id === "confirm"
                            ? "mc-cta mc-cta--primary"
                            : "mc-cta mc-cta--surface"
                        }
                        disabled={submittingId === item.intelligenceId}
                        onClick={() =>
                          void resolveInheritance(
                            item.intelligenceId,
                            action.dbKey!,
                            action.stance!,
                            item,
                            action,
                          )
                        }
                      >
                        {action.label}
                      </button>
                    );
                  }

                  return null;
                })}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
