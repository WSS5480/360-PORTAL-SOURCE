import { supabaseAdmin } from "@/lib/supabase/admin";

export async function accountIsDemo(accountId: string | null | undefined): Promise<boolean> {
  const id = String(accountId ?? "").trim();
  if (!id) return false;
  const { data } = await supabaseAdmin.from("accounts").select("is_demo").eq("id", id).maybeSingle();
  return !!(data as { is_demo?: boolean | null } | null)?.is_demo;
}

export async function orderIsDemo(orderId: string | null | undefined): Promise<boolean> {
  const id = String(orderId ?? "").trim();
  if (!id) return false;
  const { data } = await supabaseAdmin.from("orders").select("account_id").eq("id", id).maybeSingle();
  if (!data) return false;
  return accountIsDemo((data as { account_id: string }).account_id);
}

export async function fulfillmentIsDemo(fulfillmentId: string | null | undefined): Promise<boolean> {
  const id = String(fulfillmentId ?? "").trim();
  if (!id) return false;
  const { data } = await supabaseAdmin.from("fulfillments").select("order_id").eq("id", id).maybeSingle();
  if (!data?.order_id) return false;
  return orderIsDemo(String(data.order_id));
}
