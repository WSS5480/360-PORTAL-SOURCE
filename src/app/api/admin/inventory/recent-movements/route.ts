import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RECEIVE_SOURCE = "admin_inventory_receive";
const REMOVE_SOURCE = "admin_inventory_remove";

type RecentRow = {
  id: string;
  at: string;
  sku: string;
  delta: number;
  prior: number;
  next: number;
  lot: string | null;
  rawScan: string | null;
  serial: string | null;
  exp: string | null;
  reason: string | null;
  location: string | null;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
};

function safeStr(v: unknown) {
  return typeof v === "string" ? v : "";
}
function safeEmail(v: unknown) {
  return safeStr(v).trim().toLowerCase();
}

async function loadAuthEmailsByUserIds(adminSb: any, userIds: string[]) {
  const emailById = new Map<string, string>();
  const getUserById = adminSb?.auth?.admin?.getUserById;
  if (typeof getUserById !== "function") return emailById;

  for (const id of userIds) {
    try {
      const res = await adminSb.auth.admin.getUserById(id);
      const email = safeEmail(res?.data?.user?.email);
      if (email) emailById.set(id, email);
    } catch {
      // ignore
    }
  }
  return emailById;
}

function asMeta(m: unknown): Record<string, unknown> {
  return m && typeof m === "object" ? (m as Record<string, unknown>) : {};
}

export async function GET(req: Request) {
  await requireOrdersStaffOrAdmin();
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "remove" ? "remove" : "receive";
  const source = mode === "remove" ? REMOVE_SOURCE : RECEIVE_SOURCE;

  const sb: any = createSupabaseAdminClient();

  const { data: movements, error } = await sb
    .from("inventory_movements")
    .select("id, created_at, delta, resulting_on_hand, reason, meta, variant_id, actor_user_id")
    .eq("meta->>source", source)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rowsRaw = Array.isArray(movements) ? movements : [];
  const variantIds = Array.from(
    new Set(rowsRaw.map((r: any) => String(r?.variant_id ?? "").trim()).filter((id: string) => id.length > 0))
  );

  let skuByVariant = new Map<string, string>();
  if (variantIds.length) {
    const { data: variants } = await sb.from("product_variants").select("id, sku").in("id", variantIds as any);
    for (const v of variants ?? []) {
      const id = String((v as any)?.id ?? "");
      const sku = String((v as any)?.sku ?? "").trim();
      if (id && sku) skuByVariant.set(id, sku);
    }
  }

  const actorIds = Array.from(
    new Set(rowsRaw.map((r: any) => String(r?.actor_user_id ?? "").trim()).filter((id: string) => id.length > 0))
  );

  const nameByActorId = new Map<string, string>();
  if (actorIds.length) {
    const { data: profs } = await sb.from("user_profiles").select("user_id, full_name").in("user_id", actorIds as any);
    for (const p of profs ?? []) {
      const uid = String((p as any)?.user_id ?? "").trim();
      const fn = String((p as any)?.full_name ?? "").trim();
      if (uid && fn) nameByActorId.set(uid, fn);
    }
  }

  const emailByActorId = actorIds.length ? await loadAuthEmailsByUserIds(sb, actorIds) : new Map<string, string>();

  const out: RecentRow[] = [];
  for (const m of rowsRaw) {
    const variantId = String((m as any)?.variant_id ?? "").trim();
    const sku = skuByVariant.get(variantId) || "—";
    const meta = asMeta((m as any)?.meta);
    const resulting = Number((m as any)?.resulting_on_hand ?? 0) || 0;
    const delta = Number((m as any)?.delta ?? 0) || 0;
    const priorMeta = meta.prior_qty_on_hand;
    const prior =
      typeof priorMeta === "number" && Number.isFinite(priorMeta)
        ? priorMeta
        : resulting - delta;

    const lot = meta.lot_number != null ? String(meta.lot_number) : null;
    const serial = meta.serial_number != null ? String(meta.serial_number) : null;
    const exp = meta.expiration_date != null ? String(meta.expiration_date) : null;
    const rawScan = meta.raw_scan != null ? String(meta.raw_scan) : null;
    const reason = String((m as any)?.reason ?? "").trim() || null;
    const location = meta.location != null && String(meta.location).trim() ? String(meta.location).trim() : null;

    const actorUserId = String((m as any)?.actor_user_id ?? "").trim() || null;
    const actorName = actorUserId ? nameByActorId.get(actorUserId) ?? null : null;
    const actorEmail = actorUserId ? emailByActorId.get(actorUserId) ?? null : null;

    const created = (m as any)?.created_at;
    const atIso = typeof created === "string" ? created : new Date().toISOString();

    out.push({
      id: String((m as any)?.id ?? ""),
      at: atIso,
      sku,
      delta,
      prior,
      next: resulting,
      lot,
      rawScan,
      serial,
      exp,
      reason,
      location,
      actor_user_id: actorUserId,
      actor_name: actorName,
      actor_email: actorEmail,
    });
  }

  return NextResponse.json({ ok: true, rows: out });
}
