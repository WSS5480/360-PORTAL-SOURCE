export async function patchObservationCase(
  caseId: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const j = (await res.json()) as { ok?: boolean; error?: string; case?: Record<string, unknown> };
  if (!res.ok || !j.ok || !j.case) throw new Error(j.error || "");
  return j.case;
}
