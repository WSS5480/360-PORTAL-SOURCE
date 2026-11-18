import { describe, expect, it } from "vitest";

/**
 * Model of integration_submit_priced_order.
 * The database function inserts the claim with ON CONFLICT DO NOTHING, then
 * SELECT ... FOR UPDATE so a second transaction waits until the first commits.
 */
type Claim = {
  partnerId: string;
  externalOrderNumber: string;
  idempotencyKey: string;
  requestHash: string;
  orderId: string | null;
};

class PartnerOrderClaimStore {
  rows: Claim[] = [];
  private tail: Promise<void> = Promise.resolve();

  submit(input: Omit<Claim, "orderId">): Promise<{ result: "created" | "replay" | "conflict"; orderId?: string }> {
    const run = this.tail.then(async () => {
      const byNumber = this.rows.find(
        (row) => row.partnerId === input.partnerId && row.externalOrderNumber === input.externalOrderNumber
      );
      const byKey = this.rows.find(
        (row) => row.partnerId === input.partnerId && row.idempotencyKey === input.idempotencyKey
      );
      const existing = byNumber ?? byKey;
      if (!existing) {
        const created: Claim = { ...input, orderId: `order-${this.rows.length + 1}` };
        this.rows.push(created);
        return { result: "created" as const, orderId: created.orderId ?? undefined };
      }
      const same =
        existing.requestHash === input.requestHash &&
        existing.externalOrderNumber === input.externalOrderNumber &&
        existing.idempotencyKey === input.idempotencyKey;
      if (!same) return { result: "conflict" as const, orderId: existing.orderId ?? undefined };
      return { result: "replay" as const, orderId: existing.orderId ?? undefined };
    });
    this.tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }
}

describe("simultaneous partner order retries", () => {
  it("creates one order when two identical submissions run together", async () => {
    const store = new PartnerOrderClaimStore();
    const input = {
      partnerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      externalOrderNumber: "ORD-1001",
      idempotencyKey: "ORD-1001",
      requestHash: "b".repeat(64),
    };
    const results = await Promise.all([store.submit(input), store.submit(input)]);
    expect(results.map((result) => result.result).sort()).toEqual(["created", "replay"]);
    expect(new Set(results.map((result) => result.orderId)).size).toBe(1);
    expect(store.rows).toHaveLength(1);
  });

  it("conflicts when a concurrent submission changes the payload", async () => {
    const store = new PartnerOrderClaimStore();
    const base = {
      partnerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      externalOrderNumber: "ORD-1001",
      idempotencyKey: "ORD-1001",
    };
    const results = await Promise.all([
      store.submit({ ...base, requestHash: "c".repeat(64) }),
      store.submit({ ...base, requestHash: "d".repeat(64) }),
    ]);
    expect(results.map((result) => result.result).sort()).toEqual(["conflict", "created"]);
    expect(store.rows).toHaveLength(1);
  });

  it("allows the same partner order number on a different partner", async () => {
    const store = new PartnerOrderClaimStore();
    const results = await Promise.all([
      store.submit({
        partnerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        externalOrderNumber: "ORD-1001",
        idempotencyKey: "ORD-1001",
        requestHash: "e".repeat(64),
      }),
      store.submit({
        partnerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        externalOrderNumber: "ORD-1001",
        idempotencyKey: "ORD-1001",
        requestHash: "e".repeat(64),
      }),
    ]);
    expect(results.every((result) => result.result === "created")).toBe(true);
    expect(store.rows).toHaveLength(2);
  });
});
