/**
 * Store the Nimble staging bearer on the local sandbox partner and queue
 * four callback jobs for ORD-DEMO-1001. Does not run the outbound worker.
 * Reads only .env.local.test. Refuses production hosts.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXTERNAL_ORDER = "ORD-DEMO-1001";
const FORBIDDEN = ["supabase.360medical.net", "app.360medical.net", "sk_live_", "pk_live_", "rk_live_"];

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
if (env.INTEGRATION_OUTBOUND_ENABLED === "true") refuse("Outbound delivery is enabled. Leave it disabled while configuring.");
if (!String(env.STRIPE_SECRET_KEY || "").startsWith("sk_test_")) refuse("Stripe secret is not a test key.");
if (env.FEDEX_ENV === "production") refuse("FedEx is set to production.");
for (const marker of FORBIDDEN) {
  if (Object.entries(env).some(([, value]) => String(value).includes(marker))) {
    refuse(`Refusing production marker ${marker}.`);
  }
}

const token = String(env.NIMBLE_STAGING_KEY || "").trim();
if (!token) refuse("NIMBLE_STAGING_KEY is missing.");
if (token.length < 20) refuse("NIMBLE_STAGING_KEY is too short for outbound storage.");
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

function encryptOutboundSecret(plaintext, keyMaterial) {
  const key = keyBytes(keyMaterial);
  if (!key || !plaintext) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptOutboundSecret(ciphertext, keyMaterial) {
  const key = keyBytes(keyMaterial);
  if (!key) return null;
  const parts = ciphertext.split(".");
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

const ciphertext = encryptOutboundSecret(token, env.INTEGRATION_CREDENTIALS_KEY);
if (!ciphertext) refuse("Could not encrypt the staging key with INTEGRATION_CREDENTIALS_KEY.");
const decrypted = decryptOutboundSecret(ciphertext, env.INTEGRATION_CREDENTIALS_KEY);
const roundtrip = Boolean(decrypted) && digest(decrypted) === digest(token);

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

const now = new Date().toISOString();
await rest(
  "PATCH",
  `/rest/v1/integration_credentials?partner_id=eq.${partner.id}&direction=eq.outbound&active=eq.true`,
  { active: false, revoked_at: now }
);

const credential = (
  await rest("POST", "/rest/v1/integration_credentials", {
    partner_id: partner.id,
    direction: "outbound",
    name: "Nimble staging bearer",
    key_prefix: "outbound",
    secret_ciphertext: ciphertext,
    scopes: ["fulfillment:write"],
    active: true,
  })
)[0];

const updatedPartner = (
  await rest("PATCH", `/rest/v1/integration_partners?id=eq.${partner.id}`, {
    callback_base_url: CALLBACK_URL,
    updated_at: now,
  })
)[0];

const accounts = await rest(
  "GET",
  "/rest/v1/integration_partner_accounts?partner_account_ref=eq.clinic-synthetic-001&select=account_id"
);
const accountId = accounts?.[0]?.account_id;
if (!accountId) refuse("Synthetic test clinic mapping is missing.");

const variants = await rest("GET", "/rest/v1/product_variants?sku=eq.SYN-2X2&select=id");
const variantId = variants?.[0]?.id;
if (!variantId) refuse("Synthetic SKU SYN-2X2 is missing.");

let partnerOrder = (
  await rest(
    "GET",
    `/rest/v1/integration_partner_orders?partner_id=eq.${partner.id}&external_order_number=eq.${EXTERNAL_ORDER}&select=id,order_id,external_order_number`
  )
)[0];

let orderId = partnerOrder?.order_id || null;
if (!orderId) {
  const created = (
    await rest("POST", "/rest/v1/orders", {
      account_id: accountId,
      order_number: "ORD-LOCAL-DEMO-1001",
      status: "PARTIALLY_PAID",
      shipping_priority: "GROUND",
      bulk_mode: false,
      discount_percent_snapshot: 10,
      payment_terms_label_snapshot: "Net 30",
      payment_terms_days_snapshot: 30,
      subtotal: 90,
      shipping_total: 5,
      total: 95,
      placed_at: "2026-10-28T15:00:00.000Z",
    })
  )[0];
  orderId = created.id;
  await rest("POST", "/rest/v1/order_items", {
    order_id: orderId,
    sort_order: 1,
    product_variant_id: variantId,
    description: "Synthetic graft 2x2 for Nimble staging callback test",
    quantity: 1,
    uom: "Units",
    unit_price: 100,
    discount_percent: 10,
    line_total: 90,
    line_type: "product",
  });
  partnerOrder = (
    await rest("POST", "/rest/v1/integration_partner_orders", {
      partner_id: partner.id,
      external_order_number: EXTERNAL_ORDER,
      idempotency_key: EXTERNAL_ORDER,
      request_hash: digest(`${partner.id}:${EXTERNAL_ORDER}:local-staging-fixture`),
      order_id: orderId,
    })
  )[0];
}

const invoices = await rest("GET", `/rest/v1/invoices?order_id=eq.${orderId}&select=id,invoice_number,status,total,issued_at,metadata`);
let invoice = invoices?.[0];
const checkoutUrl = "https://checkout.stripe.com/c/pay/cs_test_ord_demo_1001";
if (!invoice) {
  invoice = (
    await rest("POST", "/rest/v1/invoices", {
      order_id: orderId,
      account_id: accountId,
      invoice_number: "INV-DEMO-1001",
      invoice_kind: "PRIMARY",
      status: "ISSUED",
      subtotal: 90,
      shipping_total: 5,
      tax: 0,
      total: 95,
      amount_paid: 20,
      issued_at: "2026-10-28T16:30:00.000Z",
      metadata: {
        partner_checkout: {
          url: checkoutUrl,
          session_id: "cs_test_ord_demo_1001",
          payment_intent_id: "pi_test_ord_demo_1001",
          amount_cents: 7500,
          created_at: "2026-10-28T16:31:00.000Z",
        },
      },
    })
  )[0];
}

const fulfillments = await rest("GET", `/rest/v1/fulfillments?order_id=eq.${orderId}&select=id,status,tracking_number`);
let fulfillment = fulfillments?.[0];
if (!fulfillment) {
  fulfillment = (
    await rest("POST", "/rest/v1/fulfillments", {
      order_id: orderId,
      invoice_id: invoice.id,
      status: "CLOSED",
      tracking_number: "TEST-ORD-DEMO-1001",
      dropship_carrier: "TestCarrier",
      shipped_at: "2026-10-28T18:00:00.000Z",
      closed_at: "2026-10-28T18:05:00.000Z",
      metadata: { shipping: { tracking_number: "TEST-ORD-DEMO-1001", carrier: "TestCarrier" } },
    })
  )[0];
}

const payments = await rest(
  "GET",
  `/rest/v1/invoice_payments?invoice_id=eq.${invoice.id}&external_payment_id=eq.pi_test_ord_demo_1001&select=id`
);
if (!payments?.length) {
  await rest("POST", "/rest/v1/invoice_payments", {
    invoice_id: invoice.id,
    amount: 20,
    note: "stripe:pi_test_ord_demo_1001",
    payment_method: "credit_card",
    confirmation_code: "ch_test_ord_demo_1001",
    external_payment_id: "pi_test_ord_demo_1001",
    paid_at: "2026-10-28T17:00:00.000Z",
  });
}

const planned = [
  {
    event_type: "invoice",
    business_key: `invoice:${invoice.id}`,
    payload: {
      invoice_number: "INV-DEMO-1001",
      final_total: 95,
      invoiced_at: "2026-10-28T16:30:00.000Z",
    },
  },
  {
    event_type: "shipment",
    business_key: `shipment:${fulfillment.id}`,
    payload: {
      tracking_number: "TEST-ORD-DEMO-1001",
      ship_via: "TestCarrier",
      shipped_at: "2026-10-28T18:00:00.000Z",
    },
  },
  {
    event_type: "payment-link",
    business_key: `payment-link:${invoice.id}`,
    payload: { payment_link_url: checkoutUrl },
  },
  {
    event_type: "payment",
    business_key: "payment:pi_test_ord_demo_1001",
    payload: {
      amount: 20,
      payment_date: "2026-10-28",
      payment_method: "credit_card",
      confirmation_code: "ch_test_ord_demo_1001",
    },
  },
];

const existingJobs = await rest(
  "GET",
  `/rest/v1/integration_outbound_jobs?order_id=eq.${orderId}&select=id,event_type,business_key,status`
);
const existingKeys = new Set((existingJobs || []).map((row) => `${row.event_type}:${row.business_key}`));
for (const job of planned) {
  const key = `${job.event_type}:${job.business_key}`;
  if (existingKeys.has(key)) continue;
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
const storedCred = (
  await rest(
    "GET",
    `/rest/v1/integration_credentials?id=eq.${credential.id}&select=id,name,direction,active,revoked_at,key_prefix,secret_ciphertext,key_hash`
  )
)[0];

console.log(
  JSON.stringify(
    {
      outbound_enabled: env.INTEGRATION_OUTBOUND_ENABLED,
      supabase_local: true,
      partner: {
        id: partner.id,
        code: updatedPartner.code,
        environment: updatedPartner.environment,
        status: updatedPartner.status,
        callback_base_url: updatedPartner.callback_base_url,
      },
      credential: {
        id: storedCred.id,
        name: storedCred.name,
        direction: storedCred.direction,
        active: storedCred.active,
        revoked: Boolean(storedCred.revoked_at),
        prefix: storedCred.key_prefix,
        ciphertext_shape: String(storedCred.secret_ciphertext || "").startsWith("v1.") ? "v1" : "unexpected",
        has_key_hash: Boolean(storedCred.key_hash),
        encrypt_roundtrip: roundtrip,
      },
      order: {
        local_order_id: orderId,
        local_order_number: "ORD-LOCAL-DEMO-1001",
        partner_order_number: EXTERNAL_ORDER,
      },
      jobs: (jobs || []).map((job) => ({
        event_type: job.event_type,
        status: job.status,
        external_order_number: job.external_order_number,
        blocked_reason: job.blocked_reason,
        last_http_status: job.last_http_status,
        payload_keys: Object.keys(job.payload || {}).sort(),
        payment_link_host: job.payload?.payment_link_url ? new URL(job.payload.payment_link_url).host : null,
        payment_link_is_stripe_test: String(job.payload?.payment_link_url || "").includes("cs_test_"),
      })),
    },
    null,
    2
  )
);
