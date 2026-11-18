"use client";

import React from "react";

/** Compact textarea that grows with content (capped) for mission-prep forms. */
export function PrepAutoGrowTextarea({
  value,
  rows,
  disabled,
  placeholder,
  onChange,
}: {
  value: string;
  rows: number;
  disabled?: boolean;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const syncHeight = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 18;
    const minPx = Math.max(rows, 1) * lineHeight + 14;
    const maxPx = 168;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minPx), maxPx)}px`;
  }, [rows]);

  React.useLayoutEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  return (
    <textarea
      ref={ref}
      className="ew-prep-call-plan-textarea"
      rows={rows}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e);
        syncHeight();
      }}
    />
  );
}
