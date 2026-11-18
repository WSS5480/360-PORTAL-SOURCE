import Link from "next/link";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import InviteClient from "./InviteClient";

export const dynamic = "force-dynamic";

function safeParam(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

export default async function AdminInvitePage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const sp = props.searchParams ? await props.searchParams : {};

  const initialEmail = safeParam((sp as any).email).trim().toLowerCase();
  const initialFullName = safeParam((sp as any).full_name).trim();
  const initialAccountId = safeParam((sp as any).account_id).trim();
  const fromPeople = safeParam((sp as any).fromPeople) === "1";

  const supabase: any = createSupabaseAdminClient();

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id,name,discount_percent,created_at")
    .order("name", { ascending: true })
    .limit(500);

  const { data: catalogProducts } = await supabase
    .from("products")
    .select("id, name, code, is_active")
    .eq("is_active", true)
    .order("name");

  const items = (accounts ?? []).map((a: any) => ({
    id: a.id as string,
    name: (a.name ?? "") as string,
    discount_percent:
      typeof a.discount_percent === "number"
        ? a.discount_percent
        : Number(a.discount_percent ?? 0),
  }));

  const products = (catalogProducts ?? []).map((p: any) => ({
    id: String(p.id),
    name: String(p.name || "Product"),
    code: p.code ?? null,
  }));

  return (
    <main style={{ width: "100%", maxWidth: "100%", minWidth: 0, padding: 0, boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>
            Invite User
          </h1>
          <p style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
            Invite a user to an existing account or create a new account and
            invite them in one step.
          </p>
        </div>

        {fromPeople ? (
          <Link href="/admin/people" style={{ fontSize: 13 }}>
            ← Back to People
          </Link>
        ) : (
          <Link href="/admin" style={{ fontSize: 13 }}>
            ← Back to dashboard
          </Link>
        )}
      </div>

      {error ? (
        <div
          style={{
            marginTop: 14,
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
            padding: 14,
            background: "white",
          }}
        >
          <div style={{ fontWeight: 900 }}>Could not load accounts</div>
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
            {error.message}
          </div>
          <div style={{ marginTop: 10, fontSize: 13 }}>
            You can still create a new account from{" "}
            <Link href="/admin/accounts/new">/admin/accounts/new</Link>.
          </div>
        </div>
      ) : (
        <InviteClient
          accounts={items}
          products={products}
          initialEmail={initialEmail}
          initialFullName={initialFullName}
          initialAccountId={initialAccountId}
          fromPeople={fromPeople}
        />
      )}
    </main>
  );
}
