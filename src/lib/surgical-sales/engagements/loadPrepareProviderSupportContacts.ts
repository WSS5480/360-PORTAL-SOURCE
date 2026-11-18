import type { SupabaseClient } from "@supabase/supabase-js";
import { formatSupportContactRecord } from "@/lib/surgical-sales/optionalIntelligenceCategories";

/** Compact support-contact lines for prepare provider context (not a full CRM list). */
export async function loadPrepareProviderSupportContactsSummary(
  supabase: SupabaseClient,
  providerId: string,
  limit = 4,
): Promise<string | null> {
  const { data: relRows } = await supabase
    .from("surgical_sales_contact_relationships")
    .select("related_contact_id, primary_contact_id")
    .or(`primary_contact_id.eq.${providerId},related_contact_id.eq.${providerId}`)
    .order("updated_at", { ascending: false })
    .limit(12);

  const relatedIds = [
    ...new Set(
      (relRows ?? []).flatMap((row) => {
        const relatedId = String(row.related_contact_id ?? "");
        const primaryId = String(row.primary_contact_id ?? "");
        if (relatedId === providerId) return primaryId ? [primaryId] : [];
        if (primaryId === providerId) return relatedId ? [relatedId] : [];
        return [relatedId, primaryId].filter((id) => id && id !== providerId);
      }),
    ),
  ].slice(0, limit);

  if (relatedIds.length === 0) return null;

  const { data: contacts } = await supabase
    .from("surgical_sales_contacts")
    .select("id, first_name, last_name, title, role_type, mobile_phone, email")
    .in("id", relatedIds);

  const lines = (contacts ?? [])
    .map((row) => formatSupportContactRecord(row as Record<string, unknown>))
    .filter((line) => line.trim());

  return lines.length ? lines.join(" · ") : null;
}
