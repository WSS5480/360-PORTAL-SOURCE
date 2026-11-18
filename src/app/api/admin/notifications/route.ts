import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from("admin_internal_notifications")
    .select("id, notification_type, title, body, metadata_json, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    const missing =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /does not exist|schema cache/i.test(error.message || "");
    if (missing) return NextResponse.json({ ok: true, notifications: [], unread_count: 0 });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const notifications = data || [];
  const unread_count = notifications.filter((n) => !(n as { read_at?: string | null }).read_at).length;

  return NextResponse.json({ ok: true, notifications, unread_count });
}
