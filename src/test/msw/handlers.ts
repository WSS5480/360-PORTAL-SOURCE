import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/health", () => HttpResponse.json({ ok: true })),
  http.get("/api/portal/me", () =>
    HttpResponse.json({
      ok: true,
      user: { is_admin: false, is_staff: false },
    })
  ),
  http.get("/api/portal/orders", () => HttpResponse.json({ ok: true, orders: [] })),
  http.get("/api/portal/invoices", () => HttpResponse.json({ ok: true, invoices: [] })),
  http.get("/api/portal/ivr", () => HttpResponse.json({ ok: true, ivrs: [] })),
  http.get("/api/admin/accounts", () => HttpResponse.json({ ok: true, accounts: [] })),
  http.get("/api/admin/orders", () => HttpResponse.json({ ok: true, orders: [] })),
  http.get("/api/admin/ivr", () => HttpResponse.json({ ok: true, ivrs: [] })),
];
