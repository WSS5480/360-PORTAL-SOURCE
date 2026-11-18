import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import { pickPrimaryOrgLink } from "@/lib/surgical-sales/providerDirectory";
import { loadProviderEngagementsForProfile } from "@/lib/surgical-sales/engagements/loadProviderEngagements";
import { resolveAdminProviderSalesRepId } from "@/lib/surgical-sales/admin/resolveAdminProviderSalesRepId";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const salesRepId = await resolveAdminProviderSalesRepId(providerId);
  if (!salesRepId) {
    return NextResponse.json(
      { ok: false, error: "No assigned sales rep found for this provider." },
      { status: 404 },
    );
  }

  const { data: contact, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("id, role_type, organization_id, account_id, provider_pre_observation_impact_opening_statement, provider_pre_observation_probes, provider_pre_observation_tools_resources, provider_pre_observation_value_hypothesis, provider_pre_observation_planned_close, provider_pre_observation_additional_notes, provider_strategic_goal")
    .eq("id", providerId)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!contact) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!isProviderRole(String((contact as { role_type?: string }).role_type || ""))) {
    return NextResponse.json({ ok: false, error: "Not a provider record." }, { status: 400 });
  }

  const { data: orgLinks } = await supabaseAdmin
    .from("surgical_sales_contact_organizations")
    .select("account_id, is_primary_org, is_active, accounts:sales_organizations!account_id(id, name)")
    .eq("contact_id", providerId)
    .order("is_primary_org", { ascending: false })
    .limit(20);

  const links = (orgLinks || []) as Array<Record<string, unknown>>;
  const primaryLink = pickPrimaryOrgLink(links as never);
  const primaryAcct = primaryLink?.accounts as { id?: string; name?: string | null } | null;

  try {
    const engagementLoad = await loadProviderEngagementsForProfile(supabaseAdmin, {
      providerId,
      salesRepId,
      contact: contact as Record<string, unknown>,
      actorName: "Rep",
      primaryOrganizationName: String(primaryAcct?.name || "").trim() || null,
      primaryOrganizationId: String(primaryLink?.account_id || primaryAcct?.id || "").trim() || null,
    });
    return NextResponse.json({ ok: true, engagements: engagementLoad.engagements });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load engagements" },
      { status: 500 },
    );
  }
}
