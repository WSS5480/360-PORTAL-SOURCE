import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/admin/requireAdminOrStaff";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function safeStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

function safeEmail(v: unknown) {
  return safeStr(v).trim().toLowerCase();
}

export async function POST(req: Request) {
  await requireAdminOrStaff();

  const wantsJson = (req.headers.get("accept") || "").includes("application/json");

  const form = await req.formData();
  const name = safeStr(form.get("name")).trim();
  const billing_email = safeEmail(form.get("billing_email"));
  const discount_percent = Number(String(form.get("discount_percent") ?? "40").trim() || "40");
  const terms_days = Number(String(form.get("payment_terms_days") ?? "30").trim() || "30");
  const terms_label = `Net ${Number.isFinite(terms_days) ? terms_days : 30} (after delivery)`;

  if (!name) {
    if (wantsJson) return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const supabase: any = createSupabaseAdminClient();

  const { data: created, error } = await supabase
    .from("accounts")
    .insert({
      name,
      billing_email: billing_email || null,
      discount_percent: Number.isFinite(discount_percent) ? discount_percent : 40,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !created) {
    if (wantsJson) {
      return NextResponse.json(
        { ok: false, error: "Failed to create account" },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to create account", detail: error }, { status: 500 });
  }

  const id = String(created.id || "");

  await supabase.from("account_pricing").insert({
    account_id: id,
    discount_percent: Number.isFinite(discount_percent) ? discount_percent : 40,
    payment_terms_label: terms_label,
    payment_terms_days: Number.isFinite(terms_days) ? terms_days : 30,
  });

  if (wantsJson) {
    return NextResponse.json({ ok: true, id }, { status: 200 });
  }

  return NextResponse.redirect(urlFromRequest(req, `/admin/ivr/intake?account_id=${encodeURIComponent(id)}`), 303);
}
