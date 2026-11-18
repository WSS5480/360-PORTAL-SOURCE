"use client";

import Link from "next/link";
import React from "react";
import { SalesPanel, sc } from "@/components/sales/salesCommandUi";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { buildCreateOpportunityHref } from "@/lib/surgical-sales/providerNextStepLinks";
import type {
  LinkedCaseSummary,
  LinkedEngagementSummary,
  LinkedOpportunitySummary,
} from "@/lib/surgical-sales/opportunityRelationships";
import { formatSurgicalCaseStatus } from "@/lib/surgical-sales/labels";

const inputStyle = { ...sc.input, minHeight: 36, fontSize: 13 };

type LinkOption = { id: string; label: string };

export function LinkedEngagementsPanel({
  opportunityId,
  engagements,
  linkOptions,
  onLink,
  onUnlink,
  busy,
}: {
  opportunityId: string;
  engagements: LinkedEngagementSummary[];
  linkOptions: LinkOption[];
  onLink: (engagementId: string) => Promise<void>;
  onUnlink: (engagementId: string) => Promise<void>;
  busy?: boolean;
}) {
  const [selected, setSelected] = React.useState("");

  return (
    <SalesPanel title="Linked engagements" density="compact" description="Engagements tied to this evaluation.">
      {engagements.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>No linked engagements yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {engagements.map((e) => (
            <div
              key={e.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "flex-start",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
                background: "color-mix(in srgb, var(--surface-2) 50%, var(--surface))",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Link href={`/portal/sales/engagements/${encodeURIComponent(e.id)}`} style={{ ...sc.linkBrandAction, fontWeight: 800, fontSize: 13 }}>
                  {e.title || e.engagement_type_label}
                </Link>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  {e.engagement_type_label} · {e.status_label}
                  {e.engagement_date ? ` · ${e.engagement_date}` : ""}
                  {e.organization_name ? ` · ${e.organization_name}` : ""}
                </div>
              </div>
              <button type="button" style={{ ...sc.btnGhost, fontSize: 11, padding: "4px 8px" }} disabled={busy} onClick={() => void onUnlink(e.id)}>
                Unlink
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
        <select value={selected} onChange={(ev) => setSelected(ev.target.value)} style={{ ...inputStyle, minWidth: 200, flex: "1 1 180px" }} disabled={busy}>
          <option value="">Link existing engagement…</option>
          {linkOptions
            .filter((o) => !engagements.some((e) => e.id === o.id))
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
        </select>
        <button
          type="button"
          style={sc.btnSecondary}
          disabled={!selected || busy}
          onClick={() => {
            const id = selected;
            setSelected("");
            void onLink(id);
          }}
        >
          Link engagement
        </button>
        <Link href={`/portal/sales/engagements/new?opportunity_id=${encodeURIComponent(opportunityId)}`} style={{ ...sc.linkBrandAction, fontSize: 12 }}>
          New engagement →
        </Link>
      </div>
    </SalesPanel>
  );
}

export function LinkedCasesPanel({
  opportunityId,
  accountId,
  cases,
  linkOptions,
  onLink,
  onUnlink,
  busy,
}: {
  opportunityId: string;
  accountId?: string | null;
  cases: LinkedCaseSummary[];
  linkOptions: LinkOption[];
  onLink: (caseId: string) => Promise<void>;
  onUnlink: (caseId: string) => Promise<void>;
  busy?: boolean;
}) {
  const [selected, setSelected] = React.useState("");

  return (
    <SalesPanel title="Linked cases" density="compact" description="Surgical cases explicitly linked to this opportunity.">
      {cases.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
          No linked cases yet.{" "}
          {accountId ? (
            <Link href={`/portal/sales/cases/new?account_id=${encodeURIComponent(accountId)}&opportunity_id=${encodeURIComponent(opportunityId)}`} style={sc.linkBrand}>
              Create case →
            </Link>
          ) : null}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {cases.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "flex-start",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Link href={`/portal/sales/cases/${encodeURIComponent(c.id)}`} style={{ ...sc.linkBrandAction, fontWeight: 800, fontSize: 13 }}>
                  Case {c.case_number}
                </Link>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  {formatSurgicalCaseStatus(c.status)}
                  {c.case_date ? ` · ${c.case_date}` : ""}
                  {c.procedure_type ? ` · ${c.procedure_type}` : ""}
                </div>
              </div>
              <button type="button" style={{ ...sc.btnGhost, fontSize: 11, padding: "4px 8px" }} disabled={busy} onClick={() => void onUnlink(c.id)}>
                Unlink
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
        <select value={selected} onChange={(ev) => setSelected(ev.target.value)} style={{ ...inputStyle, minWidth: 200, flex: "1 1 180px" }} disabled={busy}>
          <option value="">Link existing case…</option>
          {linkOptions
            .filter((o) => !cases.some((c) => c.id === o.id))
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
        </select>
        <button
          type="button"
          style={sc.btnSecondary}
          disabled={!selected || busy}
          onClick={() => {
            const id = selected;
            setSelected("");
            void onLink(id);
          }}
        >
          Link case
        </button>
      </div>
    </SalesPanel>
  );
}

export function LinkedOpportunityPanel({
  opportunity,
  createHref,
  linkOptions,
  onLink,
  onUnlink,
  busy,
  compact,
}: {
  opportunity: LinkedOpportunitySummary | null;
  createHref?: string;
  linkOptions?: LinkOption[];
  onLink?: (opportunityId: string) => Promise<void>;
  onUnlink?: () => Promise<void>;
  busy?: boolean;
  compact?: boolean;
}) {
  const [selected, setSelected] = React.useState("");

  const body = opportunity ? (
    <div
      style={{
        padding: compact ? "10px 12px" : "12px 14px",
        borderRadius: 10,
        border: "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
        background: "color-mix(in srgb, var(--brand-600) 4%, var(--surface))",
      }}
    >
      <Link href={`/portal/sales/opportunities/${encodeURIComponent(opportunity.id)}`} style={{ ...sc.linkBrandAction, fontWeight: 800, fontSize: 14 }}>
        {opportunity.account_name}
      </Link>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
        {opportunity.stage_label}
        {opportunity.physician_name ? ` · ${opportunity.physician_name}` : ""}
        {opportunity.product_display || opportunity.product_line ? ` · ${opportunity.product_display || opportunity.product_line}` : ""}
      </div>
      {onUnlink ? (
        <button type="button" style={{ ...sc.btnGhost, marginTop: 8, fontSize: 11, padding: "4px 8px" }} disabled={busy} onClick={() => void onUnlink()}>
          Unlink
        </button>
      ) : null}
    </div>
  ) : (
    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>No related evaluation.</p>
  );

  if (compact) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        {body}
        {!opportunity && createHref ? (
          <Link href={createHref} style={sc.linkBrandAction}>
            {OPPORTUNITY_UI.createFromProvider}
          </Link>
        ) : null}
        {!opportunity && linkOptions && linkOptions.length > 0 && onLink ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ ...inputStyle, flex: "1 1 160px" }} disabled={busy}>
              <option value="">Link opportunity…</option>
              {linkOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={sc.btnSecondary}
              disabled={!selected || busy}
              onClick={() => {
                const id = selected;
                setSelected("");
                void onLink(id);
              }}
            >
              Link
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <SalesPanel title={OPPORTUNITY_UI.linkedFieldLabel} density="compact" description={OPPORTUNITY_UI.detailSubtitle}>
      {body}
      {!opportunity && createHref ? (
        <div style={{ marginTop: 10 }}>
          <Link href={createHref} style={sc.linkBrandAction}>
            {OPPORTUNITY_UI.createFromProvider}
          </Link>
        </div>
      ) : null}
      {!opportunity && linkOptions && linkOptions.length > 0 && onLink ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ ...inputStyle, minWidth: 200, flex: "1 1 180px" }} disabled={busy}>
            <option value="">Link existing opportunity…</option>
            {linkOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            style={sc.btnSecondary}
            disabled={!selected || busy}
            onClick={() => {
              const id = selected;
              setSelected("");
              void onLink(id);
            }}
          >
            Link opportunity
          </button>
        </div>
      ) : null}
    </SalesPanel>
  );
}

export function AdoptionInitiativesListPanel({
  title,
  opportunities,
  emptyMessage,
  createHref,
}: {
  title?: string;
  opportunities: LinkedOpportunitySummary[];
  emptyMessage?: string;
  createHref?: string;
}) {
  return (
    <SalesPanel
      title={title || "Opportunities"}
      density="compact"
      description="Product opportunities for this record."
    >
      {opportunities.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
          {emptyMessage || OPPORTUNITY_UI.emptyLinked}
          {createHref ? (
            <>
              {" "}
              <Link href={createHref} style={sc.linkBrand}>
                {OPPORTUNITY_UI.createButton}
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {opportunities.map((o) => (
            <Link
              key={o.id}
              href={`/portal/sales/opportunities/${encodeURIComponent(o.id)}`}
              style={{
                display: "block",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>{o.account_name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                {o.stage_label}
                {o.physician_name ? ` · ${o.physician_name}` : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </SalesPanel>
  );
}

export function buildCreateHrefForCase(caseRow: {
  id?: string;
  account_id?: string | null;
  surgeon_contact_id?: string | null;
}) {
  return buildCreateOpportunityHref({
    caseId: caseRow.id ? String(caseRow.id) : undefined,
    accountId: caseRow.account_id ? String(caseRow.account_id) : undefined,
    providerId: caseRow.surgeon_contact_id ? String(caseRow.surgeon_contact_id) : undefined,
  });
}
