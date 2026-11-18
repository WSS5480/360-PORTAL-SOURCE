const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

/** Bias Whisper toward surgical / medical-device field vocabulary without inventing content. */
export const FIELD_NOTE_TRANSCRIBE_PROMPT =
  "Surgical medical device sales field note. Possible terms: observation, OR, debrief, hernia, " +
  "ventral, inguinal, mesh, fixation, AmnioPlast, AmchoPlast, SurgiMend, Phasix, Gore, Bard, " +
  "credentialing, vendor credentialing, Symplr, Reptrax, IntelliCentrics, Circulator, scrub tech, " +
  "surgeon, PA, NP, scheduler, case volume, pathway, intro call, permission to observe.";

export async function runOpenAiAudioTranscribe(params: {
  audioBytes: Uint8Array;
  mimeType: string;
  fileName?: string;
  prompt?: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  if (params.audioBytes.byteLength > MAX_AUDIO_BYTES) {
    throw new Error("Recording too long. Stop and try a shorter clip.");
  }

  const ext =
    params.mimeType.includes("mp4") || params.mimeType.includes("m4a")
      ? "m4a"
      : params.mimeType.includes("mpeg") || params.mimeType.includes("mp3")
        ? "mp3"
        : "webm";

  const blob = new Blob([new Uint8Array(params.audioBytes)], { type: params.mimeType || "audio/webm" });
  const form = new FormData();
  form.append("file", blob, params.fileName ?? `note.${ext}`);
  form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "whisper-1");
  form.append("language", "en");
  form.append("prompt", (params.prompt?.trim() || FIELD_NOTE_TRANSCRIBE_PROMPT).slice(0, 900));

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const body = (await res.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
  if (!res.ok) {
    const msg = body.error?.message ?? `Transcription failed (${res.status})`;
    throw new Error(msg);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) throw new Error("No speech detected in recording.");
  return text;
}
