import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import {
  findCredentialingPlatformMatch,
  matchCredentialingPlatformQuery,
  mergeCredentialingPlatformAliases,
  normalizeCredentialingPlatformName,
  parseCredentialingAliasesInput,
  type CredentialingPlatformRecord,
} from "@/lib/surgical-sales/credentialingPlatforms";

export const dynamic = "force-dynamic";

const PLATFORM_SELECT =
  "id, name, name_normalized, aliases, notes, active, updated_at";

const PostSchema = z
  .object({
    name: z.string().min(1).max(200),
    aliases: z.union([z.array(z.string().max(120)), z.string().max(500)]).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

async function requireRep() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const rep = await userIsInternalSalesRep(auth.user.id);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid: auth.user.id };
}

async function loadActivePlatforms(): Promise<CredentialingPlatformRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("credentialing_platforms")
    .select(PLATFORM_SELECT)
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data || []) as CredentialingPlatformRecord[];
}

function normalizeAliasesInput(
  aliases: string[] | string | undefined,
): string[] {
  if (!aliases) return [];
  if (Array.isArray(aliases)) {
    return mergeCredentialingPlatformAliases([], aliases);
  }
  return parseCredentialingAliasesInput(aliases);
}

async function resolveExistingPlatform(input: {
  name: string;
  aliases: string[];
}): Promise<CredentialingPlatformRecord | null> {
  const nameNormalized = normalizeCredentialingPlatformName(input.name);
  const { data: byName } = await supabaseAdmin
    .from("credentialing_platforms")
    .select(PLATFORM_SELECT)
    .eq("name_normalized", nameNormalized)
    .maybeSingle();

  if (byName) return byName as CredentialingPlatformRecord;

  const platforms = await loadActivePlatforms();
  return findCredentialingPlatformMatch(platforms, input.name, input.aliases);
}

async function mergePlatformRecord(input: {
  existing: CredentialingPlatformRecord;
  aliases: string[];
  notes?: string;
}): Promise<CredentialingPlatformRecord> {
  const mergedAliases = mergeCredentialingPlatformAliases(input.existing.aliases, input.aliases);
  const notes = input.notes?.trim() || input.existing.notes?.trim() || null;
  const aliasesChanged =
    mergedAliases.length !== input.existing.aliases.length ||
    mergedAliases.some((alias, index) => alias !== input.existing.aliases[index]);
  const notesChanged = notes !== (input.existing.notes?.trim() || null);

  if (!aliasesChanged && !notesChanged) {
    return input.existing;
  }

  const { data, error } = await supabaseAdmin
    .from("credentialing_platforms")
    .update({
      aliases: mergedAliases,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.existing.id)
    .select(PLATFORM_SELECT)
    .single();

  if (error || !data) {
    return input.existing;
  }

  return data as CredentialingPlatformRecord;
}

export async function GET(req: Request) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();

  try {
    const platforms = (await loadActivePlatforms()).filter((platform) =>
      matchCredentialingPlatformQuery(platform, q),
    );
    return NextResponse.json({ ok: true, platforms });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Could not load platforms.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const raw = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const name = parsed.data.name.trim().replace(/\s+/g, " ");
  if (!name) {
    return NextResponse.json({ ok: false, error: "Platform name is required." }, { status: 400 });
  }

  const aliases = normalizeAliasesInput(parsed.data.aliases);
  const notes = parsed.data.notes?.trim() || null;

  try {
    const existing = await resolveExistingPlatform({ name, aliases });
    if (existing) {
      const platform = await mergePlatformRecord({ existing, aliases, notes: notes ?? undefined });
      return NextResponse.json({ ok: true, platform, created: false });
    }

    const nameNormalized = normalizeCredentialingPlatformName(name);
    const { data, error } = await supabaseAdmin
      .from("credentialing_platforms")
      .insert({
        name,
        name_normalized: nameNormalized,
        aliases,
        notes,
        created_by: gate.uid,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .select(PLATFORM_SELECT)
      .single();

    if (error) {
      if (error.code === "23505") {
        const dup = await resolveExistingPlatform({ name, aliases });
        if (dup) {
          const platform = await mergePlatformRecord({ existing: dup, aliases, notes: notes ?? undefined });
          return NextResponse.json({ ok: true, platform, created: false });
        }
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, platform: data, created: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Could not save platform.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
