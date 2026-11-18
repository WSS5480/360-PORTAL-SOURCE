import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { defaultVirtualWarehouseAccessForAccountRole } from "@/lib/portal/virtualWarehouseAccessDefaultForRole";

export const dynamic = "force-dynamic";

/** Returns the account_users.role to use. INTERNAL_ADMIN and IVR_STAFF are handled separately. */
function accountRoleForInvite(raw: unknown): string {
  const role = String(raw ?? "").trim().toUpperCase();
  if (role === "INTERNAL_ADMIN") return "ACCOUNT_ADMIN";
  if (role === "IVR_STAFF") return "IVR_SUBMITTER";
  if (role === "INTERNAL_SALES_REP") return "ORDER_CREATOR";
  if (role === "IVR_SUBMITTER") return "ORDER_CREATOR"; // legacy
  return role || "ORDER_CREATOR";
}

export async function POST(req: Request) {
  // Step 1: Parse input
  const body = await req.json().catch(() => null);
  const inviteId = String(body?.inviteId || "").trim();
  if (!inviteId) {
    return NextResponse.json({ ok: false, error: "Missing inviteId" }, { status: 400 });
  }

  // Step 2: Require signed-in user (cookie session)
  const supabase = await supabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();

  if (authErr || !authData?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized (not signed in)" }, { status: 401 });
  }

  const userId = authData.user.id;
  const authedEmail = (authData.user.email || "").toLowerCase().trim();

  // Step 3: Load invite (service role, bypass RLS)
  const { data: invite, error: invErr } = await supabaseAdmin
    .from("account_invites")
    .select("id,account_id,email,full_name,role,expires_at,accepted_at,revoked_at")
    .eq("id", inviteId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!invite) return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });

  // Step 4: Validate invite state
  if (invite.revoked_at) {
    return NextResponse.json({ ok: false, error: "Invite was revoked" }, { status: 400 });
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "Invite expired" }, { status: 400 });
  }

  // Step 5: Ensure the signed-in user matches invite email
  const inviteEmail = String(invite.email || "").toLowerCase().trim();
  if (inviteEmail && authedEmail && inviteEmail !== authedEmail) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "This invite was sent to a different email address. Please sign in using the invited email and try again.",
      },
      { status: 403 }
    );
  }

  // Step 6: Idempotent membership write (PK is (account_id, user_id))
  const inviteRole = String(invite.role ?? "").trim().toUpperCase();
  const accountRole = accountRoleForInvite(invite.role);

  const { data: existingMem } = await supabaseAdmin
    .from("account_users")
    .select("user_id")
    .eq("account_id", invite.account_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingMem) {
    const { error: insErr } = await supabaseAdmin.from("account_users").insert({
      account_id: invite.account_id,
      user_id: userId,
      role: accountRole,
      virtual_warehouse_access: defaultVirtualWarehouseAccessForAccountRole(accountRole),
    });
    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }
  } else {
    const { error: updErr } = await supabaseAdmin
      .from("account_users")
      .update({ role: accountRole })
      .eq("account_id", invite.account_id)
      .eq("user_id", userId);
    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }
  }

  // Step 6a: Internal Admin — add to internal_users
  if (inviteRole === "INTERNAL_ADMIN") {
    try {
      await supabaseAdmin.from("internal_users").upsert(
        { user_id: userId, role: "ADMIN" },
        { onConflict: "user_id" }
      );
    } catch (e) {
      console.warn("[invite/accept] Failed to add internal admin:", e);
    }
  }

  // Step 6b: IVR Staff — set user_profiles.is_staff
  if (inviteRole === "IVR_STAFF") {
    try {
      const emailForProfile = authedEmail || inviteEmail || "";
      if (emailForProfile) {
        await supabaseAdmin.from("user_profiles").upsert(
          { user_id: userId, email: emailForProfile, is_staff: true } as any,
          { onConflict: "user_id" }
        );
      }
    } catch (e) {
      console.warn("[invite/accept] Failed to set IVR staff:", e);
    }
  }

  // Step 6c: Internal sales rep — flag profile (portal Sales Command)
  if (inviteRole === "INTERNAL_SALES_REP") {
    try {
      const emailForProfile = authedEmail || inviteEmail || "";
      if (emailForProfile) {
        await supabaseAdmin.from("user_profiles").upsert(
          { user_id: userId, email: emailForProfile, is_internal_sales_rep: true } as any,
          { onConflict: "user_id" }
        );
      }
    } catch (e) {
      console.warn("[invite/accept] Failed to set internal sales rep:", e);
    }
  }

  // ✅ Link account_contacts.user_id to this user (best-effort)
  try {
    await supabaseAdmin
      .from("account_contacts")
      .update({ user_id: userId })
      .eq("account_id", invite.account_id)
      .eq("email", inviteEmail)
      .is("user_id", null);
  } catch {}

  // ✅ Step 6.5 (NEW): Best-effort persist name to user_profiles (NON-BREAKING)
  // This is intentionally wrapped so it can NEVER block accepting an invite.
  // It enables reliable autofill for distributor name and other UI usage later.
  let profileWriteWarning: string | null = null;
  try {
    const fullName = String(invite.full_name || "").trim() || null;

    // Only attempt if we have something meaningful
    if (fullName || authedEmail) {
      // Try the most common linkage: user_profiles.user_id = auth.users.id
      const { error: profErr1 } = await supabaseAdmin.from("user_profiles").upsert(
        {
          user_id: userId,
          email: authedEmail || null,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id" }
      );

      if (profErr1) {
        // Some schemas use id instead of user_id; try that next.
        const { error: profErr2 } = await supabaseAdmin.from("user_profiles").upsert(
          {
            id: userId,
            email: authedEmail || null,
            full_name: fullName,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "id" }
        );

        if (profErr2) {
          // Do NOT fail the route; just keep a warning for debugging.
          profileWriteWarning = profErr2.message || "Failed to write user_profiles";
          console.warn("Invite accept: could not upsert user_profiles:", profErr1.message, profErr2.message);
        }
      }
    }
  } catch (e: any) {
    // Do NOT fail the route
    profileWriteWarning = e?.message || "Failed to write user_profiles";
    console.warn("Invite accept: unexpected error writing user_profiles:", profileWriteWarning);
  }

  // Step 7: Mark invite accepted (idempotent)
  if (!invite.accepted_at) {
    const { error: accErr } = await supabaseAdmin
      .from("account_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", inviteId);

    if (accErr) {
      return NextResponse.json({ ok: false, error: accErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    accountId: invite.account_id,
    fullName: invite.full_name || null,
    alreadyAccepted: Boolean(invite.accepted_at),
    role: accountRole,
    // This will be null in normal success. If present, it helps you diagnose schema mismatch.
    profileWriteWarning,
  });
}
