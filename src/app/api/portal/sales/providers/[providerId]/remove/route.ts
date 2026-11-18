import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { isSalesCrmTeamMember } from "@/lib/sales/isSalesCrmTeamMember";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import { assessProviderHardDeleteFromCounts } from "@/lib/surgical-sales/providerLifecyclePolicy";
import {
  isMissingHiddenFromProviderDirectoryColumn,
  isProviderRemoveScope,
} from "@/lib/surgical-sales/providerRemoveScope";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BodySchema = z
  .object({
    scope: z.enum(["everywhere", "keep_as_contact", "delete"]),
  })
  .strict();

async function requireRep() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid };
}

async function loadRetentionCounts(providerId: string) {
  const [engagementsRes, casesRes, activitiesRes, answersRes] = await Promise.all([
    supabaseAdmin.from("sales_engagements").select("id", { count: "exact", head: true }).eq("provider_id", providerId),
    supabaseAdmin.from("surgical_sales_cases").select("id", { count: "exact", head: true }).eq("surgeon_contact_id", providerId),
    supabaseAdmin.from("surgical_sales_provider_activities").select("id", { count: "exact", head: true }).eq("provider_id", providerId),
    supabaseAdmin.from("provider_clinical_discovery_answers").select("id", { count: "exact", head: true }).eq("provider_id", providerId),
  ]);
  return {
    engagementCount: engagementsRes.count ?? 0,
    caseCount: casesRes.count ?? 0,
    providerActivityCount: activitiesRes.count ?? 0,
    clinicalDiscoveryAnswerCount: answersRes.count ?? 0,
  };
}

export async function POST(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  if (!(await isSalesCrmTeamMember(gate.uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success || !isProviderRemoveScope(parsed.data.scope)) {
    return NextResponse.json({ ok: false, error: "Choose where to remove this person." }, { status: 400 });
  }

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (loadErr) return NextResponse.json({ ok: false, error: loadErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!isProviderRole(String((existing as { role_type?: string }).role_type || ""))) {
    return NextResponse.json({ ok: false, error: "Not a provider record." }, { status: 400 });
  }
  if (!(await repCanAccessContact(gate.uid, existing as never))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const scope = parsed.data.scope;

  if (scope === "delete") {
    const counts = await loadRetentionCounts(providerId);
    const retention = assessProviderHardDeleteFromCounts({
      contact: existing as Record<string, unknown>,
      ...counts,
    });
    if (!retention.hardDeleteAllowed) {
      return NextResponse.json(
        { ok: false, error: retention.blockHardDeleteReason ?? "Remove from lists instead of deleting." },
        { status: 409 },
      );
    }
    await supabaseAdmin.from("surgical_sales_contact_organizations").delete().eq("contact_id", providerId);
    await supabaseAdmin
      .from("surgical_sales_contact_relationships")
      .delete()
      .or(`primary_contact_id.eq.${providerId},related_contact_id.eq.${providerId}`);
    const { error: deleteErr } = await supabaseAdmin.from("surgical_sales_contacts").delete().eq("id", providerId);
    if (deleteErr) return NextResponse.json({ ok: false, error: deleteErr.message }, { status: 500 });
    await logSurgicalSalesCrmAudit({
      actorUserId: gate.uid,
      action: "provider_deleted",
      meta: { contact_id: providerId, provider_id: providerId, scope },
      req,
    });
    return NextResponse.json({ ok: true, scope, provider_id: providerId });
  }

  const patch: Record<string, unknown> = { updated_at: now };
  if (scope === "everywhere") {
    patch.archived_at = now;
    patch.hidden_from_provider_directory_at = now;
  } else {
    patch.archived_at = null;
    patch.hidden_from_provider_directory_at = now;
  }

  const { data, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update(patch)
    .eq("id", providerId)
    .select("*")
    .maybeSingle();
  if (error) {
    const missingHiddenCol = isMissingHiddenFromProviderDirectoryColumn(error.message);
    if (missingHiddenCol && scope === "everywhere") {
      const fallback = await supabaseAdmin
        .from("surgical_sales_contacts")
        .update({ archived_at: now, updated_at: now })
        .eq("id", providerId)
        .select("*")
        .maybeSingle();
      if (fallback.error || !fallback.data) {
        return NextResponse.json({ ok: false, error: fallback.error?.message || error.message }, { status: 500 });
      }
      await logSurgicalSalesCrmAudit({
        actorUserId: gate.uid,
        action: "contact_archived",
        meta: { contact_id: providerId, provider_id: providerId, scope: "everywhere" },
        req,
      });
      return NextResponse.json({ ok: true, scope: "everywhere", contact: fallback.data });
    }
    if (missingHiddenCol && scope === "keep_as_contact") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Keeping someone as a contact needs a database update. Apply db/migrations/20260813_provider_remove_directory_scopes.sql, then try again.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await logSurgicalSalesCrmAudit({
    actorUserId: gate.uid,
    action: scope === "everywhere" ? "contact_archived" : "provider_hidden_from_directory",
    meta: { contact_id: providerId, provider_id: providerId, scope },
    req,
  });

  return NextResponse.json({ ok: true, scope, contact: data });
}
