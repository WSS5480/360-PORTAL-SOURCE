"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import {
  beginEngagementCallClient,
  buildBeginCallHref,
} from "@/lib/surgical-sales/engagements/beginEngagementCallClient";
import { ENGAGEMENT_PREPARE_START_ENGAGEMENT_LABEL } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import { autoMarkEngagementPreparedClient } from "@/lib/surgical-sales/engagements/preparePreCallPlanSaveClient";
import { userFacingError } from "@/lib/errors/userFacingError";

export function PrepareProviderDebriefFooter({
  engagementId,
  engagementDetailHref,
  onActionError,
}: {
  engagementId: string;
  engagementDetailHref: string;
  onActionError?: (message: string | null) => void;
}) {
  const router = useRouter();
  const [starting, setStarting] = React.useState(false);

  async function handleStart() {
    if (starting) return;
    setStarting(true);
    onActionError?.(null);
    try {
      await autoMarkEngagementPreparedClient(engagementId);
      const result = await beginEngagementCallClient(engagementId);
      if (!result.ok) {
        onActionError?.(result.message);
        return;
      }
      router.push(buildBeginCallHref(engagementId));
    } catch (error: unknown) {
      onActionError?.(userFacingError(error, "Could not start engagement"));
    } finally {
      setStarting(false);
    }
  }

  return (
    <footer className="dpb-footer">
      <div className="dpb-footer__inner">
        <button
          type="button"
          className="dpb-footer__primary"
          disabled={starting}
          onClick={() => void handleStart()}
        >
          {starting ? "Starting…" : ENGAGEMENT_PREPARE_START_ENGAGEMENT_LABEL}
        </button>
        <Link href={engagementDetailHref} className="dpb-footer__secondary">
          Back to engagement
        </Link>
      </div>
    </footer>
  );
}
