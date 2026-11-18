import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function requireAdmin() {
  const supabase = await supabaseServer();
  const { data, error: authErr } = await supabase.auth.getUser();

  if (authErr || !data?.user) {
    redirect("/login");
  }

  const userId = data.user.id;

  // Internal admin?
  const { data: internal, error: internalErr } = await supabaseAdmin
    .from("internal_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!internalErr && internal) {
    return { user: data.user, role: internal.role };
  }

  // Staff? (send them to IVR queue instead of showing an error page)
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("user_profiles")
    .select("is_staff")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profErr && profile?.is_staff) {
    redirect("/admin/ivr");
  }

  // Otherwise: portal customer
  redirect("/portal");
}
