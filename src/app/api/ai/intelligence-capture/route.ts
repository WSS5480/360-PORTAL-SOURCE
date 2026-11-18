import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import {
  IntelligenceCaptureRequestSchema,
  IntelligenceCaptureValidationError,
  runIntelligenceCapture,
  validateIntelligenceCaptureContext,
} from "@/lib/ai/intelligenceCapture";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/intelligence-capture
 *
 * Extract-only contract for Capture Intelligence. Returns structured suggestions
 * for user review. Does not auto-save AI output or write ActivityEvents.
 * Uploaded images are used transiently for OCR/extraction and are not stored.
 */
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
    try {
      assertNoForbiddenPatientPayloadKeys(raw);
    } catch (e: unknown) {
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : "Forbidden patient identifiers in payload." },
        { status: 400 },
      );
    }

    const parsed = IntelligenceCaptureRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const ctxCheck = await validateIntelligenceCaptureContext(auth.user.id, parsed.data.context);
    if (!ctxCheck.ok) {
      return NextResponse.json({ ok: false, error: ctxCheck.message }, { status: ctxCheck.status });
    }

    const body = await runIntelligenceCapture(parsed.data);

    return NextResponse.json({
      ok: true,
      ...body,
    });
  } catch (e: unknown) {
    if (e instanceof IntelligenceCaptureValidationError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    }
    console.error("[intelligence-capture]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Intelligence capture failed" },
      { status: 500 },
    );
  }
}
