import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import {
  DEFAULT_PROVIDER_COMMITMENT_TYPE,
  PROVIDER_COMMITMENT_TYPES,
} from "@/lib/surgical-sales/providerCommitmentOutcomes";
import {
  loadMissionBoardCommitmentModalView,
  saveMissionBoardCommitment,
} from "@/lib/surgical-sales/missionBoardCommitmentOutcomesService";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PostBodySchema = z
  .object({
    commitment_type: z.enum(PROVIDER_COMMITMENT_TYPES).optional(),
  })
  .strict();

export async function GET(_req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const result = await loadMissionBoardCommitmentModalView({ providerId, userId: uid });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true, view: result.data });
}

export async function POST(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  let body: z.infer<typeof PostBodySchema>;
  try {
    const parsed = PostBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const result = await saveMissionBoardCommitment({
    providerId,
    userId: uid,
    commitmentType: body.commitment_type ?? DEFAULT_PROVIDER_COMMITMENT_TYPE,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true, updated: result.data.updated });
}
