/**
 * Seed the local Supabase stack with synthetic catalog data and a test admin.
 * Reads nothing from .env.local.
 */
import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const api = "http://127.0.0.1:54321";
const anon =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const service =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const credentialsKey = randomBytes(32).toString("base64");
const adminEmail = "local-admin@example.test";
const adminPassword = "Local-Test-Admin-2026!";
const inboundToken = `360_${randomBytes(24).toString("base64url")}`;
const outboundToken = `local-nimble-bearer-${randomBytes(8).toString("hex")}`;

function encryptToken(token) {
  const key = Buffer.from(credentialsKey, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

async function rest(method, pathName, body) {
  const response = await fetch(`${api}${pathName}`, {
    method,
    headers: {
      apikey: service,
      authorization: `Bearer ${service}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${pathName} ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const created = await fetch(`${api}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    apikey: service,
    authorization: `Bearer ${service}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ email: adminEmail, password: adminPassword, email_confirm: true }),
});
const createdBody = await created.json();
if (!created.ok && created.status !== 422) {
  throw new Error(`Could not create local admin: ${created.status}`);
}
let userId = createdBody?.id || createdBody?.user?.id;
if (!userId) {
  const listed = await fetch(`${api}/auth/v1/admin/users?email=${encodeURIComponent(adminEmail)}`, {
    headers: { apikey: service, authorization: `Bearer ${service}` },
  });
  const listBody = await listed.json();
  userId = (listBody?.users || []).find((user) => user.email === adminEmail)?.id;
}
if (!userId) throw new Error("Local admin user id was not returned.");

const accountId = randomUUID();
const productId = randomUUID();
const variantId = randomUUID();
const partnerId = randomUUID();

await rest("POST", "/rest/v1/accounts", { id: accountId, name: "Synthetic Test Clinic", is_demo: false });
await rest("POST", "/rest/v1/account_pricing", {
  account_id: accountId,
  discount_percent: 10,
  payment_terms_label: "Net 30",
  payment_terms_days: 30,
});
await rest("POST", "/rest/v1/products", { id: productId, name: "Synthetic Graft", is_active: true });
await rest("POST", "/rest/v1/product_variants", {
  id: variantId,
  product_id: productId,
  sku: "SYN-2X2",
  size_label: "2x2",
  base_unit_price: 100,
  width_cm: 2,
  length_cm: 2,
  total_sqcm: 4,
  is_active: true,
});
await rest("POST", "/rest/v1/product_variant_inventory", { variant_id: variantId, qty_on_hand: 5 });
await rest("POST", "/rest/v1/variant_inventory", { variant_id: variantId, on_hand: 5 });
await rest("POST", "/rest/v1/user_profiles", {
  user_id: userId,
  email: adminEmail,
  full_name: "Local Test Admin",
  is_admin: true,
});
await rest("POST", "/rest/v1/internal_users", { user_id: userId, role: "ADMIN" });
await rest("POST", "/rest/v1/integration_partners", {
  id: partnerId,
  code: "nimble",
  name: "Nimble",
  environment: "sandbox",
  status: "active",
  adapter_code: "fulfillment-callbacks-v1",
  callback_base_url: "http://127.0.0.1:9099",
});
await rest("POST", "/rest/v1/integration_partner_accounts", {
  partner_id: partnerId,
  account_id: accountId,
  partner_account_ref: "clinic-synthetic-001",
});
await rest("POST", "/rest/v1/integration_credentials", {
  partner_id: partnerId,
  direction: "inbound",
  name: "Local test key",
  key_prefix: inboundToken.slice(0, 12),
  key_hash: createHash("sha256").update(inboundToken).digest("hex"),
  scopes: ["orders:read", "orders:write"],
  active: true,
});
await rest("POST", "/rest/v1/integration_credentials", {
  partner_id: partnerId,
  direction: "outbound",
  name: "Local mock bearer",
  key_prefix: "outbound",
  secret_ciphertext: encryptToken(outboundToken),
  scopes: ["fulfillment:write"],
  active: true,
});

const env = {
  NEXT_PUBLIC_SUPABASE_URL: api,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
  SUPABASE_SERVICE_ROLE_KEY: service,
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3010",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3010",
  STRIPE_SECRET_KEY: "sk_test_local_integration_not_a_live_key",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_local_integration_not_a_live_key",
  STRIPE_WEBHOOK_SECRET: "whsec_local_integration_not_live",
  FEDEX_ENV: "sandbox",
  FEDEX_CLIENT_ID: "local-test",
  FEDEX_CLIENT_SECRET: "local-test",
  FEDEX_ACCOUNT_NUMBER: "000000000",
  INTEGRATION_WORKER_SECRET: "local-integration-worker-secret",
  INTEGRATION_CREDENTIALS_KEY: credentialsKey,
  INTEGRATION_OUTBOUND_ENABLED: "false",
  LOCAL_ADMIN_EMAIL: adminEmail,
  LOCAL_ADMIN_PASSWORD: adminPassword,
  LOCAL_PARTNER_API_KEY: inboundToken,
};
const forbidden = ["supabase.360medical.net", "app.360medical.net", "sk_live_", "pk_live_", "rk_live_"];
const joined = Object.entries(env).map(([key, value]) => `${key}=${value}`).join("\n");
for (const marker of forbidden) {
  if (joined.includes(marker)) throw new Error(`Refusing test env marker ${marker}`);
}
if (env.FEDEX_ENV === "production") throw new Error("Refusing FedEx production.");
writeFileSync(path.join(root, ".env.local.test"), `${joined}\n`, "utf8");

console.log(JSON.stringify({ adminEmail, userId, accountId, variantId, partnerId }, null, 2));
