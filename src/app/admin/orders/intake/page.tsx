import Link from "next/link";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import OrderIntakeSelectorsClient from "./ui/OrderIntakeSelectorsClient";
import ProductPickerClient from "@/app/portal/orders/new/ProductPickerClient";
import { mapPendingInvitesToOrderIntakePeople } from "@/lib/orders/orderIntakeSelectedPerson";

export const dynamic = "force-dynamic";

function baseBorder(): React.CSSProperties {
  return { borderWidth: 1, borderStyle: "solid", borderColor: "rgba(0,0,0,0.2)" };
}

function safeParam(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function safeEmail(v: unknown): string {
  return safeStr(v).trim().toLowerCase();
}

async function loadUserProfilesByUserIds(supabase: any, userIds: string[]) {
  const map = new Map<string, { full_name?: string }>();
  if (!userIds.length) return map;

  const a = await supabase.from("user_profiles").select("user_id, full_name").in("user_id", userIds);
  if (!a.error && Array.isArray(a.data)) {
    for (const row of a.data) {
      const key = safeStr(row.user_id);
      if (key) map.set(key, { full_name: safeStr(row.full_name) });
    }
    return map;
  }

  const b = await supabase.from("user_profiles").select("id, full_name").in("id", userIds);
  if (!b.error && Array.isArray(b.data)) {
    for (const row of b.data) {
      const key = safeStr(row.id);
      if (key) map.set(key, { full_name: safeStr(row.full_name) });
    }
    return map;
  }

  return map;
}

async function loadAuthEmailsByUserIds(adminSb: any, userIds: string[]) {
  const emailById = new Map<string, string>();
  const authAdmin = adminSb?.auth?.admin;
  const getUserById = authAdmin?.getUserById;
  if (typeof getUserById !== "function") return emailById;

  for (const id of userIds) {
    try {
      const res = await authAdmin.getUserById(id);
      const email = safeEmail(res?.data?.user?.email);
      if (email) emailById.set(id, email);
    } catch {
      // ignore
    }
  }

  return emailById;
}

function section(title: string, children: React.ReactNode) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 12,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "rgba(0,0,0,0.12)",
        borderRadius: 10,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>{title}</div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

export default async function AdminOrdersIntakePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOrdersStaffOrAdmin();

  const sp = await props.searchParams;
  const selectedAccountId = safeParam((sp as any).account_id);
  const selectedPersonKey = safeParam((sp as any).person);

  const supabase: any = await createSupabaseServerClient();
  const adminSb: any = createSupabaseAdminClient();

  const { data: accounts, error: accountsErr } = await supabase
    .from("accounts")
    .select("id, name, is_active")
    .order("name", { ascending: true });

  const { data: savedRecipients, error: savedRecipientsErr } = selectedAccountId
    ? await supabase
        .from("account_contacts")
        .select("id, full_name, email, created_at")
        .eq("account_id", selectedAccountId)
        .order("created_at", { ascending: false })
    : { data: [] as any[], error: null as any };

  let portalMembers: any[] = [];
  let portalMembersErr: any = null;

  if (selectedAccountId) {
    const res = await supabase.from("account_users").select("user_id, role, disabled_at").eq("account_id", selectedAccountId);

    if (res.error) {
      portalMembersErr = res.error;
    } else {
      const rows = res.data || [];
      const userIds = rows.map((r: any) => safeStr(r.user_id)).filter(Boolean);

      const [profilesById, authEmailById] = await Promise.all([
        loadUserProfilesByUserIds(supabase, userIds),
        loadAuthEmailsByUserIds(adminSb, userIds),
      ]);

      portalMembers = rows.map((r: any) => {
        const uid = safeStr(r.user_id);
        const prof = profilesById.get(uid);
        const email = authEmailById.get(uid) || "";
        const name =
          safeStr(prof?.full_name) ||
          (email ? email.split("@")[0] : uid ? `User ${uid.slice(0, 6)}` : "Portal User");

        return {
          user_id: uid,
          role: safeStr(r.role),
          disabled_at: r.disabled_at ?? null,
          display_name: name,
          display_email: email,
        };
      });
    }
  }

  let pendingInvites: any[] = [];
  let pendingInvitesErr: any = null;
  if (selectedAccountId) {
    const res = await supabaseAdmin
      .from("account_invites")
      .select("id, email, full_name, role, accepted_at, revoked_at, archived_at, expires_at, created_at")
      .eq("account_id", selectedAccountId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (res.error) pendingInvitesErr = res.error;
    else pendingInvites = res.data || [];
  }

  const savedPeople = (savedRecipients || [])
    .filter((u: any) => safeEmail(u.email))
    .map((u: any) => ({
      kind: "ACCOUNT_USER" as const,
      id: safeStr(u.id),
      name: safeStr(u.full_name) || safeEmail(u.email) || "Recipient",
      email: safeEmail(u.email),
    }));

  const portalPeople = (portalMembers || []).map((m: any) => ({
    kind: "PORTAL_MEMBER" as const,
    id: safeStr(m.user_id),
    name: safeStr(m.display_name) || "Portal User",
    email: safeEmail(m.display_email),
    role: safeStr(m.role),
    disabled: Boolean(m.disabled_at),
  }));

  const occupiedEmails = [...savedPeople, ...portalPeople].map((p) => p.email);
  const invitedPeople = mapPendingInvitesToOrderIntakePeople(pendingInvites, occupiedEmails);

  const people = [...savedPeople, ...portalPeople, ...invitedPeople].filter((p) => p.id);

  // If no account selected, render selector only
  if (!selectedAccountId) {
    return (
      <div style={{ padding: 16, maxWidth: 1100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900 }}>Admin Order Intake</h1>
            <p style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
              Create an order on behalf of a customer (portal access optional).
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/admin/orders" style={{ fontSize: 13 }}>
              ← Back to Orders
            </Link>
          </div>
        </div>

        <form method="post" action="/admin/orders/intake/submit" style={{ marginTop: 14 }}>
          {section(
            "Step 1 — Choose Account + User",
            <>
              {accountsErr ? (
                <div style={{ color: "crimson", fontSize: 13 }}>
                  Failed to load accounts: {String(accountsErr?.message || accountsErr)}
                </div>
              ) : null}

              <OrderIntakeSelectorsClient
                accounts={(accounts || []) as any}
                selectedAccountId={selectedAccountId}
                people={people as any}
                initialSelectedPersonKey={selectedPersonKey}
                createAccountHref="/admin/orders/intake/new-account"
              />
            </>
          )}
        </form>
      </div>
    );
  }

  const { data: accountRow } = await supabaseAdmin
    .from("accounts")
    .select("name, discount_percent")
    .eq("id", selectedAccountId)
    .maybeSingle();

  const { data: pricing } = await supabaseAdmin
    .from("account_pricing")
    .select("discount_percent, payment_terms_label, payment_terms_days, bulk_enabled, bulk_rules, virtual_warehouse_enabled")
    .eq("account_id", selectedAccountId)
    .maybeSingle();

  const accountName = accountRow?.name ?? "—";
  const discount = Number(pricing?.discount_percent ?? accountRow?.discount_percent ?? 0) || 0;
  const terms =
    pricing?.payment_terms_label ??
    (pricing?.payment_terms_days ? `Net ${pricing.payment_terms_days}` : "—");

  const { data: addressRows } = await supabaseAdmin
    .from("account_addresses")
    .select("id, kind, label, is_default, address, disabled_at, created_at")
    .eq("account_id", selectedAccountId)
    .is("disabled_at", null)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  const billingAddresses = (addressRows ?? []).filter((r: any) => String(r.kind).toUpperCase() === "BILLING");
  const shippingAddresses = (addressRows ?? []).filter((r: any) => String(r.kind).toUpperCase() === "SHIPPING");
  const defaultBillingId = billingAddresses.find((r: any) => !!r.is_default)?.id ?? "";
  const defaultShippingId = shippingAddresses.find((r: any) => !!r.is_default)?.id ?? "";

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, name, code, qcode, is_active, bulk_enabled, base_unit_price, brochure_file_id")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(300);

  const productIds = (products ?? []).map((p: any) => String(p.id)).filter(Boolean);

  let variants: any[] = [];
  if (productIds.length > 0) {
    const { data: vData } = await supabaseAdmin
      .from("product_variants")
      .select("id, product_id, sku, size_label, base_unit_price, is_active, bulk_enabled, width_cm, length_cm, total_sqcm")
      .eq("is_active", true)
      .in("product_id", productIds)
      .order("sku", { ascending: true })
      .limit(2500);
    variants = vData ?? [];
  }

  const variantIds = variants.map((v: any) => String(v.id)).filter(Boolean);
  let inventoryRows: Array<{ variant_id: string; qty_on_hand: number; updated_at: string | null }> = [];
  if (variantIds.length > 0) {
    const { data: inv } = await supabaseAdmin
      .from("product_variant_inventory")
      .select("variant_id, qty_on_hand, updated_at")
      .in("variant_id", variantIds);
    inventoryRows = (inv ?? []).map((r: any) => ({
      variant_id: String(r.variant_id),
      qty_on_hand: Number(r.qty_on_hand ?? 0) || 0,
      updated_at: r.updated_at ? String(r.updated_at) : null,
    }));
  }

  const brochureIds = (products ?? [])
    .map((p: any) => (p.brochure_file_id ? String(p.brochure_file_id) : ""))
    .filter((id: string) => !!id);

  let brochuresByProduct: Record<string, { file_id: string; original_filename: string | null } | null> = {};
  if (brochureIds.length > 0) {
    const { data: fileRows } = await supabaseAdmin.from("files").select("id, original_filename").in("id", brochureIds);
    const byFileId = new Map<string, { id: string; original_filename: string | null }>();
    for (const f of fileRows ?? []) {
      byFileId.set(String((f as any).id), {
        id: String((f as any).id),
        original_filename: (f as any).original_filename ? String((f as any).original_filename) : null,
      });
    }
    for (const p of products ?? []) {
      const pid = String((p as any).id);
      const fid = (p as any).brochure_file_id ? String((p as any).brochure_file_id) : "";
      brochuresByProduct[pid] =
        fid && byFileId.get(fid) ? { file_id: fid, original_filename: byFileId.get(fid)!.original_filename } : null;
    }
  } else {
    for (const p of products ?? []) brochuresByProduct[String((p as any).id)] = null;
  }

  return (
    <form method="post" action="/admin/orders/intake/submit" style={{ display: "grid", gap: 16, maxWidth: 1100, padding: 16 }}>
      <div
        style={{
          borderRadius: 22,
          overflow: "hidden",
          border: "1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border))",
          background:
            "radial-gradient(900px 240px at 20% 10%, color-mix(in srgb, var(--brand-600) 42%, transparent), transparent 60%)," +
            "linear-gradient(180deg, #061225, #050b16)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <div style={{ padding: 18, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", fontWeight: 950, letterSpacing: 0.4, textTransform: "uppercase" }}>
            360 Portal
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.3, margin: 0, color: "white" }}>
            Admin Order Intake
          </h1>
          <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 14 }}>
            Account: <b style={{ color: "white" }}>{accountName}</b>
          </div>
          <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 800 }}>
            Discount <b style={{ color: "white" }}>{discount}%</b> · Terms <b style={{ color: "white" }}>{terms}</b>
          </div>
          <div>
            <Link
              href="/admin/orders"
              style={{
                ...baseBorder(),
                padding: "8px 12px",
                borderRadius: 12,
                color: "white",
                textDecoration: "none",
                fontWeight: 900,
                background: "rgba(255,255,255,0.10)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ← Back to Orders
            </Link>
          </div>
        </div>
      </div>

      {section(
        "Step 1 — Choose Account + User",
        <>
          {accountsErr ? (
            <div style={{ color: "crimson", fontSize: 13 }}>
              Failed to load accounts: {String(accountsErr?.message || accountsErr)}
            </div>
          ) : null}

          {savedRecipientsErr ? (
            <div style={{ marginTop: 10, color: "crimson", fontSize: 13 }}>
              Failed to load saved recipients: {String(savedRecipientsErr?.message || savedRecipientsErr)}
            </div>
          ) : null}

          {portalMembersErr ? (
            <div style={{ marginTop: 10, color: "crimson", fontSize: 13 }}>
              Failed to load portal members: {String(portalMembersErr?.message || portalMembersErr)}
            </div>
          ) : null}

          {pendingInvitesErr ? (
            <div style={{ marginTop: 10, color: "crimson", fontSize: 13 }}>
              Failed to load invited users: {String(pendingInvitesErr?.message || pendingInvitesErr)}
            </div>
          ) : null}

          <OrderIntakeSelectorsClient
            accounts={(accounts || []) as any}
            selectedAccountId={selectedAccountId}
            people={people as any}
            initialSelectedPersonKey={selectedPersonKey}
            createAccountHref="/admin/orders/intake/new-account"
          />

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            <strong>Saved Recipients</strong> are name+email records you can invite later.{" "}
            <strong>Portal Members</strong> are real logins tied to the portal.{" "}
            <strong>Invited Users</strong> have a pending invite and can be selected before they sign in.
          </div>
        </>
      )}

      <ProductPickerClient
        discountPercent={discount}
        termsLabel={terms}
        bulkEnabled={!!pricing?.bulk_enabled}
        virtualWarehouseEnabled={!!(pricing as any)?.virtual_warehouse_enabled}
        bulkRules={Array.isArray(pricing?.bulk_rules) ? (pricing?.bulk_rules as any) : []}
        products={(products ?? []) as any}
        variants={(variants ?? []) as any}
        inventoryRows={inventoryRows}
        brochuresByProduct={brochuresByProduct}
        billingAddresses={(billingAddresses ?? []) as any}
        shippingAddresses={(shippingAddresses ?? []) as any}
        defaultBillingId={defaultBillingId ? String(defaultBillingId) : ""}
        defaultShippingId={defaultShippingId ? String(defaultShippingId) : ""}
        addressBookApiUrl={`/api/admin/accounts/${encodeURIComponent(selectedAccountId)}/addresses`}
      />
    </form>
  );
}
