"use client";

import React from "react";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import { LOG_UPDATE_VOICE_UNAVAILABLE } from "@/lib/surgical-sales/logUpdateUx";

const NETWORK_RETRY_DELAYS_MS = [400, 900, 1800] as const;
const DICTATION_RESTART_DELAY_MS = 420;
const NO_SPEECH_RESTART_MAX = 6;
const MIN_RECORDED_BYTES = 200;

export type DictationMode = "browser" | "server" | null;

export type DictationUiState = "idle" | "listening" | "paused" | "transcribing" | "error";

type UseSpeechDictationOptions = {
  /** Prefer server MediaRecorder + transcribe API (legacy default when true). */
  serverTranscribe?: boolean;
  /** Use browser SpeechRecognition first (Log Update). */
  preferBrowser?: boolean;
  /** Fall back to server recording when browser fails. Defaults to serverTranscribe. */
  allowServerFallback?: boolean;
  /** Fired when a finalized speech segment is appended to the note. */
  onDictationCaptured?: () => void;
};

function pickAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const mime of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "audio/webm";
}

export function mergeDictationText(base: string, addition: string): string {
  const parts = [base.trim(), addition.trim()].filter(Boolean);
  return parts.join(" ");
}

/** Safe base64 for large audio blobs (avoids stack overflow in btoa). */
export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function isBrowserSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as WindowWithSpeechRecognition;
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

/**
 * Phones/tablets should prefer MediaRecorder + Whisper over browser Web Speech.
 * Browser STT (especially mobile Chrome/Safari) is weak on surgical product names
 * and often drops trailing interim text.
 */
export function shouldPreferServerDictation(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const narrow = window.matchMedia?.("(max-width: 900px)")?.matches ?? false;
  const touch = Number(navigator.maxTouchPoints || 0) > 0;
  const ua = navigator.userAgent || "";
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return Boolean(mobileUa || coarse || (touch && narrow));
}

/** True when browser STT or microphone recording (Whisper) can capture voice. */
export function isVoiceCaptureAvailable(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    isBrowserSpeechRecognitionSupported() || Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/**
 * Shared Sales Command dictation settings (Field note + all other mic surfaces).
 * Phones prefer Whisper; desktop keeps live browser STT with Whisper fallback.
 */
export function salesDictationOptions(
  extra?: Pick<UseSpeechDictationOptions, "onDictationCaptured">,
): UseSpeechDictationOptions {
  return {
    serverTranscribe: true,
    preferBrowser: !shouldPreferServerDictation(),
    allowServerFallback: true,
    ...extra,
  };
}

/** Append a finalized STT segment without gluing words when the API omits spaces. */
export function appendFinalTranscriptSegment(existing: string, segment: string): string {
  const next = segment.replace(/\s+/g, " ").trim();
  if (!next) return existing;
  if (!existing) return next;
  if (/\s$/.test(existing)) return existing + next;
  if (/^[.!?,:;)]/.test(next)) return existing + next;
  return `${existing} ${next}`;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithSpeechRecognition;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function resolveDictationUiState(input: {
  browserSupported: boolean;
  preferBrowser: boolean;
  dictating: boolean;
  dictationPaused: boolean;
  transcribing: boolean;
  dictationError: string | null;
}): DictationUiState {
  if (input.transcribing) return "transcribing";
  if (input.dictating && !input.dictationPaused) return "listening";
  if (input.dictationPaused) return "paused";
  if (input.dictationError) return "error";
  return "idle";
}

export function useSpeechDictation(
  onTextChange: (text: string) => void,
  options?: UseSpeechDictationOptions,
) {
  const serverTranscribeEnabled = options?.serverTranscribe ?? false;
  const preferBrowser = options?.preferBrowser ?? false;
  const allowServerFallback = options?.allowServerFallback ?? serverTranscribeEnabled;
  const onDictationCapturedRef = React.useRef(options?.onDictationCaptured);
  onDictationCapturedRef.current = options?.onDictationCaptured;

  const browserSupported = React.useMemo(() => isBrowserSpeechRecognitionSupported(), []);

  const [dictating, setDictating] = React.useState(false);
  const [dictationPaused, setDictationPaused] = React.useState(false);
  const [dictationMode, setDictationMode] = React.useState<DictationMode>(null);
  const [dictationError, setDictationError] = React.useState<string | null>(null);
  const [transcribing, setTranscribing] = React.useState(false);

  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);
  const dictationBaseRef = React.useRef("");
  const dictationFinalRef = React.useRef("");
  const dictationInterimRef = React.useRef("");
  const dictationActiveRef = React.useRef(false);
  const dictationRestartTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkRetryCountRef = React.useRef(0);
  const noSpeechRestartCountRef = React.useRef(0);
  const finalTranscriptLenRef = React.useRef(0);

  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaChunksRef = React.useRef<Blob[]>([]);
  const serverMimeRef = React.useRef("audio/webm");

  function clearDictationRestartTimer() {
    if (dictationRestartTimerRef.current) {
      clearTimeout(dictationRestartTimerRef.current);
      dictationRestartTimerRef.current = null;
    }
  }

  const stopMediaCapture = React.useCallback((): Promise<void> => {
    const rec = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (!rec || rec.state === "inactive") {
      const stream = mediaStreamRef.current;
      mediaStreamRef.current = null;
      if (stream) {
        for (const track of stream.getTracks()) track.stop();
      }
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const finalize = () => {
        const stream = mediaStreamRef.current;
        mediaStreamRef.current = null;
        if (stream) {
          for (const track of stream.getTracks()) track.stop();
        }
        resolve();
      };
      rec.onstop = finalize;
      try {
        if (rec.state === "recording") {
          rec.requestData();
        }
        rec.stop();
      } catch {
        finalize();
      }
    });
  }, []);

  const teardownDictation = React.useCallback(() => {
    dictationActiveRef.current = false;
    networkRetryCountRef.current = 0;
    noSpeechRestartCountRef.current = 0;
    finalTranscriptLenRef.current = 0;
    clearDictationRestartTimer();
    void stopMediaCapture();
    mediaChunksRef.current = [];

    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    }
    setDictating(false);
    setDictationPaused(false);
    setDictationMode(null);
    setTranscribing(false);
  }, [stopMediaCapture]);

  React.useEffect(() => () => teardownDictation(), [teardownDictation]);

  function setBrowserUnavailableError() {
    setDictationError(LOG_UPDATE_VOICE_UNAVAILABLE);
  }

  function scheduleDictationRestart(rec: SpeechRecognitionInstance) {
    clearDictationRestartTimer();
    dictationRestartTimerRef.current = setTimeout(() => {
      dictationRestartTimerRef.current = null;
      if (!dictationActiveRef.current || recognitionRef.current !== rec) return;
      try {
        rec.start();
      } catch {
        teardownDictation();
        setDictationError("Dictation stopped unexpectedly. Tap the mic to try again.");
      }
    }, DICTATION_RESTART_DELAY_MS);
  }

  function applyDictationTranscript(ev: SpeechRecognitionResultEvent) {
    networkRetryCountRef.current = 0;
    const prevFinalLen = finalTranscriptLenRef.current;
    let interim = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const result = ev.results[i];
      const segment = result[0]?.transcript ?? "";
      if (!segment) continue;
      if (result.isFinal) {
        dictationFinalRef.current = appendFinalTranscriptSegment(dictationFinalRef.current, segment);
        dictationInterimRef.current = "";
      } else {
        interim += segment;
      }
    }
    if (interim) dictationInterimRef.current = interim.trim();
    if (dictationFinalRef.current.length > prevFinalLen) {
      finalTranscriptLenRef.current = dictationFinalRef.current.length;
      onDictationCapturedRef.current?.();
    }
    const parts = [
      dictationBaseRef.current,
      dictationFinalRef.current.trim(),
      dictationInterimRef.current.trim(),
    ].filter(Boolean);
    onTextChange(parts.join(" "));
  }

  function mergeBrowserDictationSnapshot(): string {
    const spoken = mergeDictationText(dictationFinalRef.current, dictationInterimRef.current);
    return mergeDictationText(dictationBaseRef.current, spoken);
  }

  async function uploadServerRecording(): Promise<string | null> {
    const chunks = mediaChunksRef.current;
    mediaChunksRef.current = [];
    if (!chunks.length) return null;

    const blob = new Blob(chunks, { type: serverMimeRef.current });
    const buf = await blob.arrayBuffer();
    const audioBase64 = bytesToBase64(new Uint8Array(buf));

    const res = await fetch("/api/portal/sales/ai-note-capture/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64, mimeType: serverMimeRef.current.split(";")[0] }),
    });
    const j = await readResponseJson<{ ok?: boolean; text?: string; error?: string }>(res);
    if (!res.ok || !j.ok || typeof j.text !== "string") {
      throw new Error(typeof j.error === "string" ? j.error : "Transcription failed");
    }
    return j.text.trim();
  }

  async function finishServerDictation(): Promise<string | null> {
    dictationActiveRef.current = false;
    setDictating(false);
    setDictationMode(null);
    await stopMediaCapture();

    const totalBytes = mediaChunksRef.current.reduce((n, c) => n + c.size, 0);
    if (!mediaChunksRef.current.length || totalBytes < MIN_RECORDED_BYTES) {
      setDictationError(
        "No audio captured. Hold the mic, speak for a few seconds, then tap stop.",
      );
      return dictationBaseRef.current || null;
    }

    setTranscribing(true);
    setDictationError(null);
    try {
      const transcript = await uploadServerRecording();
      if (transcript) {
        const merged = mergeDictationText(dictationBaseRef.current, transcript);
        onTextChange(merged);
        onDictationCapturedRef.current?.();
        return merged;
      }
      return dictationBaseRef.current || null;
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "Could not transcribe recording. Type your note or try voice again.";
      // Production often misses OPENAI_API_KEY — fall back to live browser dictation.
      if (/OPENAI_API_KEY not configured/i.test(message) && isBrowserSpeechRecognitionSupported()) {
        setDictationError(
          "Server transcription isn’t configured on this environment. Switched to live browser dictation — tap the mic and try again.",
        );
        return null;
      }
      setDictationError(
        /OPENAI_API_KEY not configured/i.test(message)
          ? "Server transcription isn’t configured (missing OPENAI_API_KEY). Type your note, or ask an admin to add the key to production."
          : message,
      );
      return null;
    } finally {
      setTranscribing(false);
    }
  }

  async function startServerDictation(currentText: string): Promise<boolean> {
    if (!allowServerFallback && preferBrowser) return false;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;

    teardownDictation();
    dictationBaseRef.current = currentText.trim();
    dictationFinalRef.current = "";
    dictationInterimRef.current = "";
    finalTranscriptLenRef.current = 0;
    dictationActiveRef.current = true;
    setDictationError(null);
    setDictationMode("server");
    setDictating(true);

    try {
      // Prefer a clean close-mic capture for Whisper. Aggressive browser DSP can
      // smear medical terms on phones.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      mediaStreamRef.current = stream;
      const mimeType = pickAudioMimeType();
      serverMimeRef.current = mimeType;
      mediaChunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) mediaChunksRef.current.push(ev.data);
      };
      recorder.onerror = () => {
        teardownDictation();
        setDictationError("Recording failed. Check your microphone and try again.");
      };
      recorder.start(250);
      return true;
    } catch {
      teardownDictation();
      setDictationError("Microphone access is required. Allow the mic in browser settings, then try again.");
      return false;
    }
  }

  function handleBrowserNetworkError(rec: SpeechRecognitionInstance, currentText: string) {
    if (!allowServerFallback) {
      dictationActiveRef.current = false;
      clearDictationRestartTimer();
      setDictating(false);
      setDictationMode(null);
      setDictationError(
        "Live dictation needs a network connection in this browser. Allow microphone access and try again, or type your note.",
      );
      return;
    }
    const attempt = networkRetryCountRef.current;
    if (attempt < NETWORK_RETRY_DELAYS_MS.length) {
      const delay = NETWORK_RETRY_DELAYS_MS[attempt];
      networkRetryCountRef.current = attempt + 1;
      clearDictationRestartTimer();
      dictationRestartTimerRef.current = setTimeout(() => {
        dictationRestartTimerRef.current = null;
        if (!dictationActiveRef.current || recognitionRef.current !== rec) return;
        try {
          rec.start();
        } catch {
          void tryServerFallback(currentText);
        }
      }, delay);
      return;
    }
    void tryServerFallback(currentText);
  }

  async function tryServerFallback(currentText: string) {
    if (!allowServerFallback) {
      dictationActiveRef.current = false;
      setDictating(false);
      setDictationMode(null);
      setBrowserUnavailableError();
      return;
    }
    recognitionRef.current = null;
    clearDictationRestartTimer();
    setDictating(false);
    setDictationMode(null);

    if (await startServerDictation(currentText)) {
      setDictationError(null);
      return;
    }

    dictationActiveRef.current = false;
    setBrowserUnavailableError();
  }

  function startBrowserDictation(currentText: string): boolean {
    const SR = getSpeechRecognitionCtor();
    if (!SR) {
      if (allowServerFallback) {
        void startServerDictation(currentText);
        return true;
      }
      setBrowserUnavailableError();
      return false;
    }

    teardownDictation();
    dictationBaseRef.current = currentText.trim();
    dictationFinalRef.current = "";
    dictationInterimRef.current = "";
    finalTranscriptLenRef.current = 0;
    dictationActiveRef.current = true;
    networkRetryCountRef.current = 0;
    noSpeechRestartCountRef.current = 0;
    setDictationError(null);
    setDictationPaused(false);
    setDictationMode("browser");

    const rec = new SR();
    recognitionRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    setDictating(true);

    rec.onresult = (ev: SpeechRecognitionResultEvent) => applyDictationTranscript(ev);

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      const code = ev.error;
      if (code === "aborted") return;
      if (code === "no-speech") {
        if (!dictationActiveRef.current) return;
        noSpeechRestartCountRef.current += 1;
        if (noSpeechRestartCountRef.current >= NO_SPEECH_RESTART_MAX && allowServerFallback) {
          void tryServerFallback(currentText);
          return;
        }
        scheduleDictationRestart(rec);
        return;
      }
      if (code === "network") {
        handleBrowserNetworkError(rec, currentText);
        return;
      }

      dictationActiveRef.current = false;
      clearDictationRestartTimer();
      setDictating(false);
      setDictationMode(null);
      if (code === "not-allowed" || code === "service-not-allowed") {
        setDictationError("Microphone access is required. Allow the mic in browser settings, then try again.");
      } else if (code === "audio-capture") {
        setDictationError("No microphone detected. Check your device and try again.");
      } else {
        setDictationError("Dictation interrupted. Tap the mic to try again.");
      }
    };

    rec.onend = () => {
      if (!dictationActiveRef.current) {
        setDictating(false);
        setDictationMode(null);
        return;
      }
      scheduleDictationRestart(rec);
    };

    try {
      rec.start();
      return true;
    } catch {
      if (allowServerFallback) {
        void tryServerFallback(currentText);
        return false;
      }
      setBrowserUnavailableError();
      return false;
    }
  }

  function startDictation(currentText: string) {
    if (dictationActiveRef.current || transcribing) return false;

    if (preferBrowser) {
      setDictationError(null);
      return startBrowserDictation(currentText);
    }

    if (serverTranscribeEnabled) {
      setDictationError(null);
      void (async () => {
        const serverOk = await startServerDictation(currentText);
        if (!serverOk) startBrowserDictation(currentText);
      })();
      return true;
    }

    return startBrowserDictation(currentText);
  }

  function pauseDictation(currentText?: string) {
    if (!dictationActiveRef.current && !dictating && !dictationPaused) return;
    if (currentText !== undefined) {
      dictationBaseRef.current = currentText.trim();
      dictationFinalRef.current = "";
      dictationInterimRef.current = "";
      finalTranscriptLenRef.current = 0;
      onTextChange(dictationBaseRef.current);
    }
    clearDictationRestartTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      try {
        recorder.pause();
        dictationActiveRef.current = false;
        setDictating(false);
        setDictationPaused(true);
        return;
      } catch {
        /* fall through */
      }
    }
    const rec = recognitionRef.current;
    if (rec) {
      dictationActiveRef.current = false;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      setDictating(false);
      setDictationPaused(true);
    }
  }

  function resumeDictation(currentText: string) {
    if (!browserSupported && preferBrowser) {
      setBrowserUnavailableError();
      return false;
    }
    setDictationPaused(false);
    dictationBaseRef.current = currentText.trim();
    dictationFinalRef.current = "";
    dictationInterimRef.current = "";
    finalTranscriptLenRef.current = 0;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "paused") {
      try {
        dictationActiveRef.current = true;
        recorder.resume();
        setDictating(true);
        setDictationMode("server");
        setDictationError(null);
        return true;
      } catch {
        /* restart below */
      }
    }

    if (dictationMode === "browser" && recognitionRef.current) {
      dictationActiveRef.current = true;
      setDictating(true);
      setDictationError(null);
      try {
        recognitionRef.current.start();
        return true;
      } catch {
        return startBrowserDictation(currentText);
      }
    }

    return startDictation(currentText);
  }

  function stopDictation() {
    setDictationPaused(false);
    if (dictationMode === "server" && dictationActiveRef.current) {
      void finishServerDictation();
      return;
    }
    if (dictationMode === "browser" && recognitionRef.current) {
      dictationActiveRef.current = false;
      clearDictationRestartTimer();
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      const merged = mergeBrowserDictationSnapshot();
      dictationInterimRef.current = "";
      onTextChange(merged);
      setDictating(false);
      setDictationMode(null);
      return;
    }
    teardownDictation();
  }

  async function stopDictationAsync(): Promise<string | null> {
    setDictationPaused(false);
    if (dictationMode === "server" && (dictationActiveRef.current || mediaRecorderRef.current)) {
      return finishServerDictation();
    }
    if (dictationMode === "browser" && recognitionRef.current) {
      dictationActiveRef.current = false;
      clearDictationRestartTimer();
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      // Keep trailing interim results — mobile browsers often never finalize the last phrase.
      const merged = mergeBrowserDictationSnapshot();
      dictationInterimRef.current = "";
      onTextChange(merged);
      setDictating(false);
      setDictationMode(null);
      return merged;
    }
    teardownDictation();
    return null;
  }

  const clearDictationError = React.useCallback(() => {
    setDictationError(null);
  }, []);

  function clearTranscript() {
    const restore = dictationBaseRef.current;
    teardownDictation();
    dictationFinalRef.current = "";
    dictationInterimRef.current = "";
    finalTranscriptLenRef.current = 0;
    onTextChange(restore);
  }

  const dictationUiState = React.useMemo(
    () =>
      resolveDictationUiState({
        browserSupported,
        preferBrowser,
        dictating,
        dictationPaused,
        transcribing,
        dictationError,
      }),
    [browserSupported, preferBrowser, dictating, dictationPaused, transcribing, dictationError],
  );

  return {
    dictating,
    dictationPaused,
    dictationMode,
    transcribing,
    dictationError,
    dictationUiState,
    browserSupported,
    clearDictationError,
    startDictation,
    pauseDictation,
    resumeDictation,
    stopDictation,
    stopDictationAsync,
    clearTranscript,
    teardownDictation,
  };
}
