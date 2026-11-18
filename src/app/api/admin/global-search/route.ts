import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runAdminGlobalSearch } from "@/lib/search/globalSearchServer";

export const dynamic = "force-dynamic";

async function assertAdminOrStaffApi(): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data, error: authErr } = await supabase.auth.getUser();
  if (authErr || !data?.user) return null;
  const userId = data.user.id;
  const { data: internal } = await supabaseAdmin.from("internal_users").select("role").eq("user_id", userId).maybeSingle();
  if (internal) return userId;
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("is_staff").eq("user_id", userId).maybeSingle();
  if (profile?.is_staff) return userId;
  return null;
}

export async function GET(req: Request) {
  const uid = await assertAdminOrStaffApi();
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const groups = await runAdminGlobalSearch(q);
  return NextResponse.json({ ok: true, q: q.trim(), groups });
}
