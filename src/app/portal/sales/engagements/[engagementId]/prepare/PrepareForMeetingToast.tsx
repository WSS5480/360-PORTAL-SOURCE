"use client";

import Link from "next/link";
import React from "react";

export type PrepareToastVariant = "success" | "error";

export type PrepareToastState = {
  message: string;
  variant: PrepareToastVariant;
  actionLabel?: string;
  actionHref?: string;
};

const TOAST_MS = 5200;

export function usePrepareForMeetingToast() {
  const [toast, setToast] = React.useState<PrepareToastState | null>(null);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const showToast = React.useCallback((
    message: string,
    variant: PrepareToastVariant = "success",
    action?: { label: string; href: string },
  ) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast({
      message,
      variant,
      actionLabel: action?.label,
      actionHref: action?.href,
    });
    timerRef.current = window.setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, action ? TOAST_MS : 2600);
  }, []);

  const dismissToast = React.useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
}

export function PrepareForMeetingToast({
  toast,
}: {
  toast: PrepareToastState | null;
}) {
  if (!toast) return null;

  return (
    <div className="pfm-toast-stack" role="status" aria-live="polite">
      <div className={`pfm-toast pfm-toast--${toast.variant}${toast.actionHref ? " pfm-toast--with-action" : ""}`}>
        <span>{toast.message}</span>
        {toast.actionHref && toast.actionLabel ? (
          <Link className="pfm-toast-action" href={toast.actionHref}>
            {toast.actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
