# Database baseline

`schema.sql` is a schema-only export of the working portal database, taken from PostgreSQL system catalogs on 2026-11-11. It is not a guess from application code. It contains no customer, patient, order, invoice, or inventory rows.

`storage.sql` inserts the four private storage bucket records and no files. Apply it only on Supabase, after `schema.sql`.

## Chronology

This is a current-schema bootstrap. The objects created by `db/migrations` are already in `schema.sql`.

| Database | What to run |
| --- | --- |
| Brand-new Supabase project | `schema.sql`, then `storage.sql`, then `scripts/bootstrap-local-admin.sql` after you create an Auth user. Do not run `db/migrations`. |
| Existing portal database | Do not load this baseline. Apply only migration files added after 2026-11-11. |
| Future changes | Add a new file under `db/migrations` with a later date prefix. Apply that file to the existing database and to developer databases created from this baseline. |

Supabase already provides the `auth` schema. `schema.sql` expects `auth.users` and `auth.uid()`. Do not replay historical migrations on top of this file.

Platform extensions that are not required by the tables (`pg_graphql`, `pg_net`, `pg_stat_statements`, `pgjwt`, `supabase_vault`) are created only when that server has them.

Regenerate with either:

```bash
node scripts/export-portal-schema.mjs --from-api
```

or, when `pg_dump` and `DATABASE_URL` are available:

```bash
node scripts/export-portal-schema.mjs
```

Check a regenerated file with:

```bash
node scripts/verify-baseline.mjs
```

That command loads `schema.sql` into a throwaway local Postgres, after creating a stub `auth.users` and `auth.uid()`. It does not connect to the working portal database.
