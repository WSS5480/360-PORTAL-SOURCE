"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import {
  INTELLIGENCE_POST_SAVE_ACTION_LABELS,
  type IntelligencePostSaveAction,
  intelligencePostSaveProviderHref,
} from "@/lib/surgical-sales/intelligencePostSaveActions";

export function IntelligencePostSaveFooter({
  providerId,
  actions,
  onReturnToProvider,
  onActionClick,
  returnLabel = INTELLIGENCE_POST_SAVE_ACTION_LABELS.return_to_provider,
  className = "",
  primaryClassName = "intel-post-save-primary",
  actionClassName = "intel-post-save-action",
}: {
  providerId?: string | null;
  actions: IntelligencePostSaveAction[];
  onReturnToProvider?: () => void;
  onActionClick?: () => void;
  returnLabel?: string;
  className?: string;
  primaryClassName?: string;
  actionClassName?: string;
}) {
  const router = useRouter();
  const providerHref = intelligencePostSaveProviderHref(providerId);

  function handleReturnToProvider() {
    onReturnToProvider?.();
    if (providerHref) {
      router.push(providerHref);
    }
  }

  if (!providerHref && actions.length === 0) return null;

  return (
    <footer className={`intel-post-save-footer${className ? ` ${className}` : ""}`}>
      {providerHref ? (
        <button type="button" className={primaryClassName} onClick={handleReturnToProvider}>
          {returnLabel}
        </button>
      ) : null}
      {actions.length > 0 ? (
        <div className="intel-post-save-actions" role="group" aria-label="Next steps">
          {actions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className={actionClassName}
              onClick={() => onActionClick?.()}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </footer>
  );
}
