import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadProviderIntelligenceAggregator } from "@/lib/surgical-sales/intelligence";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ providerId: string }> },
) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const { data: contact, error: contactErr } = await supabase
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();

  if (contactErr || !contact) {
    return NextResponse.json({ ok: false, error: "Provider not found" }, { status: 404 });
  }

  const salesRepId = String(contact.sales_rep_id ?? uid).trim();
  const organizationId = contact.organization_id
    ? String(contact.organization_id)
    : contact.account_id
      ? String(contact.account_id)
      : null;

  try {
    const aggregator = await loadProviderIntelligenceAggregator(supabase, {
      providerId,
      salesRepId,
      organizationId,
      contact: contact as Record<string, unknown>,
    });

    return NextResponse.json({
      ok: true,
      aggregator,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[providers/intelligence-context/audit] failed", error);
    return NextResponse.json(
      { ok: false, error: "Failed to assemble provider intelligence context" },
      { status: 500 },
    );
  }
}
