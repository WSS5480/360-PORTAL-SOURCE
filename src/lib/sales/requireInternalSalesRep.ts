import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function userIsInternalSalesRep(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("is_internal_sales_rep")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return data.is_internal_sales_rep === true;
}

export async function requireInternalSalesRep() {
  const user = await requireUser();
  const ok = await userIsInternalSalesRep(user.id);
  if (!ok) redirect("/portal");
  return { user };
}
