import type { SupabaseClient } from "@supabase/supabase-js";

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Fungible virtual warehouse sq cm (see account_pricing.virtual_sqcm_balance). */
export async function getVirtualSqcmBalance(sb: SupabaseClient, accountId: string): Promise<number> {
  const { data, error } = await sb
    .from("account_pricing")
    .select("virtual_sqcm_balance")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return safeNum((data as any)?.virtual_sqcm_balance);
}

export async function incrementVirtualSqcmBalance(sb: SupabaseClient, accountId: string, deltaSqcm: number): Promise<void> {
  if (!Number.isFinite(deltaSqcm) || deltaSqcm <= 0) return;

  const { error: rpcErr } = await sb.rpc("increment_virtual_sqcm_balance", {
    p_account_id: accountId,
    p_delta: deltaSqcm,
  });

  if (!rpcErr) return;

  const { data: row, error: readErr } = await sb
    .from("account_pricing")
    .select("virtual_sqcm_balance")
    .eq("account_id", accountId)
    .maybeSingle();

  if (readErr) throw new Error(readErr.message);
  const cur = safeNum((row as any)?.virtual_sqcm_balance);
  const { error: upErr } = await sb
    .from("account_pricing")
    .update({ virtual_sqcm_balance: cur + deltaSqcm })
    .eq("account_id", accountId);

  if (upErr) throw new Error(upErr.message);
}

/** Returns true if balance was sufficient and subtracted. */
export async function trySubtractVirtualSqcmBalance(
  sb: SupabaseClient,
  accountId: string,
  deltaSqcm: number
): Promise<boolean> {
  if (!Number.isFinite(deltaSqcm) || deltaSqcm <= 0) return true;

  const { data, error: rpcErr } = await sb.rpc("try_subtract_virtual_sqcm_balance", {
    p_account_id: accountId,
    p_delta: deltaSqcm,
  });

  if (!rpcErr) return data === true;

  const bal = await getVirtualSqcmBalance(sb, accountId);
  if (bal < deltaSqcm - 0.0001) return false;
  const { error: upErr } = await sb
    .from("account_pricing")
    .update({ virtual_sqcm_balance: bal - deltaSqcm })
    .eq("account_id", accountId);

  if (upErr) throw new Error(upErr.message);
  return true;
}
