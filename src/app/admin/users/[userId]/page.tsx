import Link from "next/link";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import UserMembershipsClient from "./UserMembershipsClient";
import UserIdentitiesBlock from "./UserIdentitiesBlock";
import UserPasswordRecoveryClient from "./UserPasswordRecoveryClient";
import UserMfaClient from "./UserMfaClient";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pill(active: boolean): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.18)",
    fontSize: 12,
    fontWeight: 900,
    background: active ? "#111" : "white",
    color: active ? "white" : "black",
  };
}

const card: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(0,0,0,0.10)",
  background: "white",
  overflow: "hidden",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  height: "100%",
};

const cardHead: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid rgba(0,0,0,0.08)",
  fontWeight: 950,
  fontSize: 15,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: 16,
  alignItems: "stretch",
};

export default async function AdminUserDetailPage(props: { params: Promise<{ userId: string }> }) {
  await requireAdmin();
  const { userId } = await props.params;

  if (!userId || !UUID_RE.test(userId)) {
    return (
      <main style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>User</h1>
        <p style={{ marginTop: 12, color: "crimson" }}>Invalid user id.</p>
        <Link href="/admin/users" style={{ fontWeight: 950 }}>
          ← Back to Users
        </Link>
      </main>
    );
  }

  const supabase: any = createSupabaseAdminClient();

  const [{ data: userRes, error: userErr }, { data: adminRow }, { data: profileRow }] = await Promise.all([
    supabase.auth.admin.getUserById(userId),
    supabase.from("internal_users").select("user_id,role").eq("user_id", userId).maybeSingle(),
    supabase.from("user_profiles").select("user_id,is_staff,is_internal_sales_rep").eq("user_id", userId).maybeSingle(),
  ]);

  if (userErr || !userRes?.user) {
    return (
      <main style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>User</h1>
        <p style={{ marginTop: 12, color: "crimson" }}>Failed to load user.</p>
        <p style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
          {(userErr as { message?: string } | null)?.message?.trim() || "Please try again."}
        </p>
        <Link href="/admin/users" style={{ fontWeight: 950 }}>
          ← Back to Users
        </Link>
      </main>
    );
  }

  const user = userRes.user;
  const isAdmin = !!adminRow;
  const isStaff = !!profileRow?.is_staff;
  const isSalesRep = !!profileRow?.is_internal_sales_rep;

  const mfaListFn = supabase.auth?.admin?.mfa?.listFactors;
  const [{ data: memberships }, { data: accounts }, mfaResult] = await Promise.all([
    supabase
      .from("account_users")
      .select("account_id, role, created_at, accounts:accounts(id,name)")
      .eq("user_id", userId),
    supabase.from("accounts").select("id,name").order("name", { ascending: true }).limit(500),
    typeof mfaListFn === "function" ? mfaListFn({ userId }) : Promise.resolve({ data: { factors: [] } }),
  ]);

  const accountById = new Map((accounts || []).map((a: any) => [a.id, a.name]));
  const memRows =
    (memberships || []).map((m: any) => ({
      account_id: String(m.account_id),
      role: m.role ?? null,
      created_at: m.created_at ?? null,
      account_name: accountById.get(m.account_id) ?? null,
    })) ?? [];

  const identities = (user.identities ?? []).map((i: any) => ({
    id: String(i.id ?? ""),
    provider: String(i.provider ?? ""),
    created_at: i.created_at ?? null,
    last_sign_in_at: i.last_sign_in_at ?? null,
  }));

  const factorsRaw = (mfaResult as any)?.data?.factors ?? [];
  const factors = Array.isArray(factorsRaw)
    ? factorsRaw.map((f: any) => ({
        id: String(f.id ?? ""),
        factor_type: String(f.factor_type ?? ""),
        friendly_name: f.friendly_name ?? null,
        status: String(f.status ?? ""),
      }))
    : [];

  const email = user.email ? String(user.email) : null;
  const createdAt = user.created_at ? String(user.created_at) : null;
  const lastSignIn = user.last_sign_in_at ? String(user.last_sign_in_at) : null;

  return (
    <main style={{ padding: 18, maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
      <div
        style={{
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(129,140,248,0.26)",
          background:
            "radial-gradient(900px 240px at 15% 10%, rgba(99,102,241,0.22), transparent 60%)," +
            "linear-gradient(180deg, #0a1428, #050d16)",
          boxShadow: "0 16px 36px rgba(15,23,42,0.12)",
        }}
      >
        <div style={{ padding: 18, display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.7, fontWeight: 900, textTransform: "uppercase", color: "white" }}>
              Admin
            </div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
              <Link href="/admin/users" style={{ color: "white", fontWeight: 950, textDecoration: "none" }}>
                ← All users
              </Link>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 950, margin: "10px 0 0", color: "white", letterSpacing: -0.3 }}>User details</h1>
            <div style={{ marginTop: 8, fontSize: 15, fontWeight: 800, color: "white", wordBreak: "break-word" }}>{email ?? "No email"}</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, color: "white", fontFamily: "ui-monospace, monospace" }}>{user.id}</div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            padding: "12px 14px",
            gap: 8,
            fontSize: 12,
            color: "white",
          }}
        >
          <div>
            <div style={{ opacity: 0.65, textTransform: "uppercase", fontWeight: 900, fontSize: 10 }}>Created</div>
            <div style={{ fontWeight: 800 }}>{createdAt ? new Date(createdAt).toLocaleString() : "—"}</div>
          </div>
          <div>
            <div style={{ opacity: 0.65, textTransform: "uppercase", fontWeight: 900, fontSize: 10 }}>Last sign-in</div>
            <div style={{ fontWeight: 800 }}>{lastSignIn ? new Date(lastSignIn).toLocaleString() : "—"}</div>
          </div>
          <div>
            <div style={{ opacity: 0.65, textTransform: "uppercase", fontWeight: 900, fontSize: 10 }}>Roles</div>
            <div style={{ fontWeight: 800 }}>
              {(() => {
                const bits: string[] = [];
                if (isAdmin) bits.push("Admin");
                if (isStaff) bits.push("IVR staff");
                if (isSalesRep) bits.push("Sales rep");
                return bits.length ? bits.join(" · ") : "Customer";
              })()}
            </div>
          </div>
        </div>
      </div>

      <div style={grid2}>
        <section style={card}>
          <div style={cardHead}>
            <span>Password recovery</span>
            <span style={{ fontSize: 12, opacity: 0.65, fontWeight: 700 }}>Same as Forgot password</span>
          </div>
          <div style={{ padding: 16, flex: 1 }}>
            <UserPasswordRecoveryClient userId={user.id} email={email} />
          </div>
        </section>

        <section style={card}>
          <div style={cardHead}>
            <span>Access roles</span>
            <span style={{ fontSize: 12, opacity: 0.65, fontWeight: 700 }}>Admin, IVR, sales</span>
          </div>
          <div style={{ padding: 16, flex: 1 }}>
            <form method="post" action={`/api/admin/users/${user.id}/roles`} style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <input type="checkbox" name="is_admin" defaultChecked={isAdmin} />
                <span style={{ fontWeight: 900 }}>Internal admin</span>
                <span style={{ ...pill(isAdmin), marginLeft: "auto" }}>{isAdmin ? "ADMIN" : "OFF"}</span>
              </label>

              <label style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <input type="checkbox" name="is_staff" defaultChecked={isStaff} />
                <span style={{ fontWeight: 900 }}>IVR team (staff)</span>
                <span style={{ ...pill(isStaff), marginLeft: "auto" }}>{isStaff ? "STAFF" : "OFF"}</span>
              </label>

              <label style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <input type="checkbox" name="is_internal_sales_rep" defaultChecked={isSalesRep} />
                <span style={{ fontWeight: 900 }}>Internal sales rep</span>
                <span style={{ ...pill(isSalesRep), marginLeft: "auto" }}>{isSalesRep ? "SALES" : "OFF"}</span>
              </label>

              <p style={{ margin: 0, fontSize: 13, opacity: 0.75, lineHeight: 1.45 }}>
                Customer access is driven by account memberships below, not these toggles. Sales rep unlocks Sales
                Command in the portal.
              </p>

              <button
                type="submit"
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.2)",
                  background: "#111",
                  color: "white",
                  fontWeight: 950,
                  cursor: "pointer",
                  width: "fit-content",
                }}
              >
                Save roles
              </button>
            </form>
          </div>
        </section>
      </div>

      <div style={grid2}>
        <section style={card}>
          <div style={cardHead}>
            <span>Sign-in methods</span>
            <span style={{ fontSize: 12, opacity: 0.65, fontWeight: 700 }}>Providers</span>
          </div>
          <div style={{ padding: 16, flex: 1 }}>
            <UserIdentitiesBlock identities={identities} />
          </div>
        </section>

        <section style={card}>
          <div style={cardHead}>
            <span>Multi-factor (MFA)</span>
            <span style={{ fontSize: 12, opacity: 0.65, fontWeight: 700 }}>TOTP / factors</span>
          </div>
          <div style={{ padding: 16, flex: 1 }}>
            <UserMfaClient userId={user.id} factors={factors} />
          </div>
        </section>
      </div>

      <UserMembershipsClient userId={user.id} accounts={(accounts as any) || []} memberships={memRows} />
    </main>
  );
}
