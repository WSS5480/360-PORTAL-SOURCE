/**
 * Schema-only export of the working portal database.
 *
 * Prefer pg_dump when DATABASE_URL is set.
 * Otherwise pass --from-api to read structure from the Supabase SQL endpoint
 * configured in .env.local. That path selects from system catalogs only.
 * It does not print credentials or copy table rows.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "db", "baseline");
const outFile = path.join(outDir, "schema.sql");
const storageFile = path.join(outDir, "storage.sql");

if (process.argv.includes("--from-api")) {
  await exportFromApi();
} else {
  await exportFromPgDump();
}

async function exportFromPgDump() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("Set DATABASE_URL, or re-run with --from-api to read catalogs through the local Supabase API.");
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  const dump = spawnSync(
    "pg_dump",
    ["--schema-only", "--no-owner", "--no-privileges", "--schema=public", "--file", outFile, databaseUrl],
    { stdio: ["ignore", "inherit", "inherit"] }
  );
  if (dump.error) {
    console.error("pg_dump is not available. Install the PostgreSQL client tools, or re-run with --from-api.");
    process.exit(1);
  }
  if (dump.status !== 0) {
    rmSync(outFile, { force: true });
    process.exit(dump.status ?? 1);
  }
  assertNoRowData(readFileSync(outFile, "utf8"), outFile);
  console.log("Wrote db/baseline/schema.sql");
}

async function exportFromApi() {
  const env = loadEnv(path.join(root, ".env.local"));
  const base = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) {
    console.error(".env.local is missing the Supabase URL or service role key.");
    process.exit(1);
  }

  async function catalog(query) {
    const response = await fetch(base + "/pg/query", {
      method: "POST",
      headers: {
        apikey: key,
        authorization: "Bearer " + key,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error("Catalog query failed with status " + response.status);
    }
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Catalog query did not return rows.");
    return data;
  }

  const extensions = await catalog(
    "select extname from pg_extension where extname <> 'plpgsql' order by 1"
  );
  const enums = await catalog(`
    select t.typname,
           string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder) as labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'
    group by t.typname
    order by t.typname
  `);
  const sequences = await catalog(`
    select c.relname,
           pg_catalog.format_type(s.seqtypid, null) as data_type,
           s.seqstart::text as seqstart,
           s.seqincrement::text as seqincrement,
           s.seqmin::text as seqmin,
           s.seqmax::text as seqmax,
           s.seqcache::text as seqcache,
           s.seqcycle as seqcycle,
           exists (
             select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'i'
           ) as identity_owned
    from pg_sequence s
    join pg_class c on c.oid = s.seqrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
    order by c.relname
  `);
  const columns = await catalog(`
    select c.relname as table_name,
           a.attname,
           a.attnum,
           pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
           a.attnotnull,
           a.attidentity,
           a.attgenerated,
           pg_get_expr(ad.adbin, ad.adrelid) as default_expr
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
    cross join (select set_config('search_path', 'pg_catalog', true)) cfg
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname, a.attnum
  `);
  const constraints = await catalog(`
    select c.relname as table_name,
           con.conname,
           con.contype,
           pg_get_constraintdef(con.oid, true) as definition
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    cross join (select set_config('search_path', 'pg_catalog', true)) cfg
    where n.nspname = 'public'
    order by c.relname, con.contype, con.conname
  `);
  const indexes = await catalog(`
    select pg_get_indexdef(i.indexrelid) as definition
    from pg_index i
    join pg_class c on c.oid = i.indrelid
    join pg_namespace n on n.oid = c.relnamespace
    cross join (select set_config('search_path', 'pg_catalog', true)) cfg
    where n.nspname = 'public'
      and not exists (select 1 from pg_constraint con where con.conindid = i.indexrelid)
    order by 1
  `);
  const functions = await catalog(`
    select pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join (select set_config('search_path', 'pg_catalog', true)) cfg
    where n.nspname in ('public', 'private')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    order by n.nspname, p.proname, p.oid
  `);
  const views = await catalog(`
    select viewname, definition
    from pg_views
    cross join (select set_config('search_path', 'pg_catalog', true)) cfg
    where schemaname = 'public'
    order by viewname
  `);
  const triggers = await catalog(`
    select pg_get_triggerdef(t.oid, true) as definition
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    cross join (select set_config('search_path', 'pg_catalog', true)) cfg
    where n.nspname = 'public' and not t.tgisinternal
    order by 1
  `);
  const rls = await catalog(`
    select c.relname, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname
  `);
  const policies = await catalog(`
    select tablename, policyname, permissive, roles::text as roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  `);
  const grants = await catalog(`
    select table_name, grantee, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated', 'service_role')
    order by table_name, grantee, privilege_type
  `);
  const routineGrants = await catalog(`
    select p.oid::regprocedure::text as signature, r.rolname as grantee
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl on true
    join pg_roles r on r.oid = acl.grantee
    where n.nspname in ('public', 'private')
      and r.rolname in ('anon', 'authenticated', 'service_role')
      and acl.privilege_type = 'EXECUTE'
    order by 1, 2
  `);
  const sequenceOwners = await catalog(`
    select seq.relname as sequence_name, tab.relname as table_name, att.attname as column_name
    from pg_depend d
    join pg_class seq on seq.oid = d.objid and seq.relkind = 'S'
    join pg_class tab on tab.oid = d.refobjid
    join pg_attribute att on att.attrelid = tab.oid and att.attnum = d.refobjsubid
    join pg_namespace n on n.oid = seq.relnamespace
    where n.nspname = 'public' and d.deptype in ('a', 'i')
    order by 1
  `);

  let storageSql = "";
  try {
    const buckets = await catalog(
      "select id, name, public from storage.buckets order by id"
    );
    const storagePolicies = await catalog(`
      select tablename, policyname, permissive, roles::text as roles, cmd, qual, with_check
      from pg_policies
      where schemaname = 'storage'
      order by tablename, policyname
    `);
    storageSql = renderStorage(buckets, storagePolicies);
  } catch {
    storageSql = "-- Storage schema was not readable. Create buckets in the Supabase dashboard.\n";
  }

  const sql = renderPublic({
    extensions,
    enums,
    sequences,
    columns,
    constraints,
    indexes,
    functions,
    views,
    triggers,
    rls,
    policies,
    grants,
    routineGrants,
    sequenceOwners,
  });
  mkdirSync(outDir, { recursive: true });
  assertNoRowData(sql, outFile);
  assertNoRowData(storageSql.replace(/^INSERT INTO storage\.buckets[\s\S]*?;/gm, ""), storageFile);
  writeFileSync(outFile, sql);
  writeFileSync(storageFile, storageSql);
  console.log(
    "Wrote db/baseline/schema.sql and db/baseline/storage.sql (" +
      columns.reduce((names, row) => names.add(row.table_name), new Set()).size +
      " tables)."
  );
}

function renderPublic(source) {
  const lines = [];
  lines.push(`-- Schema-only bootstrap for a new development database.
-- Exported from the working portal database system catalogs on ${new Date().toISOString().slice(0, 10)}.
-- No application rows are included. Do not replay db/migrations on top of this file.
-- See db/baseline/README.md.

SET search_path = public, auth;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
`);

  const optionalExtensions = new Set(["pg_graphql", "pg_net", "pg_stat_statements", "pgjwt", "supabase_vault"]);
  for (const extension of source.extensions) {
    if (optionalExtensions.has(extension.extname)) {
      lines.push(`DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS ${quoteIdent(extension.extname)};
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'extension ${extension.extname} is not installed on this server';
END $$;`);
    } else {
      lines.push(`CREATE EXTENSION IF NOT EXISTS ${quoteIdent(extension.extname)};`);
    }
  }
  lines.push("");
  lines.push("CREATE SCHEMA IF NOT EXISTS private;");
  lines.push("GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;");
  lines.push("");

  for (const type of source.enums) {
    lines.push(`CREATE TYPE public.${quoteIdent(type.typname)} AS ENUM (${type.labels});`);
  }
  lines.push("");

  for (const sequence of source.sequences) {
    if (sequence.identity_owned === true) continue;
    const cycle = sequence.seqcycle === true ? "CYCLE" : "NO CYCLE";
    lines.push(
      `CREATE SEQUENCE public.${quoteIdent(sequence.relname)} AS ${sequence.data_type} INCREMENT BY ${sequence.seqincrement} MINVALUE ${sequence.seqmin} MAXVALUE ${sequence.seqmax} START ${sequence.seqstart} CACHE ${sequence.seqcache} ${cycle};`
    );
  }
  lines.push("");

  const byTable = new Map();
  for (const column of source.columns) {
    if (!byTable.has(column.table_name)) byTable.set(column.table_name, []);
    byTable.get(column.table_name).push(column);
  }
  const constraintsByTable = new Map();
  const foreignKeys = [];
  for (const constraint of source.constraints) {
    if (constraint.contype === "f" || constraint.contype === "x") {
      foreignKeys.push(constraint);
      continue;
    }
    if (!constraintsByTable.has(constraint.table_name)) constraintsByTable.set(constraint.table_name, []);
    constraintsByTable.get(constraint.table_name).push(constraint);
  }

  for (const [table, tableColumns] of byTable) {
    const parts = tableColumns.map(columnSql);
    for (const constraint of constraintsByTable.get(table) ?? []) {
      parts.push(`CONSTRAINT ${quoteIdent(constraint.conname)} ${constraint.definition}`);
    }
    lines.push(`CREATE TABLE public.${quoteIdent(table)} (\n  ${parts.join(",\n  ")}\n);`);
    lines.push("");
  }

  for (const fn of source.functions) {
    lines.push(fn.definition.trim().replace(/;\s*$/, "") + ";");
    lines.push("");
  }

  for (const owner of source.sequenceOwners) {
    if (source.sequences.some((sequence) => sequence.relname === owner.sequence_name && sequence.identity_owned === true)) {
      continue;
    }
    lines.push(
      `ALTER SEQUENCE public.${quoteIdent(owner.sequence_name)} OWNED BY public.${quoteIdent(owner.table_name)}.${quoteIdent(owner.column_name)};`
    );
  }
  lines.push("");

  for (const constraint of foreignKeys) {
    lines.push(
      `ALTER TABLE public.${quoteIdent(constraint.table_name)} ADD CONSTRAINT ${quoteIdent(constraint.conname)} ${constraint.definition};`
    );
  }
  lines.push("");

  for (const index of source.indexes) {
    lines.push(index.definition.trim().replace(/;\s*$/, "") + ";");
  }
  lines.push("");

  for (const view of source.views) {
    const body = String(view.definition).trim().replace(/;\s*$/, "");
    lines.push(`CREATE VIEW public.${quoteIdent(view.viewname)} AS ${body};`);
    lines.push("");
  }

  for (const trigger of source.triggers) {
    lines.push(trigger.definition.trim().replace(/;\s*$/, "") + ";");
  }
  lines.push("");

  for (const table of source.rls) {
    if (table.relrowsecurity === true) {
      lines.push(`ALTER TABLE public.${quoteIdent(table.relname)} ENABLE ROW LEVEL SECURITY;`);
    }
    if (table.relforcerowsecurity === true) {
      lines.push(`ALTER TABLE public.${quoteIdent(table.relname)} FORCE ROW LEVEL SECURITY;`);
    }
  }
  lines.push("");

  for (const policy of source.policies) {
    lines.push(policySql("public", policy));
    lines.push("");
  }

  const tableGrants = new Map();
  for (const grant of source.grants) {
    const key = grant.table_name + "\0" + grant.grantee;
    if (!tableGrants.has(key)) tableGrants.set(key, new Set());
    tableGrants.get(key).add(grant.privilege_type);
  }
  for (const [key, privileges] of tableGrants) {
    const [table, grantee] = key.split("\0");
    lines.push(
      `GRANT ${[...privileges].sort().join(", ")} ON TABLE public.${quoteIdent(table)} TO ${quoteIdent(grantee)};`
    );
  }
  for (const grant of source.routineGrants) {
    lines.push(`GRANT EXECUTE ON FUNCTION ${grant.signature} TO ${quoteIdent(grant.grantee)};`);
  }

  return lines.join("\n") + "\n";
}

function renderStorage(buckets, policies) {
  const lines = [];
  lines.push(`-- Storage buckets and policies from the working portal.
-- Apply this only on Supabase, after the storage schema exists.
-- Bucket rows are configuration. Object files are not included.

`);
  for (const bucket of buckets) {
    const isPublic = bucket.public === true ? "true" : "false";
    lines.push(
      `INSERT INTO storage.buckets (id, name, public) VALUES (${quoteLiteral(bucket.id)}, ${quoteLiteral(bucket.name)}, ${isPublic}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");
  for (const policy of policies) {
    lines.push(policySql("storage", policy));
    lines.push("");
  }
  return lines.join("\n");
}

function columnSql(column) {
  let sql = `${quoteIdent(column.attname)} ${column.data_type}`;
  if (column.attidentity === "a") sql += " GENERATED ALWAYS AS IDENTITY";
  else if (column.attidentity === "d") sql += " GENERATED BY DEFAULT AS IDENTITY";
  else if (column.attgenerated === "s" && column.default_expr) {
    sql += ` GENERATED ALWAYS AS (${column.default_expr}) STORED`;
  } else if (column.default_expr) sql += ` DEFAULT ${column.default_expr}`;
  if (column.attnotnull === true) sql += " NOT NULL";
  return sql;
}

function policySql(schema, policy) {
  const permissive = String(policy.permissive || "PERMISSIVE").toUpperCase() === "RESTRICTIVE" ? "RESTRICTIVE" : "PERMISSIVE";
  const command = String(policy.cmd || "ALL").toUpperCase();
  let sql = `CREATE POLICY ${quoteIdent(policy.policyname)} ON ${schema}.${quoteIdent(policy.tablename)} AS ${permissive} FOR ${command} TO ${roleList(policy.roles)}`;
  if (policy.qual) sql += ` USING (${policy.qual})`;
  if (policy.with_check) sql += ` WITH CHECK (${policy.with_check})`;
  return sql + ";";
}

function roleList(roles) {
  const items = Array.isArray(roles)
    ? roles
    : String(roles ?? "")
        .replace(/^\{|\}$/g, "")
        .split(",")
        .map((role) => role.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
  if (items.length === 0 || items.some((role) => role.toLowerCase() === "public")) return "PUBLIC";
  return items.map(quoteIdent).join(", ");
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function assertNoRowData(sql, file) {
  if (/^COPY /m.test(sql) || /^INSERT INTO (?!storage\.buckets\b)/m.test(sql)) {
    rmSync(file, { force: true });
    console.error("Refusing the export because it contains table data.");
    process.exit(1);
  }
  if (/sk_live_|eyJ[A-Za-z0-9_-]{20,}/.test(sql)) {
    rmSync(file, { force: true });
    console.error("Refusing the export because it contains a credential-like token.");
    process.exit(1);
  }
}

function loadEnv(file) {
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}
