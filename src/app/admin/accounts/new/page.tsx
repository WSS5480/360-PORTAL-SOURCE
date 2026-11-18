import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import NewAccountClient from "./NewAccountClient";

export const dynamic = "force-dynamic";

export default async function NewAccountPage() {
  await requireAdmin();

  const { data: catalogProducts } = await supabaseAdmin
    .from("products")
    .select("id, name, code, is_active")
    .eq("is_active", true)
    .order("name");

  return (
    <NewAccountClient
      products={(catalogProducts || []).map((p: any) => ({
        id: String(p.id),
        name: String(p.name || "Product"),
        code: p.code ?? null,
      }))}
    />
  );
}
