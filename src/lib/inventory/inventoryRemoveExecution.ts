import type { SupabaseClient } from "@supabase/supabase-js";

export function toIsoDateOnly(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{8}$/.test(raw)) {
    const y = raw.slice(0, 4);
    const m = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    return `${y}-${m}-${d}`;
  }
  if (/^\d{6}$/.test(raw)) {
    const yy = raw.slice(0, 2);
    const mm = raw.slice(2, 4);
    const dd = raw.slice(4, 6);
    return `20${yy}-${mm}-${dd}`;
  }
  return null;
}

export function parseGs1AIs(raw: string): {
  gtin?: string;
  lot_number?: string;
  expiration_date?: string;
  serial_number?: string;
} {
  const s = String(raw || "").trim();
  if (!s) return {};
  if (s.includes("(") && s.includes(")")) {
    const out: Record<string, string> = {};
    const re = /\((\d{2})\)([^()]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      const ai = m[1];
      const val = (m[2] ?? "").trim();
      if (ai === "01") out.gtin = val;
      if (ai === "10") out.lot_number = val;
      if (ai === "21") out.serial_number = val;
      if (ai === "17") {
        const vv = val.replace(/\D/g, "");
        const iso = toIsoDateOnly(vv);
        if (iso) out.expiration_date = iso;
      }
    }
    return out;
  }
  return {};
}

type LotRow = { id: string; qty: number };

async function decrementLotRow(sb: SupabaseClient, id: string, curQty: number, nextQty: number): Promise<boolean> {
  const { data, error } = await sb
    .from("product_variant_lots")
    .update({ qty: nextQty })
    .eq("id", id)
    .eq("qty", curQty)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data?.id;
}

/** FIFO across rows: earliest expiration first, then newest created_at */
export async function removeQtyFromLotNumber(
  sb: SupabaseClient,
  variantId: string,
  lotNumber: string,
  qty: number,
  location: string | null
): Promise<{ touched: Array<{ lot_row_id: string; taken: number }>; total: number }> {
  let q = sb
    .from("product_variant_lots")
    .select("id, qty")
    .eq("variant_id", variantId)
    .eq("lot_number", lotNumber)
    .gt("qty", 0)
    .order("expiration_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (location) q = q.eq("location", location);

  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);

  const list: LotRow[] = (rows ?? []).map((r: any) => ({
    id: String(r.id),
    qty: Number(r.qty ?? 0) || 0,
  }));

  let remaining = qty;
  const touched: Array<{ lot_row_id: string; taken: number }> = [];

  for (const row of list) {
    if (remaining <= 0) break;
    const have = row.qty;
    if (have <= 0) continue;
    const take = Math.min(have, remaining);
    const next = have - take;
    const ok = await decrementLotRow(sb, row.id, have, next);
    if (!ok) throw new Error("Lot row changed while removing — try again.");
    touched.push({ lot_row_id: row.id, taken: take });
    remaining -= take;
  }

  if (remaining > 0) {
    const locHint = location ? ` in location "${location}"` : "";
    throw new Error(
      `Insufficient quantity for lot "${lotNumber}"${locHint}. Needed ${qty}, could only allocate ${qty - remaining}.`
    );
  }

  return { touched, total: qty };
}

export type ExecuteInventoryRemoveInput = {
  sku: string;
  qty: number;
  reason: string;
  actorUserId: string;
  location?: string | null;
  raw_scan?: string | null;
  lot_number?: string | null;
  serial_number?: string | null;
  expiration_date?: string | null;
  /** inventory_movements.meta.source */
  movementSource: string;
  /** Merged into inventory_movements.meta */
  movementMetaExtra?: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
};

export type ExecuteInventoryRemoveResult = {
  variant_id: string;
  sku: string;
  delta: number;
  prior_qty_on_hand: number;
  next_qty_on_hand: number;
  touched_lots: Array<{ lot_row_id: string; taken: number }>;
  lot_number: string | null | undefined;
  serial_number: string | null | undefined;
  expiration_date: string | null | undefined;
};

function safeNum(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : NaN;
}

/** Single removal — mirrors `/api/admin/inventory/remove` POST handler. */
export async function executeInventoryRemove(
  sb: SupabaseClient,
  input: ExecuteInventoryRemoveInput
): Promise<ExecuteInventoryRemoveResult> {
  const sku = String(input.sku ?? "").trim();
  const location = String(input.location ?? "").trim() || null;

  const qtyRaw = safeNum(input.qty);
  const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;

  const rawScan = String(input.raw_scan ?? "").trim() || null;
  const lotManual = String(input.lot_number ?? "").trim() || null;
  const serialManual = String(input.serial_number ?? "").trim() || null;
  const expManual = toIsoDateOnly(input.expiration_date);

  if (!sku) throw new Error("Missing sku.");

  const { data: variant, error: vErr } = await sb.from("product_variants").select("id, sku").eq("sku", sku).maybeSingle();
  if (vErr) throw new Error(vErr.message);
  if (!variant) throw new Error(`No variant found for SKU: ${sku}`);

  const variantId = String(variant.id);

  const gs1 = rawScan ? parseGs1AIs(rawScan) : {};
  const lot_number = lotManual ?? (gs1.lot_number ? String(gs1.lot_number).trim() : null);
  const serial_number = serialManual ?? (gs1.serial_number ? String(gs1.serial_number).trim() : null);
  const expiration_date = expManual ?? (gs1.expiration_date ? toIsoDateOnly(gs1.expiration_date) : null);

  if (serial_number && qty !== 1) {
    throw new Error("Serial-controlled removal requires qty = 1.");
  }

  if (!lot_number && !serial_number && !rawScan) {
    throw new Error("Missing lot/serial/raw_scan.");
  }

  const { data: invRow, error: invErr } = await sb
    .from("product_variant_inventory")
    .select("variant_id, qty_on_hand")
    .eq("variant_id", variantId)
    .maybeSingle();

  if (invErr) throw new Error(invErr.message);
  const priorOnHand = Number(invRow?.qty_on_hand ?? 0) || 0;
  if (priorOnHand < qty) {
    throw new Error(`Not enough on-hand for ${sku}. Have ${priorOnHand}, tried to remove ${qty}.`);
  }

  let touchedLots: Array<{ lot_row_id: string; taken: number }> = [];
  let lotMeta: { lot_number?: string | null; serial_number?: string | null; expiration_date?: string | null } = {
    lot_number,
    serial_number,
    expiration_date,
  };

  if (serial_number) {
    let q = sb
      .from("product_variant_lots")
      .select("id, qty, variant_id, serial_number")
      .eq("variant_id", variantId)
      .eq("serial_number", serial_number)
      .gt("qty", 0);

    if (location) q = q.eq("location", location);

    const { data: sRow, error: sErr } = await q.maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!sRow?.id) {
      const locHint = location ? ` in location "${location}"` : "";
      throw new Error(`Serial not found in inventory${locHint}: ${serial_number}`);
    }

    const have = Number(sRow.qty ?? 0) || 0;
    if (have < 1) throw new Error("Serial row has no quantity to remove.");

    const ok = await decrementLotRow(sb, String(sRow.id), have, 0);
    if (!ok) throw new Error("Serial row changed — try again.");
    touchedLots = [{ lot_row_id: String(sRow.id), taken: 1 }];
  } else if (lot_number) {
    const r = await removeQtyFromLotNumber(sb, variantId, lot_number, qty, location);
    touchedLots = r.touched;
  } else if (rawScan) {
    const gs = parseGs1AIs(rawScan);
    const serial = String(gs?.serial_number ?? "").trim() || null;
    const lot = String(gs?.lot_number ?? "").trim() || null;
    const rawFallback = rawScan.trim();

    if (serial) {
      let q = sb
        .from("product_variant_lots")
        .select("id, qty")
        .eq("variant_id", variantId)
        .eq("serial_number", serial)
        .gt("qty", 0);
      if (location) q = q.eq("location", location);
      const { data: sRow, error: sErr } = await q.maybeSingle();
      if (sErr) throw new Error(sErr.message);
      if (!sRow?.id) throw new Error(`Serial not found in inventory: ${serial}`);
      const have = Number(sRow.qty ?? 0) || 0;
      if (qty !== 1) throw new Error("Serial-controlled removal requires qty = 1.");
      const ok = await decrementLotRow(sb, String(sRow.id), have, 0);
      if (!ok) throw new Error("Serial row changed — try again.");
      touchedLots = [{ lot_row_id: String(sRow.id), taken: 1 }];
      lotMeta = { ...lotMeta, serial_number: serial };
    } else if (lot) {
      const r = await removeQtyFromLotNumber(sb, variantId, lot, qty, location);
      touchedLots = r.touched;
      lotMeta = { ...lotMeta, lot_number: lot };
    } else {
      let q = sb
        .from("product_variant_lots")
        .select("id, qty")
        .eq("variant_id", variantId)
        .eq("serial_number", rawFallback)
        .gt("qty", 0);
      if (location) q = q.eq("location", location);
      const { data: sRow } = await q.maybeSingle();
      if (sRow?.id) {
        if (qty !== 1) throw new Error("Serial-controlled removal requires qty = 1.");
        const have = Number(sRow.qty ?? 0) || 0;
        const ok = await decrementLotRow(sb, String(sRow.id), have, 0);
        if (!ok) throw new Error("Serial row changed — try again.");
        touchedLots = [{ lot_row_id: String(sRow.id), taken: 1 }];
        lotMeta = { ...lotMeta, serial_number: rawFallback };
      } else {
        const r = await removeQtyFromLotNumber(sb, variantId, rawFallback, qty, location);
        touchedLots = r.touched;
        lotMeta = { ...lotMeta, lot_number: rawFallback };
      }
    }
  }

  const nowIso = new Date().toISOString();
  const nextOnHand = priorOnHand - qty;

  const { error: upErr } = await sb
    .from("product_variant_inventory")
    .upsert({ variant_id: variantId, qty_on_hand: nextOnHand, updated_at: nowIso }, { onConflict: "variant_id" });

  if (upErr) throw new Error(upErr.message);

  try {
    await sb.from("variant_inventory").upsert({ variant_id: variantId, on_hand: nextOnHand, updated_at: nowIso }, { onConflict: "variant_id" });
  } catch {
    // ignore
  }

  if (input.actorUserId) {
    try {
      await sb.from("inventory_movements").insert({
        variant_id: variantId,
        delta: -qty,
        resulting_on_hand: nextOnHand,
        reason: input.reason,
        actor_user_id: input.actorUserId,
        meta: {
          source: input.movementSource,
          location: location ?? undefined,
          lot_touches: touchedLots,
          lot_number: lotMeta.lot_number,
          serial_number: lotMeta.serial_number,
          expiration_date: lotMeta.expiration_date,
          raw_scan: rawScan,
          prior_qty_on_hand: priorOnHand,
          ...(input.movementMetaExtra ?? {}),
        },
        ip: input.ip,
        user_agent: input.userAgent,
      });
    } catch {
      // ignore
    }
  }

  return {
    variant_id: variantId,
    sku: String(variant.sku ?? sku),
    delta: -qty,
    prior_qty_on_hand: priorOnHand,
    next_qty_on_hand: nextOnHand,
    touched_lots: touchedLots,
    lot_number: lotMeta.lot_number,
    serial_number: lotMeta.serial_number,
    expiration_date: lotMeta.expiration_date,
  };
}

/** Read-only check for preview UI (no mutations). */
export async function previewInventoryRemoveLine(
  sb: SupabaseClient,
  sku: string,
  identifier: string,
  qty: number,
  location: string | null
): Promise<{ ok: true; preview: PreviewOk } | PreviewFail> {
  const qNeed = Math.floor(Number(qty) || 0) > 0 ? Math.floor(Number(qty)) : 1;
  const id = String(identifier ?? "").trim();
  const sk = String(sku ?? "").trim();

  if (!sk || !id) return { ok: false, error: "Missing SKU or identifier." };

  const { data: variant, error: vErr } = await sb.from("product_variants").select("id, sku, size_label").eq("sku", sk).maybeSingle();
  if (vErr) return { ok: false, error: vErr.message };
  if (!variant) return { ok: false, error: `No variant found for SKU: ${sk}` };

  const variantId = String(variant.id);

  const { data: invRow, error: invErr } = await sb
    .from("product_variant_inventory")
    .select("variant_id, qty_on_hand")
    .eq("variant_id", variantId)
    .maybeSingle();
  if (invErr) return { ok: false, error: invErr.message };
  const priorOnHand = Number(invRow?.qty_on_hand ?? 0) || 0;
  if (priorOnHand < qNeed) {
    return previewFail(
      sb,
      variantId,
      id,
      `Not enough on-hand for ${sk}. Have ${priorOnHand}, need ${qNeed}.`,
      location
    );
  }

  // Simulate raw_scan = identifier (non-GS1) — serial first, else lot FIFO sum
  const gs = parseGs1AIs(id);
  if (gs.serial_number && qNeed !== 1) {
    return previewFail(sb, variantId, id, `Serial-controlled line requires qty = 1 (${id}).`, location);
  }

  let path: PreviewOk["matchPath"] = "serial";
  let lotAvailable = 0;

  if (gs.serial_number || gs.lot_number) {
    // Explicit GS1 on a single identifier is rare for pasted slips; still support
    if (gs.serial_number) {
      let q = sb
        .from("product_variant_lots")
        .select("id, qty")
        .eq("variant_id", variantId)
        .eq("serial_number", String(gs.serial_number).trim())
        .gt("qty", 0);
      if (location) q = q.eq("location", location);
      const { data: sRow } = await q.maybeSingle();
      const have = Number(sRow?.qty ?? 0) || 0;
      if (!sRow?.id || have < 1) {
        return previewFail(sb, variantId, id, `Serial not found in inventory: ${gs.serial_number}`, location);
      }
      path = "serial";
      lotAvailable = have;
    } else {
      const lot = String(gs.lot_number).trim();
      let q = sb
        .from("product_variant_lots")
        .select("qty")
        .eq("variant_id", variantId)
        .eq("lot_number", lot)
        .gt("qty", 0);
      if (location) q = q.eq("location", location);
      const { data: rows } = await q;
      lotAvailable = (rows ?? []).reduce((a, r) => a + (Number((r as any).qty ?? 0) || 0), 0);
      path = "lot";
      if (lotAvailable < qNeed) {
        return previewFail(
          sb,
          variantId,
          id,
          `Insufficient lot quantity for "${lot}". Have ${lotAvailable}, need ${qNeed}.`,
          location
        );
      }
    }
  } else {
    let qs = sb
      .from("product_variant_lots")
      .select("id, qty")
      .eq("variant_id", variantId)
      .eq("serial_number", id)
      .gt("qty", 0);
    if (location) qs = qs.eq("location", location);
    const { data: sRow } = await qs.maybeSingle();
    if (sRow?.id) {
      if (qNeed !== 1) {
        return previewFail(sb, variantId, id, "Serial-controlled removal requires qty = 1.", location);
      }
      path = "serial";
      lotAvailable = Number(sRow.qty ?? 0) || 0;
    } else {
      let ql = sb
        .from("product_variant_lots")
        .select("qty")
        .eq("variant_id", variantId)
        .eq("lot_number", id)
        .gt("qty", 0);
      if (location) ql = ql.eq("location", location);
      const { data: lotRows } = await ql;
      lotAvailable = (lotRows ?? []).reduce((a, r) => a + (Number((r as any).qty ?? 0) || 0), 0);
      path = "lot";
      if (lotAvailable < qNeed) {
        return previewFail(
          sb,
          variantId,
          id,
          `No stock found for identifier "${id}" (not a serial with qty > 0, and lot rows with qty > 0 sum to ${lotAvailable}; need ${qNeed}).`,
          location
        );
      }
    }
  }

  return {
    ok: true,
    preview: {
      sku: sk,
      variant_id: variantId,
      size_label: (variant as any).size_label ?? null,
      identifier: id,
      qty: qNeed,
      prior_qty_on_hand: priorOnHand,
      matchPath: path,
      available_in_trace_rows: lotAvailable,
    },
  };
}

export type PreviewOk = {
  sku: string;
  variant_id: string;
  size_label: string | null;
  identifier: string;
  qty: number;
  prior_qty_on_hand: number;
  matchPath: "serial" | "lot";
  available_in_trace_rows: number;
};

/** Trace + movement hints when a line cannot be removed (e.g. already shipped or PDF run twice). */
export type IdentifierHistoryHint = {
  trace_rows: Array<{
    id: string;
    qty: number;
    serial_number: string | null;
    lot_number: string | null;
    location: string | null;
    created_at: string | null;
  }>;
  movements: Array<{
    id: string;
    created_at: string;
    delta: number;
    reason: string | null;
    source: string | null;
  }>;
  /** When preview used a location filter, listed trace rows that exist under other bins */
  trace_at_other_locations?: string[];
};

function asMetaObj(m: unknown): Record<string, unknown> {
  return m && typeof m === "object" && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}

async function safeLookupHistory(
  sb: SupabaseClient,
  variantId: string,
  identifier: string,
  locationFilter: string | null
): Promise<IdentifierHistoryHint | undefined> {
  try {
    return await lookupIdentifierTraceHints(sb, variantId, identifier, locationFilter);
  } catch {
    return undefined;
  }
}

/**
 * Lot/serial trace rows (including qty 0) + recent inventory_movements mentioning this identifier.
 */
export async function lookupIdentifierTraceHints(
  sb: SupabaseClient,
  variantId: string,
  identifier: string,
  locationFilter: string | null
): Promise<IdentifierHistoryHint> {
  const id = String(identifier ?? "").trim();

  const [{ data: serLot }, { data: numLot }] = await Promise.all([
    sb
      .from("product_variant_lots")
      .select("id, qty, serial_number, lot_number, location, created_at")
      .eq("variant_id", variantId)
      .eq("serial_number", id)
      .order("created_at", { ascending: false })
      .limit(8),
    sb
      .from("product_variant_lots")
      .select("id, qty, serial_number, lot_number, location, created_at")
      .eq("variant_id", variantId)
      .eq("lot_number", id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const traceMap = new Map<string, any>();
  for (const r of [...(serLot ?? []), ...(numLot ?? [])]) {
    const row = r as any;
    const rid = String(row?.id ?? "");
    if (rid) traceMap.set(rid, row);
  }
  const trace_rows = Array.from(traceMap.values()).map((row: any) => ({
    id: String(row.id),
    qty: Number(row.qty ?? 0) || 0,
    serial_number: row.serial_number ?? null,
    lot_number: row.lot_number ?? null,
    location: row.location ?? null,
    created_at: row.created_at ?? null,
  }));

  let trace_at_other_locations: string[] | undefined;
  if (locationFilter && trace_rows.length) {
    const others = trace_rows.filter((t) => t.location && String(t.location) !== String(locationFilter));
    const locs = Array.from(new Set(others.map((t) => String(t.location)).filter(Boolean)));
    if (locs.length) trace_at_other_locations = locs.sort();
  }

  const sel = "id, created_at, delta, reason, meta";
  const [{ data: mSer }, { data: mLot }, { data: mRaw }] = await Promise.all([
    sb.from("inventory_movements").select(sel).eq("variant_id", variantId).eq("meta->>serial_number", id).order("created_at", { ascending: false }).limit(8),
    sb.from("inventory_movements").select(sel).eq("variant_id", variantId).eq("meta->>lot_number", id).order("created_at", { ascending: false }).limit(8),
    sb.from("inventory_movements").select(sel).eq("variant_id", variantId).eq("meta->>raw_scan", id).order("created_at", { ascending: false }).limit(8),
  ]);

  const movMap = new Map<string, any>();
  for (const m of [...(mSer ?? []), ...(mLot ?? []), ...(mRaw ?? [])]) {
    const mid = String((m as any)?.id ?? "");
    if (mid && !movMap.has(mid)) movMap.set(mid, m);
  }
  const movements = Array.from(movMap.values())
    .map((row: any) => {
      const meta = asMetaObj(row?.meta);
      return {
        id: String(row.id),
        created_at: String(row.created_at ?? ""),
        delta: Number(row.delta ?? 0) || 0,
        reason: row.reason != null ? String(row.reason) : null,
        source: meta.source != null ? String(meta.source) : null,
      };
    })
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 10);

  return {
    trace_rows,
    movements,
    ...(trace_at_other_locations?.length ? { trace_at_other_locations } : {}),
  };
}

type PreviewFail = { ok: false; error: string; history?: IdentifierHistoryHint };

async function previewFail(
  sb: SupabaseClient | null,
  variantId: string | null,
  identifier: string,
  error: string,
  locationFilter: string | null
): Promise<PreviewFail> {
  if (!sb || !variantId) return { ok: false, error };
  const h = await safeLookupHistory(sb, variantId, identifier, locationFilter);
  if (!h || (h.trace_rows.length === 0 && h.movements.length === 0)) return { ok: false, error };
  return { ok: false, error, history: h };
}
