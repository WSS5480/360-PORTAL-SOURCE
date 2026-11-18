import { describe, expect, it } from "vitest";
import { authenticatePartnerRequest } from "@/lib/integrations/partnerAuth";
import {
  credentialAllows,
  generateInboundPartnerKey,
  hashPartnerApiKey,
  productionCredentialsCannotBeActivated,
  readBearerToken,
} from "@/lib/integrations/partnerCredentials";
import {
  CreatePartnerOrderSchema,
  normalizePartnerOrder,
  partnerOrderRequestHash,
} from "@/lib/integrations/partnerOrderContract";

const partnerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const credentialId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function authDb(args: {
  credential?: Record<string, unknown> | null;
  partner?: Record<string, unknown> | null;
}) {
  const updates: unknown[] = [];
  return {
    updates,
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const api: any = {
        select() {
          return api;
        },
        eq(key: string, value: unknown) {
          filters[key] = value;
          return api;
        },
        update(patch: unknown) {
          updates.push({ table, patch });
          return api;
        },
        maybeSingle: async () => {
          if (table === "integration_credentials") {
            const credential = args.credential;
            if (!credential || credential.key_hash !== filters.key_hash) return { data: null, error: null };
            return { data: credential, error: null };
          }
          if (table === "integration_partners") {
            if (!args.partner || args.partner.id !== filters.id) return { data: null, error: null };
            return { data: args.partner, error: null };
          }
          return { data: null, error: null };
        },
        then(resolve: (value: unknown) => void) {
          resolve({ data: null, error: null });
        },
      };
      return api;
    },
  };
}

const address = {
  line1: "100 Example Ave",
  city: "Austin",
  postal: "78701",
};

describe("partner credentials", () => {
  it("hashes inbound keys and never needs the plaintext for later comparison", () => {
    const key = generateInboundPartnerKey();
    expect(key.prefix).toBe(key.plaintext.slice(0, 12));
    expect(key.hash).toBe(hashPartnerApiKey(key.plaintext));
    expect(key.plaintext.startsWith("360_")).toBe(true);
    expect(productionCredentialsCannotBeActivated("production")).toBe(true);
    expect(productionCredentialsCannotBeActivated("sandbox")).toBe(false);
  });

  it("parses a bearer token and ignores other authorization schemes", () => {
    expect(readBearerToken("Bearer 360_exampletokenvalue123456")).toBe("360_exampletokenvalue123456");
    expect(readBearerToken("Basic abc")).toBeNull();
    expect(readBearerToken(null)).toBeNull();
  });

  it("lets orders:write read orders and keeps orders:read from writing", () => {
    expect(credentialAllows(["orders:write"], "orders:read")).toBe(true);
    expect(credentialAllows(["orders:write"], "orders:write")).toBe(true);
    expect(credentialAllows(["orders:read"], "orders:write")).toBe(false);
  });
});

describe("partner authentication", () => {
  const key = generateInboundPartnerKey();

  it("rejects a missing key, a revoked key, a production partner, and a read-only key on write", async () => {
    const missing = await authenticatePartnerRequest(authDb({}) as any, null, "orders:write");
    expect(missing).toMatchObject({ ok: false, status: 401 });

    const revoked = await authenticatePartnerRequest(
      authDb({
        credential: {
          id: credentialId,
          partner_id: partnerId,
          scopes: ["orders:write"],
          active: false,
          revoked_at: "2026-10-20T00:00:00.000Z",
          direction: "inbound",
          key_hash: key.hash,
        },
        partner: { id: partnerId, code: "example", name: "Example Partner", environment: "sandbox", status: "active" },
      }) as any,
      `Bearer ${key.plaintext}`,
      "orders:write"
    );
    expect(revoked).toMatchObject({ ok: false, status: 401 });

    const production = await authenticatePartnerRequest(
      authDb({
        credential: {
          id: credentialId,
          partner_id: partnerId,
          scopes: ["orders:write"],
          active: true,
          revoked_at: null,
          direction: "inbound",
          key_hash: key.hash,
        },
        partner: { id: partnerId, code: "example", name: "Example Partner", environment: "production", status: "active" },
      }) as any,
      `Bearer ${key.plaintext}`,
      "orders:write"
    );
    expect(production).toMatchObject({ ok: false, status: 401 });

    const readOnly = await authenticatePartnerRequest(
      authDb({
        credential: {
          id: credentialId,
          partner_id: partnerId,
          scopes: ["orders:read"],
          active: true,
          revoked_at: null,
          direction: "inbound",
          key_hash: key.hash,
        },
        partner: { id: partnerId, code: "example", name: "Example Partner", environment: "sandbox", status: "active" },
      }) as any,
      `Bearer ${key.plaintext}`,
      "orders:write"
    );
    expect(readOnly).toMatchObject({ ok: false, status: 403 });
  });
});

describe("partner order contract", () => {
  it("rejects an address that is missing street, city, or postal code", () => {
    const parsed = CreatePartnerOrderSchema.safeParse({
      partner_order_number: "ORD-1001",
      partner_account_ref: "fixture-clinic",
      billing_address: { line1: "", city: "Austin", postal: "78701" },
      shipping_address: address,
      lines: [{ sku: "FIXTURE-SKU", quantity: 1 }],
    });
    expect(parsed.success).toBe(false);
  });

  it("hashes the same payload once regardless of key order", () => {
    const first = normalizePartnerOrder(
      CreatePartnerOrderSchema.parse({
        partner_order_number: "ORD-1001",
        partner_account_ref: "fixture-clinic",
        shipping_address: { postal: "78701", city: "Austin", line1: "100 Example Ave" },
        billing_address: address,
        lines: [{ quantity: 2, sku: "FIXTURE-SKU" }],
      })
    );
    const second = normalizePartnerOrder(
      CreatePartnerOrderSchema.parse({
        lines: [{ sku: "FIXTURE-SKU", quantity: 2 }],
        billing_address: { line1: "100 Example Ave", city: "Austin", postal: "78701" },
        shipping_address: address,
        partner_account_ref: "fixture-clinic",
        partner_order_number: "ORD-1001",
      })
    );
    expect(partnerOrderRequestHash(first)).toBe(partnerOrderRequestHash(second));
    expect(first.shipping_priority).toBe("GROUND");
  });
});
