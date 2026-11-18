"use client";

import React from "react";
import {
  buildPlanningPatchFromDraft,
  hydrateProviderPlanningDraft,
} from "@/lib/surgical-sales/providerPlanningTabSections";
import type { IntelligenceCaptureContext } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderProfilePayload } from "./providerProfileTypes";
import { userFacingError } from "@/lib/errors/userFacingError";

const AUTOSAVE_MS = 800;

export function useProviderPlanningAutosave(params: {
  providerId: string;
  provider: Record<string, unknown> | null;
  enabled?: boolean;
  captureContext?: IntelligenceCaptureContext;
  onSaved: (payload: ProviderProfilePayload) => void;
  onError: (message: string | null) => void;
}) {
  const { providerId, provider, enabled = true, captureContext, onSaved, onError } = params;

  const [planDraft, setPlanDraft] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [lastSavedAt, setLastSavedAt] = React.useState<number | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const planDraftRef = React.useRef(planDraft);
  planDraftRef.current = planDraft;
  const captureContextRef = React.useRef(captureContext);
  captureContextRef.current = captureContext;

  const providerSyncKey = provider
    ? `${providerId}:${String(provider.provider_planning_updated_at || provider.updated_at || "")}`
    : "";

  React.useEffect(() => {
    if (!provider) return;
    setPlanDraft(hydrateProviderPlanningDraft(provider));
    setDirty(false);
  }, [provider, providerId, providerSyncKey]);

  const savePlanning = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!enabled || saving) return;
      setSaving(true);
      if (!opts?.silent) onError(null);
      try {
        const planning = buildPlanningPatchFromDraft(planDraftRef.current);
        const ctx = captureContextRef.current;
        const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planning,
            ...(ctx ? { planning_capture_context: ctx } : {}),
          }),
        });
        const j = (await res.json()) as ProviderProfilePayload & { ok?: boolean; error?: string };
        if (!res.ok || !j.ok) throw new Error(j.error || "Save failed");
        onSaved(j);
        setLastSavedAt(Date.now());
        setDirty(false);
        return j;
      } catch (e: unknown) {
        const msg = userFacingError(e, "We could not save your changes. Please try again.");
        if (!opts?.silent) onError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [enabled, onError, onSaved, providerId, saving],
  );

  React.useEffect(() => {
    if (!enabled || !dirty || saving) return;
    const handle = window.setTimeout(() => {
      void savePlanning({ silent: true }).catch(() => {
        /* error surfaced on explicit save */
      });
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(handle);
  }, [dirty, enabled, planDraft, savePlanning, saving]);

  const setPlanDraftDirty = React.useCallback((updater: React.SetStateAction<Record<string, string>>) => {
    setPlanDraft(updater);
    setDirty(true);
  }, []);

  return {
    planDraft,
    setPlanDraft: setPlanDraftDirty,
    saving,
    lastSavedAt,
    dirty,
    savePlanning,
  };
}
