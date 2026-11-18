// Render start-up step for the 360 Portal look-around copy (added 2026-11-17).
// 1. If SUPABASE_DB_URL is set and the database is empty, load db/baseline/schema.sql then storage.sql (once).
// 2. If ADMIN_EMAIL is set and that person already exists in Supabase Auth, make them the first admin
//    (same rows as scripts/bootstrap-local-admin.sql). Safe to run on every start.
// It never stops the app from starting: any problem is logged and the app boots anyway.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.log("[bootstrap] SUPABASE_DB_URL not set: skipping database setup.");
  process.exit(0);
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const { rows } = await client.query("select to_regclass('public.internal_users') as t");
  if (!rows[0].t) {
    console.log("[bootstrap] Empty database: loading db/baseline/schema.sql ...");
    await client.query(fs.readFileSync(path.join(root, "db/baseline/schema.sql"), "utf8"));
    console.log("[bootstrap] Loading db/baseline/storage.sql ...");
    await client.query(fs.readFileSync(path.join(root, "db/baseline/storage.sql"), "utf8"));
    console.log("[bootstrap] Schema loaded.");
  } else {
    console.log("[bootstrap] Schema already present: nothing to load.");
  }

  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (email) {
    const u = await client.query("select id from auth.users where lower(email) = $1", [email]);
    if (u.rows.length === 1) {
      const id = u.rows[0].id;
      await client.query(
        "insert into public.internal_users (user_id, role) values ($1, 'ADMIN') on conflict (user_id) do update set role = excluded.role",
        [id],
      );
      await client.query(
        "insert into public.user_profiles (user_id, email, is_staff, is_admin) values ($1, $2, true, true) " +
          "on conflict (user_id) do update set email = excluded.email, is_staff = true, is_admin = true",
        [id, email],
      );
      console.log("[bootstrap] Admin access set for " + email + ".");
    } else {
      console.log("[bootstrap] ADMIN_EMAIL has no Supabase Auth user yet: create it in Supabase, then redeploy.");
    }
  }
} catch (e) {
  console.error("[bootstrap] Database setup failed:", e.message);
} finally {
  await client.end().catch(() => {});
}
