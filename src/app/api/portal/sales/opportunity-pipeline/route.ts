import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadOpportunityPipelineForRep } from "@/lib/surgical-sales/loadOpportunityPipelineForRep";

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

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();

  try {
    const pipeline = await loadOpportunityPipelineForRep(uid, q || undefined);
    return NextResponse.json({ ok: true, pipeline });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load opportunity pipeline";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
