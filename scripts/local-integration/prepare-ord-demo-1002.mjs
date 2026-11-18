/**
 * Prepare a new synthetic local order for ORD-DEMO-1002 and queue four
 * callback jobs. Does not rotate credentials, does not enable outbound,
 * and does not rename ORD-DEMO-1001.
 */
import { createDecipheriv, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXTERNAL_ORDER = "ORD-DEMO-1002";
const LOCAL_ORDER = "ORD-LOCAL-DEMO-1002";
const FORBIDDEN = ["supabase.360medical.net", "app.360medical.net", "sk_live_", "pk_live_", "rk_live_"];
const SYNTHETIC_PAY_URL = "https://example.test/synthetic-pay/ord-demo-1002";

const env = {};
for (const line of readFileSync(path.join(root, ".env.local.test"), "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
  const index = trimmed.indexOf("=");
  env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
}

function refuse(message) {
  throw new Error(message);
}

if (env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321") refuse("Supabase URL is not the local stack.");
if (env.INTEGRATION_OUTBOUND_ENABLED === "true") refuse("Outbound delivery is enabled. Leave it disabled.");
if (!String(env.STRIPE_SECRET_KEY || "").startsWith("sk_test_")) refuse("Stripe secret is not a test key.");
if (env.STRIPE_API_HOST && env.STRIPE_API_HOST !== "127.0.0.1" && env.STRIPE_API_HOST !== "localhost") {
  refuse("Stripe host is not loopback.");
}
if (env.FEDEX_ENV === "production") refuse("FedEx is set to production.");
for (const marker of FORBIDDEN) {
  if (Object.entries(env).some(([, value]) => String(value).includes(marker))) {
    refuse(`Refusing production marker ${marker}.`);
  }
}

const token = String(env.NIMBLE_STAGING_KEY || "").trim();
if (!token) refuse("NIMBLE_STAGING_KEY is missing.");
if (!token.startsWith("nimble_pk_")) refuse("NIMBLE_STAGING_KEY does not have the expected Nimble prefix.");
const CALLBACK_URL = String(env.NIMBLE_STAGING_CALLBACK_URL || "").trim().replace(/\/$/, "");
if (!CALLBACK_URL) {
  refuse("Set NIMBLE_STAGING_CALLBACK_URL in .env.local.test to the https callback origin for this lab.");
}

function keyBytes(raw) {
  const value = raw?.trim();
  if (!value) return null;
  if (/^[a-f0-9]{64}$/i.test(value)) return Buffer.from(value, "hex");
  const decoded = Buffer.from(value, "base64");
  if (decoded.length === 32) return decoded;
  return createHash("sha256").update(value, "utf8").digest();
}

function decryptOutboundSecret(ciphertext, keyMaterial) {
  const key = keyBytes(keyMaterial);
  if (!key) return null;
  const parts = String(ciphertext || "").split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  try {
    const iv = Buffer.from(parts[1] ?? "", "base64url");
    const tag = Buffer.from(parts[2] ?? "", "base64url");
    const encrypted = Buffer.from(parts[3] ?? "", "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

function payloadHash(payload) {
  const keys = Object.keys(payload).sort();
  return createHash("sha256").update(JSON.stringify(payload, keys), "utf8").digest("hex");
}

function digest(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function rest(method, pathname, body) {
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}${pathname}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${pathname} ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const partners = await rest(
  "GET",
  "/rest/v1/integration_partners?code=eq.nimble&environment=eq.sandbox&select=id,code,environment,status,adapter_code,callback_base_url"
);
const partner = partners?.[0];
if (!partner) refuse("Local Nimble sandbox partner was not found.");
if (partner.environment !== "sandbox") refuse("Refusing to configure a non-sandbox partner.");
if (partner.status !== "active") refuse(`Local Nimble partner is ${partner.status}.`);
if (partner.callback_base_url !== CALLBACK_URL) {
  refuse(`Callback URL is ${partner.callback_base_url}, not Nimble staging.`);
}

const creds = await rest(
  "GET",
  `/rest/v1/integration_credentials?partner_id=eq.${partner.id}&direction=eq.outbound&active=eq.true&revoked_at=is.null&select=id,secret_ciphertext,active,revoked_at,created_at&order=created_at.desc`
);
const credential = creds?.[0];
if (!credential) refuse("Active outbound staging credential is missing.");
const decrypted = decryptOutboundSecret(credential.secret_ciphertext, env.INTEGRATION_CREDENTIALS_KEY);
if (!decrypted) refuse("Outbound staging credential could not be decrypted.");
if (digest(decrypted) !== digest(token)) refuse("Stored outbound credential does not match NIMBLE_STAGING_KEY.");

const existing1002 = await rest(
  "GET",
  `/rest/v1/integration_partner_orders?partner_id=eq.${partner.id}&external_order_number=eq.${EXTERNAL_ORDER}&select=id,order_id,external_order_number`
);
if (existing1002?.[0]) refuse("ORD-DEMO-1002 already exists. Refusing to reuse or mutate it.");

const leftover1001 = await rest(
  "GET",
  "/rest/v1/integration_partner_orders?external_order_number=eq.ORD-DEMO-1001&select=id,order_id,external_order_number"
);
if (leftover1001?.[0]?.order_id === undefined) {
  // ORD-DEMO-1001 may still exist; we only refuse to rename it.
}

const now = new Date().toISOString();
const held = await rest(
  "PATCH",
  `/rest/v1/integration_outbound_jobs?status=eq.pending&external_order_number=neq.${EXTERNAL_ORDER}`,
  { next_attempt_at: "2099-01-01T00:00:00.000Z", updated_at: now }
);

const accounts = await rest(
  "GET",
  "/rest/v1/integration_partner_accounts?partner_account_ref=eq.clinic-synthetic-001&select=account_id"
);
const accountId = accounts?.[0]?.account_id;
if (!accountId) refuse("Synthetic test clinic mapping is missing.");

const variants = await rest("GET", "/rest/v1/product_variants?sku=eq.SYN-2X2&select=id");
const variantId = variants?.[0]?.id;
if (!variantId) refuse("Synthetic SKU SYN-2X2 is missing.");

const created = (
  await rest("POST", "/rest/v1/orders", {
    account_id: accountId,
    order_number: LOCAL_ORDER,
    status: "PARTIALLY_PAID",
    shipping_priority: "GROUND",
    bulk_mode: false,
    discount_percent_snapshot: 10,
    payment_terms_label_snapshot: "Net 30",
    payment_terms_days_snapshot: 30,
    subtotal: 90,
    shipping_total: 5,
    total: 95,
    placed_at: "2026-11-02T15:00:00.000Z",
  })
)[0];
const orderId = created.id;

await rest("POST", "/rest/v1/order_items", {
  order_id: orderId,
  sort_order: 1,
  product_variant_id: variantId,
  description: "Synthetic graft 2x2 for Nimble staging callback test ORD-DEMO-1002",
  quantity: 1,
  uom: "Units",
  unit_price: 100,
  discount_percent: 10,
  line_total: 90,
  line_type: "product",
});

const partnerOrder = (
  await rest("POST", "/rest/v1/integration_partner_orders", {
    partner_id: partner.id,
    external_order_number: EXTERNAL_ORDER,
    idempotency_key: EXTERNAL_ORDER,
    request_hash: digest(`${partner.id}:${EXTERNAL_ORDER}:local-staging-fixture`),
    order_id: orderId,
  })
)[0];

const invoice = (
  await rest("POST", "/rest/v1/invoices", {
    order_id: orderId,
    account_id: accountId,
    invoice_number: "INV-DEMO-1002",
    invoice_kind: "PRIMARY",
    status: "ISSUED",
    subtotal: 90,
    shipping_total: 5,
    tax: 0,
    total: 95,
    amount_paid: 20,
    issued_at: "2026-11-02T16:30:00.000Z",
    metadata: {
      partner_checkout: {
        url: SYNTHETIC_PAY_URL,
        session_id: "synthetic_ord_demo_1002",
        payment_intent_id: "pi_test_ord_demo_1002",
        amount_cents: 7500,
        created_at: "2026-11-02T16:31:00.000Z",
      },
    },
  })
)[0];

const fulfillment = (
  await rest("POST", "/rest/v1/fulfillments", {
    order_id: orderId,
    invoice_id: invoice.id,
    status: "CLOSED",
    tracking_number: "TEST-ORD-DEMO-1002",
    dropship_carrier: "TestCarrier",
    shipped_at: "2026-11-02T18:00:00.000Z",
    closed_at: "2026-11-02T18:05:00.000Z",
    metadata: { shipping: { tracking_number: "TEST-ORD-DEMO-1002", carrier: "TestCarrier" } },
  })
)[0];

await rest("POST", "/rest/v1/invoice_payments", {
  invoice_id: invoice.id,
  amount: 20,
  note: "synthetic:pi_test_ord_demo_1002",
  payment_method: "credit_card",
  confirmation_code: "ch_test_ord_demo_1002",
  external_payment_id: "pi_test_ord_demo_1002",
  paid_at: "2026-11-02T17:00:00.000Z",
});

const planned = [
  {
    event_type: "invoice",
    business_key: `invoice:${invoice.id}`,
    payload: {
      invoice_number: "INV-DEMO-1002",
      final_total: 95,
      invoiced_at: "2026-11-02T16:30:00.000Z",
    },
  },
  {
    event_type: "shipment",
    business_key: `shipment:${fulfillment.id}`,
    payload: {
      tracking_number: "TEST-ORD-DEMO-1002",
      ship_via: "TestCarrier",
      shipped_at: "2026-11-02T18:00:00.000Z",
    },
  },
  {
    event_type: "payment-link",
    business_key: `payment-link:${invoice.id}`,
    payload: { payment_link_url: SYNTHETIC_PAY_URL },
  },
  {
    event_type: "payment",
    business_key: "payment:pi_test_ord_demo_1002",
    payload: {
      amount: 20,
      payment_date: "2026-11-02",
      payment_method: "credit_card",
      confirmation_code: "ch_test_ord_demo_1002",
    },
  },
];

for (const job of planned) {
  await rest("POST", "/rest/v1/integration_outbound_jobs", {
    partner_id: partner.id,
    order_id: orderId,
    external_order_number: EXTERNAL_ORDER,
    event_type: job.event_type,
    business_key: job.business_key,
    payload: job.payload,
    payload_hash: payloadHash(job.payload),
    status: "pending",
    attempt_count: 0,
    max_attempts: 8,
    next_attempt_at: now,
    last_http_status: null,
    last_error: null,
    blocked_reason: null,
  });
}

const jobs = await rest(
  "GET",
  `/rest/v1/integration_outbound_jobs?order_id=eq.${orderId}&select=event_type,status,external_order_number,blocked_reason,last_http_status,payload&order=event_type.asc`
);
const pendingOther = await rest(
  "GET",
  `/rest/v1/integration_outbound_jobs?status=eq.pending&external_order_number=neq.${EXTERNAL_ORDER}&select=id,event_type,external_order_number,next_attempt_at`
);

console.log(
  JSON.stringify(
    {
      outbound_enabled: env.INTEGRATION_OUTBOUND_ENABLED,
      supabase_local: true,
      stripe_is_test: true,
      stripe_host: env.STRIPE_API_HOST || null,
      fedex_env: env.FEDEX_ENV,
      credential_matches_env_key: true,
      partner: {
        id: partner.id,
        code: partner.code,
        environment: partner.environment,
        status: partner.status,
        callback_base_url: partner.callback_base_url,
      },
      order: {
        local_order_id: orderId,
        local_order_number: LOCAL_ORDER,
        partner_order_number: partnerOrder.external_order_number,
      },
      held_unrelated_pending: Array.isArray(held) ? held.length : held ? 1 : 0,
      unrelated_pending_remaining: (pendingOther || []).map((row) => ({
        event_type: row.event_type,
        external_order_number: row.external_order_number,
        next_attempt_at: row.next_attempt_at,
      })),
      jobs: (jobs || []).map((job) => ({
        event_type: job.event_type,
        status: job.status,
        external_order_number: job.external_order_number,
        payload_keys: Object.keys(job.payload || {}).sort(),
        payment_link_host: job.payload?.payment_link_url ? new URL(job.payload.payment_link_url).host : null,
        payment_link_is_https: String(job.payload?.payment_link_url || "").startsWith("https://"),
        payment_link_is_stripe_checkout: String(job.payload?.payment_link_url || "").includes("checkout.stripe.com"),
      })),
    },
    null,
    2
  )
);
