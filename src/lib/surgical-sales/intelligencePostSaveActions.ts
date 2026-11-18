import {
  buildEngagementAddNoteHref,
  buildPrepareCaptureIntelHref,
  buildProviderOverviewHref,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";

export const INTELLIGENCE_POST_SAVE_ACTION_LABELS = {
  return_to_provider: "Return to provider",
  view_intelligence: "View intelligence",
  create_follow_up: "Create follow-up",
  open_related_case: "Open related case",
} as const;

export type IntelligencePostSaveActionId = keyof typeof INTELLIGENCE_POST_SAVE_ACTION_LABELS;

export type IntelligencePostSaveAction = {
  id: IntelligencePostSaveActionId;
  label: string;
  href: string;
};

export function buildSurgicalCasePortalHref(caseId: string): string {
  return `/portal/sales/cases/${encodeURIComponent(caseId)}`;
}

export function buildIntelligencePostSaveActions(params: {
  providerId?: string | null;
  caseId?: string | null;
  accountId?: string | null;
}): IntelligencePostSaveAction[] {
  const providerId = String(params.providerId ?? "").trim();
  const caseId = String(params.caseId ?? "").trim();
  const actions: IntelligencePostSaveAction[] = [];

  if (providerId) {
    actions.push({
      id: "view_intelligence",
      label: INTELLIGENCE_POST_SAVE_ACTION_LABELS.view_intelligence,
      href: buildPrepareCaptureIntelHref(providerId),
    });
    actions.push({
      id: "create_follow_up",
      label: INTELLIGENCE_POST_SAVE_ACTION_LABELS.create_follow_up,
      href: buildFollowUpEngagementHref(providerId, params.accountId),
    });
  }

  if (caseId) {
    actions.push({
      id: "open_related_case",
      label: INTELLIGENCE_POST_SAVE_ACTION_LABELS.open_related_case,
      href: buildSurgicalCasePortalHref(caseId),
    });
  }

  return actions;
}

export function buildFollowUpEngagementHref(
  providerId: string,
  accountId?: string | null,
): string {
  const scheduleParams = new URLSearchParams({
    provider_id: providerId,
    engagement_type: "follow_up",
  });
  const orgId = String(accountId ?? "").trim();
  if (orgId) scheduleParams.set("organization_id", orgId);
  return `/portal/sales/engagements/new?${scheduleParams.toString()}`;
}

export function intelligencePostSaveProviderHref(providerId?: string | null): string | null {
  const id = String(providerId ?? "").trim();
  return id ? buildProviderOverviewHref(id) : null;
}

/** Provider activity tab — optional deep link for note follow-up. */
export function intelligencePostSaveAddNoteHref(providerId?: string | null): string | null {
  const id = String(providerId ?? "").trim();
  return id ? buildEngagementAddNoteHref(id) : null;
}
