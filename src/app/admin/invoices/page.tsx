import AdminInvoicesTableClient from "./AdminInvoicesTableClient";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { effectivePaymentTermsDays } from "@/lib/billing/effectivePaymentTermsDays";

export const dynamic = "force-dynamic";

function normalizeSearchParam(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

export default async function AdminInvoicesPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOrdersStaffOrAdmin();

  const sp = await props.searchParams;
  const accountId = normalizeSearchParam(sp.account_id);
  const statusFilter = normalizeSearchParam(sp.status);

  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select(
      "id, invoice_number, status, total, amount_paid, created_at, issued_at, metadata, order_id, account_id, orders(order_number, bulk_mode, payment_terms_days_snapshot, payment_terms_label_snapshot), accounts(name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rowsRaw = Array.isArray(invoices) ? invoices : [];
  const accountIds = Array.from(
    new Set(rowsRaw.map((r: any) => String(r?.account_id || "")).filter(Boolean))
  );
  const { data: pricingRaw } = accountIds.length
    ? await supabaseAdmin
        .from("account_pricing")
        .select("account_id, payment_terms_days, payment_terms_label")
        .in("account_id", accountIds)
        .limit(500)
    : { data: [] };
  const pricingByAccount = new Map<string, any>();
  for (const p of pricingRaw ?? []) {
    const id = String((p as any)?.account_id || "");
    if (id) pricingByAccount.set(id, p);
  }

  const rows = rowsRaw.map((r: any) => {
    const pricing = pricingByAccount.get(String(r?.account_id || "")) || {};
    const effectiveTermsDays = effectivePaymentTermsDays({
      bulk_mode: r?.orders?.bulk_mode,
      payment_terms_days_snapshot: r?.orders?.payment_terms_days_snapshot,
      payment_terms_label_snapshot: r?.orders?.payment_terms_label_snapshot,
      account_payment_terms_days: pricing.payment_terms_days,
    });
    return {
      ...r,
      payment_terms_days: pricing.payment_terms_days ?? null,
      payment_terms_label: pricing.payment_terms_label ?? null,
      effective_payment_terms_days: effectiveTermsDays,
    };
  });

  return (
    <main style={{ padding: 18, maxWidth: 1200, margin: "0 auto", display: "grid", gap: 16 }}>
      <AdminInvoicesTableClient rows={rows as any} initialAccountId={accountId} initialStatusFilter={statusFilter || undefined} />
    </main>
  );
}
