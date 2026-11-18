"use client";

import { useMemo, useState } from "react";
import BulkRuleRowsEditor, { type BulkRuleProductOption } from "@/components/admin/BulkRuleRowsEditor";
import { DEFAULT_BULK_PRICE_PER_SQCM } from "@/lib/bulkRules";
import {
  normalizeBulkRulesForSave,
  parseAllBulkRuleDrafts,
  type BulkRuleDraft,
} from "@/lib/bulkPricingRuleDraft";

function clampPercent(n: number) {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

export default function NewAccountClient(props: { products: BulkRuleProductOption[] }) {
  const [name, setName] = useState("");
  const [discountPercentRaw, setDiscountPercentRaw] = useState("40");
  const [termsDaysRaw, setTermsDaysRaw] = useState("30");
  const [allowBulk, setAllowBulk] = useState(false);
  const [allowVirtualWarehouse, setAllowVirtualWarehouse] = useState(false);
  const [rules, setRules] = useState<BulkRuleDraft[]>([]);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const discountPercent = useMemo(() => {
    const raw = discountPercentRaw.trim();
    if (!raw) return 0;
    return clampPercent(Number(raw));
  }, [discountPercentRaw]);

  const discountPercentIsValid = useMemo(() => {
    const raw = discountPercentRaw.trim();
    if (!raw) return true;
    const n = Number(raw);
    return Number.isFinite(n);
  }, [discountPercentRaw]);

  const parsedRules = useMemo(() => parseAllBulkRuleDrafts(rules), [rules]);

  const hasInvalidRules = parsedRules.some((r) => !r.valid);
  const bulkRulesValid = !allowBulk || (allowBulk && rules.length > 0 && !hasInvalidRules);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);

    if (!discountPercentIsValid) {
      setError("Discount percent must be a number between 0 and 100.");
      return;
    }

    if (!bulkRulesValid) {
      setError(
        allowBulk
          ? "Add at least one valid bulk rule (min total sq cm and base $/sq cm)."
          : "Fix invalid bulk rule values."
      );
      return;
    }

    const termsDays = Number(termsDaysRaw.trim() || "30");
    const bulk_rules =
      allowBulk && !hasInvalidRules
        ? normalizeBulkRulesForSave(
            parsedRules
              .filter((r) => r.valid && r.min_sqcm !== null && r.price_per_sqcm !== null)
              .map((r) => ({
                min_sqcm: r.min_sqcm!,
                price_per_sqcm: r.price_per_sqcm!,
                product_id: r.product_id,
              }))
          )
        : [];

    const res = await fetch("/api/admin/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        discount_percent: discountPercent,
        payment_terms_days: Number.isFinite(termsDays) ? termsDays : 30,
        payment_terms_label: `Net ${Number.isFinite(termsDays) ? termsDays : 30} (after delivery)`,
        bulk_enabled: allowBulk,
        bulk_rules,
        virtual_warehouse_enabled: allowVirtualWarehouse,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setError(json?.error || "Failed to create account");
      return;
    }

    const accountId = json?.account?.id;
    if (!accountId) {
      setError("Account created but server did not return an id.");
      return;
    }

    setStatus(`Created account: ${json.account.name}`);
    window.location.href = `/admin/accounts/${accountId}`;
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Create Account</h1>

      <form onSubmit={onCreate} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, opacity: 0.8 }}>Account name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 12,
              border: "1px solid #ddd",
              borderRadius: 8,
              marginTop: 6,
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, opacity: 0.8 }}>Discount percent (0–100)</label>
          <input
            value={discountPercentRaw}
            onChange={(e) => setDiscountPercentRaw(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            style={{
              width: "100%",
              padding: 12,
              border: discountPercentIsValid ? "1px solid #ddd" : "1px solid rgba(220,0,0,0.45)",
              borderRadius: 8,
              marginTop: 6,
            }}
          />
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
            Effective value: <span style={{ fontWeight: 900 }}>{discountPercent}%</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
            Default is 40%. Payment terms default to Net 30 (after delivery).
          </div>
          {!discountPercentIsValid ? (
            <div style={{ marginTop: 6, fontSize: 12, color: "crimson", fontWeight: 900 }}>
              Please enter a valid number.
            </div>
          ) : null}
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, opacity: 0.8 }}>Payment terms (days after delivery)</label>
          <input
            value={termsDaysRaw}
            onChange={(e) => setTermsDaysRaw(e.target.value)}
            inputMode="numeric"
            placeholder="30"
            style={{
              width: "100%",
              padding: 12,
              border: "1px solid #ddd",
              borderRadius: 8,
              marginTop: 6,
            }}
          />
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
            Label will be saved as <b>Net {termsDaysRaw || "30"} (after delivery)</b>.
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="allow-bulk"
              checked={allowBulk}
              onChange={(e) => setAllowBulk(e.target.checked)}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="allow-bulk" style={{ fontSize: 14, cursor: "pointer" }}>
              Allow bulk purchasing
            </label>
          </div>

          {allowBulk ? (
            <>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Add sq cm thresholds and $/sq cm. Use <b>All products</b> or scope a tier to one product.
              </div>
              <BulkRuleRowsEditor
                rules={rules}
                setRules={setRules}
                products={props.products}
                emptyHint="No bulk rules yet. Add at least one to enable bulk purchasing."
                defaultPricePerSqcm={String(DEFAULT_BULK_PRICE_PER_SQCM)}
              />
              {hasInvalidRules ? (
                <div style={{ fontSize: 12, color: "crimson", fontWeight: 900 }}>
                  Each rule needs a valid min total sq cm (≥0) and a positive base $/sq cm.
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            id="allow-vw"
            checked={allowVirtualWarehouse}
            onChange={(e) => setAllowVirtualWarehouse(e.target.checked)}
            style={{ width: 18, height: 18, cursor: "pointer" }}
          />
          <label htmlFor="allow-vw" style={{ fontSize: 14, cursor: "pointer" }}>
            Enable virtual warehouse
          </label>
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Lets customers on bulk orders store paid units in a virtual balance and request shipment later without a new
          product invoice.
        </div>

        <button
          type="submit"
          disabled={!discountPercentIsValid || !bulkRulesValid}
          style={{
            padding: 12,
            borderRadius: 8,
            border: 0,
            cursor: discountPercentIsValid ? "pointer" : "not-allowed",
          }}
        >
          Create
        </button>

        {status && <div>{status}</div>}
        {error && <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{error}</div>}
      </form>
    </div>
  );
}
