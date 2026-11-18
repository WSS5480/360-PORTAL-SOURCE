import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { INTELLIGENCE_CAPTURE_CATEGORY_IDS } from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { applyCategoryFindingToProvider } from "@/lib/surgical-sales/intelligenceCapture/applyCategoryFinding";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PostSchema = z
  .object({
    categoryId: z.enum(INTELLIGENCE_CAPTURE_CATEGORY_IDS),
    finding: z.string().min(1).max(4000),
  })
  .strict();

async function requireRep() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid };
}

export async function POST(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, email")
    .eq("user_id", gate.uid)
    .maybeSingle();
  const actorName =
    String((profile as { full_name?: string | null } | null)?.full_name ?? "").trim() ||
    String((profile as { email?: string | null } | null)?.email ?? "").trim() ||
    "Rep";

  const result = await applyCategoryFindingToProvider({
    providerId,
    categoryId: parsed.data.categoryId,
    finding: parsed.data.finding,
    actorUserId: gate.uid,
    actorName,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    confirmationMessage: result.confirmationMessage,
    followUpRequired: result.followUpRequired,
    savedFields: result.savedFields,
    provider: result.provider,
  });
}
