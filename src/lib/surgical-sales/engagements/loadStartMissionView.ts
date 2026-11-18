import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import {
  buildStartMissionView,
  type StartMissionView,
} from "@/lib/surgical-sales/engagements/buildStartMissionView";

export async function loadStartMissionViewForActor(
  engagementId: string,
  userId: string,
): Promise<
  | { ok: true; live: StartMissionView; engagement: Record<string, unknown> }
  | { ok: false; error: string; status: 404 | 500 }
> {
  const engagement = await loadEngagementForPortalActor(engagementId, userId, {
    includeArchived: true,
  });
  if (!engagement) {
    return { ok: false, error: "Not found", status: 404 };
  }

  if (String(engagement.archived_at ?? "").trim()) {
    return { ok: false, error: "Engagement is archived", status: 404 };
  }

  const providerId = String(engagement.provider_id);
  const orgId = engagement.organization_id ? String(engagement.organization_id) : null;

  const [providerRes, orgRes] = await Promise.all([
    supabaseAdmin.from("surgical_sales_contacts").select("*").eq("id", providerId).maybeSingle(),
    orgId
      ? supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").eq("id", orgId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const providerRow = providerRes.data;
  if (!providerRow) {
    return { ok: false, error: "Provider not found", status: 404 };
  }

  const live = buildStartMissionView({
    engagement,
    provider: {
      id: providerId,
      display_name: contactDisplayName(providerRow as never),
    },
    organization: orgRes.data
      ? { id: String((orgRes.data as { id: string }).id), name: String((orgRes.data as { name?: string }).name ?? "") }
      : null,
  });

  return { ok: true, live, engagement };
}
