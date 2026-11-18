import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  CreateAccountAddressSchema,
  insertAccountAddressRow,
  normalizeAddressFromFlat,
  parseAccountAddressBody,
  safeBool,
  safeStr,
} from "@/lib/accounts/accountAddressBookApi";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  try {
    await requireOrdersStaffOrAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { accountId } = await ctx.params;
  if (!UUID_RE.test(accountId)) {
    return NextResponse.json({ ok: false, error: "Invalid account id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const kind = safeStr(url.searchParams.get("kind"));
  const onlyActive = safeStr(url.searchParams.get("only_active"));
  const limitRaw = safeStr(url.searchParams.get("limit"));

  const sb: any = createSupabaseAdminClient();

  const { data: account, error: accountErr } = await sb.from("accounts").select("id").eq("id", accountId).maybeSingle();
  if (accountErr) return NextResponse.json({ ok: false, error: accountErr.message }, { status: 500 });
  if (!account) return NextResponse.json({ ok: false, error: "Account not found." }, { status: 404 });

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

export async function POST(req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  let adminCtx;
  try {
    adminCtx = await requireOrdersStaffOrAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { accountId } = await ctx.params;
  if (!UUID_RE.test(accountId)) {
    return NextResponse.json({ ok: false, error: "Invalid account id" }, { status: 400 });
  }

  const body = await parseAccountAddressBody(req);
  if (!body) return NextResponse.json({ ok: false, error: "Unsupported content-type" }, { status: 415 });

  const candidate = {
    kind: safeStr(body.kind),
    label: safeStr(body.label),
    is_default: safeBool(body.is_default),
    address: normalizeAddressFromFlat(body),
  };

  const parsed = CreateAccountAddressSchema.safeParse(candidate);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();

  const { data: account, error: accountErr } = await sb.from("accounts").select("id").eq("id", accountId).maybeSingle();
  if (accountErr) return NextResponse.json({ ok: false, error: accountErr.message }, { status: 500 });
  if (!account) return NextResponse.json({ ok: false, error: "Account not found." }, { status: 404 });

  try {
    const data = await insertAccountAddressRow(sb, {
      accountId,
      kind: parsed.data.kind,
      label: parsed.data.label,
      is_default: !!parsed.data.is_default,
      address: parsed.data.address,
      createdByUserId: adminCtx.user?.id ? String(adminCtx.user.id) : null,
    });
    return NextResponse.json({ ok: true, address: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save address.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
