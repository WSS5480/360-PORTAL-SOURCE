DO $$
DECLARE
  status_type text;
  status_schema text;
  status_kind "char";
BEGIN
  SELECT t.typname, n.nspname, t.typtype
    INTO status_type, status_schema, status_kind
  FROM pg_attribute a
  JOIN pg_class c ON a.attrelid = c.oid
  JOIN pg_namespace cn ON c.relnamespace = cn.oid
  JOIN pg_type t ON a.atttypid = t.oid
  JOIN pg_namespace n ON t.typnamespace = n.oid
  WHERE c.relname = 'orders'
    AND a.attname = 'status'
    AND a.attnum > 0
    AND NOT a.attisdropped
  LIMIT 1;

  IF status_type IS NULL THEN
    RAISE NOTICE 'orders.status column not found';
    RETURN;
  END IF;

  IF status_kind = 'e' THEN
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', status_schema, status_type, 'PENDING_WIRE');
  ELSE
    RAISE NOTICE 'orders.status is not enum (%), no values added.', status_type;
  END IF;
END $$;
