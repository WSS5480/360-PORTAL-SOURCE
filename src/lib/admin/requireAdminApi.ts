import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AdminApiContext = {
  userId: string;
  role: string;
};

export async function requireAdminApi():
  Promise<{ ok: true; ctx: AdminApiContext } | { ok: false; status: number; error: string }> {
  const supabase = await supabaseServer();
  const { data, error: authErr } = await supabase.auth.getUser();
  if (authErr || !data?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const userId = data.user.id;
  const { data: internal, error: internalErr } = await supabaseAdmin
    .from("internal_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (internalErr || !internal) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, ctx: { userId, role: String(internal.role ?? "admin") } };
}
