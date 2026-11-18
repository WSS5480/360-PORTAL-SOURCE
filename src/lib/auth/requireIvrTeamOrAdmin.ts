// src/lib/auth/requireIvrTeamOrAdmin.ts
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type IvrTeamOrAdminContext =
  | { user: any; kind: "ADMIN"; internalRole: string }
  | { user: any; kind: "STAFF" };

export async function requireIvrTeamOrAdmin(): Promise<IvrTeamOrAdminContext | null> {
  const supabase = await supabaseServer();
  const { data, error: authErr } = await supabase.auth.getUser();

  if (authErr || !data?.user) return null;

  const userId = data.user.id;

  // 1) Internal admin? (row exists in internal_users)
  const { data: internal, error: internalErr } = await supabaseAdmin
    .from("internal_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!internalErr && internal?.role) {
    return { user: data.user, kind: "ADMIN", internalRole: internal.role };
  }

  // 2) IVR Team (staff)? (user_profiles.is_staff = true)
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("user_profiles")
    .select("is_staff")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profErr && profile?.is_staff) {
    return { user: data.user, kind: "STAFF" };
  }

  return null;
}
