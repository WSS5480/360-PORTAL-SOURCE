import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { enrichExtractResultWithPlanningFields } from "@/lib/surgical-sales/aiNoteCapture/enrichSuggestions";
import { mockAiNoteCaptureExtract } from "@/lib/surgical-sales/aiNoteCapture/mockExtract";
import { loadProviderPlanningFieldValues } from "@/lib/surgical-sales/aiNoteCapture/loadProviderPlanningFields";
import { runAiNoteCaptureExtract } from "@/lib/surgical-sales/aiNoteCapture/openaiExtract";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const BodySchema = z.object({
  text: z.string().max(16000).optional(),
  imageBase64: z.string().max(12_000_000).optional(),
  imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).optional(),
  inputMode: z.enum(["photo", "upload", "dictate", "type"]).optional(),
  context: z
    .object({
      caseId: z.string().uuid().optional(),
      caseLabel: z.string().max(200).optional(),
      providerId: z.string().uuid().optional(),
      providerLabel: z.string().max(200).optional(),
      opportunityId: z.string().uuid().optional(),
      opportunityLabel: z.string().max(200).optional(),
      organizationId: z.string().uuid().optional(),
      organizationLabel: z.string().max(200).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const rep = await userIsInternalSalesRep(auth.user.id);
    if (!rep) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { text, imageBase64, imageMimeType, inputMode, context } = parsed.data;
    if (!text?.trim() && !imageBase64) {
      return NextResponse.json({ ok: false, error: "Provide note text or an image." }, { status: 400 });
    }

    if (imageBase64) {
      const approxBytes = Math.ceil((imageBase64.length * 3) / 4);
      if (approxBytes > MAX_IMAGE_BYTES) {
        return NextResponse.json({ ok: false, error: "Image too large (max 6 MB)." }, { status: 400 });
      }
    }

    const ctx = context ?? {};
    let existingPlanningFields: Record<string, string> = {};
    if (ctx.providerId) {
      existingPlanningFields = await loadProviderPlanningFieldValues(ctx.providerId);
    }

    const useMockOnly = process.env.AI_NOTE_CAPTURE_MOCK_ONLY === "1";
    const extractInput = {
      rawText: text?.trim() || "",
      inputMode: inputMode ?? (imageBase64 ? "upload" : "type"),
      context: ctx,
      existingPlanningFields,
    };
    const mockExtract = () => mockAiNoteCaptureExtract(extractInput);

    let result;
    if (useMockOnly) {
      result = await mockExtract();
    } else {
      try {
        result = await runAiNoteCaptureExtract({
          rawText: extractInput.rawText,
          inputMode: extractInput.inputMode,
          context: ctx,
          imageBase64: imageBase64 || undefined,
          imageMimeType: imageMimeType || undefined,
        });
      } catch {
        result = await mockExtract();
      }
    }

    const enriched = await enrichExtractResultWithPlanningFields(result, ctx);

    return NextResponse.json({ ok: true, ...enriched });
  } catch (e: unknown) {
    console.error("[ai-note-capture extract]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Extraction failed" },
      { status: 500 },
    );
  }
}
