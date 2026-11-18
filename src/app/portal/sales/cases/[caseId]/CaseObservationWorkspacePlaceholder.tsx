"use client";

import type React from "react";
import { caseObservationTabPlaceholderCss } from "./caseObservationTabPlaceholderCss";

export function CaseObservationWorkspacePlaceholder({
  kicker,
  message,
}: {
  kicker: string;
  message: string;
}) {
  return (
    <div className="case-obs-tab-placeholder">
      <p className="case-obs-tab-placeholder-kicker">{kicker}</p>
      <p className="case-obs-tab-placeholder-copy">{message}</p>
    </div>
  );
}

export function CaseObservationTabShell({
  kicker,
  children,
}: {
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <div className="case-mobile-only case-obs-tab-panel">
      <style dangerouslySetInnerHTML={{ __html: caseObservationTabPlaceholderCss }} />
      <div className="case-obs-tab-placeholder-kicker" style={{ padding: "10px 12px 0", margin: 0 }}>
        {kicker}
      </div>
      {children}
    </div>
  );
}
