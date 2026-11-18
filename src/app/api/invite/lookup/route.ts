import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Returns the pending invite for the authenticated user's email.
 * Used when Supabase redirects to /login with tokens in hash (wrong redirect URL)
 * so we can recover and send the user to set-password.
 */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();

  if (authErr || !authData?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const email = (authData.user.email || "").toLowerCase().trim();
  if (!email) {
    return NextResponse.json({ ok: false, error: "No email" }, { status: 400 });
  }

  const { data: invite, error } = await supabaseAdmin
    .from("account_invites")
    .select("id")
    .ilike("email", email)
    .is("revoked_at", null)
    .is("accepted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!invite?.id) {
    return NextResponse.json({ ok: false, error: "No pending invite" }, { status: 404 });
  }

  // Check expiry
  const { data: fullInvite } = await supabaseAdmin
    .from("account_invites")
    .select("expires_at")
    .eq("id", invite.id)
    .single();

  if (fullInvite?.expires_at && new Date(fullInvite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "Invite expired" }, { status: 410 });
  }

  return NextResponse.json({ ok: true, inviteId: invite.id });
}
