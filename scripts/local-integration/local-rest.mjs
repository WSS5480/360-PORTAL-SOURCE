/**
 * Minimal PostgREST-compatible server for the local integration test.
 * It speaks the subset of /rest/v1 used by the partner order API and worker.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const IDENT = /^[a-z_][a-z0-9_]*$/;

function verifyServiceRole(header, secret) {
  const match = /^Bearer\s+(\S+)$/i.exec(header || "");
  if (!match) return false;
  const parts = match[1].split(".");
  if (parts.length !== 3) return false;
  const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
  const actual = Buffer.from(parts[2], "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  return payload.role === "service_role";
}

function send(res, status, body, headers = {}) {
  if (body === "") {
    res.writeHead(status, headers);
    res.end();
    return;
  }
  const payload = body == null ? "" : JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function splitColumns(select) {
  if (!select || select === "*") return "*";
  const columns = select.split(",").map((column) => column.trim()).filter(Boolean);
  if (columns.some((column) => !IDENT.test(column))) throw new Error("unsupported select");
  return columns.map((column) => `"${column}"`).join(", ");
}

function filters(searchParams) {
  const clauses = [];
  const params = [];
  for (const [key, raw] of searchParams) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    if (!IDENT.test(key)) throw new Error("unsupported filter");
    const add = (sql, value) => {
      params.push(value);
      clauses.push(sql.replace("?", `$${params.length}`));
    };
    if (raw === "not.is.null") clauses.push(`"${key}" IS NOT NULL`);
    else if (raw === "is.null") clauses.push(`"${key}" IS NULL`);
    else if (raw.startsWith("eq.")) add(`"${key}"::text = ?`, raw.slice(3));
    else if (raw.startsWith("gte.")) add(`"${key}" >= ?`, raw.slice(4));
    else if (raw.startsWith("gt.")) add(`"${key}" > ?`, raw.slice(3));
    else if (raw.startsWith("lte.")) add(`"${key}" <= ?`, raw.slice(4));
    else if (raw.startsWith("lt.")) add(`"${key}" < ?`, raw.slice(3));
    else if (raw.startsWith("in.")) {
      const values = raw.slice(3).replace(/^\(|\)$/g, "").split(",").map((value) => value.trim().replace(/^"|"$/g, "")).filter(Boolean);
      if (!values.length) clauses.push("false");
      else add(`"${key}"::text = ANY(?::text[])`, values);
    } else throw new Error(`unsupported filter ${raw}`);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

function orderBy(searchParams) {
  const order = searchParams.get("order");
  if (!order) return "";
  const [column, direction = "asc"] = order.split(".");
  if (!IDENT.test(column) || !["asc", "desc"].includes(direction)) throw new Error("unsupported order");
  return `ORDER BY "${column}" ${direction}`;
}

function limit(searchParams) {
  const value = searchParams.get("limit");
  if (!value) return "";
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 5000) throw new Error("unsupported limit");
  return `LIMIT ${parsed}`;
}

function placeholders(values, start) {
  return values.map((value, index) => {
    const position = `$${start + index}`;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) return `${position}::jsonb`;
    if (Array.isArray(value)) return `${position}::text[]`;
    return position;
  });
}

function bindable(value) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) return JSON.stringify(value);
  return value;
}

export function startLocalRest({ port, pool, jwtSecret }) {
  return createServer(async (req, res) => {
    try {
      if (!verifyServiceRole(req.headers.authorization, jwtSecret)) {
        send(res, 401, { message: "Invalid JWT" });
        return;
      }
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] !== "rest" || parts[1] !== "v1") {
        send(res, 404, { message: "not found" });
        return;
      }

      if (parts[2] === "rpc" && IDENT.test(parts[3] || "") && req.method === "POST") {
        const body = (await readBody(req)) || {};
        const meta = await pool.query(
          `SELECT p.proargnames AS names, pg_catalog.pg_get_function_identity_arguments(p.oid) AS args,
                  pg_catalog.pg_get_function_result(p.oid) AS result
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = $1
           ORDER BY p.oid DESC LIMIT 1`,
          [parts[3]]
        );
        if (!meta.rows[0]) {
          send(res, 404, { message: "function not found" });
          return;
        }
        const inputs = String(meta.rows[0].args || "")
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        const names = inputs.map((part) => part.split(/\s+/)[0]);
        const types = inputs.map((part) => part.split(/\s+/).pop());
        const args = names.map((name, index) => {
          const value = body[name];
          const type = types[index];
          if ((type === "jsonb" || type === "json") && value != null && typeof value !== "string") {
            return JSON.stringify(value);
          }
          return value;
        });
        const marks = types.map((type, index) => `$${index + 1}::${type}`).join(", ");
        const tableResult = /^(SETOF|TABLE)/i.test(meta.rows[0].result);
        const sql = tableResult
          ? `SELECT * FROM public.${parts[3]}(${marks})`
          : `SELECT public.${parts[3]}(${marks}) AS result`;
        const called = await pool.query(sql, args);
        send(res, 200, tableResult ? called.rows : called.rows[0]?.result ?? null);
        return;
      }

      const table = parts[2];
      if (!IDENT.test(table || "")) {
        send(res, 404, { message: "not found" });
        return;
      }
      const quoted = `"${table}"`;
      const { where, params } = filters(url.searchParams);
      const object = String(req.headers.accept || "").includes("application/vnd.pgrst.object+json");

      if (req.method === "GET" || req.method === "HEAD") {
        const countOnly = String(req.headers.prefer || "").includes("count=exact") && req.method === "HEAD";
        if (countOnly) {
          const counted = await pool.query(`SELECT count(*)::int AS count FROM ${quoted} ${where}`, params);
          send(res, 200, "", { "content-range": `*/${counted.rows[0].count}` });
          return;
        }
        const rows = await pool.query(
          `SELECT ${splitColumns(url.searchParams.get("select"))} FROM ${quoted} ${where} ${orderBy(url.searchParams)} ${limit(url.searchParams)}`,
          params
        );
        if (object) {
          if (rows.rows.length !== 1) {
            send(res, 406, { code: "PGRST116", message: "Cannot coerce the result to a single JSON object" });
            return;
          }
          send(res, 200, rows.rows[0]);
          return;
        }
        send(res, 200, rows.rows);
        return;
      }

      const body = await readBody(req);
      if (req.method === "POST") {
        const rows = Array.isArray(body) ? body : [body];
        const keys = Object.keys(rows[0] || {}).filter((key) => IDENT.test(key));
        const inserted = [];
        for (const row of rows) {
          const values = keys.map((key) => bindable(row[key]));
          const result = await pool.query(
            `INSERT INTO ${quoted} (${keys.map((key) => `"${key}"`).join(", ")})
             VALUES (${placeholders(keys.map((key) => row[key]), 1).join(", ")}) RETURNING *`,
            values
          );
          inserted.push(result.rows[0]);
        }
        send(res, 201, Array.isArray(body) ? inserted : inserted[0]);
        return;
      }

      if (req.method === "PATCH") {
        const keys = Object.keys(body || {}).filter((key) => IDENT.test(key));
        const values = keys.map((key) => bindable(body[key]));
        const assignments = placeholders(keys.map((key) => body[key]), 1)
          .map((mark, index) => `"${keys[index]}" = ${mark}`)
          .join(", ");
        const shifted = where.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + values.length}`);
        const result = await pool.query(
          `UPDATE ${quoted} SET ${assignments} ${shifted} RETURNING *`,
          [...values, ...params]
        );
        send(res, 200, object ? result.rows[0] ?? null : result.rows);
        return;
      }

      send(res, 405, { message: "method not allowed" });
    } catch (error) {
      const code = error && error.code === "23505" ? 409 : 400;
      send(res, code, { message: error instanceof Error ? error.message : "query failed", code: error?.code || "error" });
    }
  }).listen(port, "127.0.0.1");
}
