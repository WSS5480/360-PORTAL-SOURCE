/**
 * Persist multiple category findings — each normalized item maps independently.
 */

import type { IntelligenceCaptureCategoryId } from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { applyCategoryFindingToProvider } from "@/lib/surgical-sales/intelligenceCapture/applyCategoryFinding";

export type ApplyCategoryFindingsResult =
  | {
      ok: true;
      savedCount: number;
      confirmationMessage: string;
      followUpRequired: boolean;
      provider: Record<string, unknown>;
    }
  | { ok: false; message: string };

export async function applyCategoryFindingsToProvider(input: {
  providerId: string;
  categoryId: IntelligenceCaptureCategoryId;
  findings: string[];
  actorUserId: string;
  actorName: string;
}): Promise<ApplyCategoryFindingsResult> {
  const findings = input.findings.map((f) => f.trim()).filter(Boolean);
  if (!findings.length) {
    return { ok: false, message: "Add what you learned before saving." };
  }

  let savedCount = 0;
  let followUpRequired = false;
  let lastProvider: Record<string, unknown> | null = null;
  let lastConfirmation = "";

  for (const finding of findings) {
    const result = await applyCategoryFindingToProvider({
      providerId: input.providerId,
      categoryId: input.categoryId,
      finding,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
    });
    if (!result.ok) {
      if (savedCount > 0 && lastProvider) {
        return {
          ok: true,
          savedCount,
          confirmationMessage: `${savedCount} finding${savedCount === 1 ? "" : "s"} saved. Some items could not be mapped.`,
          followUpRequired,
          provider: lastProvider,
        };
      }
      return { ok: false, message: result.message };
    }
    savedCount += 1;
    followUpRequired = followUpRequired || result.followUpRequired;
    lastProvider = result.provider;
    lastConfirmation = result.confirmationMessage;
  }

  if (!lastProvider) {
    return { ok: false, message: "Could not save findings." };
  }

  const confirmationMessage =
    savedCount === 1
      ? lastConfirmation
      : `${savedCount} findings saved to this area.`;

  return {
    ok: true,
    savedCount,
    confirmationMessage,
    followUpRequired,
    provider: lastProvider,
  };
}
