import { readResponseJson } from "@/lib/utils/readResponseJson";

export type PlanProviderDebriefFromCaseResult = {
  engagementId: string;
  prepareHref: string;
  created: boolean;
  reused: boolean;
};

export type PlanProviderDebriefFromCaseResponse = {
  ok?: boolean;
  error?: string;
  engagementId?: string;
  prepareHref?: string;
  created?: boolean;
  reused?: boolean;
};

export async function planProviderDebriefFromCaseClient(
  caseId: string,
): Promise<{ ok: true; result: PlanProviderDebriefFromCaseResult } | { ok: false; message: string }> {
  const res = await fetch(
    `/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/plan-provider-debrief`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
  );

  try {
    const json = await readResponseJson<PlanProviderDebriefFromCaseResponse>(res);
    if (!res.ok || !json.ok || !json.engagementId || !json.prepareHref) {
      return { ok: false, message: json.error || "Failed to plan provider debrief" };
    }

    return {
      ok: true,
      result: {
        engagementId: json.engagementId,
        prepareHref: json.prepareHref,
        created: Boolean(json.created),
        reused: Boolean(json.reused),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to plan provider debrief";
    return { ok: false, message };
  }
}
