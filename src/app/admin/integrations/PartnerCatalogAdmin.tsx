"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const card: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 16,
  background: "white",
  padding: 16,
  display: "grid",
  gap: 12,
};

const input: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.16)",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 14,
};

const button: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.14)",
  borderRadius: 10,
  background: "white",
  padding: "8px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

async function postJson(url: string, method: "POST" | "PATCH", body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

export type PartnerPolicy = {
  id: string;
  auto_create_accounts: boolean;
  allow_direct_sku_match: boolean;
  approved_discount_percent: number | null;
  approved_payment_terms_days: number | null;
  approved_payment_terms_label: string | null;
};

export function AccountPolicyForm({ partner }: { partner: PartnerPolicy }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <section style={card}>
      <div style={{ fontWeight: 900 }}>Approved account policy</div>
      <div style={{ fontSize: 13, opacity: 0.75 }}>
        Automatic account creation uses this discount and these payment terms. It does not change accounts that are already mapped, and it does not create portal logins.
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setPending(true);
          const form = event.currentTarget;
          const discountRaw = String(new FormData(form).get("approved_discount_percent") || "").trim();
          const daysRaw = String(new FormData(form).get("approved_payment_terms_days") || "").trim();
          const labelRaw = String(new FormData(form).get("approved_payment_terms_label") || "").trim();
          const result = await postJson(`/api/admin/integrations/partners/${partner.id}`, "PATCH", {
            auto_create_accounts: (form.elements.namedItem("auto_create_accounts") as HTMLInputElement).checked,
            allow_direct_sku_match: (form.elements.namedItem("allow_direct_sku_match") as HTMLInputElement).checked,
            approved_discount_percent: discountRaw === "" ? null : Number(discountRaw),
            approved_payment_terms_days: daysRaw === "" ? null : Number(daysRaw),
            approved_payment_terms_label: labelRaw === "" ? null : labelRaw,
          });
          setPending(false);
          if (!result.ok) {
            setError(result.json?.error || "The account policy could not be saved.");
            return;
          }
          router.refresh();
        }}
        style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, fontWeight: 700 }}>
          <input name="auto_create_accounts" type="checkbox" defaultChecked={partner.auto_create_accounts} />
          Auto-create accounts
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, fontWeight: 700 }}>
          <input name="allow_direct_sku_match" type="checkbox" defaultChecked={partner.allow_direct_sku_match} />
          Allow exact internal SKU
        </label>
        <input
          name="approved_discount_percent"
          type="number"
          min={0}
          max={100}
          step="0.01"
          defaultValue={partner.approved_discount_percent ?? ""}
          placeholder="Approved discount %"
          style={input}
        />
        <input
          name="approved_payment_terms_days"
          type="number"
          min={0}
          max={365}
          step={1}
          defaultValue={partner.approved_payment_terms_days ?? ""}
          placeholder="Payment terms days"
          style={input}
        />
        <input
          name="approved_payment_terms_label"
          defaultValue={partner.approved_payment_terms_label ?? ""}
          placeholder="Payment terms label"
          style={input}
        />
        <button type="submit" style={button} disabled={pending}>
          Save account policy
        </button>
      </form>
      {error ? <div style={{ color: "#b91c1c", fontWeight: 800 }}>{error}</div> : null}
    </section>
  );
}

export type ProductMapEditorRow = {
  id: string;
  external_sku: string;
  partner_product_name: string | null;
  product_variant_id: string;
  status: string;
};

export function ProductMapManager({
  partnerId,
  maps,
  variants,
}: {
  partnerId: string;
  maps: ProductMapEditorRow[];
  variants: { id: string; sku: string; size_label: string | null; manufacturer: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(mapId: string | null, body: Record<string, unknown>) {
    setError(null);
    setPending(true);
    const result = await postJson(
      mapId
        ? `/api/admin/integrations/partners/${partnerId}/products/${mapId}`
        : `/api/admin/integrations/partners/${partnerId}/products`,
      mapId ? "PATCH" : "POST",
      body
    );
    setPending(false);
    if (!result.ok) {
      setError(result.json?.error || "The product mapping could not be saved.");
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <section style={card}>
      <div style={{ fontWeight: 900 }}>Product mapping</div>
      <div style={{ fontSize: 13, opacity: 0.75 }}>
        A verified mapping is the only automatic translation from a partner SKU to a 360 variant. Pending and disabled mappings are rejected. Changing a mapping does not rewrite orders already placed.
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const saved = await save(null, {
            external_sku: String(form.get("external_sku") || ""),
            product_variant_id: String(form.get("product_variant_id") || ""),
            partner_product_name: String(form.get("partner_product_name") || "") || null,
            status: String(form.get("status") || "pending"),
          });
          if (saved) event.currentTarget.reset();
        }}
        style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
      >
        <input name="external_sku" required placeholder="External SKU" style={input} />
        <input name="partner_product_name" placeholder="Partner product name" style={input} />
        <select name="product_variant_id" required defaultValue="" style={input}>
          <option value="" disabled>
            360 variant
          </option>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.sku}
              {variant.size_label ? ` · ${variant.size_label}` : ""}
              {variant.manufacturer ? ` · ${variant.manufacturer}` : ""}
            </option>
          ))}
        </select>
        <select name="status" defaultValue="pending" style={input}>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="disabled">Disabled</option>
        </select>
        <button type="submit" style={button} disabled={pending}>
          Add mapping
        </button>
      </form>
      {maps.map((map) => (
        <form
          key={map.id}
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await save(map.id, {
              external_sku: String(form.get("external_sku") || ""),
              product_variant_id: String(form.get("product_variant_id") || ""),
              partner_product_name: String(form.get("partner_product_name") || "") || null,
              status: String(form.get("status") || map.status),
            });
          }}
          style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 8 }}
        >
          <input name="external_sku" required defaultValue={map.external_sku} style={input} />
          <input name="partner_product_name" defaultValue={map.partner_product_name ?? ""} placeholder="Partner product name" style={input} />
          <select name="product_variant_id" defaultValue={map.product_variant_id} style={input}>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.sku}
                {variant.size_label ? ` · ${variant.size_label}` : ""}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={map.status} style={input}>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="disabled">Disabled</option>
          </select>
          <button type="submit" style={button} disabled={pending}>
            Save
          </button>
        </form>
      ))}
      {maps.length === 0 ? <div style={{ fontSize: 14, opacity: 0.7 }}>No product mappings.</div> : null}
      {error ? <div style={{ color: "#b91c1c", fontWeight: 800 }}>{error}</div> : null}
    </section>
  );
}
