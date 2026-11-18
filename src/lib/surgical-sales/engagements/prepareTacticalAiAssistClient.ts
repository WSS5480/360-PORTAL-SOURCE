import type { PrepareTacticalAiAssistActionId } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistActions";
import type { PrepareTacticalAiAssistApplyPayload } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistApply";

export type PrepareTacticalAiAssistResponse =
  | ({ ok: true } & PrepareTacticalAiAssistApplyPayload)
  | { ok: false; error: string };

export async function runPrepareTacticalAiAssistClient(
  engagementId: string,
  action: PrepareTacticalAiAssistActionId,
): Promise<PrepareTacticalAiAssistResponse> {
  const res = await fetch(
    `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/assist`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    },
  );
  const j = (await res.json()) as PrepareTacticalAiAssistResponse & { error?: string };
  if (!res.ok || !j.ok) {
    return { ok: false, error: j.error || "Assist failed" };
  }
  return j;
}
