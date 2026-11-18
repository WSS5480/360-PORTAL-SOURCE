import { createHmac, timingSafeEqual } from "node:crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signingKey(): string {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key.startsWith("sk_")) throw new Error("Missing Stripe test or live secret for the payment link.");
  return key;
}

export function signInvoicePayToken(invoiceId: string): string {
  const signature = createHmac("sha256", signingKey()).update(invoiceId).digest("base64url");
  return `${invoiceId}.${signature}`;
}

export function readInvoicePayToken(token: string): string | null {
  const separator = token.indexOf(".");
  if (separator <= 0) return null;
  const invoiceId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!UUID_RE.test(invoiceId)) return null;
  const expected = createHmac("sha256", signingKey()).update(invoiceId).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return invoiceId;
}
