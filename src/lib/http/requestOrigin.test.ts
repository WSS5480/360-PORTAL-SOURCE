import { describe, expect, it } from "vitest";
import { urlFromRequest } from "@/lib/http/requestOrigin";

function request(url: string, host: string): Request {
  return new Request(url, { headers: { host } });
}

describe("loopback redirect origin", () => {
  it("keeps the browser host when Next reports a different loopback alias", () => {
    const destination = urlFromRequest(request("http://localhost:3010/api/admin/orders/1/invoice", "127.0.0.1:3010"), "/admin/orders/1");
    expect(destination.origin).toBe("http://127.0.0.1:3010");
    expect(destination.pathname).toBe("/admin/orders/1");
  });

  it("keeps an absolute referer and does not follow a public Host header", () => {
    const referer = urlFromRequest(
      request("http://localhost:3010/api/admin/invoices/1/status", "127.0.0.1:3010"),
      "http://127.0.0.1:3010/admin/invoices/1"
    );
    expect(referer.href).toBe("http://127.0.0.1:3010/admin/invoices/1");

    const attack = urlFromRequest(request("https://app.example.test/admin", "evil.example"), "/admin");
    expect(attack.origin).toBe("https://app.example.test");
  });
});
