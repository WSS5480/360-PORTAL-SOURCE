import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const KindSchema = z.enum(["BILLING", "SHIPPING"]);

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

const CreateSchema = z.object({
  kind: KindSchema,
  label: z.string().min(1).max(120),
  is_default: z.boolean().optional(),
  address: AddressJsonSchema,
});

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = safeStr(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

async function parseBody(req: Request): Promise<any | null> {
  const ct = req.headers.get("content-type") || "";

  if (ct.includes("application/json")) {
    return await req.json().catch(() => null);
  }

  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const obj: any = {};
    for (const [k, v] of form.entries()) obj[k] = typeof v === "string" ? v : String(v);
    // allow passing address_* fields
    return obj;
  }

  return null;
}

function normalizeAddressFromFlat(obj: any): any {
  // Supports:
  // - address: { ... } (json)
  // - or flat keys: company/attn/line1/... (or address_company etc.)
  if (obj && typeof obj === "object") {
    if (obj.address && typeof obj.address === "object") return obj.address;

    const pick = (k: string) => {
      const direct = obj[k];
      const pref = obj[`address_${k}`];
      const v = direct ?? pref;
      const s = safeStr(v);
      return s ? s : null;
    };

    return {
      company: pick("company"),
      attn: pick("attn"),
      line1: pick("line1"),
      line2: pick("line2"),
      city: pick("city"),
      state: pick("state"),
      postal: pick("postal"),
      country: pick("country"),
      phone: pick("phone"),
      email: pick("email"),
      notes: pick("notes"),
    };
  }
  return {};
}

export async function GET(req: Request) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;
  if (!accountId) return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });

  const url = new URL(req.url);
  const kind = safeStr(url.searchParams.get("kind"));
  const onlyActive = safeStr(url.searchParams.get("only_active"));
  const limitRaw = safeStr(url.searchParams.get("limit"));

  const sb: any = createSupabaseAdminClient();

  let q = sb
    .from("account_addresses")
    .select("id, account_id, kind, label, is_default, address, created_at, updated_at, disabled_at")
    .eq("account_id", accountId);

  if (kind && (kind === "BILLING" || kind === "SHIPPING")) q = q.eq("kind", kind);
  if (!onlyActive || onlyActive.toLowerCase() !== "false") q = q.is("disabled_at", null);

  const limit = Number(limitRaw);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(500, Math.floor(limit)) : 200;

  const { data, error } = await q
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, addresses: data ?? [] });
}

export async function POST(req: Request) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;
  if (!accountId) return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });

  const body = await parseBody(req);
  if (!body) return NextResponse.json({ ok: false, error: "Unsupported content-type" }, { status: 415 });

  const kind = safeStr(body.kind);
  const label = safeStr(body.label);
  const is_default = safeBool(body.is_default);

  const candidate = {
    kind,
    label,
    is_default,
    address: normalizeAddressFromFlat(body),
  };

  const parsed = CreateSchema.safeParse(candidate);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();
  const actorUserId = (ctx.user as any)?.id ?? null;

  // If making default, clear existing default (active rows) for this account+kind
  if (parsed.data.is_default) {
    const { error: clearErr } = await sb
      .from("account_addresses")
      .update({ is_default: false })
      .eq("account_id", accountId)
      .eq("kind", parsed.data.kind)
      .is("disabled_at", null)
      .eq("is_default", true);

    if (clearErr) {
      return NextResponse.json({ ok: false, error: clearErr.message }, { status: 500 });
    }
  }

  const { data, error } = await sb
    .from("account_addresses")
    .insert({
      account_id: accountId,
      kind: parsed.data.kind,
      label: parsed.data.label,
      is_default: !!parsed.data.is_default,
      address: parsed.data.address,
      created_by_user_id: actorUserId,
    })
    .select("id, account_id, kind, label, is_default, address, created_at, updated_at, disabled_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, address: data });
}
