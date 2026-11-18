import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { canViewOrders } from "@/lib/portal/portalRoles";
import { isPortalInvoiceRowViewable } from "@/lib/portal/portalRowScope";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reconcilePendingStripeSubmissionsForInvoice } from "@/lib/stripe/reconcilePendingStripeSubmissions";
import { getInvoiceWireInstructionsText } from "@/lib/billing/invoiceWireInstructions";
import PortalInvoicePayClient, {
  type PortalInvoicePayment,
  type PortalInvoiceSubmission,
} from "../ui/PortalInvoicePayClient";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default async function PortalInvoicePayPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const ctx = await requireCurrentAccount();
  const accountId = ctx.currentAccountId;

  if (!accountId) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>No account selected.</div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>Please select an account to continue.</div>
      </div>
    );
  }

  if (!canViewOrders(ctx.currentRole)) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>Forbidden</div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
          Your role does not have permission to view invoices for this account.
        </div>
      </div>
    );
  }

  const resolved = await params;
  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");

  if (!UUID_RE.test(invoiceId)) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>Invalid invoiceId.</div>
        <Link href="/portal/invoices" style={{ textDecoration: "none", fontWeight: 900 }}>
          ← Back to invoices
        </Link>
      </div>
    );
  }

  const { data: invoice, error: invoiceErr } = await supabaseAdmin
    .from("invoices")
    .select("id, account_id, order_id, invoice_number, status, issued_at, total, amount_paid, created_at")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceErr) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>{invoiceErr.message}</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 950 }}>Invoice not found.</div>
      </div>
    );
  }

  if (String((invoice as any).account_id) !== String(accountId)) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>Forbidden.</div>
      </div>
    );
  }

  const portalUserId = String((ctx.user as any)?.id ?? "");
  const viewable = await isPortalInvoiceRowViewable(supabaseAdmin as any, accountId, portalUserId, ctx.currentRole, invoice as any);
  if (!viewable) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 950 }}>Invoice not found.</div>
      </div>
    );
  }

  await reconcilePendingStripeSubmissionsForInvoice(invoiceId);

  let payments: PortalInvoicePayment[] = [];
  try {
    const { data: payRaw } = await supabaseAdmin
      .from("invoice_payments")
      .select("id, amount, note, created_at")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false })
      .limit(100);
    payments = Array.isArray(payRaw) ? (payRaw as PortalInvoicePayment[]) : [];
  } catch {
    payments = [];
  }

  let submissions: PortalInvoiceSubmission[] = [];
  try {
    const { data: subRaw } = await supabaseAdmin
      .from("invoice_payment_submissions")
      .select("id, method, amount, status, reference, sent_at, note, created_at, stripe_payment_intent_status")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false })
      .limit(100);
    submissions = Array.isArray(subRaw) ? (subRaw as PortalInvoiceSubmission[]) : [];
  } catch {
    submissions = [];
  }

  const total = safeNum((invoice as any).total);
  const storedPaid = safeNum((invoice as any).amount_paid);
  const computedPaid = payments.reduce((sum, p) => sum + safeNum(p?.amount), 0);
  const amountPaid = Math.max(storedPaid, computedPaid);
  const remaining = Math.max(0, total - amountPaid);

  const wireInstructions = getInvoiceWireInstructionsText();

  if (remaining <= 0.005) {
    redirect(`/portal/invoices/${encodeURIComponent(invoiceId)}`);
  }

  return (
    <PortalInvoicePayClient
      invoice={{
        id: String((invoice as any).id),
        invoice_number: (invoice as any).invoice_number ?? null,
        status: (invoice as any).status ?? null,
        issued_at: (invoice as any).issued_at ?? null,
        order_id: (invoice as any).order_id ?? null,
        total,
        amount_paid: amountPaid,
        remaining,
      }}
      payments={payments}
      submissions={submissions}
      wireInstructions={wireInstructions}
    />
  );
}
