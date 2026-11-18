import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CreatePartnerSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,48}$/),
  name: z.string().trim().min(1).max(120),
  environment: z.enum(["sandbox", "production"]),
  callback_base_url: z.string().trim().max(300).optional().nullable(),
});

function httpsOrEmpty(value: string | null | undefined): { ok: true; url: string | null } | { ok: false; error: string } {
  const raw = (value ?? "").trim();
  if (!raw) return { ok: true, url: null };
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "Callback base URL must be a valid HTTPS URL." };
  }
  if (parsed.protocol !== "https:") return { ok: false, error: "Callback base URL must use HTTPS." };
  return { ok: true, url: parsed.toString().replace(/\/$/, "") };
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = CreatePartnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Partner details are invalid." }, { status: 422 });
  }

  const callback = httpsOrEmpty(parsed.data.callback_base_url);
  if (!callback.ok) return NextResponse.json({ ok: false, error: callback.error }, { status: 422 });

  const sb = createSupabaseAdminClient();
  const { data, error } = await sb
    .from("integration_partners")
    .insert({
      code: parsed.data.code,
      name: parsed.data.name,
      environment: parsed.data.environment,
      status: "inactive",
      callback_base_url: callback.url,
      created_by_user_id: auth.ctx.userId,
    })
    .select("id, code, name, environment, status, callback_base_url, created_at")
    .single();

  if (error) {
    const message = /duplicate|unique/i.test(error.message)
      ? "A partner with that code already exists in this environment."
      : "The partner could not be created.";
    return NextResponse.json({ ok: false, error: message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, partner: data });
}
