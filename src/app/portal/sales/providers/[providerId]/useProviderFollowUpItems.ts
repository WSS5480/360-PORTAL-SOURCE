"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildProviderFollowUpItemsView,
  type ProviderFollowUpItem,
} from "@/lib/surgical-sales/buildProviderFollowUpItemsView";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderDebriefNarrativeContext } from "@/lib/surgical-sales/engagements/loadLatestProviderDebriefNarrative";
import { parseDebriefIntelligenceSnapshot } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import { followUpTaskCompletionKey } from "@/lib/surgical-sales/engagements/syncEngagementDebriefFollowUpTasks";

function applyFollowUpCompletionLocally(
  engagements: ProviderEngagementSummary[],
  item: ProviderFollowUpItem,
  completed: boolean,
): ProviderEngagementSummary[] {
  return engagements.map((engagement) => {
    if (engagement.id !== item.engagementId) return engagement;

    const snapshotRecord = (engagement.debrief_intelligence_snapshot ?? {}) as Record<string, unknown>;
    const parsed = parseDebriefIntelligenceSnapshot(engagement.debrief_intelligence_snapshot);
    const existingCompletions =
      parsed &&
      (parsed as unknown as { followUpTaskCompletions?: Record<string, string> }).followUpTaskCompletions
        ? (parsed as unknown as { followUpTaskCompletions: Record<string, string> }).followUpTaskCompletions
        : snapshotRecord.followUpTaskCompletions &&
            typeof snapshotRecord.followUpTaskCompletions === "object" &&
            !Array.isArray(snapshotRecord.followUpTaskCompletions)
          ? (snapshotRecord.followUpTaskCompletions as Record<string, string>)
          : {};

    const completions = { ...existingCompletions };
    const key = followUpTaskCompletionKey(item.title);
    if (completed) {
      completions[key] = new Date().toISOString();
    } else {
      delete completions[key];
    }

    return {
      ...engagement,
      debrief_intelligence_snapshot: {
        ...snapshotRecord,
        followUpTaskCompletions: completions,
      },
    };
  });
}

export function useProviderFollowUpItems(input: {
  engagements?: ProviderEngagementSummary[];
  debriefNarrativeContext?: ProviderDebriefNarrativeContext | null;
  providerId: string;
  onEngagementsUpdated?: (engagements: ProviderEngagementSummary[]) => void;
  onProviderUpdated?: (provider: Record<string, unknown>) => void | Promise<void>;
}) {
  const { engagements, debriefNarrativeContext, providerId, onEngagementsUpdated, onProviderUpdated } = input;
  const [localEngagements, setLocalEngagements] = useState(engagements ?? []);

  useEffect(() => {
    setLocalEngagements(engagements ?? []);
  }, [engagements]);

  const followUpItems = useMemo(
    () =>
      buildProviderFollowUpItemsView({
        engagements: localEngagements,
        debriefNarrativeContext,
      }),
    [debriefNarrativeContext, localEngagements],
  );

  const toggleFollowUpItem = useCallback(
    async (item: ProviderFollowUpItem, completed: boolean) => {
      let previousEngagements: ProviderEngagementSummary[] = [];

      setLocalEngagements((current) => {
        previousEngagements = current;
        const next = applyFollowUpCompletionLocally(current, item, completed);
        onEngagementsUpdated?.(next);
        return next;
      });

      try {
        const res = await fetch(
          `/api/portal/sales/engagements/${encodeURIComponent(item.engagementId)}/follow-up-tasks`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task_title: item.title, completed }),
          },
        );
        const payload = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !payload.ok) {
          throw new Error(typeof payload.error === "string" ? payload.error : "Could not update follow-up item.");
        }

        void (async () => {
          try {
            const providerRes = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, {
              cache: "no-store",
            });
            const providerPayload = (await providerRes.json()) as {
              ok?: boolean;
              engagements?: ProviderEngagementSummary[];
              contact?: Record<string, unknown>;
            };
            if (!providerRes.ok || !providerPayload.ok) return;

            if (providerPayload.engagements) {
              setLocalEngagements(providerPayload.engagements);
              onEngagementsUpdated?.(providerPayload.engagements);
            }
            if (providerPayload.contact) {
              await onProviderUpdated?.(providerPayload.contact);
            }
          } catch {
            /* non-blocking background sync */
          }
        })();
      } catch {
        setLocalEngagements(previousEngagements);
        onEngagementsUpdated?.(previousEngagements);
      }
    },
    [onEngagementsUpdated, onProviderUpdated, providerId],
  );

  return { followUpItems, toggleFollowUpItem };
}
