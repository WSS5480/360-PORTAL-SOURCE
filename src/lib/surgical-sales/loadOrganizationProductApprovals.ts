import { supabaseAdmin } from "@/lib/supabase/admin";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import type { OrgProductApprovalListItem } from "@/lib/surgical-sales/organizationProductApprovals";

export async function loadOrganizationProductApprovals(
  organizationId: string,
): Promise<OrgProductApprovalListItem[]> {
  const { data, error } = await supabaseAdmin
    .from("sales_organization_product_approvals")
    .select(
      `
      id,
      organization_id,
      product_id,
      status,
      champion_contact_id,
      submitted_at,
      approved_at,
      notes,
      created_by_user_id,
      created_at,
      updated_at,
      product:surgical_sales_products ( id, name, category ),
      champion:surgical_sales_contacts ( id, first_name, last_name, email, title )
    `,
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const product = r.product as { name?: string; category?: string | null } | null;
    const champion = r.champion as Parameters<typeof contactDisplayName>[0] | null;
    return {
      id: String(r.id),
      organization_id: String(r.organization_id),
      product_id: String(r.product_id),
      status: String(r.status) as OrgProductApprovalListItem["status"],
      champion_contact_id: r.champion_contact_id ? String(r.champion_contact_id) : null,
      submitted_at: r.submitted_at ? String(r.submitted_at) : null,
      approved_at: r.approved_at ? String(r.approved_at) : null,
      notes: r.notes ? String(r.notes) : null,
      created_by_user_id: String(r.created_by_user_id),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
      product_name: String(product?.name ?? "Unknown product"),
      product_category: product?.category ? String(product.category) : null,
      champion_name: champion ? contactDisplayName(champion) : null,
    };
  });
}
