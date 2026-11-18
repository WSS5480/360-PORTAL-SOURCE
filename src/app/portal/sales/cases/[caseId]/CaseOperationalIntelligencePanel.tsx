"use client";

import Link from "next/link";
import type React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import { IntelligenceScopeBadge } from "@/components/sales/intelligenceCapture/IntelligenceScopeBadge";
import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { UPDATE_PROVIDER_INTELLIGENCE_ACTION_LABEL } from "@/lib/surgical-sales/providerIntelligencePromote";
import {
  OPEN_PROVIDER_INTELLIGENCE_LABEL,
  providerIntelligenceHref,
} from "@/lib/surgical-sales/preCallPlanFields";
import { caseOperationalIntelligenceCss } from "./caseOperationalIntelligenceCss";

function scopeForBadge(scope: "facility" | "provider" | "case"): IntelligenceScope {
  if (scope === "facility") return "organization";
  return scope;
}

function ContextBlock({
  title,
  inheritanceLine,
  items,
  empty,
}: {
  title: string;
  inheritanceLine?: string;
  items: CaseOperationalContextView["facility"]["items"];
  empty: string;
}) {
  return (
    <section className="case-ops-ctx-block">
      <header className="case-ops-ctx-block-head">
        <h4 className="case-ops-ctx-block-title">{title}</h4>
        {inheritanceLine ? <p className="case-ops-ctx-inherit">{inheritanceLine}</p> : null}
      </header>
      {items.length > 0 ? (
        <ul className="case-ops-ctx-list">
          {items.map((item) => (
            <li key={item.id} className="case-ops-ctx-line">
              <div className="case-ops-ctx-line-top">
                <span className="case-ops-ctx-label">{item.label}</span>
                <IntelligenceScopeBadge scope={scopeForBadge(item.scope)} compact />
                {item.inherited ? (
                  <span className="case-ops-ctx-inherited-tag">Inherited</span>
                ) : null}
              </div>
              <p className="case-ops-ctx-value">{item.value}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="case-ops-ctx-empty">{empty}</p>
      )}
    </section>
  );
}

export function CaseOperationalIntelligencePanel({
  context,
  providerId,
  providerName,
  caseId,
  caseNumber,
  hasLinkedProvider,
  intelligence,
  onPromote,
  promoteDisabled,
  onEditCaseLogistics,
  embedded = false,
}: {
  context: CaseOperationalContextView;
  providerId: string | null;
  providerName: string;
  caseId: string;
  caseNumber?: string;
  hasLinkedProvider: boolean;
  intelligence?: ProviderIntelligenceSnapshot | null;
  onPromote?: () => void;
  promoteDisabled?: boolean;
  onEditCaseLogistics?: () => void;
  embedded?: boolean;
}) {
  const planningHref =
    providerId && hasLinkedProvider
      ? providerIntelligenceHref(providerId, caseId, caseNumber)
      : null;

  return (
    <section
      className={`case-ops-intel${embedded ? " case-ops-intel--embedded" : ""}`}
      aria-labelledby="case-ops-intel-title"
    >
      <style dangerouslySetInnerHTML={{ __html: caseOperationalIntelligenceCss }} />

      <header className="case-ops-intel-head">
        <div>
          <h3 id="case-ops-intel-title" className="case-ops-intel-title">
            Case preparation intelligence
          </h3>
          <p className="case-ops-intel-lead">
            Facility and surgeon context flows into this case — use it for day-of execution, not a
            separate checklist.
          </p>
        </div>
        <span className={`case-ops-readiness-pill case-ops-readiness-pill--${context.readinessState}`}>
          {context.readinessLabel}
        </span>
      </header>

      <p className="case-ops-readiness-summary">{context.readinessSummary}</p>

      <div className="case-ops-readiness-grid" aria-label="Case readiness">
        {context.dimensions.map((dim) => (
          <div
            key={dim.id}
            className={`case-ops-readiness-dim case-ops-readiness-dim--${dim.status}`}
          >
            <div className="case-ops-readiness-dim-top">
              <span className="case-ops-readiness-dim-label">{dim.label}</span>
              <IntelligenceScopeBadge scope={scopeForBadge(dim.scope)} compact />
            </div>
            <span className="case-ops-readiness-dim-state">{dim.statusLabel}</span>
            <p className="case-ops-readiness-dim-line">{dim.line}</p>
          </div>
        ))}
      </div>

      <div className="case-ops-ctx-sections">
        <ContextBlock
          title={context.facility.title}
          inheritanceLine={context.facility.inheritanceLine}
          items={context.facility.items}
          empty="Facility tray, access, and logistics still open — capture on the facility intelligence profile."
        />
        <ContextBlock
          title={context.provider.title}
          items={context.provider.items}
          empty={
            hasLinkedProvider
              ? "Provider preferences still open — enrich surgeon profile before case day."
              : "Link a surgeon to inherit preferences and support expectations."
          }
        />
        <ContextBlock
          title={context.caseDay.title}
          items={context.caseDay.items}
          empty="Confirm implants, trays, room, and support for this case day."
        />
      </div>

      {context.priorCaseIssues ? (
        <div className="case-ops-prior">
          <span className="case-ops-prior-kicker">Prior case signal</span>
          <p className="case-ops-prior-text">{context.priorCaseIssues}</p>
        </div>
      ) : null}

      <div className="case-ops-intel-actions">
        {onEditCaseLogistics ? (
          <button type="button" data-surgical-press style={sc.btnSecondary} onClick={onEditCaseLogistics}>
            Update case logistics
          </button>
        ) : null}
        {planningHref ? (
          <Link href={planningHref} data-surgical-press style={{ ...sc.btnPrimary, textDecoration: "none" }}>
            {OPEN_PROVIDER_INTELLIGENCE_LABEL}
          </Link>
        ) : null}
        {onPromote && hasLinkedProvider ? (
          <button
            type="button"
            data-surgical-press
            style={sc.btnSecondary}
            disabled={promoteDisabled}
            onClick={onPromote}
          >
            {UPDATE_PROVIDER_INTELLIGENCE_ACTION_LABEL}
          </button>
        ) : null}
      </div>

      {hasLinkedProvider && intelligence?.last_updated_at ? (
        <p className="case-ops-intel-foot">
          Provider profile · {providerName} · last updated{" "}
          {new Date(intelligence.last_updated_at).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      ) : null}
    </section>
  );
}
