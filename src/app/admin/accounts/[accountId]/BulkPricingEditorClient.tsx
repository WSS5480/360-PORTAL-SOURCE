"use client";

import { useMemo, useState } from "react";
import BulkRuleRowsEditor, { type BulkRuleProductOption } from "@/components/admin/BulkRuleRowsEditor";
import { DEFAULT_BULK_PRICE_PER_SQCM } from "@/lib/bulkRules";
import {
  bulkRuleDraftsFromSaved,
  normalizeBulkRulesForSave,
  parseAllBulkRuleDrafts,
  type BulkRuleDraft,
} from "@/lib/bulkPricingRuleDraft";

export default function BulkPricingEditorClient(props: {
  accountId: string;
  initialEnabled: boolean;
  initialRules: Array<{ min_sqcm: number; price_per_sqcm: number; product_id?: string | null }>;
  products?: BulkRuleProductOption[];
}) {
  const [enabled, setEnabled] = useState(!!props.initialEnabled);
  const [rules, setRules] = useState<BulkRuleDraft[]>(() => bulkRuleDraftsFromSaved(props.initialRules || []));
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const parsedRules = useMemo(() => parseAllBulkRuleDrafts(rules), [rules]);
  const hasInvalid = parsedRules.some((r) => !r.valid);

  async function save(nextEnabled?: boolean) {
    setSaving(true);
    setOk(null);
    setErr(null);

    if (hasInvalid) {
      setErr("Each rule needs a valid min total sq cm and a positive base $/sq cm.");
      setSaving(false);
      return;
    }

    const cleaned = normalizeBulkRulesForSave(
      parsedRules
        .filter((r) => r.valid && r.min_sqcm !== null && r.price_per_sqcm !== null)
        .map((r) => ({
          min_sqcm: r.min_sqcm!,
          price_per_sqcm: r.price_per_sqcm!,
          product_id: r.product_id,
        }))
    );

    const res = await fetch(`/api/admin/accounts/${props.accountId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        bulk_enabled: typeof nextEnabled === "boolean" ? nextEnabled : enabled,
        bulk_rules: cleaned,
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      setErr(json?.error || `Update failed (${res.status})`);
      setSaving(false);
      return;
    }

    setOk("Saved.");
    setSaving(false);
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Bulk purchasing</div>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 900 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            const next = e.target.checked;
            setEnabled(next);
            if (!hasInvalid) {
              void save(next);
            } else {
              setErr("Fix invalid rule values before enabling bulk mode.");
            }
          }}
        />
        Allow bulk purchasing for this account
      </label>

      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Add sq cm thresholds and the <b>base price per sq cm</b> for each tier. Use <b>All products</b> for the
        account default, or scope a tier to one product. Typical account discount % does not apply to bulk-priced
        lines.
      </div>

      <BulkRuleRowsEditor
        rules={rules}
        setRules={setRules}
        products={props.products}
        emptyHint="No bulk rules yet."
        defaultPricePerSqcm={String(DEFAULT_BULK_PRICE_PER_SQCM)}
      />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => save()}
          disabled={saving || hasInvalid}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#111",
            color: "white",
            fontWeight: 900,
            cursor: saving || hasInvalid ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Save bulk rules"}
        </button>
        {hasInvalid ? <div style={{ fontSize: 12, color: "crimson", fontWeight: 900 }}>Fix invalid rule values.</div> : null}
      </div>

      {err ? <div style={{ color: "crimson", fontSize: 13, fontWeight: 900 }}>{err}</div> : null}
      {ok ? <div style={{ color: "green", fontSize: 13, fontWeight: 900 }}>{ok}</div> : null}
    </div>
  );
}
