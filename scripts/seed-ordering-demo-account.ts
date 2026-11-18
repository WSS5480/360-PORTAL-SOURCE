/**
 * Create (or refresh) a demo ordering account for live walkthroughs.
 *
 * - Full portal ordering + admin lock/fulfill flow
 * - Skips real inventory, virtual warehouse debits, and order emails (see accounts.is_demo)
 *
 * Run:
 *   npx tsx scripts/seed-ordering-demo-account.ts <user-uuid-or-email>
 *
 * Re-run safe: upserts the same demo account id and membership.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const userArg = process.argv.slice(2).find((a) => a.trim())?.trim();
if (!userArg) {
  console.error("Usage: npx tsx scripts/seed-ordering-demo-account.ts <user-uuid-or-email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

/** Stable demo ordering account id. */
const ORDERING_DEMO_ACCOUNT_ID = "f1111111-1111-4111-8111-111111110001";

async function resolveUserId(input: string): Promise<string> {
  if (UUID_RE.test(input)) return input;
  const { data, error } = await supabase.from("user_profiles").select("user_id, email").ilike("email", input).limit(5);
  if (error) throw new Error(error.message);
  const row = (data || []).find((r) => String((r as { email?: string | null }).email || "").toLowerCase() === input.toLowerCase());
  if (!row?.user_id) throw new Error(`No user found for email: ${input}`);
  return String((row as { user_id: string }).user_id);
}

async function resetDemoOrders() {
  const { data: orders } = await supabase.from("orders").select("id").eq("account_id", ORDERING_DEMO_ACCOUNT_ID);
  const orderIds = (orders || []).map((o) => String((o as { id: string }).id));
  if (orderIds.length === 0) return;

  const { data: fulfillments } = await supabase.from("fulfillments").select("id").in("order_id", orderIds);
  const fulfillmentIds = (fulfillments || []).map((f) => String((f as { id: string }).id));

  if (fulfillmentIds.length > 0) {
    await supabase.from("fulfillment_picks").delete().in("fulfillment_id", fulfillmentIds);
    await supabase.from("fulfillment_items").delete().in("fulfillment_id", fulfillmentIds);
    await supabase.from("fulfillments").delete().in("id", fulfillmentIds);
  }

  await supabase.from("order_status_events").delete().in("order_id", orderIds);
  await supabase.from("order_items").delete().in("order_id", orderIds);
  await supabase.from("invoices").delete().in("order_id", orderIds);
  await supabase.from("orders").delete().in("id", orderIds);
}

async function main() {
  const userId = await resolveUserId(userArg);

  const { error: acctErr } = await supabase.from("accounts").upsert(
    {
      id: ORDERING_DEMO_ACCOUNT_ID,
      name: "360 Demo Hospital (Walkthrough)",
      discount_percent: 0,
      is_demo: true,
    },
    { onConflict: "id" },
  );
  if (acctErr) throw new Error(acctErr.message);

  const { error: memErr } = await supabase.from("account_users").upsert(
    {
      account_id: ORDERING_DEMO_ACCOUNT_ID,
      user_id: userId,
      role: "ACCOUNT_ADMIN",
      virtual_warehouse_access: true,
    },
    { onConflict: "account_id,user_id" },
  );
  if (memErr) throw new Error(memErr.message);

  await resetDemoOrders();

  console.log("Demo ordering account ready.");
  console.log(`  Account id:   ${ORDERING_DEMO_ACCOUNT_ID}`);
  console.log(`  Account name: 360 Demo Hospital (Walkthrough)`);
  console.log(`  Member user:  ${userId}`);
  console.log("");
  console.log("In the portal, switch to this account (sidebar account switcher or set portal_account cookie).");
  console.log("Place an order, confirm it, then lock + fulfill from Admin → Orders.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
