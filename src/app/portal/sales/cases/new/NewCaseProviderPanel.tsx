"use client";

import Link from "next/link";
import { formatNewCaseLinkedInitiativesHeading, OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import { ProviderPlanningStatusSummary } from "@/components/sales/ProviderPlanningStatusSummary";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  buildProviderIntelligenceInsightCards,
  formatRepIntelligenceFieldValue,
} from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { ProviderIntelligencePreviewForRep } from "./ProviderIntelligencePreviewForRep";
import { NewCaseCollapsibleSection } from "./NewCaseCollapsibleSection";

export type ProviderOrgLinkRow = {
  account_id?: string | null;
  is_primary_org?: boolean | null;
  specialty?: string | null;
  preferred_hospital?: string | null;
  accounts?: { id?: string; name?: string | null } | null;
};

export type NewCaseProviderContext = {
  provider: Record<string, unknown>;
  specialty: string | null;
  primary_organization: { id: string; name: string | null; territory: string | null };
  organization_links: ProviderOrgLinkRow[];
  planning_completion: ProviderPlanningCompletion;
  priorCaseProcedureTypes?: string[];
  opportunities: Array<{
    id: string;
    account_id?: string | null;
    account_name?: string | null;
    physician_name?: string | null;
    product_display?: string | null;
    product_line?: string | null;
  }>;
};

export type ProviderPickOption = {
  id: string;
  label: string;
  subtitle?: string;
};

const INCOMPLETE_PLANNING_WARNING =
  "Provider planning is still developing. You can create the case now — more context improves observation support.";

const providerContextCardCss = `
.new-case-provider-context{display:grid;gap:4px;padding:5px 0 6px;border-radius:0;border:0;border-bottom:1px solid color-mix(in srgb,var(--foreground) 5%,var(--border));background:transparent}
.new-case-provider-context-head{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:18px}
.new-case-provider-context-kicker{margin:0;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);line-height:1.2}
.new-case-provider-context-badge{display:inline-flex;align-items:center;flex-shrink:0;border-radius:999px;padding:1px 7px;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--brand-700);border:1px solid color-mix(in srgb,var(--brand-600) 28%,var(--border));background:color-mix(in srgb,var(--brand-600) 8%,var(--surface))}
.new-case-provider-context-body{display:grid;gap:2px;min-height:0}
.new-case-provider-context-name{margin:0;font-size:13px;font-weight:850;line-height:1.25;color:var(--foreground)}
.new-case-provider-context-meta{margin:0;font-size:11px;line-height:1.35;color:color-mix(in srgb,var(--foreground) 72%,var(--muted))}
.new-case-provider-context-skeleton{display:grid;gap:4px;padding:1px 0 2px}
.new-case-provider-context-skeleton span{display:block;height:9px;border-radius:4px;background:color-mix(in srgb,var(--foreground) 7%,var(--border))}
.new-case-provider-context-skeleton span:first-child{width:42%;height:11px}
.new-case-provider-context-skeleton span:nth-child(2){width:68%}
.new-case-provider-context-skeleton span:nth-child(3){width:52%}
.new-case-provider-context-foot{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;padding-top:1px}
.new-case-provider-context-actions{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px 6px}
.new-case-provider-context-action{font-size:11px;font-weight:750;color:var(--brand-700);text-decoration:none;background:transparent;border:0;padding:0;cursor:pointer;font-family:inherit;line-height:1.3}
.new-case-provider-context-action:hover{text-decoration:underline}
.new-case-provider-context-sep{color:color-mix(in srgb,var(--foreground) 22%,var(--muted));font-size:10px;user-select:none}
.new-case-provider-context-switch{font-size:10px;font-weight:700;color:var(--muted);background:transparent;border:0;padding:0;cursor:pointer;font-family:inherit;line-height:1.3}
.new-case-provider-context-switch:hover{color:var(--brand-700);text-decoration:underline}
@media (max-width:480px){
  .new-case-provider-context{padding:6px 7px;gap:4px}
  .new-case-provider-context-foot{flex-direction:column;align-items:flex-start;gap:4px}
}`;

function providerProcedureFocusLabel(ctx: NewCaseProviderContext | null): string | null {
  if (!ctx) return null;
  const focus = formatRepIntelligenceFieldValue(
    "provider_procedure_focus",
    (ctx.provider as { provider_procedure_focus?: string | null }).provider_procedure_focus,
  );
  if (focus) return focus;
  const specialty = String(ctx.specialty || "").trim();
  return specialty || null;
}

function ProviderContextSkeleton() {
  return (
    <div className="new-case-provider-context-skeleton" aria-hidden>
      <span />
      <span />
      <span />
    </div>
  );
}

export function NewCaseProviderContextCard({
  surgeonId,
  providerContext,
  providerContextBusy,
  onChangeProvider,
  onAddDifferentProvider,
  /** When the org/facility field appears below, avoid repeating it in this summary. */
  suppressOrganizationLine = false,
}: {
  surgeonId: string;
  providerContext: NewCaseProviderContext | null;
  providerContextBusy: boolean;
  onChangeProvider: () => void;
  onAddDifferentProvider: () => void;
  suppressOrganizationLine?: boolean;
}) {
  const profileHref = `/portal/sales/providers/${encodeURIComponent(surgeonId)}`;
  const providerName = providerContext ? contactDisplayName(providerContext.provider as never) : "";
  const organizationName = String(providerContext?.primary_organization?.name || "").trim();
  const procedureFocus = providerProcedureFocusLabel(providerContext);
  const focusLine = [procedureFocus, !suppressOrganizationLine && organizationName ? organizationName : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      className="new-case-provider-context"
      aria-labelledby="new-case-provider-context-title"
      aria-busy={providerContextBusy}
    >
      <style dangerouslySetInnerHTML={{ __html: providerContextCardCss }} />
      <div className="new-case-provider-context-head">
        <h2 id="new-case-provider-context-title" className="new-case-provider-context-kicker">
          Provider Context
        </h2>
        <span className="new-case-provider-context-badge">Preselected</span>
      </div>

      {providerContextBusy ? (
        <ProviderContextSkeleton />
      ) : providerContext ? (
        <div className="new-case-provider-context-body">
          <p className="new-case-provider-context-name">{providerName}</p>
          {focusLine ? <p className="new-case-provider-context-meta">{focusLine}</p> : null}
        </div>
      ) : (
        <p className="new-case-provider-context-meta">Could not load provider profile.</p>
      )}

      <div className="new-case-provider-context-foot">
        <div className="new-case-provider-context-actions">
          <Link href={profileHref} className="new-case-provider-context-action">
            Open profile
          </Link>
          <span className="new-case-provider-context-sep" aria-hidden>
            ·
          </span>
          <button type="button" className="new-case-provider-context-action" onClick={onChangeProvider}>
            Change
          </button>
        </div>
        <button
          type="button"
          className="new-case-provider-context-switch"
          onClick={onAddDifferentProvider}
        >
          + Switch provider
        </button>
      </div>
    </section>
  );
}

function orgLinkAccountId(link: ProviderOrgLinkRow): string {
  return String(link.account_id || link.accounts?.id || "").trim();
}

function orgLinkAccountName(link: ProviderOrgLinkRow): string {
  return String(link.accounts?.name || "").trim();
}

function IntelligencePreview({
  contact,
  providerId,
  planning,
}: {
  contact: Record<string, unknown>;
  providerId: string;
  planning: ProviderPlanningCompletion | null;
}) {
  const hasPreview = React.useMemo(
    () => buildProviderIntelligenceInsightCards(contact, { planning }).hasContent,
    [contact, planning],
  );

  if (!hasPreview) {
    return (
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
        No procedural or product intelligence documented yet.{" "}
        <Link href={`/portal/sales/providers/${encodeURIComponent(providerId)}`} style={sc.linkBrand}>
          Open provider profile
        </Link>
      </p>
    );
  }

  return <ProviderIntelligencePreviewForRep contact={contact} planning={planning} />;
}

export function NewCaseProviderPanel({
  surgeonId,
  providerSearchQuery,
  onProviderSearchQueryChange,
  providerPickOptions,
  providerSearchBusy,
  onProviderChange,
  providerContext,
  providerContextBusy,
  createProviderHref,
  hideIntelligencePreview = false,
}: {
  surgeonId: string;
  providerSearchQuery: string;
  onProviderSearchQueryChange: (q: string) => void;
  providerPickOptions: ProviderPickOption[];
  providerSearchBusy: boolean;
  onProviderChange: (id: string) => void;
  providerContext: NewCaseProviderContext | null;
  providerContextBusy: boolean;
  createProviderHref: string;
  /** Hide compact intelligence preview when a full snapshot is shown elsewhere. */
  hideIntelligencePreview?: boolean;
}) {
  const planning = providerContext?.planning_completion ?? null;
  const showIncompleteWarning = planning != null && planning.status !== "complete";

  return (
    <section className="new-case-section">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div>
          <h3 className="new-case-title">Provider / surgeon</h3>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)", lineHeight: 1.4, maxWidth: 520 }}>
            {OPPORTUNITY_UI.newCaseProviderPanelIntro}
          </p>
        </div>
        <Link href={createProviderHref} className="new-case-provider-context-action" style={{ whiteSpace: "nowrap" }}>
          + Create new provider
        </Link>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 12 }}>Search providers</span>
        <input
          value={providerSearchQuery}
          onChange={(e) => onProviderSearchQueryChange(e.target.value)}
          placeholder="Name, organization, specialty…"
          style={sc.input}
          autoComplete="off"
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 12 }}>
          Provider <span style={{ color: "var(--brand-600)" }}>*</span>
        </span>
        <select
          required
          value={surgeonId}
          onChange={(e) => onProviderChange(e.target.value)}
          style={sc.input}
        >
          <option value="">{providerSearchBusy ? "Loading providers…" : "Select provider…"}</option>
          {providerPickOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.subtitle ? `${p.label} · ${p.subtitle}` : p.label}
            </option>
          ))}
        </select>
        {providerSearchBusy && providerPickOptions.length === 0 ? (
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Searching provider directory…</span>
        ) : null}
      </label>

      {surgeonId ? (
        <div
          style={{
            display: "grid",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
            background: "color-mix(in srgb, var(--foreground) 2%, var(--surface))",
          }}
        >
          {providerContextBusy ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Loading provider profile…</p>
          ) : providerContext ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>
                  {contactDisplayName(providerContext.provider as never)}
                  {providerContext.specialty ? (
                    <span style={{ fontWeight: 600, color: "var(--muted)", marginLeft: 6 }}>· {providerContext.specialty}</span>
                  ) : null}
                </div>
                <Link
                  href={`/portal/sales/providers/${encodeURIComponent(surgeonId)}`}
                  style={{ ...sc.linkBrand, fontSize: 12, fontWeight: 800 }}
                >
                  Open profile
                </Link>
              </div>

              {planning ? <ProviderPlanningStatusSummary planning={planning} compact /> : null}

              {showIncompleteWarning ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.45,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid color-mix(in srgb, #f59e0b 35%, var(--border))",
                    background: "color-mix(in srgb, #f59e0b 10%, var(--surface))",
                    color: "#92400e",
                  }}
                >
                  {INCOMPLETE_PLANNING_WARNING}{" "}
                  <Link
                    href={`/portal/sales/providers/${encodeURIComponent(surgeonId)}?tab=intelligence`}
                    style={{ ...sc.linkBrand, fontWeight: 800 }}
                  >
                    Complete provider planning
                  </Link>
                </p>
              ) : null}

              {providerContext.organization_links.length > 0 ? (
                <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 800, color: "var(--muted)", fontSize: 11 }}>Linked organizations / facilities</span>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                    {providerContext.organization_links.map((link) => {
                      const aid = orgLinkAccountId(link);
                      const name = orgLinkAccountName(link) || aid;
                      if (!aid) return null;
                      return (
                        <li key={aid}>
                          {name}
                          {link.is_primary_org ? " (primary)" : ""}
                          {link.preferred_hospital ? ` · ${link.preferred_hospital}` : ""}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : providerContext.primary_organization?.name ? (
                <p style={{ margin: 0, fontSize: 12 }}>
                  <span style={{ fontWeight: 800, color: "var(--muted)", fontSize: 11 }}>Primary organization: </span>
                  {providerContext.primary_organization.name}
                </p>
              ) : null}

              {!hideIntelligencePreview ? (
                <NewCaseCollapsibleSection title="Provider intelligence" hint="Signals from profile">
                  <IntelligencePreview
                    contact={providerContext.provider}
                    providerId={surgeonId}
                    planning={planning}
                  />
                </NewCaseCollapsibleSection>
              ) : (
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.35 }}>
                  Provider intelligence is on the provider profile.
                </p>
              )}

              <NewCaseCollapsibleSection
                title={formatNewCaseLinkedInitiativesHeading(providerContext.opportunities.length)}
                hint={providerContext.opportunities.length > 0 ? "View on file" : "None linked"}
              >
                {providerContext.opportunities.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.4 }}>
                    {providerContext.opportunities.slice(0, 5).map((o) => (
                      <li key={o.id}>
                        {String(o.account_name || "Organization").trim()} —{" "}
                        {String(o.product_display || o.product_line || OPPORTUNITY_UI.fallbackRecordLabel).trim()}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{OPPORTUNITY_UI.providerTabEmpty}</p>
                )}
              </NewCaseCollapsibleSection>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Could not load provider profile.</p>
          )}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
          Select an existing provider or{" "}
          <Link href={createProviderHref} style={sc.linkBrand}>
            create a new provider
          </Link>{" "}
          to continue.
        </p>
      )}
    </section>
  );
}
