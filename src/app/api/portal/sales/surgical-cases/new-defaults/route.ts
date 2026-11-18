import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import { loadSurgicalNewCaseDefaults } from "@/lib/surgical-sales/newCaseDefaultsQuery";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const accountRaw = (url.searchParams.get("account_id") || "").trim();
  const productRaw = (url.searchParams.get("product_id") || "").trim();
  const surgeonRaw = (url.searchParams.get("surgeon_contact_id") || "").trim();

  const accountId = UUID_RE.test(accountRaw) ? accountRaw : null;
  const productId = UUID_RE.test(productRaw) ? productRaw : null;
  const surgeonContactId = UUID_RE.test(surgeonRaw) ? surgeonRaw : null;

  if (accountId) {
    const ok = await repCanViewSurgicalAccount(uid, accountId);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Account not available for this user" }, { status: 403 });
    }
  }

  if (productId) {
    const { data: pr } = await supabaseAdmin.from("surgical_sales_products").select("id").eq("id", productId).maybeSingle();
    if (!pr) {
      return NextResponse.json({ ok: false, error: "Product not found" }, { status: 400 });
    }
  }

  const defaults = await loadSurgicalNewCaseDefaults({
    repUserId: uid,
    accountId,
    productId,
    surgeonContactId,
  });

  return NextResponse.json({ ok: true, defaults });
}
