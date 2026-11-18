// src/app/api/admin/ivr/templates/route.ts
import { NextResponse } from "next/server";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireIvrTeamOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { data, error } = await sb
    .from("ivr_coverage_templates")
    .select("id,name,body,is_active,sort_order,created_at,updated_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Request failed" }, { status: 500 });

  return NextResponse.json({ rows: data || [] });
}
