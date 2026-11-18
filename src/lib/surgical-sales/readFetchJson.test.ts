import { describe, expect, it } from "vitest";
import { readFetchJson } from "./readFetchJson";

describe("readFetchJson", () => {
  it("throws a readable error for empty response bodies", async () => {
    const res = new Response("", { status: 500 });
    await expect(readFetchJson(res, "Save failed")).rejects.toThrow("Save failed (500)");
  });

  it("parses valid JSON responses", async () => {
    const res = new Response(JSON.stringify({ ok: true, contact: { id: "c1" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const payload = await readFetchJson<{ ok: boolean; contact: { id: string } }>(res, "Load failed");
    expect(payload.contact.id).toBe("c1");
  });
});
