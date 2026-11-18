import { sendEmail } from "@/lib/email/sendEmail";

type OrderEmailArgs = {
  sb: any;
  orderId: string;
  accountId: string;
  submittedAt: string;
  submittedBy: string;
  customerEmail?: string | null;
  adminUrl?: string;
  portalUrl?: string;
  /** Demo accounts: skip all outbound order notification emails. */
  skipEmails?: boolean;
};

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function splitEmails(v: string | undefined): string[] {
  const s = (v ?? "").trim();
  if (!s) return [];
  return s
    .split(/[,\n;]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function prettyAddress(v: any): string {
  if (!v || typeof v !== "object") return "—";
  const get = (k: string) => (v as any)?.[k] ?? "";
  const parts = [
    get("company"),
    get("attn") ? `Attn: ${get("attn")}` : "",
    get("line1"),
    get("line2"),
    [get("city"), get("state"), get("postal")].filter(Boolean).join(", "),
    get("country"),
    get("phone") ? `Phone: ${get("phone")}` : "",
    get("email") ? `Email: ${get("email")}` : "",
    get("notes") ? `Notes: ${get("notes")}` : "",
  ].filter((x) => String(x || "").trim().length > 0);

  return parts.length ? parts.join("\n") : "—";
}

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function addressHtml(v: any): string {
  const text = prettyAddress(v);
  return escapeHtml(text).replace(/\n/g, "<br />");
}

export function formatCentralTime(date: Date): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
    return fmt.format(date);
  } catch {
    return date.toLocaleString();
  }
}

function buildOrderEmailHtml(args: {
  title: string;
  subtitle: string;
  orderNumber: string;
  accountName: string;
  submittedAt: string;
  submittedBy: string;
  shippingPriority: string;
  billingHtml: string;
  shippingHtml: string;
  totals: { subtotal: string; shipping: string; total: string };
  linesHtml: string;
  adminUrl?: string;
  portalUrl?: string;
}) {
  const brand = "#0b5cab";
  const ink = "#0f172a";
  const muted = "#64748b";
  const border = "rgba(15, 23, 42, 0.12)";
  const surface = "#ffffff";
  const soft = "rgba(15, 23, 42, 0.04)";

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#f6f7fb;margin:0;padding:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${ink}">
    <tr>
      <td align="center" style="padding:0;margin:0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:720px;margin:0 auto;background:${surface};border:1px solid ${border};border-radius:16px;overflow:hidden;box-shadow:0 10px 24px rgba(15,23,42,0.08)">
          <tr>
            <td style="padding:0;margin:0">
      <div style="background:linear-gradient(180deg,#061225,#050b16);padding:22px 24px;color:#fff">
        <div style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;opacity:.75">360 Portal</div>
        <div style="font-size:24px;font-weight:800;margin-top:6px">${escapeHtml(args.title)}</div>
        <div style="font-size:14px;margin-top:6px;opacity:.8">${escapeHtml(args.subtitle)}</div>
      </div>

      <div style="padding:20px 24px;display:grid;gap:16px">
        <div style="display:grid;gap:8px">
          <div style="font-size:13px;color:${muted}">Order</div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <div style="font-size:20px;font-weight:800;background:rgba(11,92,171,0.08);display:inline-flex;padding:6px 10px;border-radius:10px;width:fit-content">${escapeHtml(
              args.orderNumber
            )}</div>
            <span style="font-size:11px;font-weight:800;color:${brand};background:rgba(11,92,171,0.12);border:1px solid rgba(11,92,171,0.22);padding:4px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.08em">Submitted</span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
          <div style="border:1px solid ${border};border-radius:12px;padding:12px;background:${soft}">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Account</div>
            <div style="font-weight:800;margin-top:6px">${escapeHtml(args.accountName)}</div>
          </div>
          <div style="border:1px solid ${border};border-radius:12px;padding:12px;background:${soft}">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Submitted</div>
            <div style="font-weight:700;margin-top:6px">${escapeHtml(args.submittedAt)}</div>
            <div style="color:${muted};margin-top:4px">${escapeHtml(args.submittedBy)}</div>
          </div>
          <div style="border:1px solid ${border};border-radius:12px;padding:12px;background:${soft}">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Shipping priority</div>
            <div style="font-weight:800;margin-top:6px;color:${brand}">${escapeHtml(args.shippingPriority)}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
          <div style="border:1px solid ${border};border-radius:12px;padding:12px">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Billing</div>
            <div style="margin-top:6px;font-size:13px;line-height:1.5">${args.billingHtml}</div>
          </div>
          <div style="border:1px solid ${border};border-radius:12px;padding:12px">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Shipping</div>
            <div style="margin-top:6px;font-size:13px;line-height:1.5">${args.shippingHtml}</div>
          </div>
        </div>

        <div style="border:1px solid ${border};border-radius:12px;padding:12px">
          <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Line items</div>
          <div style="margin-top:8px;font-size:13px;line-height:1.5">${args.linesHtml}</div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
          <div style="border:1px solid ${border};border-radius:12px;padding:12px">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Subtotal</div>
            <div style="font-weight:800;margin-top:6px">${escapeHtml(args.totals.subtotal)}</div>
          </div>
          <div style="border:1px solid ${border};border-radius:12px;padding:12px">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Shipping</div>
            <div style="font-weight:800;margin-top:6px">${escapeHtml(args.totals.shipping)}</div>
          </div>
          <div style="border:1px solid ${border};border-radius:12px;padding:12px">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Total</div>
            <div style="font-weight:900;margin-top:6px;color:${brand}">${escapeHtml(args.totals.total)}</div>
          </div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${
            args.adminUrl
              ? `<a href="${escapeHtml(
                  args.adminUrl
                )}" style="text-decoration:none;background:rgba(15,23,42,0.08);color:${ink};padding:10px 14px;border-radius:10px;font-weight:800;font-size:13px">View in Admin</a>`
              : ""
          }
          ${
            args.portalUrl
              ? `<a href="${escapeHtml(
                  args.portalUrl
                )}" style="text-decoration:none;background:#111;color:white;padding:10px 14px;border-radius:10px;font-weight:800;font-size:13px">View order in portal</a>`
              : ""
          }
        </div>
      </div>

      <div style="padding:16px 24px;border-top:1px solid ${border};font-size:12px;color:${muted}">
        This message was sent by 360 Portal. If you have questions, reply to this email.
      </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;
}

export function buildShippingEmailHtml(args: {
  title: string;
  subtitle: string;
  orderNumber: string;
  accountName: string;
  shippedAt: string;
  /** Actual shipping service used (e.g. "FedEx Ground") — shown when shipped */
  shippingService?: string;
  /** When admin changed service from customer choice */
  serviceChangeReason?: string;
  /** Original service customer chose (for change context) */
  serviceChangedFrom?: string;
  /** Legacy: customer's original choice — used as fallback when no actual service */
  shippingPriority?: string;
  billingHtml: string;
  shippingHtml: string;
  totals: { subtotal: string; shipping: string; total: string };
  linesHtml: string;
  tracking: { carrier?: string; trackingNumber?: string; trackingUrl?: string };
  portalUrl?: string;
}) {
  const brand = "#0b5cab";
  const ink = "#0f172a";
  const muted = "#64748b";
  const border = "rgba(15, 23, 42, 0.12)";
  const surface = "#ffffff";
  const soft = "rgba(15, 23, 42, 0.04)";

  const carrierLabel = args.tracking.carrier ? `${args.tracking.carrier} ` : "";
  const trackingText = args.tracking.trackingNumber
    ? `${carrierLabel}${args.tracking.trackingNumber}`
    : "—";

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#f6f7fb;margin:0;padding:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${ink}">
    <tr>
      <td align="center" style="padding:0;margin:0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:720px;margin:0 auto;background:${surface};border:1px solid ${border};border-radius:16px;overflow:hidden;box-shadow:0 10px 24px rgba(15,23,42,0.08)">
          <tr>
            <td style="padding:0;margin:0">
      <div style="background:linear-gradient(180deg,#061225,#050b16);padding:22px 24px;color:#fff">
        <div style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;opacity:.75">360 Portal</div>
        <div style="font-size:24px;font-weight:800;margin-top:6px">${escapeHtml(args.title)}</div>
        <div style="font-size:14px;margin-top:6px;opacity:.8">${escapeHtml(args.subtitle)}</div>
      </div>

      <div style="padding:20px 24px;display:grid;gap:16px">
        <div style="display:grid;gap:8px">
          <div style="font-size:13px;color:${muted}">Order</div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <div style="font-size:20px;font-weight:800;background:rgba(11,92,171,0.08);display:inline-flex;padding:6px 10px;border-radius:10px;width:fit-content">${escapeHtml(
              args.orderNumber
            )}</div>
            <span style="font-size:11px;font-weight:800;color:${brand};background:rgba(11,92,171,0.12);border:1px solid rgba(11,92,171,0.22);padding:4px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.08em">Shipped</span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
          <div style="border:1px solid ${border};border-radius:12px;padding:12px;background:${soft}">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Account</div>
            <div style="font-weight:800;margin-top:6px">${escapeHtml(args.accountName)}</div>
          </div>
          <div style="border:1px solid ${border};border-radius:12px;padding:12px;background:${soft}">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Shipped</div>
            <div style="font-weight:700;margin-top:6px">${escapeHtml(args.shippedAt)}</div>
          </div>
          <div style="border:1px solid ${border};border-radius:12px;padding:12px;background:${soft}">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Shipping service</div>
            <div style="font-weight:800;margin-top:6px;color:${brand}">${escapeHtml(args.shippingService || args.shippingPriority || "—")}</div>
            ${
              args.serviceChangeReason
                ? `<div style="margin-top:8px;padding:8px;border-radius:8px;background:rgba(255,153,0,0.1);border:1px solid rgba(255,153,0,0.25);font-size:12px;color:#783c00;line-height:1.45">
                  <div style="font-weight:800;margin-bottom:4px">Service change${args.serviceChangedFrom ? ` (from ${escapeHtml(args.serviceChangedFrom)})` : ""}</div>
                  ${escapeHtml(args.serviceChangeReason)}
                </div>`
                : ""
            }
          </div>
        </div>

        <div style="border:1px solid ${border};border-radius:12px;padding:12px;background:#f8fafc">
          <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Tracking</div>
          <div style="margin-top:6px;font-weight:800">${escapeHtml(trackingText)}</div>
          ${
            args.tracking.trackingUrl
              ? `<div style="margin-top:8px"><a href="${escapeHtml(
                  args.tracking.trackingUrl
                )}" style="text-decoration:none;background:${brand};color:white;padding:8px 12px;border-radius:10px;font-weight:800;font-size:12px;display:inline-block">Track package</a></div>`
              : ""
          }
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
          <div style="border:1px solid ${border};border-radius:12px;padding:12px">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Billing</div>
            <div style="margin-top:6px;font-size:13px;line-height:1.5">${args.billingHtml}</div>
          </div>
          <div style="border:1px solid ${border};border-radius:12px;padding:12px">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Shipping</div>
            <div style="margin-top:6px;font-size:13px;line-height:1.5">${args.shippingHtml}</div>
          </div>
        </div>

        <div style="border:1px solid ${border};border-radius:12px;padding:12px">
          <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Line items</div>
          <div style="margin-top:8px;font-size:13px;line-height:1.5">${args.linesHtml}</div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
          <div style="border:1px solid ${border};border-radius:12px;padding:12px">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Subtotal</div>
            <div style="font-weight:800;margin-top:6px">${escapeHtml(args.totals.subtotal)}</div>
          </div>
          <div style="border:1px solid ${border};border-radius:12px;padding:12px">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Shipping</div>
            <div style="font-weight:800;margin-top:6px">${escapeHtml(args.totals.shipping)}</div>
          </div>
          <div style="border:1px solid ${border};border-radius:12px;padding:12px">
            <div style="font-size:12px;color:${muted};font-weight:700;text-transform:uppercase;letter-spacing:.04em">Total</div>
            <div style="font-weight:900;margin-top:6px;color:${brand}">${escapeHtml(args.totals.total)}</div>
          </div>
        </div>

        ${
          args.portalUrl
            ? `<div style="display:flex;gap:10px;flex-wrap:wrap">
                <a href="${escapeHtml(
                  args.portalUrl
                )}" style="text-decoration:none;background:#111;color:white;padding:10px 14px;border-radius:10px;font-weight:800;font-size:13px">View order in portal</a>
              </div>`
            : ""
        }
      </div>

      <div style="padding:16px 24px;border-top:1px solid ${border};font-size:12px;color:${muted}">
        This message was sent by 360 Portal. If you have questions, reply to this email.
      </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;
}

export async function sendOrderEmails(args: OrderEmailArgs) {
  if (args.skipEmails) {
    console.log("[sendOrderEmails] skipped (demo account)", { orderId: args.orderId, accountId: args.accountId });
    return;
  }

  const { sb, orderId, accountId, submittedAt, submittedBy, customerEmail, adminUrl, portalUrl } = args;

  const { data: acct } = await sb
    .from("accounts")
    .select("name, billing_email, discount_percent")
    .eq("id", accountId)
    .maybeSingle();

  const { data: order2 } = await sb
    .from("orders")
    .select("subtotal, shipping_total, total, invoice_address, delivery_address, order_number, shipping_priority")
    .eq("id", orderId)
    .maybeSingle();

  const { data: itemsForEmail } = await sb
    .from("order_items")
    .select("description, quantity, line_total, line_type, sort_order")
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true });

  const productLines2 = (itemsForEmail ?? []).filter((x: any) => String(x.line_type ?? "").toUpperCase() !== "SHIPPING");

  const linesText = productLines2
    .slice(0, 50)
    .map((it: any) => {
      const qty = Number(it.quantity) || 0;
      const desc = String(it.description ?? "Item");
      const lt = money(it.line_total);
      return `- ${qty} × ${desc} = ${lt}`;
    })
    .join("\n");

  const orderNumber = String(order2?.order_number ?? orderId);
  const linesHtml = linesText ? escapeHtml(linesText).replace(/\n/g, "<br />") : "—";
  const shippingPriority = String(order2?.shipping_priority ?? "—");

  const htmlBase = {
    orderNumber,
    accountName: acct?.name ?? "—",
    submittedAt,
    submittedBy,
    shippingPriority,
    billingHtml: addressHtml(order2?.invoice_address),
    shippingHtml: addressHtml(order2?.delivery_address),
    totals: {
      subtotal: money(order2?.subtotal),
      shipping: money(order2?.shipping_total),
      total: money(order2?.total),
    },
    linesHtml,
  };

  const to = splitEmails(env("ORDER_NOTIFY_TO"));
  const cc = splitEmails(env("ORDER_NOTIFY_CC"));

  if (to.length > 0) {
    const html = buildOrderEmailHtml({
      title: "New order submitted",
      subtitle: "A portal user submitted a new order.",
      adminUrl,
      // Staff notification: admin link only (no portal link for normal or bulk workflows).
      portalUrl: undefined,
      ...htmlBase,
    });
    await sendEmail({
      to,
      cc: cc.length ? cc : undefined,
      subject: `New order submitted: ${orderNumber} (${acct?.name ?? "Account"})`,
      html,
      emailType: "order",
    });
  }

  const customer = String(customerEmail ?? "").trim();
  if (customer) {
    const customerTotals = {
      ...htmlBase.totals,
      shipping: "TBD",
    };
    const html = buildOrderEmailHtml({
      title: "Order confirmed",
      subtitle: "Thanks for placing your order with 360 Medical.",
      adminUrl: undefined,
      portalUrl,
      ...htmlBase,
      totals: customerTotals,
    });
    await sendEmail({
      to: customer,
      subject: `Order confirmation: ${orderNumber}`,
      html,
      replyTo: env("EMAIL_REPLY_TO") || undefined,
      emailType: "order",
    });
  }
}
