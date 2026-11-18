import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { PartnerControls, RemoveMappingButton, RetrySyncButton, RevokeCredentialButton } from "../IntegrationsAdminClient";
import { AccountPolicyForm, ProductMapManager } from "../PartnerCatalogAdmin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const card: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 16,
  background: "white",
  padding: 16,
  overflowX: "auto",
};

function connectionLabel(environment: string, status: string, hasActiveKey: boolean) {
  if (environment === "production") return "Production not activated";
  if (status === "active" && hasActiveKey) return "Sandbox connected";
  if (status === "disabled") return "Disabled";
  return "Sandbox inactive";
}

export default async function AdminIntegrationPartnerPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  await requireAdmin();
  const { partnerId } = await params;
  if (!UUID_RE.test(partnerId)) notFound();

  const sb = createSupabaseAdminClient();
  const { data: partner, error } = await sb
    .from("integration_partners")
    .select(
      "id, code, name, environment, status, callback_base_url, auto_create_accounts, allow_direct_sku_match, approved_discount_percent, approved_payment_terms_days, approved_payment_terms_label"
    )
    .eq("id", partnerId)
    .maybeSingle();
  if (error || !partner) notFound();

  const [{ data: credentials }, { data: mappings }, { data: partnerOrders }, { data: requests }, { data: accounts }] =
    await Promise.all([
      sb
        .from("integration_credentials")
        .select("id, name, direction, key_prefix, scopes, active, revoked_at, last_used_at, created_at")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false }),
      sb
        .from("integration_partner_accounts")
        .select("id, partner_account_ref, customer_name, account_id, created_at")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false }),
      sb
        .from("integration_partner_orders")
        .select("id, external_order_number, order_id, created_at")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(50),
      sb
        .from("integration_inbound_requests")
        .select("request_id, method, path, http_status, error_code, external_order_number, created_at")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(50),
      sb.from("accounts").select("id, name").order("name", { ascending: true }).limit(500),
    ]);

  const accountIds = Array.from(new Set((mappings ?? []).map((row) => String(row.account_id))));
  const orderIds = Array.from(new Set((partnerOrders ?? []).map((row) => String(row.order_id || "")).filter(Boolean)));
  const [{ data: mappedAccounts }, { data: orders }] = await Promise.all([
    accountIds.length
      ? sb.from("accounts").select("id, name").in("id", accountIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    orderIds.length
      ? sb.from("orders").select("id, order_number, status, total").in("id", orderIds)
      : Promise.resolve({ data: [] as { id: string; order_number: string; status: string; total: number }[] }),
  ]);
  const [{ data: pricingRows }, issuesResult, mapsResult, variantsResult] = await Promise.all([
    accountIds.length
      ? sb
          .from("account_pricing")
          .select("account_id, discount_percent, payment_terms_label, payment_terms_days")
          .in("account_id", accountIds)
      : Promise.resolve({ data: [] as { account_id: string; discount_percent: number; payment_terms_label: string | null; payment_terms_days: number | null }[] }),
    sb
      .from("integration_partner_order_issues")
      .select("id, external_order_number, partner_account_ref, error_code, created_at")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(30),
    sb
      .from("integration_partner_product_maps")
      .select("id, external_sku, partner_product_name, product_variant_id, status, updated_at, product_variants(sku, size_label, manufacturer)")
      .eq("partner_id", partnerId)
      .order("external_sku", { ascending: true }),
    sb
      .from("product_variants")
      .select("id, sku, size_label, manufacturer, is_active")
      .eq("is_active", true)
      .order("sku", { ascending: true })
      .limit(400),
  ]);
  const pricingByAccount = new Map((pricingRows ?? []).map((row) => [String(row.account_id), row]));
  const issues = issuesResult.error ? [] : (issuesResult.data ?? []);
  const productMaps = mapsResult.error ? [] : (mapsResult.data ?? []);
  const catalogVariants = (variantsResult.data ?? []).map((row) => ({
    id: String(row.id),
    sku: String(row.sku),
    size_label: row.size_label == null ? null : String(row.size_label),
    manufacturer: row.manufacturer == null ? null : String(row.manufacturer),
  }));
  const accountName = new Map((mappedAccounts ?? []).map((row) => [String(row.id), String(row.name)]));
  const orderById = new Map((orders ?? []).map((row) => [String(row.id), row]));
  const hasActiveKey = (credentials ?? []).some((row) => row.active && !row.revoked_at && row.direction === "inbound");
  const jobsResult = await sb
    .from("integration_outbound_jobs")
    .select("id, external_order_number, event_type, status, attempt_count, last_http_status, last_error, blocked_reason, updated_at")
    .eq("partner_id", partnerId)
    .order("updated_at", { ascending: false })
    .limit(100);
  const jobs = jobsResult.error ? [] : (jobsResult.data ?? []);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
      <div>
        <Link href="/admin/integrations" style={{ fontWeight: 800, color: "var(--brand-700)" }}>
          ← Integrations
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 950, margin: "8px 0 0" }}>{partner.name}</h1>
        <p style={{ margin: "8px 0 0" }}>
          Connection: {connectionLabel(partner.environment, partner.status, hasActiveKey)}
          {partner.callback_base_url ? ` · Callback host saved` : ""}
        </p>
      </div>

      <PartnerControls partner={partner} accounts={(accounts ?? []).map((row) => ({ id: row.id, name: row.name }))} />

      <AccountPolicyForm
        partner={{
          id: partner.id,
          auto_create_accounts: partner.auto_create_accounts === true,
          allow_direct_sku_match: partner.allow_direct_sku_match !== false,
          approved_discount_percent: partner.approved_discount_percent == null ? null : Number(partner.approved_discount_percent),
          approved_payment_terms_days: partner.approved_payment_terms_days == null ? null : Number(partner.approved_payment_terms_days),
          approved_payment_terms_label: partner.approved_payment_terms_label ?? null,
        }}
      />

      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Credentials</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Prefix</th>
              <th style={{ padding: 8 }}>Scopes</th>
              <th style={{ padding: 8 }}>State</th>
              <th style={{ padding: 8 }}>Last used</th>
              <th style={{ padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {(credentials ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 8, opacity: 0.7 }}>
                  No credentials.
                </td>
              </tr>
            ) : (
              (credentials ?? []).map((row) => (
                <tr key={row.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: 8 }}>{row.name}</td>
                  <td style={{ padding: 8 }}>
                    <code>{row.key_prefix}</code>
                  </td>
                  <td style={{ padding: 8 }}>{(row.scopes ?? []).join(", ")}</td>
                  <td style={{ padding: 8 }}>{row.revoked_at ? "Revoked" : row.active ? "Active" : "Inactive"}</td>
                  <td style={{ padding: 8 }}>{row.last_used_at ? new Date(row.last_used_at).toLocaleString() : "—"}</td>
                  <td style={{ padding: 8 }}>
                    {row.revoked_at ? null : <RevokeCredentialButton partnerId={partnerId} credentialId={row.id} />}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Customer accounts</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>
          Auto-create: {partner.auto_create_accounts ? "Enabled" : "Disabled"}. An external customer id is unique for this partner. A later order does not rename a linked account or replace its pricing.
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: 8 }}>External customer ID</th>
              <th style={{ padding: 8 }}>Customer name</th>
              <th style={{ padding: 8 }}>360 account</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Pricing policy</th>
              <th style={{ padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {(mappings ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 8, opacity: 0.7 }}>
                  No customer accounts.
                </td>
              </tr>
            ) : (
              (mappings ?? []).map((row) => {
                const linkedName = accountName.get(String(row.account_id));
                const pricing = pricingByAccount.get(String(row.account_id));
                return (
                  <tr key={row.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <td style={{ padding: 8 }}>{row.partner_account_ref}</td>
                    <td style={{ padding: 8 }}>{row.customer_name || linkedName || "—"}</td>
                    <td style={{ padding: 8 }}>
                      {linkedName ? (
                        <Link href={`/admin/accounts/${row.account_id}`} style={{ fontWeight: 800, color: "var(--brand-700)" }}>
                          {linkedName}
                        </Link>
                      ) : (
                        "Account missing"
                      )}
                    </td>
                    <td style={{ padding: 8 }}>{linkedName ? "Linked" : "Unresolved"}</td>
                    <td style={{ padding: 8 }}>
                      {pricing
                        ? `${pricing.discount_percent}% · ${pricing.payment_terms_label || `${pricing.payment_terms_days ?? "—"} days`}`
                        : "Pricing missing"}
                    </td>
                    <td style={{ padding: 8 }}>
                      <RemoveMappingButton partnerId={partnerId} mappingId={row.id} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Unresolved customers and mapping errors</div>
        {issuesResult.error ? (
          <div style={{ color: "#9a3412" }}>Order diagnostics are not installed on this database yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: 8 }}>When</th>
                <th style={{ padding: 8 }}>External customer</th>
                <th style={{ padding: 8 }}>Partner order</th>
                <th style={{ padding: 8 }}>Error</th>
              </tr>
            </thead>
            <tbody>
              {issues.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 8, opacity: 0.7 }}>
                    No unresolved customers or mapping errors.
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <td style={{ padding: 8 }}>{new Date(issue.created_at).toLocaleString()}</td>
                    <td style={{ padding: 8 }}>{issue.partner_account_ref || "—"}</td>
                    <td style={{ padding: 8 }}>{issue.external_order_number || "—"}</td>
                    <td style={{ padding: 8 }}>{issue.error_code}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>

      {mapsResult.error ? (
        <section style={card}>
          <div style={{ fontWeight: 900 }}>Product mapping</div>
          <div style={{ color: "#9a3412" }}>Product mapping is not installed on this database yet.</div>
        </section>
      ) : (
        <ProductMapManager
          partnerId={partnerId}
          maps={productMaps.map((row) => ({
            id: String(row.id),
            external_sku: String(row.external_sku),
            partner_product_name: row.partner_product_name ?? null,
            product_variant_id: String(row.product_variant_id),
            status: String(row.status),
          }))}
          variants={catalogVariants}
        />
      )}

      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Mapped products</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: 8 }}>External SKU</th>
              <th style={{ padding: 8 }}>Partner product</th>
              <th style={{ padding: 8 }}>360 SKU</th>
              <th style={{ padding: 8 }}>Manufacturer and size</th>
              <th style={{ padding: 8 }}>Verification</th>
            </tr>
          </thead>
          <tbody>
            {productMaps.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 8, opacity: 0.7 }}>
                  No mapped products.
                </td>
              </tr>
            ) : (
              productMaps.map((row) => {
                const variant = Array.isArray(row.product_variants) ? row.product_variants[0] : row.product_variants;
                return (
                  <tr key={row.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <td style={{ padding: 8 }}>{row.external_sku}</td>
                    <td style={{ padding: 8 }}>{row.partner_product_name || "—"}</td>
                    <td style={{ padding: 8 }}>{variant?.sku || "—"}</td>
                    <td style={{ padding: 8 }}>
                      {[variant?.manufacturer, variant?.size_label].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td style={{ padding: 8 }}>{row.status}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Fulfillment synchronization</div>
        <p style={{ marginTop: 0, fontSize: 13, opacity: 0.75 }}>
          Pending, succeeded, failed, and blocked callback jobs. A blocked extra shipment stays visible. Retry queues the job again and the worker rechecks the current order.
        </p>
        {jobsResult.error ? (
          <div style={{ color: "#9a3412" }}>Outbound synchronization is not installed on this database yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: 8 }}>Partner order</th>
                <th style={{ padding: 8 }}>Event</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Attempts</th>
                <th style={{ padding: 8 }}>HTTP</th>
                <th style={{ padding: 8 }}>Detail</th>
                <th style={{ padding: 8 }} />
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 8, opacity: 0.7 }}>
                    No synchronization jobs.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <td style={{ padding: 8 }}>{job.external_order_number}</td>
                    <td style={{ padding: 8 }}>{job.event_type}</td>
                    <td style={{ padding: 8 }}>{job.status}</td>
                    <td style={{ padding: 8 }}>{job.attempt_count}</td>
                    <td style={{ padding: 8 }}>{job.last_http_status ?? "—"}</td>
                    <td style={{ padding: 8 }}>{job.blocked_reason || job.last_error || "—"}</td>
                    <td style={{ padding: 8 }}>
                      {job.status === "failed" || job.status === "blocked" ? <RetrySyncButton jobId={job.id} /> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>

      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Incoming API orders</div>
        <p style={{ marginTop: 0, fontSize: 13, opacity: 0.75 }}>
          The partner order number stays separate from the 360 order number. Short inventory is rejected and is not held as a backorder.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: 8 }}>Partner order</th>
              <th style={{ padding: 8 }}>360 order</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Total</th>
              <th style={{ padding: 8 }}>Received</th>
            </tr>
          </thead>
          <tbody>
            {(partnerOrders ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 8, opacity: 0.7 }}>
                  No API orders.
                </td>
              </tr>
            ) : (
              (partnerOrders ?? []).map((row) => {
                const order = orderById.get(String(row.order_id));
                return (
                  <tr key={row.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <td style={{ padding: 8 }}>{row.external_order_number}</td>
                    <td style={{ padding: 8 }}>
                      {order ? (
                        <Link href={`/admin/orders/${order.id}`} style={{ fontWeight: 800, color: "var(--brand-700)" }}>
                          {order.order_number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ padding: 8 }}>{order?.status ?? "—"}</td>
                    <td style={{ padding: 8 }}>{order ? Number(order.total).toFixed(2) : "—"}</td>
                    <td style={{ padding: 8 }}>{new Date(row.created_at).toLocaleString()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Request activity</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: 8 }}>When</th>
              <th style={{ padding: 8 }}>Method</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Error</th>
              <th style={{ padding: 8 }}>Partner order</th>
              <th style={{ padding: 8 }}>Request ID</th>
            </tr>
          </thead>
          <tbody>
            {(requests ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 8, opacity: 0.7 }}>
                  No requests.
                </td>
              </tr>
            ) : (
              (requests ?? []).map((row) => (
                <tr key={row.request_id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: 8 }}>{new Date(row.created_at).toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{row.method}</td>
                  <td style={{ padding: 8 }}>{row.http_status ?? "—"}</td>
                  <td style={{ padding: 8 }}>{row.error_code || "—"}</td>
                  <td style={{ padding: 8 }}>{row.external_order_number || "—"}</td>
                  <td style={{ padding: 8 }}>
                    <code>{row.request_id}</code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
