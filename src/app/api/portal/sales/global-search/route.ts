import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { runPortalSalesGlobalSearch } from "@/lib/search/globalSearchServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const groups = await runPortalSalesGlobalSearch(uid, q);
  return NextResponse.json({ ok: true, q: q.trim(), groups });
}
