/**
 * Enroll a known TOTP factor for E2E login (Supabase projects that require AAL2).
 *
 * Run: npx tsx scripts/setup-e2e-mfa.ts
 *
 * Requires in .env.local:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 * - E2E_USER_EMAIL
 * - E2E_USER_PASSWORD
 *
 * Writes E2E_TOTP_SECRET to .env.local when enrollment succeeds.
 */

import { createClient } from "@supabase/supabase-js";
import { generateSync } from "otplib";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");

function loadEnvLocal(): void {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

type MfaFactor = { id: string; factor_type?: string; status?: string };

function normalizeFactors(factors: unknown): MfaFactor[] {
  if (Array.isArray(factors)) return factors as MfaFactor[];
  if (factors && typeof factors === "object" && "totp" in factors) {
    return ((factors as { totp?: MfaFactor[] }).totp ?? []) as MfaFactor[];
  }
  return [];
}

async function removeExistingFactors(userId: string, url: string, serviceKey: string): Promise<void> {
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}/factors`, {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
  });
  const body = await res.json();
  for (const factor of normalizeFactors(body)) {
    await fetch(`${url}/auth/v1/admin/users/${userId}/factors/${factor.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    });
  }
}

function upsertEnvLocal(key: string, value: string): void {
  const lines = existsSync(envPath) ? readFileSync(envPath, "utf-8").split("\n") : [];
  const prefix = `${key}=`;
  let found = false;
  const next = lines.map((line) => {
    if (line.startsWith(prefix)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) {
    if (next.length > 0 && next[next.length - 1] !== "") next.push("");
    next.push(`${key}=${value}`);
  }
  writeFileSync(envPath, next.join("\n"), "utf-8");
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_USER_EMAIL?.trim();
  const password = process.env.E2E_USER_PASSWORD;

  if (!url || !anonKey || !serviceKey || !email || !password) {
    console.error("Missing required env vars in .env.local");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = listData?.users?.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error("E2E user not found:", email);
    process.exit(1);
  }

  await removeExistingFactors(user.id, url, serviceKey);

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) {
    console.error("Sign-in failed:", signInErr.message);
    process.exit(1);
  }

  const { data: enrollData, error: enrollErr } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "E2E Playwright",
  });
  if (enrollErr || !enrollData?.totp?.secret) {
    console.error("MFA enroll failed:", enrollErr?.message ?? "missing secret");
    process.exit(1);
  }

  const secret = enrollData.totp.secret;
  const code = generateSync({ secret });
  const challenge = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
  if (challenge.error) {
    console.error("MFA challenge failed:", challenge.error.message);
    process.exit(1);
  }

  const verify = await supabase.auth.mfa.verify({
    factorId: enrollData.id,
    challengeId: challenge.data.id,
    code,
  });
  if (verify.error) {
    console.error("MFA verify failed:", verify.error.message);
    process.exit(1);
  }

  upsertEnvLocal("E2E_TOTP_SECRET", secret);
  console.log("E2E MFA enrolled for", email);
  console.log("Saved E2E_TOTP_SECRET to .env.local");
}

main();
