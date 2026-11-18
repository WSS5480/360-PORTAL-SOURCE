import { describe, expect, it } from "vitest";
import { getPartnerOrder, submitPartnerOrder } from "@/lib/integrations/submitPartnerOrder";
import { normalizePartnerOrder, type NormalizedPartnerOrder } from "@/lib/integrations/partnerOrderContract";

const partnerA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const partnerB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const accountId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const variantId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const productId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const orderId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

const order: NormalizedPartnerOrder = normalizePartnerOrder({
  partner_order_number: "ORD-1001",
  partner_account_ref: "fixture-clinic",
  billing_address: { line1: "100 Example Ave", city: "Austin", postal: "78701" },
  shipping_address: { line1: "100 Example Ave", city: "Austin", postal: "78701" },
  lines: [{ sku: "FIXTURE-SKU", quantity: 2 }],
});

function matches(row: Record<string, unknown>, filters: Record<string, unknown>) {
  return Object.entries(filters).every(([key, value]) => {
    if (Array.isArray(value)) return value.includes(row[key]);
    return row[key] === value;
  });
}

function db(
  tables: Record<string, Record<string, unknown>[]>,
  rpc: (args: Record<string, unknown>, fn?: string) => any
) {
  return {
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
        in(key: string, value: unknown) {
          filters[key] = value;
          return api;
        },
        gte() {
          return api;
        },
        order() {
          return api;
        },
        maybeSingle: async () => {
          const rows = (tables[table] ?? []).filter((row) => matches(row, filters));
          return { data: rows[0] ?? null, error: null };
        },
        then(resolve: (value: unknown) => void) {
          const rows = (tables[table] ?? []).filter((row) => matches(row, filters));
          resolve({ data: rows, error: null, count: rows.length });
        },
      };
      return api;
    },
    rpc: async (fn: string, args: Record<string, unknown>) => ({ data: await rpc(args, fn), error: null }),
  };
}

const catalog = {
  integration_partner_accounts: [
    { partner_id: partnerA, partner_account_ref: "fixture-clinic", account_id: accountId },
  ],
  accounts: [{ id: accountId, is_demo: false }],
  account_pricing: [{ account_id: accountId, discount_percent: 10, payment_terms_label: "Net 15", payment_terms_days: 15 }],
  product_variants: [
    {
      id: variantId,
      product_id: productId,
      sku: "FIXTURE-SKU",
      size_label: "2x2",
      base_unit_price: 50,
      is_active: true,
      total_sqcm: 4,
    },
  ],
  products: [{ id: productId, is_active: true }],
  product_variant_inventory: [{ variant_id: variantId, qty_on_hand: 10 }],
  orders: [
    {
      id: orderId,
      order_number: "ORD-20261020-AB12CD",
      status: "CONFIRMED",
      subtotal: 90,
      shipping_total: 0,
      total: 90,
    },
  ],
  order_items: [
    {
      order_id: orderId,
      product_variant_id: variantId,
      quantity: 2,
      unit_price: 50,
      discount_percent: 10,
      line_total: 90,
      sort_order: 0,
    },
  ],
};

describe("partner order intake", () => {
  it("prices from account pricing and returns separate partner and internal order numbers", async () => {
    let captured: Record<string, unknown> | null = null;
    const result = await submitPartnerOrder(
      db(catalog, async (args) => {
        captured = args;
        return { result: "created", order_id: orderId, order_number: "ORD-20261020-AB12CD" };
      }) as any,
      { partnerId: partnerA, idempotencyKey: "ORD-1001", order }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.idempotentReplay).toBe(false);
    expect(result.order.partner_order_number).toBe("ORD-1001");
    expect(result.order.order_number).toBe("ORD-20261020-AB12CD");
    expect(result.order.id).not.toBe("ORD-1001");
    const items = captured?.p_items as Array<{ unit_price: number; line_total: number; discount_percent: number }>;
    expect(items[0]).toMatchObject({ unit_price: 50, discount_percent: 10, line_total: 90 });
    expect((captured?.p_order as { status: string }).status).toBe("CONFIRMED");
  });

  it("rejects an unknown SKU and an inventory shortage without creating an order", async () => {
    let calls = 0;
    const unknown = await submitPartnerOrder(
      db(
        { ...catalog, product_variants: [] },
        async () => {
          calls += 1;
          return { result: "created", order_id: orderId };
        }
      ) as any,
      { partnerId: partnerA, idempotencyKey: "ORD-1001", order }
    );
    expect(unknown).toMatchObject({ ok: false, status: 422, errorCode: "unknown_sku" });

    const short = await submitPartnerOrder(
      db(
        { ...catalog, product_variant_inventory: [{ variant_id: variantId, qty_on_hand: 1 }] },
        async () => {
          calls += 1;
          return { result: "created", order_id: orderId };
        }
      ) as any,
      { partnerId: partnerA, idempotencyKey: "ORD-1001", order }
    );
    expect(short).toMatchObject({ ok: false, status: 422, errorCode: "insufficient_inventory" });
    expect(calls).toBe(0);
  });

  it("replays an identical submission and conflicts when the payload hash differs", async () => {
    const { partnerOrderRequestHash } = await import("@/lib/integrations/partnerOrderContract");
    const hash = partnerOrderRequestHash(order);
    let calls = 0;
    const existing = {
      ...catalog,
      integration_partner_orders: [
        {
          partner_id: partnerA,
          external_order_number: "ORD-1001",
          idempotency_key: "ORD-1001",
          request_hash: hash,
          order_id: orderId,
        },
      ],
    };
    const replay = await submitPartnerOrder(
      db(existing, async () => {
        calls += 1;
        return { result: "created", order_id: orderId };
      }) as any,
      { partnerId: partnerA, idempotencyKey: "ORD-1001", order }
    );
    expect(replay).toMatchObject({ ok: true, idempotentReplay: true });
    expect(calls).toBe(0);

    const conflict = await submitPartnerOrder(
      db(existing, async () => {
        calls += 1;
        return { result: "created", order_id: orderId };
      }) as any,
      {
        partnerId: partnerA,
        idempotencyKey: "ORD-1001",
        order: { ...order, lines: [{ sku: "FIXTURE-SKU", quantity: 9 }] },
      }
    );
    expect(conflict).toMatchObject({ ok: false, status: 409, errorCode: "conflict" });
    expect(calls).toBe(0);
  });

  it("does not return another partner's order", async () => {
    const result = await getPartnerOrder(
      db({
        ...catalog,
        integration_partner_orders: [
          {
            partner_id: partnerA,
            external_order_number: "ORD-1001",
            idempotency_key: "ORD-1001",
            request_hash: "a".repeat(64),
            order_id: orderId,
          },
        ],
      }) as any,
      partnerB,
      "ORD-1001"
    );
    expect(result).toMatchObject({ ok: false, status: 404, errorCode: "not_found" });
  });

  it("keeps an existing account's pricing when the partner default is different", async () => {
    let ensureCalls = 0;
    let captured: Record<string, unknown> | null = null;
    const result = await submitPartnerOrder(
      db(
        {
          ...catalog,
          integration_partners: [
            {
              id: partnerA,
              auto_create_accounts: true,
              allow_direct_sku_match: true,
              approved_discount_percent: 5,
              approved_payment_terms_days: 30,
            },
          ],
        },
        async (args, fn) => {
          if (fn === "integration_ensure_partner_account") {
            ensureCalls += 1;
            return { result: "created", account_id: accountId };
          }
          captured = args;
          return { result: "created", order_id: orderId, order_number: "ORD-20261020-AB12CD" };
        }
      ) as any,
      {
        partnerId: partnerA,
        idempotencyKey: "ORD-1001",
        order: { ...order, customer: { name: "A Different Clinic Name" } },
      }
    );
    expect(result.ok).toBe(true);
    expect(ensureCalls).toBe(0);
    const priced = captured?.p_order as { account_id: string; discount_percent_snapshot: number };
    expect(priced.account_id).toBe(accountId);
    expect(priced.discount_percent_snapshot).toBe(10);
  });

  it("creates one account from the approved policy and does not create a portal user", async () => {
    const createdAccountId = "11111111-1111-4111-8111-111111111111";
    const calls: string[] = [];
    let captured: Record<string, unknown> | null = null;
    const tables = {
      ...catalog,
      integration_partner_accounts: [],
      integration_partners: [
        {
          id: partnerA,
          auto_create_accounts: true,
          allow_direct_sku_match: false,
          approved_discount_percent: 5,
          approved_payment_terms_days: 30,
          approved_payment_terms_label: "Net 30",
        },
      ],
      accounts: [{ id: createdAccountId, is_demo: false }],
      account_pricing: [
        { account_id: createdAccountId, discount_percent: 5, payment_terms_label: "Net 30", payment_terms_days: 30 },
      ],
      integration_partner_product_maps: [
        { partner_id: partnerA, external_sku: "PARTNER-SKU", product_variant_id: variantId, status: "verified" },
        { partner_id: partnerB, external_sku: "PARTNER-SKU", product_variant_id: "99999999-9999-4999-8999-999999999999", status: "verified" },
      ],
    };
    const result = await submitPartnerOrder(
      db(tables, async (args, fn) => {
        calls.push(String(fn));
        if (fn === "integration_ensure_partner_account") return { result: "created", account_id: createdAccountId };
        captured = args;
        return { result: "created", order_id: orderId, order_number: "ORD-20261020-AB12CD" };
      }) as any,
      {
        partnerId: partnerA,
        idempotencyKey: "ORD-NEW-1",
        order: {
          ...order,
          partner_order_number: "ORD-NEW-1",
          partner_account_ref: "new-clinic",
          customer: { name: "Synthetic Auto Clinic" },
          lines: [{ sku: "PARTNER-SKU", quantity: 2 }],
        },
      }
    );
    expect(result.ok).toBe(true);
    expect(calls).toEqual(["integration_ensure_partner_account", "integration_submit_priced_order"]);
    const items = captured?.p_items as Array<{ product_variant_id: string; discount_percent: number; line_total: number }>;
    expect(items[0]).toMatchObject({ product_variant_id: variantId, discount_percent: 5, line_total: 95 });
    expect(JSON.stringify(captured)).not.toContain("account_users");
  });

  it("rejects a missing account, an unverified SKU, and an unknown SKU", async () => {
    const missing = await submitPartnerOrder(
      db({ ...catalog, integration_partner_accounts: [] }, async () => ({ result: "created", order_id: orderId })) as any,
      { partnerId: partnerA, idempotencyKey: "ORD-1001", order: { ...order, partner_account_ref: "missing-clinic" } }
    );
    expect(missing).toMatchObject({ ok: false, errorCode: "unknown_account" });

    const unverified = await submitPartnerOrder(
      db(
        {
          ...catalog,
          integration_partners: [{ id: partnerA, allow_direct_sku_match: true }],
          integration_partner_product_maps: [
            { partner_id: partnerA, external_sku: "FIXTURE-SKU", product_variant_id: variantId, status: "pending" },
          ],
        },
        async () => ({ result: "created", order_id: orderId })
      ) as any,
      { partnerId: partnerA, idempotencyKey: "ORD-1001", order }
    );
    expect(unverified).toMatchObject({ ok: false, status: 422, errorCode: "unverified_mapping" });

    const unmapped = await submitPartnerOrder(
      db(
        {
          ...catalog,
          integration_partners: [{ id: partnerA, allow_direct_sku_match: false }],
        },
        async () => ({ result: "created", order_id: orderId })
      ) as any,
      { partnerId: partnerA, idempotencyKey: "ORD-1001", order }
    );
    expect(unmapped).toMatchObject({ ok: false, status: 422, errorCode: "unmapped_sku" });
  });

  it("returns the original variant after a mapping would point somewhere else", async () => {
    const result = await getPartnerOrder(
      db({
        ...catalog,
        integration_partner_orders: [
          {
            partner_id: partnerA,
            external_order_number: "ORD-1001",
            idempotency_key: "ORD-1001",
            request_hash: "a".repeat(64),
            order_id: orderId,
          },
        ],
        integration_partner_product_maps: [
          { partner_id: partnerA, external_sku: "FIXTURE-SKU", product_variant_id: "99999999-9999-4999-8999-999999999999", status: "verified" },
        ],
      }) as any,
      partnerA,
      "ORD-1001"
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.lines[0]).toMatchObject({ product_variant_id: variantId, sku: "FIXTURE-SKU", quantity: 2, unit_price: 50 });
  });
});
