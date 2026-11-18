import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { generateInboundPartnerKey } from "@/lib/integrations/partnerCredentials";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BodySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { partnerId } = await params;
  if (!UUID_RE.test(partnerId)) {
    return NextResponse.json({ ok: false, error: "Partner not found." }, { status: 404 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Credential name is required." }, { status: 422 });

  const sb = createSupabaseAdminClient();
  const { data: partner, error: findError } = await sb
    .from("integration_partners")
    .select("id, environment")
    .eq("id", partnerId)
    .maybeSingle();
  if (findError || !partner) return NextResponse.json({ ok: false, error: "Partner not found." }, { status: 404 });

  if (partner.environment === "production") {
    return NextResponse.json(
      { ok: false, error: "Production integration credentials cannot be activated." },
      { status: 409 }
    );
  }

  const key = generateInboundPartnerKey();
  const { data, error } = await sb
    .from("integration_credentials")
    .insert({
      partner_id: partnerId,
      direction: "inbound",
      name: parsed.data.name,
      key_prefix: key.prefix,
      key_hash: key.hash,
      scopes: ["orders:read", "orders:write"],
      active: true,
      created_by_user_id: auth.ctx.userId,
    })
    .select("id, name, key_prefix, scopes, active, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "The credential could not be created." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    credential: data,
    secret: key.plaintext,
  });
}
