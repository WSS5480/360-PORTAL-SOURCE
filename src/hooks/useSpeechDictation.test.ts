import { describe, expect, it } from "vitest";
import {
  appendFinalTranscriptSegment,
  bytesToBase64,
  mergeDictationText,
  resolveDictationUiState,
  salesDictationOptions,
  shouldPreferServerDictation,
} from "./useSpeechDictation";

describe("mergeDictationText", () => {
  it("appends dictation without dropping existing base text", () => {
    expect(mergeDictationText("Met with surgeon.", "Case volume is high.")).toBe(
      "Met with surgeon. Case volume is high.",
    );
  });

  it("returns base when addition is empty", () => {
    expect(mergeDictationText("Typed note", "")).toBe("Typed note");
  });

  it("keeps trailing interim speech when finalized text is merged with interim", () => {
    expect(mergeDictationText("Confirmed observation permission.", "Next week")).toBe(
      "Confirmed observation permission. Next week",
    );
  });
});

describe("appendFinalTranscriptSegment", () => {
  it("inserts a space between word boundaries when the STT omits one", () => {
    expect(appendFinalTranscriptSegment("Case volume", "is high")).toBe("Case volume is high");
  });

  it("does not double-space when the segment already has leading space", () => {
    expect(appendFinalTranscriptSegment("Case volume", " is high")).toBe("Case volume is high");
  });
});

describe("shouldPreferServerDictation", () => {
  it("returns a boolean in the current environment", () => {
    expect(typeof shouldPreferServerDictation()).toBe("boolean");
  });
});

describe("salesDictationOptions", () => {
  it("enables Whisper server transcription with browser fallback", () => {
    const opts = salesDictationOptions();
    expect(opts.serverTranscribe).toBe(true);
    expect(opts.allowServerFallback).toBe(true);
    expect(typeof opts.preferBrowser).toBe("boolean");
  });
});

describe("bytesToBase64", () => {
  it("encodes bytes without throwing on larger buffers", () => {
    const bytes = new Uint8Array(9000);
    bytes[0] = 65;
    bytes[8999] = 90;
    const encoded = bytesToBase64(bytes);
    expect(encoded.length).toBeGreaterThan(0);
    expect(atob(encoded).length).toBe(bytes.length);
  });
});

describe("resolveDictationUiState", () => {
  const base = {
    browserSupported: true,
    preferBrowser: true,
    dictating: false,
    dictationPaused: false,
    transcribing: false,
    dictationError: null,
  };

  it("maps active dictation to listening", () => {
    expect(resolveDictationUiState({ ...base, dictating: true })).toBe("listening");
  });

  it("maps pause flag to paused", () => {
    expect(resolveDictationUiState({ ...base, dictationPaused: true })).toBe("paused");
  });

  it("maps errors to error state", () => {
    expect(
      resolveDictationUiState({ ...base, dictationError: "Voice capture unavailable in this browser. Type your update instead." }),
    ).toBe("error");
  });
});
