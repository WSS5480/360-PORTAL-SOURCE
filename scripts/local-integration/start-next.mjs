/**
 * Start Next.js with only the local test environment.
 * Keys present in .env.local are replaced so production values cannot load.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function parseEnv(file) {
  if (!existsSync(file)) return {};
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

const test = parseEnv(path.join(root, ".env.local.test"));
const localNames = Object.keys(parseEnv(path.join(root, ".env.local")));
const child = { ...process.env, NODE_ENV: "development" };
for (const name of localNames) child[name] = test[name] ?? "local-test-disabled";
Object.assign(child, test);

const joined = Object.entries(child).map(([key, value]) => `${key}=${value}`).join("\n");
for (const marker of ["supabase.360medical.net", "sk_live_", "pk_live_", "rk_live_"]) {
  if (joined.includes(marker)) throw new Error(`Refusing to start Next: environment contains ${marker}`);
}
if (!String(child.NEXT_PUBLIC_SUPABASE_URL).startsWith("http://127.0.0.1:54321")) {
  throw new Error("Refusing to start Next: Supabase URL is not the local stack.");
}
if (child.FEDEX_ENV === "production") throw new Error("Refusing FedEx production.");

const next = spawn("npx", ["next", "dev", "--webpack", "-H", "127.0.0.1", "-p", "3010"], {
  cwd: root,
  env: child,
  shell: true,
  stdio: "inherit",
});
next.on("exit", (code) => process.exit(code ?? 0));
