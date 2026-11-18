import { supabaseAdmin } from "@/lib/supabase/admin";

export async function isInternalPortalAdmin(userId: string): Promise<boolean> {
  const [{ data: internal }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("internal_users").select("user_id").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("user_profiles").select("is_admin").eq("user_id", userId).maybeSingle(),
  ]);
  return !!internal || profile?.is_admin === true;
}
