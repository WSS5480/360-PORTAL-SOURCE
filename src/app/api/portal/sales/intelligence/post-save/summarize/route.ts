import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { summarizePostSaveIntelligenceWithOpenAi } from "@/lib/surgical-sales/openAiIntelligenceServices";
import type { IntelligenceSaveTarget } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  sourceScope: z.string().min(1).max(200),
  rawNote: z.string().max(8000).nullable().optional(),
  acceptedByTarget: z
    .array(
      z.object({
        saveTarget: z.enum(["organization", "provider", "case", "engagement"]),
        lines: z.array(z.string()).max(24),
      }),
    )
    .max(4),
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

  const summary = await summarizePostSaveIntelligenceWithOpenAi({
    sourceScope: body.sourceScope,
    rawNote: body.rawNote ?? null,
    acceptedByTarget: body.acceptedByTarget as Array<{
      saveTarget: IntelligenceSaveTarget;
      lines: string[];
    }>,
  });

  if (!summary) {
    return NextResponse.json({
      ok: false,
      error: "OpenAI post-save summary unavailable",
      unavailable: true,
    });
  }

  return NextResponse.json({ ok: true, summary });
}
