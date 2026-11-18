import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { describeRegionCodeIssue, normalizeRegionCode } from "@/lib/shipping/normalizeRegionCode";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BLOCKED_ORDER_STATUSES = new Set([
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "DENIED",
  "VOID",
  "VOIDED",
]);

const AddressJsonSchema = z
  .object({
    company: z.string().optional().nullable(),
    attn: z.string().optional().nullable(),
    line1: z.string().optional().nullable(),
    line2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postal: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .passthrough();

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeAddressInput(raw: z.infer<typeof AddressJsonSchema>) {
  const country = safeStr(raw.country) || "US";
  const stateRaw = safeStr(raw.state);
  const stateNorm = normalizeRegionCode(stateRaw, country);
  return {
    company: safeStr(raw.company) || null,
    attn: safeStr(raw.attn) || null,
    line1: safeStr(raw.line1) || null,
    line2: safeStr(raw.line2) || null,
    city: safeStr(raw.city) || null,
    state: stateNorm ? stateNorm.toUpperCase() : stateRaw || null,
    postal: safeStr(raw.postal) || null,
    country,
    phone: safeStr(raw.phone) || null,
    email: safeStr(raw.email) || null,
    notes: safeStr(raw.notes) || null,
  };
}

function validateAddress(addr: ReturnType<typeof normalizeAddressInput>): string | null {
  if (!safeStr(addr.line1)) return "Street address is required.";
  if (!safeStr(addr.city)) return "City is required.";
  if (!safeStr(addr.postal)) return "Postal/ZIP code is required.";
  const stateRaw = safeStr(addr.state);
  if (!stateRaw) return "State/province is required.";
  const regionIssue = describeRegionCodeIssue(stateRaw, normalizeRegionCode(stateRaw, addr.country));
  if (regionIssue) return regionIssue;
  return null;
}

export async function POST(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const ctx = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = AddressJsonSchema.safeParse(body?.delivery_address ?? body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const nextAddress = normalizeAddressInput(parsed.data);
  const validationError = validateAddress(nextAddress);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, account_id, order_number, status")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  const statusUpper = safeStr(order.status).toUpperCase();
  if (BLOCKED_ORDER_STATUSES.has(statusUpper)) {
    return NextResponse.json(
      { ok: false, error: `Cannot edit delivery address for ${statusUpper} orders.` },
      { status: 400 }
    );
  }

  const { error: updErr } = await sb
    .from("orders")
    .update({ delivery_address: nextAddress })
    .eq("id", orderId);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  try {
    await sb.from("audit_events").insert({
      account_id: order.account_id,
      actor_user_id: ctx.user?.id ?? null,
      action: "ORDER_DELIVERY_ADDRESS_UPDATED",
      resource_type: "order",
      resource_id: orderId,
      metadata: { order_number: order.order_number, source: "admin_fulfillment" },
    });
  } catch {}

  return NextResponse.json({ ok: true, delivery_address: nextAddress });
}
