import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

function safeNum(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : NaN;
}

function toIsoDateOnly(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;

  // Allow "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // Allow "YYYYMMDD"
  if (/^\d{8}$/.test(raw)) {
    const y = raw.slice(0, 4);
    const m = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    return `${y}-${m}-${d}`;
  }

  // Allow "YYMMDD" (GS1 AI 17 commonly outputs this)
  if (/^\d{6}$/.test(raw)) {
    const yy = raw.slice(0, 2);
    const mm = raw.slice(2, 4);
    const dd = raw.slice(4, 6);
    return `20${yy}-${mm}-${dd}`;
  }

  return null;
}

// Minimal GS1 AI parser for the common case:
// (01)GTIN(10)LOT(17)YYMMDD or YYYYMMDD(21)SERIAL
function parseGs1AIs(raw: string): {
  gtin?: string;
  lot_number?: string;
  expiration_date?: string; // YYYY-MM-DD
  serial_number?: string;
} {
  const s = String(raw || "").trim();
  if (!s) return {};

  // Parentheses format: (01)....(10)....(17)....(21)....
  if (s.includes("(") && s.includes(")")) {
    const out: any = {};
    const re = /\((\d{2})\)([^()]*)/g;
    const parts: Array<{ ai: string; val: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      parts.push({ ai: m[1], val: (m[2] ?? "").trim() });
    }

    for (const p of parts) {
      if (p.ai === "01") out.gtin = p.val;
      if (p.ai === "10") out.lot_number = p.val;
      if (p.ai === "21") out.serial_number = p.val;
      if (p.ai === "17") {
        const vv = p.val.replace(/\D/g, "");
        const iso = toIsoDateOnly(vv);
        if (iso) out.expiration_date = iso;
      }
    }
    return out;
  }

  // Other scanner formats exist (ASCII 29 separators, etc.)
  // We intentionally do not attempt to decode those here.
  return {};
}

export async function POST(req: Request) {
  const ctx = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const body = await req.json().catch(() => ({}));

  const sku = String((body as any)?.sku ?? "").trim();
  const location = String((body as any)?.location ?? "").trim() || null; // optional (we store in meta; table column optional)
  const qtyRaw = safeNum((body as any)?.qty);
  const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;

  const reasonRaw = String((body as any)?.reason ?? "").trim();
  const reason = reasonRaw || "Receiving scan-in";

  const rawScan = String((body as any)?.raw_scan ?? "").trim() || null;

  const lotManual = String((body as any)?.lot_number ?? "").trim() || null;
  const serialManual = String((body as any)?.serial_number ?? "").trim() || null;
  const expManual = toIsoDateOnly((body as any)?.expiration_date);

  if (!sku) {
    return NextResponse.json(
      { ok: false, error: "Missing sku. Receiving requires a SKU until GTIN mapping is implemented." },
      { status: 400 }
    );
  }

  // Find variant by SKU
  const { data: variant, error: vErr } = await sb
    .from("product_variants")
    .select("id, sku")
    .eq("sku", sku)
    .maybeSingle();

  if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
  if (!variant) return NextResponse.json({ ok: false, error: `No variant found for SKU: ${sku}` }, { status: 404 });

  const variantId = String(variant.id);

  // Parse GS1 if provided (best-effort)
  const gs1 = rawScan ? parseGs1AIs(rawScan) : {};
  const lot_number = lotManual ?? (gs1.lot_number ? String(gs1.lot_number).trim() : null);
  const serial_number = serialManual ?? (gs1.serial_number ? String(gs1.serial_number).trim() : null);
  const expiration_date = expManual ?? (gs1.expiration_date ? toIsoDateOnly(gs1.expiration_date) : null);
  /** Matches DB row: product_variant_lots.lot_number is NOT NULL; we persist UNKNOWN when not parsed. */
  const storedLotNumber = lot_number ?? "UNKNOWN";

  // Serial = single unit
  if (serial_number && qty !== 1) {
    return NextResponse.json({ ok: false, error: "Serial-controlled receiving requires qty = 1." }, { status: 400 });
  }

  if (!lot_number && !serial_number && !rawScan) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing lot/serial/raw_scan. Provide raw_scan (recommended) or enter lot_number/serial_number manually.",
      },
      { status: 400 }
    );
  }

  // If serial present, prevent duplicates (do not double-add silently)
  if (serial_number) {
    const { data: existingSerial, error: sErr } = await sb
      .from("product_variant_lots")
      .select("id, variant_id, serial_number")
      .eq("serial_number", serial_number)
      .maybeSingle();

    if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });

    if (existingSerial?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: `Serial already exists in inventory: ${serial_number}. (Ref: ${existingSerial.id})`,
        },
        { status: 400 }
      );
    }
  }

  const nowIso = new Date().toISOString();

  // Insert lot/serial trace row
  // NOTE: we keep your existing table usage (product_variant_lots) intact
  let lotRowId: string | null = null;
  try {
    const insertPayload: any = {
      variant_id: variantId,
      lot_number: storedLotNumber,
      serial_number,
      expiration_date,
      qty,
      raw_scan: rawScan,
    };

    // Optional: if your table later gets a "location" column, this will just start working
    if (location) insertPayload.location = location;

    const { data: lotRow, error: lotErr } = await sb
      .from("product_variant_lots")
      .insert(insertPayload)
      .select("id")
      .single();

    if (lotErr) {
      return NextResponse.json({ ok: false, error: lotErr.message }, { status: 400 });
    }

    lotRowId = lotRow?.id ? String(lotRow.id) : null;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ? String(e.message) : "Failed to insert lot row" },
      { status: 500 }
    );
  }

  // Read current on-hand (portal truth)
  const { data: invRow, error: invErr } = await sb
    .from("product_variant_inventory")
    .select("variant_id, qty_on_hand")
    .eq("variant_id", variantId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

  const prior = Number(invRow?.qty_on_hand ?? 0) || 0;
  const next = prior + qty;

  // Update portal truth table
  const { error: upErr } = await sb
    .from("product_variant_inventory")
    .upsert({ variant_id: variantId, qty_on_hand: next, updated_at: nowIso }, { onConflict: "variant_id" });

  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  // Keep legacy table in sync (best-effort)
  try {
    await sb.from("variant_inventory").upsert({ variant_id: variantId, on_hand: next, updated_at: nowIso }, { onConflict: "variant_id" });
  } catch {
    // ignore
  }

  // Movement log (immutable) — store lot/serial/exp/raw_scan/location in meta
  const actorUserId = String((ctx as any)?.user?.id ?? "");
  if (actorUserId) {
    try {
      await sb.from("inventory_movements").insert({
        variant_id: variantId,
        delta: qty,
        resulting_on_hand: next,
        reason,
        actor_user_id: actorUserId,
        meta: {
          source: "admin_inventory_receive",
          location: location ?? undefined,
          lot_row_id: lotRowId,
          lot_number: storedLotNumber,
          serial_number,
          expiration_date,
          raw_scan: rawScan,
          prior_qty_on_hand: prior,
        },
        ip: getClientIp(req),
        user_agent: req.headers.get("user-agent"),
      });
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    ok: true,
    lot_row_id: lotRowId,
    variant_id: variantId,
    sku: String(variant.sku ?? sku),
    delta: qty,
    prior_qty_on_hand: prior,
    next_qty_on_hand: next,
    lot_number: storedLotNumber,
    serial_number,
    expiration_date,
    raw_scan: rawScan,
    updated_at: nowIso,
  });
}
