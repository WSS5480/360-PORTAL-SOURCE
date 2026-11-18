"use client";

import { useMemo } from "react";
import { buildProviderOverviewAccessIntelligence } from "@/lib/surgical-sales/buildProviderOverviewAccessIntelligence";
import {
  buildProviderOverviewOptionalIntelligenceView,
} from "@/lib/surgical-sales/optionalIntelligenceCategories";
import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";

function formatAccessRow(row: { label: string; value: string; captured: boolean }): string {
  if (!row.captured) return `${row.label}: ${row.value}`;
  if (!row.value.trim()) return row.label;
  return `${row.label}: ${row.value}`;
}

function dedupeRelatedContacts(contacts: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const byKey = new Map<string, Record<string, unknown>>();
  for (const contact of contacts) {
    const id = String(contact.id ?? "").trim();
    const name = [String(contact.first_name ?? ""), String(contact.last_name ?? "")]
      .filter(Boolean)
      .join(" ")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    const key = id || name;
    if (key && !byKey.has(key)) byKey.set(key, contact);
  }
  return [...byKey.values()];
}

export function ProviderOverviewSupportingAccordion({
  contact,
  relatedContacts = [],
  onManageContacts,
  onOpenOptionalIntelligence,
}: {
  contact: Record<string, unknown>;
  relatedContacts?: Array<Record<string, unknown>>;
  onManageContacts?: () => void;
  onOpenOptionalIntelligence?: () => void;
}) {
  const accessView = useMemo(
    () => buildProviderOverviewAccessIntelligence({ contact }),
    [contact],
  );
  const optionalView = useMemo(
    () => buildProviderOverviewOptionalIntelligenceView({ contact, relatedContacts }),
    [contact, relatedContacts],
  );
  const uniqueRelatedContacts = useMemo(() => dedupeRelatedContacts(relatedContacts), [relatedContacts]);

  const championCount = optionalView.rows.filter((row) => row.id === "champion_candidates").length;

  const sections = [
    {
      id: "support_contacts",
      label: BRIEF.keyRelationships,
      count: uniqueRelatedContacts.length,
      testId: "pov-support-contacts",
      body:
        uniqueRelatedContacts.length === 0 ? (
          <p className="pov-cc-supporting__empty">{BRIEF.noKeyRelationshipsYet}</p>
        ) : (
          <ul className="pov-cc-supporting__list">
            {uniqueRelatedContacts.map((row) => {
              const name = [String(row.first_name ?? ""), String(row.last_name ?? "")]
                .filter(Boolean)
                .join(" ")
                .trim();
              const role = String(row.role_type ?? row.title ?? "").trim();
              return (
                <li key={String(row.id ?? name)} className="pov-cc-supporting__row">
                  {name || "Contact"}
                  {role ? <span className="pov-cc-supporting__meta"> · {role}</span> : null}
                </li>
              );
            })}
          </ul>
        ),
      action: onManageContacts ? (
        <button type="button" className="pov-cc-supporting__action" onClick={onManageContacts}>
          {BRIEF.manageKeyRelationships}
        </button>
      ) : null,
    },
    {
      id: "optional_intelligence",
      label: BRIEF.supplementaryBriefing,
      count: optionalView.capturedCount,
      testId: "pov-optional-intelligence",
      body: optionalView.hasData ? (
        <ul className="pov-cc-supporting__list">
          {optionalView.rows.map((row) => (
            <li key={row.id} className="pov-cc-supporting__row">
              <span className="pov-cc-supporting__label">{row.label}:</span> {row.value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="pov-cc-supporting__empty">{BRIEF.noSupplementaryBriefingYet}</p>
      ),
      action: null,
    },
    {
      id: "champion_candidates",
      label: BRIEF.influencePaths,
      count: championCount || optionalView.rows.filter((r) => r.id === "champion_candidates").length,
      testId: "pov-champion-candidates",
      body: (
        <p className="pov-cc-supporting__empty">
          {String(contact.provider_champion_potential ?? "").trim() ||
            BRIEF.captureInfluencePaths}
        </p>
      ),
      action: null,
    },
    {
      id: "access_intelligence",
      label: accessView.title,
      count: accessView.capturedCount,
      testId: "pov-access-intelligence",
      body: (
        <ul className="pov-cc-supporting__list">
          {accessView.rows.map((row) => (
            <li key={row.id} className="pov-cc-supporting__row">
              {formatAccessRow(row)}
            </li>
          ))}
        </ul>
      ),
      action: null,
    },
  ];

  return (
    <section className="pov-cc-supporting pov-cc-supporting--light" data-testid="pov-supporting-stack">
      <div className="pov-cc-supporting__head">
        <p className="pov-cc-supporting__kicker">{BRIEF.referenceKicker}</p>
        <h2 className="pov-cc-supporting__title">{BRIEF.supplementaryBriefing}</h2>
      </div>
      <div className="pov-cc-supporting__accordions">
        {sections.map((section) => (
          <details key={section.id} className="pov-cc-supporting__item" data-testid={section.testId}>
            <summary className="pov-cc-supporting__summary">
              <span>
                {section.label} ({section.count})
              </span>
            </summary>
            <div className="pov-cc-supporting__body">
              {section.body}
              {section.action}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
