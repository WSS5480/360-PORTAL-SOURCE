import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AdminOrStaffContext =
  | { user: any; kind: "ADMIN"; internalRole: string }
  | { user: any; kind: "STAFF" };

export async function requireAdminOrStaff(): Promise<AdminOrStaffContext> {
  const supabase = await supabaseServer();
  const { data, error: authErr } = await supabase.auth.getUser();

  if (authErr || !data?.user) {
    redirect("/login");
  }

  const userId = data.user.id;

  // 1) Internal admin?
  const { data: internal, error: internalErr } = await supabaseAdmin
    .from("internal_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!internalErr && internal) {
    return { user: data.user, kind: "ADMIN", internalRole: internal.role };
  }

  // 2) Staff / IVR team?
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("user_profiles")
    .select("is_staff")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profErr && profile?.is_staff) {
    return { user: data.user, kind: "STAFF" };
  }

  // Not internal at all -> customers go back to portal
  redirect("/portal");
}
