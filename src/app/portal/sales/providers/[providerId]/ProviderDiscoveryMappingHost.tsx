"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { AiNoteCaptureWorkflow } from "@/components/sales/aiNoteCapture/AiNoteCaptureWorkflow";
import { buildCaptureIntelligenceOpenContext } from "@/components/sales/captureIntelligence/CaptureIntelligenceHost";
import { contactDisplayName } from "@/lib/surgical-sales/labels";

/**
 * Provider profile intelligence capture — freeform AI-reviewed flow only.
 * Replaces the prior category-browse / stage-mapping modal on the Intelligence tab.
 */
export function ProviderDiscoveryMappingHost({
  open,
  onOpenChange,
  contact,
  providerId,
  organizationId,
  organizationName,
  onLogFieldIntel,
  onProviderUpdated,
  onProfileRefresh,
  enableUrlDeepLink = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Record<string, unknown>;
  providerId: string;
  organizationId?: string | null;
  organizationName?: string | null;
  onLogFieldIntel: () => void;
  onProviderUpdated?: (provider: Record<string, unknown>) => void | Promise<void>;
  onProfileRefresh?: () => void | Promise<void>;
  enableUrlDeepLink?: boolean;
  /** @deprecated Unused — capture is always freeform from provider profile. */
  planning?: unknown;
  relationshipStage?: string | null;
  engagements?: unknown[];
  opportunities?: unknown[];
  cases?: unknown[];
  relatedContacts?: Record<string, unknown>[];
  initialGroupId?: unknown;
  initialSignalId?: unknown;
}) {
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (!enableUrlDeepLink) return;
    if (searchParams.get("mapping") !== "1") return;
    onOpenChange(true);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("mapping");
      const query = params.toString();
      const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      window.history.replaceState({}, "", nextUrl);
    }
  }, [enableUrlDeepLink, onOpenChange, searchParams]);

  const captureContext = React.useMemo(
    () =>
      buildCaptureIntelligenceOpenContext("provider", {
        providerId,
        providerLabel: contactDisplayName(contact),
        organizationId: organizationId ?? undefined,
        organizationLabel: organizationName ?? undefined,
      }),
    [contact, organizationId, organizationName, providerId],
  );

  const handleSaved = React.useCallback(() => {
    onOpenChange(false);
    void onProviderUpdated?.(contact);
    void onProfileRefresh?.();
  }, [contact, onOpenChange, onProfileRefresh, onProviderUpdated]);

  return (
    <AiNoteCaptureWorkflow
      open={open}
      context={captureContext}
      onClose={() => onOpenChange(false)}
      onSaved={handleSaved}
    />
  );
}
