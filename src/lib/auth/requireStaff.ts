import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function requireStaff() {
  const user = await requireUser();

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("is_staff")
    .eq("user_id", user.id)
    .single();

  if (error || !data?.is_staff) {
    redirect("/portal");
  }

  return user;
}
