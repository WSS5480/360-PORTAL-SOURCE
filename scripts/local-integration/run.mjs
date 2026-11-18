/**
 * Isolated local integration run.
 * Starts Postgres and a local PostgREST stand-in, writes .env.local.test, and
 * launches Next with only those values. Production values from .env.local are
 * never copied. Postgres comes from the embedded-postgres and pg packages.
 */
import { createCipheriv, createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer, request as httpRequest } from "node:http";
import { createConnection } from "node:net";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startLocalRest } from "./local-rest.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lab = path.join(tmpdir(), "pg-integration-lab");
const pgPort = 54330;
const postgrestPort = 54322;
const apiPort = 54321;
const nextPort = 3010;
const mockPort = 9099;
const dbPassword = "local-test-password";
const jwtSecret = "local-integration-jwt-secret-not-production-0001";
const workerSecret = "local-integration-worker-secret";
const credentialsKey = randomBytes(32).toString("base64");
const forbidden = [
  "supabase.360medical.net",
  "app.360medical.net",
  "sk_live_",
  "pk_live_",
  "rk_live_",
];

function jwt(role) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ role, iss: "local-integration", exp: 4102444800 })
  ).toString("base64url");
  const signature = createHmac("sha256", jwtSecret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function encryptToken(token) {
  const key = Buffer.from(credentialsKey, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function assertSafe(env) {
  const joined = Object.entries(env).map(([key, value]) => `${key}=${value}`).join("\n");
  for (const marker of forbidden) {
    if (joined.includes(marker)) throw new Error(`Refusing to start: test environment contains ${marker}`);
  }
  if (!String(env.NEXT_PUBLIC_SUPABASE_URL).startsWith("http://127.0.0.1:")) {
    throw new Error("Refusing to start: Supabase URL is not the local test server.");
  }
  if (!String(env.STRIPE_SECRET_KEY).startsWith("sk_test_")) throw new Error("Refusing a non-test Stripe secret.");
  if (env.FEDEX_ENV === "production") throw new Error("Refusing FedEx production.");
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function waitFor(label, check, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${label} did not become ready.`);
}

const serviceKey = jwt("service_role");
const anonKey = jwt("anon");
const inboundToken = `360_${randomBytes(24).toString("base64url")}`;
const outboundToken = `local-nimble-bearer-${randomBytes(8).toString("hex")}`;
const accountId = randomUUID();
const productId = randomUUID();
const variantId = randomUUID();
const partnerId = randomUUID();

const env = {
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${apiPort}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${nextPort}`,
  NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${nextPort}`,
  STRIPE_SECRET_KEY: "sk_test_local_integration_not_a_live_key",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_local_integration_not_a_live_key",
  STRIPE_WEBHOOK_SECRET: "whsec_local_integration_not_live",
  FEDEX_ENV: "sandbox",
  FEDEX_CLIENT_ID: "local-test",
  FEDEX_CLIENT_SECRET: "local-test",
  FEDEX_ACCOUNT_NUMBER: "000000000",
  INTEGRATION_WORKER_SECRET: workerSecret,
  INTEGRATION_CREDENTIALS_KEY: credentialsKey,
  INTEGRATION_OUTBOUND_ENABLED: "true",
  EMAIL_TRANSPORT: "local-test-disabled",
};
assertSafe(env);

const localEnvNames = existsSync(path.join(root, ".env.local"))
  ? readFileSync(path.join(root, ".env.local"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => line.slice(0, line.indexOf("=")).trim())
  : [];

const childEnv = { ...process.env, NODE_ENV: "development" };
for (const name of localEnvNames) childEnv[name] = env[name] ?? "local-test-disabled";
Object.assign(childEnv, env);
assertSafe(childEnv);

writeFileSync(
  path.join(root, ".env.local.test"),
  `${Object.entries(env).map(([key, value]) => `${key}=${value}`).join("\n")}\n`,
  "utf8"
);

const { default: EmbeddedPostgres } = await import("embedded-postgres");
const pg = await import("pg");
const databaseDir = path.join(lab, "data-local-integration");
rmSync(databaseDir, { recursive: true, force: true });
const database = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: dbPassword,
  port: pgPort,
  persistent: false,
});
await database.initialise();
await database.start();
await database.createDatabase("integration_test");
const client = new pg.default.Client({
  host: "127.0.0.1",
  port: pgPort,
  user: "postgres",
  password: dbPassword,
  database: "integration_test",
});
await client.connect();
await client.query(`
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '${dbPassword}';
  GRANT anon, authenticated, service_role TO authenticator;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, authenticator;
`);
await client.query(readFileSync(path.join(root, "scripts/local-integration/local-schema.sql"), "utf8"));
for (const file of [
  "db/migrations/20261020_integration_partner_foundation.sql",
  "db/migrations/20261020_integration_outbound_outbox.sql",
]) {
  await client.query(readFileSync(path.join(root, file), "utf8"));
}
await client.query(`ALTER ROLE service_role BYPASSRLS`);
await client.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role`);
await client.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role`);
await client.query(
  `INSERT INTO accounts (id, name, is_demo) VALUES ($1, 'Synthetic Test Clinic', false)`,
  [accountId]
);
await client.query(
  `INSERT INTO account_pricing (account_id, discount_percent, payment_terms_label, payment_terms_days)
   VALUES ($1, 10, 'Net 30', 30)`,
  [accountId]
);
await client.query(`INSERT INTO products (id, name, is_active) VALUES ($1, 'Synthetic Graft', true)`, [productId]);
await client.query(
  `INSERT INTO product_variants (id, product_id, sku, size_label, base_unit_price, width_cm, length_cm, total_sqcm, is_active)
   VALUES ($1, $2, 'SYN-2X2', '2x2', 100, 2, 2, 4, true)`,
  [variantId, productId]
);
await client.query(`INSERT INTO product_variant_inventory (variant_id, qty_on_hand) VALUES ($1, 5)`, [variantId]);
await client.query(
  `INSERT INTO integration_partners (
     id, code, name, environment, status, adapter_code, callback_base_url
   ) VALUES ($1, 'nimble', 'Nimble', 'sandbox', 'active', 'fulfillment-callbacks-v1', $2)`,
  [partnerId, `http://127.0.0.1:${mockPort}`]
);
await client.query(
  `INSERT INTO integration_partner_accounts (partner_id, account_id, partner_account_ref)
   VALUES ($1, $2, 'clinic-synthetic-001')`,
  [partnerId, accountId]
);
await client.query(
  `INSERT INTO integration_credentials (
     partner_id, direction, name, key_prefix, key_hash, scopes, active
   ) VALUES ($1, 'inbound', 'Local test key', $2, $3, '{orders:read,orders:write}', true)`,
  [partnerId, inboundToken.slice(0, 12), createHash("sha256").update(inboundToken).digest("hex")]
);
await client.query(
  `INSERT INTO integration_credentials (
     partner_id, direction, name, key_prefix, secret_ciphertext, scopes, active
   ) VALUES ($1, 'outbound', 'Local mock bearer', 'outbound', $2, '{fulfillment:write}', true)`,
  [partnerId, encryptToken(outboundToken)]
);

const pool = new pg.default.Pool({
  host: "127.0.0.1",
  port: pgPort,
  user: "postgres",
  password: dbPassword,
  database: "integration_test",
  max: 8,
});
const rest = startLocalRest({ port: apiPort, pool, jwtSecret });
await waitFor("local API", () => portOpen(apiPort));
const probe = await fetch(
  `http://127.0.0.1:${apiPort}/rest/v1/integration_credentials?select=key_prefix,direction,active&direction=eq.inbound`,
  { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } }
);
const probeBody = await probe.text();
if (!probe.ok) throw new Error(`Local API probe failed ${probe.status}: ${probeBody}`);

const calls = [];
let shipmentAttempts = 0;
const mock = createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");
    calls.push({
      method: req.method,
      url: req.url,
      status: (req.url || "").includes("/shipment") && shipmentAttempts === 0 ? 500 : 200,
    });
    if ((req.url || "").includes("/shipment") && shipmentAttempts === 0) {
      shipmentAttempts += 1;
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  });
});
mock.listen(mockPort, "127.0.0.1");

const next = spawn("npm", ["run", "dev", "--", "--webpack", "-H", "127.0.0.1", "-p", String(nextPort)], {
  cwd: root,
  env: childEnv,
  shell: true,
  stdio: "inherit",
});

const report = { started: false, schema: false, httpOrder: null, admin: null, callbacks: [], issues: [] };
try {
  await waitFor("local API", () => portOpen(apiPort));
  await waitFor("Next.js", async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${nextPort}/api/integrations/v1/orders`, { method: "POST" });
      return response.status === 401;
    } catch {
      return false;
    }
  }, 120);
  report.started = true;
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name LIKE 'integration_%' ORDER BY table_name`
  );
  report.schema = tables.rows.map((row) => row.table_name);

  const address = {
    company: "Synthetic Clinic",
    line1: "100 Test Street",
    city: "Testville",
    state: "OH",
    postal: "43000",
    country: "US",
  };
  async function postOrder(body, token = inboundToken) {
    const response = await fetch(`http://127.0.0.1:${nextPort}/api/integrations/v1/orders`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "idempotency-key": body.partner_order_number,
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }
  const orderBody = {
    partner_order_number: "NIMBLE-LOCAL-1001",
    partner_account_ref: "clinic-synthetic-001",
    billing_address: address,
    shipping_address: address,
    lines: [{ sku: "SYN-2X2", quantity: 2 }],
  };
  const created = await postOrder(orderBody);
  const replay = await postOrder(orderBody);
  const conflict = await postOrder({ ...orderBody, lines: [{ sku: "SYN-2X2", quantity: 1 }] });
  const unauthorized = await postOrder(orderBody, "360_not-a-real-credential");
  const short = await postOrder({
    ...orderBody,
    partner_order_number: "NIMBLE-LOCAL-1002",
    lines: [{ sku: "SYN-2X2", quantity: 20 }],
  });
  const stored = await client.query(
    `SELECT o.order_number, o.status::text AS status, o.total, o.created_by_user_id,
            i.unit_price, i.discount_percent, i.line_total, c.external_order_number
     FROM orders o
     JOIN order_items i ON i.order_id = o.id
     JOIN integration_partner_orders c ON c.order_id = o.id`
  );
  report.httpOrder = { created, replay, conflict, unauthorized, short, stored: stored.rows };

  const adminOrders = await fetch(`http://127.0.0.1:${nextPort}/admin/orders`, { redirect: "manual" });
  const adminIntegrations = await fetch(`http://127.0.0.1:${nextPort}/admin/integrations`, { redirect: "manual" });
  report.admin = {
    ordersStatus: adminOrders.status,
    ordersLocation: adminOrders.headers.get("location"),
    integrationsStatus: adminIntegrations.status,
  };

  const orderId = created.body?.order?.id;
  if (orderId) {
    await client.query(
      `INSERT INTO invoices (order_id, invoice_number, invoice_kind, status, total, issued_at)
       VALUES ($1, 'INV-LOCAL-1001', 'PRIMARY', 'ISSUED', $2, now())`,
      [orderId, stored.rows[0]?.total ?? 0]
    );
    const worker = async () => {
      const response = await fetch(`http://127.0.0.1:${nextPort}/api/internal/integrations/outbound/worker`, {
        method: "POST",
        headers: { authorization: `Bearer ${workerSecret}` },
      });
      return { status: response.status, body: await response.json() };
    };
    const invoiceRun = await worker();
    await client.query(
      `INSERT INTO fulfillments (order_id, status, tracking_number, shipped_at, closed_at)
       VALUES ($1, 'CLOSED', '1ZLOCALTEST', now(), now())`,
      [orderId]
    );
    const shipmentRetry = await worker();
    await client.query(
      `UPDATE integration_outbound_jobs
       SET next_attempt_at = now(), locked_at = NULL, locked_by = NULL, status = 'pending'
       WHERE status IN ('pending', 'failed')`
    );
    const shipmentRun = await worker();
    const jobs = await client.query(
      `SELECT event_type, status, attempt_count, last_error
       FROM integration_outbound_jobs ORDER BY created_at`
    );
    const attempts = await client.query(
      `SELECT http_status, error IS NOT NULL AS had_error
       FROM integration_outbound_attempts ORDER BY attempted_at`
    );
    report.callbacks = { calls, invoiceRun, shipmentRetry, shipmentRun, jobs: jobs.rows, attempts: attempts.rows };
  }
} catch (error) {
  report.issues.push(error instanceof Error ? error.message : "local run failed");
}

writeFileSync(path.join(tmpdir(), "local-integration-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
next.kill();
spawn("taskkill", ["/PID", String(next.pid), "/T", "/F"], { stdio: "ignore" });
rest.close();
mock.close();
await pool.end();
await client.end();
await database.stop();
process.exit(report.issues.length ? 1 : 0);
