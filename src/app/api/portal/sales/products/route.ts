import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, code, qcode, is_active")
    .order("name", { ascending: true })
    .limit(1200);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    products: (data ?? []).map((p: { id: string; name: string; code?: string | null; qcode?: string | null; is_active?: boolean }) => ({
      id: p.id,
      name: String(p.name ?? "").trim() || "Product",
      code: p.code ?? null,
      qcode: p.qcode ?? null,
      is_active: p.is_active !== false,
    })),
  });
}
