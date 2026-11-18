import { NextResponse } from "next/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { supabaseServer } from "@/lib/supabase/server";
import { loadUniversalFactsByCaptureId } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ captureId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const rep = await userIsInternalSalesRep(auth.user.id);
  if (!rep) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { captureId } = await ctx.params;
  const id = String(captureId ?? "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing capture id" }, { status: 400 });
  }

  const run = await loadUniversalFactsByCaptureId(id);
  if (!run) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, run });
}
