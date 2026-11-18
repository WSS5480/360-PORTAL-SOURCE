/**
 * Apply db/baseline/schema.sql to a throwaway local Postgres and check core tables.
 * Does not connect to the working portal database.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { default: EmbeddedPostgres } = await import("embedded-postgres");
const pg = await import("pg");

const databaseDir = mkdtempSync(path.join(tmpdir(), "portal-baseline-"));
const port = 54338;
const database = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "local-test-password",
  port,
  persistent: false,
});

const required = [
  "accounts",
  "internal_users",
  "products",
  "orders",
  "invoices",
  "surgical_sales_contacts",
  "surgical_sales_cases",
  "universal_surgical_facts",
  "user_profiles",
];

try {
  await database.initialise();
  await database.start();
  const client = new pg.default.Client({
    host: "127.0.0.1",
    port,
    user: "postgres",
    password: "local-test-password",
    database: "postgres",
  });
  await client.connect();
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY,
      email text
    );
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'anon'::text $$;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
  `);
  const sql = readFileSync(path.join(root, "db", "baseline", "schema.sql"), "utf8");
  const statements = splitSql(sql);
  for (const statement of statements) {
    try {
      await client.query(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : "query failed";
      console.error("FAILED:", message);
      console.error(statement.slice(0, 400));
      process.exitCode = 1;
      break;
    }
  }
  if (!process.exitCode) {
    const found = await client.query(
      "select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname = any($1::text[]) order by 1",
      [required]
    );
    const names = new Set(found.rows.map((row) => row.relname));
    const missing = required.filter((name) => !names.has(name));
    if (missing.length) {
      console.error("Missing tables:", missing.join(", "));
      process.exitCode = 1;
    } else {
      console.log("baseline applied; core tables present:", required.join(", "));
    }
  }
  await client.end();
} finally {
  try {
    await database.stop();
  } catch {
    // already stopped
  }
  rmSync(databaseDir, { recursive: true, force: true });
}

function splitSql(sql) {
  const statements = [];
  let current = "";
  let i = 0;
  let dollar = null;
  let inString = false;
  while (i < sql.length) {
    const char = sql[i];
    if (!dollar && !inString && char === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      current += end === -1 ? sql.slice(i) : sql.slice(i, end + 1);
      i = end === -1 ? sql.length : end + 1;
      continue;
    }
    if (!dollar && char === "'") {
      if (inString && sql[i + 1] === "'") {
        current += "''";
        i += 2;
        continue;
      }
      inString = !inString;
      current += char;
      i += 1;
      continue;
    }
    if (!inString) {
      const match = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match && (dollar === null || dollar === match[0])) {
        dollar = dollar === match[0] ? null : match[0];
        current += match[0];
        i += match[0].length;
        continue;
      }
    }
    if (!dollar && !inString && char === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      i += 1;
      continue;
    }
    current += char;
    i += 1;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}
