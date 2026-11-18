import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { generateFieldBriefingWithOpenAi } from "@/lib/surgical-sales/openAiIntelligenceServices";
import type { IntelligenceSaveTarget } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  providerName: z.string().min(1).max(200),
  facilityName: z.string().max(200).nullable().optional(),
  touchType: z.string().max(120),
  relationshipStage: z.string().max(80),
  knownFields: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        saveTarget: z.enum(["organization", "provider", "case", "engagement"]),
      }),
    )
    .max(40)
    .default([]),
  existingAsks: z.array(z.string()).max(20).default([]),
  openGaps: z.array(z.string()).max(20).default([]),
});

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await userIsInternalSalesRep(auth.user.id))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const enhancement = await generateFieldBriefingWithOpenAi({
    providerName: body.providerName,
    facilityName: body.facilityName ?? null,
    touchType: body.touchType,
    relationshipStage: body.relationshipStage,
    knownFields: body.knownFields as Array<{
      label: string;
      value: string;
      saveTarget: IntelligenceSaveTarget;
    }>,
    existingAsks: body.existingAsks,
    openGaps: body.openGaps,
  });

  if (!enhancement) {
    return NextResponse.json({
      ok: false,
      error: "OpenAI field briefing unavailable",
      unavailable: true,
    });
  }

  return NextResponse.json({ ok: true, enhancement });
}
