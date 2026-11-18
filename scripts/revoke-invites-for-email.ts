/**
 * Revoke pending invites for an email so you can send a fresh invite.
 * Use when you hit "An invite was just sent to this email" and need to retest.
 *
 * Run: npx tsx scripts/revoke-invites-for-email.ts you@example.com
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
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

const email = process.argv[2]?.trim();
if (!email) {
  console.error("Usage: npx tsx scripts/revoke-invites-for-email.ts <email>");
  process.exit(1);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: invites, error: fetchErr } = await supabase
    .from("account_invites")
    .select("id, account_id, email, created_at")
    .ilike("email", email)
    .is("revoked_at", null);

  if (fetchErr) {
    console.error("Failed to fetch invites:", fetchErr.message);
    process.exit(1);
  }

  if (!invites?.length) {
    console.log("No pending invites found for:", email);
    process.exit(0);
  }

  const { error: updateErr } = await supabase
    .from("account_invites")
    .update({ revoked_at: new Date().toISOString() })
    .ilike("email", email)
    .is("revoked_at", null);

  if (updateErr) {
    console.error("Failed to revoke:", updateErr.message);
    process.exit(1);
  }

  console.log("Revoked", invites.length, "invite(s) for:", email);
}

main();
