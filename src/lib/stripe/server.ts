import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY env var.");
}

function loopbackHost(host: string): boolean {
  const name = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return name === "localhost" || name === "127.0.0.1" || name === "::1";
}

function stripeNetwork(): Pick<Stripe.StripeConfig, "host" | "port" | "protocol"> {
  const host = process.env.STRIPE_API_HOST?.trim() || "";
  if (!host || !loopbackHost(host)) return {};
  if (!stripeSecretKey?.startsWith("sk_test_")) {
    throw new Error("STRIPE_API_HOST is only allowed with a Stripe test secret.");
  }
  const port = Number(process.env.STRIPE_API_PORT || "12112");
  const protocol = process.env.STRIPE_API_PROTOCOL === "https" ? "https" : "http";
  return { host, port: Number.isFinite(port) ? port : 12112, protocol };
}

const globalForStripe = globalThis as unknown as { stripe?: Stripe };

export const stripe =
  globalForStripe.stripe ??
  new Stripe(stripeSecretKey, {
    apiVersion: "2026-01-28.clover",
    typescript: true,
    ...stripeNetwork(),
  });

if (!globalForStripe.stripe) {
  globalForStripe.stripe = stripe;
}
