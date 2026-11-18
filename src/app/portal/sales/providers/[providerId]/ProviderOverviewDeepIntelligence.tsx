"use client";

import Link from "next/link";
import type { ProviderOverviewOperationalMemory } from "@/lib/surgical-sales/buildProviderOverviewOperationalMemory";
import type { ProviderIntelligenceScopeDisplay } from "@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay";
import { PROVIDER_FIELD_OPS_CTA, PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import { ProviderIntelligenceScopeSplit } from "./ProviderIntelligenceScopeSplit";

export function ProviderOverviewDeepIntelligence({
  contact,
  display,
  organizationName,
  providerName,
  organizationBaseline,
  maxBulletsPerPanel,
  memory,
  intelligenceHref,
  onEditFacilityField,
  onEditProviderField,
}: {
  contact: Record<string, unknown>;
  display: ProviderIntelligenceScopeDisplay;
  organizationName?: string | null;
  providerName?: string | null;
  organizationBaseline?: import("@/lib/surgical-sales/loadOrganizationIntelligenceBaseline").OrganizationIntelligenceBaseline | null;
  maxBulletsPerPanel?: number;
  memory: ProviderOverviewOperationalMemory;
  intelligenceHref: string;
  onEditFacilityField?: (dbKey: string) => void;
  onEditProviderField?: (dbKey: string) => void;
}) {
  const hasMemory = memory.lines.length > 0;

  return (
    <details className="pov-deep-intel">
      <summary className="pov-deep-intel-summary">
        <span className="pov-deep-intel-summary-title">
          {PROVIDER_FIELD_OPS_SECTION.deepOperationalIntelligence}
        </span>
        <span className="pov-deep-intel-summary-hint">Facility · provider · field memory</span>
      </summary>

      <div className="pov-deep-intel-body">
        {hasMemory ? (
          <div className="pov-deep-intel-memory" aria-label={PROVIDER_FIELD_OPS_SECTION.operationalMemory}>
            <ul className="pov-deep-intel-memory-list">
              {memory.lines.map((row) => (
                <li key={row.id} className={`pov-deep-intel-memory-item pov-deep-intel-memory-item--${row.tone}`}>
                  <span className="pov-deep-intel-memory-kicker">{row.kicker}</span>
                  <span className="pov-deep-intel-memory-line">{row.line}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ProviderIntelligenceScopeSplit
          contact={contact}
          display={display}
          organizationName={organizationName}
          providerName={providerName}
          organizationBaseline={organizationBaseline}
          maxBulletsPerPanel={maxBulletsPerPanel}
          className="pov-deep-intel-scope"
          onEditFacilityField={onEditFacilityField}
          onEditProviderField={onEditProviderField}
        />

        <footer className="pov-deep-intel-foot">
          <Link href={intelligenceHref} className="pov-deep-intel-link">
            {PROVIDER_FIELD_OPS_CTA.viewOperationalIntelligence}
          </Link>
        </footer>
      </div>
    </details>
  );
}
