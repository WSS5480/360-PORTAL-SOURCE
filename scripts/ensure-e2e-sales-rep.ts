import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1]?.trim();
    const value = match[2]?.trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_USER_EMAIL?.trim();

  if (!url || !serviceRoleKey || !email) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or E2E_USER_EMAIL");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  const user = data.users.find((row) => (row.email ?? "").toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`E2E user not found: ${email}`);

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      email: user.email,
      is_staff: true,
      is_internal_sales_rep: true,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;

  console.log(`Enabled internal sales rep for ${email} (${user.id})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
