import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";

export async function improvePreCallPlanFieldWordingClient(
  engagementId: string,
  body: {
    fieldKey: PreCallPlanFieldKey;
    fieldLabel: string;
    fieldHelper?: string;
    currentText: string;
  },
): Promise<{ text: string; usedAi: boolean }> {
  const res = await fetch(
    `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/plan-field`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "improve_wording", ...body }),
    },
  );
  const j = (await res.json()) as {
    ok?: boolean;
    error?: string;
    text?: string;
    usedAi?: boolean;
  };
  if (!res.ok || !j.ok || !j.text) {
    throw new Error(j.error || "Could not improve wording");
  }
  return { text: j.text, usedAi: Boolean(j.usedAi) };
}
