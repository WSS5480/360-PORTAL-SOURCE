"use client";

import React from "react";
import { LogUpdateDesktopButton } from "@/components/sales/captureIntelligence/LogUpdateDesktopButton";
import { SalesMobileActionBar } from "@/components/sales/captureIntelligence/SalesMobileActionBar";
import { SalesMobileLogUpdateFab } from "@/components/sales/captureIntelligence/SalesMobileLogUpdateFab";
import { AiNoteCaptureWorkflow } from "./AiNoteCaptureWorkflow";
import { AiNoteCaptureProvider, useAiNoteCapture } from "./AiNoteCaptureContext";

function AiNoteCaptureModalLayer() {
  const { isOpen, context, close, onSaved } = useAiNoteCapture();
  return (
    <AiNoteCaptureWorkflow
      open={isOpen}
      context={context}
      onClose={close}
      onSaved={(result) => {
        onSaved?.(result);
      }}
    />
  );
}

export function AiNoteCaptureHost({ children }: { children: React.ReactNode }) {
  return (
    <AiNoteCaptureProvider>
      <LogUpdateDesktopButton />
      {children}
      <SalesMobileLogUpdateFab />
      <SalesMobileActionBar />
      <AiNoteCaptureModalLayer />
    </AiNoteCaptureProvider>
  );
}

export { useAiNoteCapture };
