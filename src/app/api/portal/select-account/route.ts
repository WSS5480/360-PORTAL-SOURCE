import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const Schema = z.object({
  accountId: z.string().uuid(),
});

export async function POST(req: Request) {
  // must be logged in
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid accountId" }, { status: 400 });

  // must be a member of that account
  const { data: membership, error } = await supabaseAdmin
    .from("account_users")
    .select("account_id")
    .eq("user_id", data.user.id)
    .eq("account_id", parsed.data.accountId)
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  if (!membership) return NextResponse.json({ ok: false, error: "Not a member of that account" }, { status: 403 });

  const res = NextResponse.json({ ok: true });
  const isProduction = process.env.NODE_ENV === "production";
  res.cookies.set("portal_account", parsed.data.accountId, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
