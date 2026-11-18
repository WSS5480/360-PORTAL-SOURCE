import { supabaseAdmin } from "@/lib/supabase/admin";

/** Rep whose cases best represent this provider for admin read-only command view. */
export async function resolveAdminProviderSalesRepId(providerId: string): Promise<string | null> {
  const { data: caseRow } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select("sales_rep_id, case_date, updated_at")
    .eq("surgeon_contact_id", providerId)
    .is("archived_at", null)
    .neq("status", "cancelled")
    .order("case_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fromCase = String((caseRow as { sales_rep_id?: string } | null)?.sales_rep_id ?? "").trim();
  if (fromCase) return fromCase;

  const { data: engagementRow } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("sales_rep_id")
    .eq("provider_id", providerId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fromEngagement = String((engagementRow as { sales_rep_id?: string } | null)?.sales_rep_id ?? "").trim();
  if (fromEngagement) return fromEngagement;

  const { data: contact } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("created_by")
    .eq("id", providerId)
    .maybeSingle();

  const fromContact = String((contact as { created_by?: string } | null)?.created_by ?? "").trim();
  return fromContact || null;
}
