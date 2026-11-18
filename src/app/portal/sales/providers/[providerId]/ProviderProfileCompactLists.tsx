"use client";

import Link from "next/link";
import { formatInitiativeStageLine } from "@/lib/sales/opportunityUiLabels";
import { formatOppMoney } from "./providerProfileTypes";
import { ProviderCaseTimelineList } from "./ProviderCaseTimelineList";

export function ProviderCompactCaseList({
  cases,
  empty,
  addCaseHref,
}: {
  cases: Record<string, unknown>[];
  empty: string;
  addCaseHref?: string;
  providerName?: string | null;
  providerSpecialty?: string | null;
}) {
  return <ProviderCaseTimelineList cases={cases} empty={empty} addCaseHref={addCaseHref} />;
}

export function ProviderCompactOppList({ opps, empty }: { opps: Record<string, unknown>[]; empty: string }) {
  if (opps.length === 0) {
    return <p className="provider-compact-empty">{empty}</p>;
  }
  return (
    <ul className="provider-compact-list">
      {opps.map((o) => {
        const id = String(o.id);
        return (
          <li key={id}>
            <Link href={`/portal/sales/opportunities/${encodeURIComponent(id)}`} className="provider-compact-row">
              <span className="provider-compact-row-main">
                <span className="provider-compact-row-title">{String(o.account_name || "Evaluation")}</span>
                <span className="provider-compact-row-sub">
                  {formatInitiativeStageLine(String(o.stage_label || o.stage || "")) ||
                    String(o.stage_label || o.stage || "")}
                  {o.value_cents ? ` · ${formatOppMoney(o.value_cents)}` : ""}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
