import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadSalesCommandDocumentTree } from "@/lib/sales-command/loadSalesCommandDocumentTree";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  const isRep = await userIsInternalSalesRep(user.id);
  if (!isRep) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("user_profiles")
    .select("is_internal_sales_rep, is_territory_manager")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileErr) return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });

  try {
    const tree = await loadSalesCommandDocumentTree({
      isInternalSalesRep: profile?.is_internal_sales_rep === true,
      isTerritoryManager: profile?.is_territory_manager === true,
    });
    return NextResponse.json({ ok: true, tree });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load documents" },
      { status: 500 },
    );
  }
}
