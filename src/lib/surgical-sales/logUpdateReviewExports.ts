import {
  LOG_UPDATE_RAW_DEBRIEF_DEFAULT,
  LOG_UPDATE_RAW_DEBRIEF_ENGAGEMENT,
  LOG_UPDATE_RAW_DEBRIEF_PROVIDER,
} from "@/lib/surgical-sales/logUpdateUx";
import type { ReviewScopeDisplayContext } from "@/lib/surgical-sales/logUpdateReviewPresentation";

export function logUpdateRawDebriefHint(opts: {
  engagementId?: string | null;
  providerId?: string | null;
}): string {
  if (opts.engagementId) return LOG_UPDATE_RAW_DEBRIEF_ENGAGEMENT;
  if (opts.providerId) return LOG_UPDATE_RAW_DEBRIEF_PROVIDER;
  return LOG_UPDATE_RAW_DEBRIEF_DEFAULT;
}

export function logUpdateReviewScopeContext(opts: {
  providerId?: string | null;
  providerLabel?: string | null;
  organizationId?: string | null;
  organizationLabel?: string | null;
  engagementId?: string | null;
}): ReviewScopeDisplayContext {
  return {
    organizationLabel: opts.organizationLabel ?? null,
    providerLabel: opts.providerLabel ?? null,
    fromProviderWorkspace: Boolean(opts.providerId || opts.engagementId),
  };
}
