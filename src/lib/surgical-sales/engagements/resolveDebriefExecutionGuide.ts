import { buildDebriefExecutionGuideFromWorkspace } from "@/lib/surgical-sales/engagements/buildDebriefExecutionGuideFromWorkspace";
import type { DebriefExecutionGuide } from "@/lib/surgical-sales/engagements/debriefExecutionGuideTypes";
import { isDebriefValidationEngagementType } from "@/lib/surgical-sales/engagements/isPostObservationProviderDebrief";
import { resolveDebriefPrepareWorkspaceForEngagement } from "@/lib/surgical-sales/engagements/resolveDebriefPrepareWorkspace";
import { readDebriefPrepareWorkspaceSnapshot } from "@/lib/surgical-sales/engagements/debriefPrepareWorkspace";

export type ResolveDebriefExecutionGuideResult =
  | { ok: true; guide: DebriefExecutionGuide }
  | { ok: false; message: string; status: 400 | 404 | 500 };

export async function resolveDebriefExecutionGuide(input: {
  engagement: Record<string, unknown>;
  engagementId: string;
  userId: string;
}): Promise<ResolveDebriefExecutionGuideResult> {
  if (!isDebriefValidationEngagementType(String(input.engagement.engagement_type ?? ""))) {
    return { ok: false, message: "Not a provider debrief engagement.", status: 400 };
  }

  const resolved = await resolveDebriefPrepareWorkspaceForEngagement(input);
  if (!resolved.ok) {
    return { ok: false, message: resolved.message, status: resolved.status };
  }

  const savedSnapshot = readDebriefPrepareWorkspaceSnapshot(input.engagement.debrief_intelligence_snapshot);
  const guide = buildDebriefExecutionGuideFromWorkspace({
    workspace: resolved.workspace,
    savedSnapshot,
  });

  return { ok: true, guide };
}

export async function resolveDebriefExecutionGuideForEngagementId(input: {
  engagementId: string;
  userId: string;
}): Promise<ResolveDebriefExecutionGuideResult> {
  const { loadEngagementForPortalActor } = await import(
    "@/lib/surgical-sales/engagements/engagementAccess"
  );
  const engagement = await loadEngagementForPortalActor(input.engagementId, input.userId, {
    includeArchived: true,
  });
  if (!engagement) {
    return { ok: false, message: "Engagement not found.", status: 404 };
  }

  return resolveDebriefExecutionGuide({
    engagement: engagement as Record<string, unknown>,
    engagementId: input.engagementId,
    userId: input.userId,
  });
}
