/**
 * Loopback stand-in for the Stripe API.
 * Accepts Checkout session creates and signed webhook deliveries to the local app.
 * It never calls Stripe and never stores card numbers.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env.local.test");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index);
    if (!process.env[key]) process.env[key] = trimmed.slice(index + 1);
  }
}

const port = Number(process.env.STRIPE_API_PORT || "12112");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const appWebhook = process.env.APP_WEBHOOK_URL || "http://127.0.0.1:3010/api/stripe/webhook";
const sessions = new Map();
const intents = new Map();

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function intentView(intent) {
  return {
    id: intent.id,
    object: "payment_intent",
    status: intent.status,
    amount: intent.amount,
    amount_received: intent.status === "succeeded" ? intent.amount_received : 0,
    currency: "usd",
    metadata: intent.metadata,
    payment_method_types: ["card", "us_bank_account"],
    payment_method:
      intent.method == null
        ? null
        : { id: `pm_${intent.id}`, object: "payment_method", type: intent.method },
    latest_charge:
      intent.status === "succeeded"
        ? {
            id: intent.chargeId,
            object: "charge",
            payment_method_details: { type: intent.method },
          }
        : null,
  };
}

async function deliverWebhook(intent) {
  if (!webhookSecret) throw new Error("missing webhook secret");
  const stripe = new Stripe("sk_test_local_mock", { apiVersion: "2026-01-28.clover" });
  const payload = JSON.stringify({
    id: `evt_${randomUUID().replace(/-/g, "")}`,
    object: "event",
    type: intent.status === "succeeded" ? "payment_intent.succeeded" : "payment_intent.payment_failed",
    data: { object: intentView(intent) },
  });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  const response = await fetch(appWebhook, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: payload,
  });
  const text = await response.text();
  return { status: response.status, body: text.slice(0, 300) };
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const body = await readBody(req);

    if (req.method === "POST" && url.pathname === "/__pay") {
      const input = JSON.parse(body || "{}");
      const session = sessions.get(input.session_id);
      if (!session) return send(res, 404, { error: "session_not_found" });
      const amount = Number(input.amount_cents || session.amount);
      if (!Number.isInteger(amount) || amount < 50 || amount > session.amount) {
        return send(res, 422, { error: "amount_exceeds_session" });
      }
      const method = input.method === "us_bank_account" ? "us_bank_account" : "card";
      const intent = intents.get(session.payment_intent);
      intent.amount_received = amount;
      intent.amount = amount;
      intent.method = method;
      intent.status = input.outcome === "failed" ? "requires_payment_method" : "succeeded";
      intent.chargeId = `ch_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const webhook = await deliverWebhook(intent);
      return send(res, 200, { ok: webhook.status === 200, payment_intent: intent.id, webhook_status: webhook.status });
    }

    if (req.method === "POST" && url.pathname === "/v1/checkout/sessions") {
      const params = new URLSearchParams(body);
      console.log(`checkout keys ${[...params.keys()].join(",")}`);
      const idempotency = req.headers["idempotency-key"] || "";
      if (idempotency && sessions.has(idempotency)) {
        return send(res, 200, sessions.get(idempotency).response);
      }
      const amount = Number(
        params.get("line_items[0][price_data][unit_amount]") ||
          params.get("line_items[0][price_data][unit_amount_decimal]") ||
          "0"
      );
      const metadata = {
        invoice_id: params.get("metadata[invoice_id]") || params.get("payment_intent_data[metadata][invoice_id]") || "",
        order_id: params.get("metadata[order_id]") || params.get("payment_intent_data[metadata][order_id]") || "",
      };
      const id = `cs_test_${randomUUID().replace(/-/g, "").slice(0, 18)}`;
      const paymentIntent = `pi_test_${randomUUID().replace(/-/g, "").slice(0, 18)}`;
      const response = {
        id,
        object: "checkout.session",
        url: `https://checkout.stripe.com/c/pay/${id}`,
        payment_intent: paymentIntent,
        status: "open",
        mode: "payment",
        amount_total: amount,
        metadata,
      };
      const session = { id, amount, payment_intent: paymentIntent, response };
      sessions.set(id, session);
      if (idempotency) sessions.set(idempotency, session);
      intents.set(paymentIntent, { id: paymentIntent, amount, amount_received: 0, status: "requires_payment_method", metadata, method: null, chargeId: null });
      return send(res, 200, response);
    }

    const expire = url.pathname.match(/^\/v1\/checkout\/sessions\/([^/]+)\/expire$/);
    if (req.method === "POST" && expire) {
      const session = sessions.get(expire[1]);
      if (!session) return send(res, 404, { error: { message: "not_found" } });
      session.response.status = "expired";
      return send(res, 200, { ...session.response, status: "expired" });
    }

    const retrieve = url.pathname.match(/^\/v1\/payment_intents\/([^/]+)$/);
    if (req.method === "GET" && retrieve) {
      const intent = intents.get(retrieve[1]);
      if (!intent) return send(res, 404, { error: { message: "not_found" } });
      return send(res, 200, intentView(intent));
    }

    return send(res, 404, { error: { message: `unmocked ${req.method} ${url.pathname}` } });
  } catch (error) {
    return send(res, 500, { error: { message: error instanceof Error ? error.message : "mock_failed" } });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`mock stripe listening on http://127.0.0.1:${port}`);
});
