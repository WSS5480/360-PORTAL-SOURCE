"use client";

import Link from "next/link";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { formatSurgicalCaseStatus } from "@/lib/surgical-sales/labels";
import { formatOppMoney } from "./providerProfileTypes";

export function ProviderCaseList({ cases, empty }: { cases: Record<string, unknown>[]; empty: string }) {
  if (cases.length === 0) return <div style={{ color: "var(--muted)", fontSize: 13 }}>{empty}</div>;
  return (
    <>
      {cases.map((c) => {
        const id = String(c.id);
        const date = c.case_date ? new Date(String(c.case_date)).toLocaleDateString() : "—";
        return (
          <Link key={id} href={`/portal/sales/cases/${encodeURIComponent(id)}`} className="provider-profile-row-link">
            <div style={{ fontWeight: 800 }}>{String(c.case_number || "Case")}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {date}
              {c.procedure_type ? ` · ${String(c.procedure_type)}` : ""}
              {c.status ? ` · ${formatSurgicalCaseStatus(String(c.status))}` : ""}
            </div>
          </Link>
        );
      })}
    </>
  );
}

export function ProviderOppList({ opps, empty }: { opps: Record<string, unknown>[]; empty: string }) {
  if (opps.length === 0) return <div style={{ color: "var(--muted)", fontSize: 13 }}>{empty}</div>;
  return (
    <>
      {opps.map((o) => {
        const id = String(o.id);
        return (
          <Link key={id} href={`/portal/sales/opportunities/${encodeURIComponent(id)}`} className="provider-profile-row-link">
            <div style={{ fontWeight: 800 }}>{String(o.account_name || OPPORTUNITY_UI.fallbackRecordLabel)}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {String(o.stage_label || o.stage || "")}
              {o.value_cents ? ` · ${formatOppMoney(o.value_cents)}` : ""}
            </div>
          </Link>
        );
      })}
    </>
  );
}
