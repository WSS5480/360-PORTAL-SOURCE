"use client";

import React from "react";
import type { AiNoteCaptureContext, AiNoteCaptureSavedResult } from "@/lib/surgical-sales/aiNoteCapture/types";

type AiNoteCaptureOpenState = {
  context: AiNoteCaptureContext;
  onSaved?: (result?: AiNoteCaptureSavedResult) => void;
};

type AiNoteCaptureApi = {
  open: (
    context?: AiNoteCaptureContext,
    options?: { onSaved?: (result?: AiNoteCaptureSavedResult) => void },
  ) => void;
  close: () => void;
  isOpen: boolean;
  context: AiNoteCaptureContext;
  onSaved?: (result?: AiNoteCaptureSavedResult) => void;
};

const AiNoteCaptureCtx = React.createContext<AiNoteCaptureApi | null>(null);

export function AiNoteCaptureProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AiNoteCaptureOpenState | null>(null);

  const api = React.useMemo<AiNoteCaptureApi>(
    () => ({
      open: (context = {}, options) => setState({ context, onSaved: options?.onSaved }),
      close: () => setState(null),
      isOpen: state != null,
      context: state?.context ?? {},
      onSaved: state?.onSaved,
    }),
    [state],
  );

  return <AiNoteCaptureCtx.Provider value={api}>{children}</AiNoteCaptureCtx.Provider>;
}

export function useAiNoteCapture() {
  const ctx = React.useContext(AiNoteCaptureCtx);
  if (!ctx) throw new Error("useAiNoteCapture must be used within AiNoteCaptureProvider");
  return ctx;
}

export function useAiNoteCaptureOptional() {
  return React.useContext(AiNoteCaptureCtx);
}
