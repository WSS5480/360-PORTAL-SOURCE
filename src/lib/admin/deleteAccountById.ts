// src/lib/admin/deleteAccountById.ts
// Deletes one account and all public data tied to it (orders, invoices, IVR, documents, memberships, etc.).
// Invoices must be removed before orders when invoices.order_id references orders(id).

import type { SupabaseClient } from "@supabase/supabase-js";

export async function deleteAccountById(
  supabase: SupabaseClient,
  accountId: string
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const { data: account } = await supabase.from("accounts").select("id,name").eq("id", accountId).maybeSingle();

  if (!account) {
    return { ok: false, error: "Account not found" };
  }

  const accountName = account.name ?? "";

  const { data: orders } = await supabase.from("orders").select("id").eq("account_id", accountId);
  const orderIds = (orders ?? []).map((o) => o.id);

  if (orderIds.length > 0) {
    const { data: fulfillments } = await supabase.from("fulfillments").select("id").in("order_id", orderIds);
    const fulfillmentIds = (fulfillments ?? []).map((f) => f.id);
    if (fulfillmentIds.length > 0) {
      await supabase.from("fulfillment_item_trace").delete().in("fulfillment_id", fulfillmentIds);
      await supabase.from("fulfillment_picks").delete().in("fulfillment_id", fulfillmentIds);
      await supabase.from("fulfillment_items").delete().in("fulfillment_id", fulfillmentIds);
      await supabase.from("fulfillment_files").delete().in("fulfillment_id", fulfillmentIds);
      await supabase.from("fulfillments").delete().in("order_id", orderIds);
    }

    await supabase.from("order_audit_log").delete().in("order_id", orderIds);
    await supabase.from("order_status_events").delete().in("order_id", orderIds);
    await supabase.from("order_items").delete().in("order_id", orderIds);
  }

  await supabase.from("invoices").delete().eq("account_id", accountId);
  await supabase.from("orders").delete().eq("account_id", accountId);

  const { data: ivrs } = await supabase.from("ivr_requests").select("id").eq("account_id", accountId);
  const ivrIds = (ivrs ?? []).map((i) => i.id);
  if (ivrIds.length > 0) {
    await supabase
      .from("ivr_email_outbox")
      .delete()
      .or(ivrIds.map((id) => `metadata->>ivr_request_id.eq.${id}`).join(","));
    await supabase.from("ivr_files").delete().in("ivr_request_id", ivrIds);
    await supabase.from("ivr_insurance_verifications").delete().in("ivr_request_id", ivrIds);
    await supabase.from("ivr_audit_log").delete().in("ivr_request_id", ivrIds);
    await supabase.from("ivr_requests").delete().eq("account_id", accountId);
  }

  await supabase.from("documents_folder_accounts").delete().eq("account_id", accountId);
  const { data: folders } = await supabase.from("documents_folders").select("id").eq("account_id", accountId);
  const folderIds = (folders ?? []).map((f) => f.id);
  if (folderIds.length > 0) {
    await supabase.from("documents_files").delete().in("folder_id", folderIds);
    await supabase.from("documents_folders").delete().eq("account_id", accountId);
  }

  await supabase.from("account_virtual_inventory").delete().eq("account_id", accountId);

  await supabase.from("account_invites").delete().eq("account_id", accountId);
  await supabase.from("account_contacts").delete().eq("account_id", accountId);
  await supabase.from("account_addresses").delete().eq("account_id", accountId);
  await supabase.from("account_provider_profiles").delete().eq("account_id", accountId);
  await supabase.from("account_users").delete().eq("account_id", accountId);
  await supabase.from("account_pricing").delete().eq("account_id", accountId);

  await supabase.from("audit_events").delete().eq("account_id", accountId);
  await supabase.from("files").delete().eq("account_id", accountId);

  const { error: delErr } = await supabase.from("accounts").delete().eq("id", accountId);

  if (delErr) {
    return { ok: false, error: delErr.message };
  }

  return { ok: true, name: accountName };
}
