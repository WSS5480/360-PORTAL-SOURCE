import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { runOpenAiAudioTranscribe } from "@/lib/surgical-sales/aiNoteCapture/openaiTranscribe";

export const dynamic = "force-dynamic";

const MAX_BASE64_LEN = 12_000_000;

const ALLOWED_MIME = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/x-m4a",
  "audio/m4a",
]);

function normalizeAudioMimeType(raw: unknown): string {
  const base = String(raw ?? "audio/webm")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (ALLOWED_MIME.has(base)) return base;
  if (base.includes("webm")) return "audio/webm";
  if (base.includes("mp4") || base.includes("m4a")) return "audio/mp4";
  if (base.includes("ogg")) return "audio/ogg";
  if (base.includes("wav")) return "audio/wav";
  if (base.includes("mpeg") || base.includes("mp3")) return "audio/mpeg";
  return "audio/webm";
}

const BodySchema = z.object({
  audioBase64: z.string().min(8).max(MAX_BASE64_LEN),
  mimeType: z.preprocess(normalizeAudioMimeType, z.string()).optional(),
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

    const { audioBase64, mimeType } = parsed.data;
    const buf = Buffer.from(audioBase64, "base64");
    const text = await runOpenAiAudioTranscribe({
      audioBytes: new Uint8Array(buf),
      mimeType: mimeType ?? "audio/webm",
    });

    return NextResponse.json({ ok: true, text });
  } catch (e: unknown) {
    console.error("[ai-note-capture transcribe]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Transcription failed" },
      { status: 500 },
    );
  }
}
