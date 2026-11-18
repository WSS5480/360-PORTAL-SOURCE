import type { MissionBoardCommitmentModalView } from "@/lib/surgical-sales/missionBoardCommitmentOutcomesService";
import type {
  ProviderCommitmentType,
  ProviderOutcomeUpdateType,
} from "@/lib/surgical-sales/providerCommitmentOutcomes";

async function parseJson(res: Response): Promise<Record<string, unknown> | null> {
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
}

export async function fetchMissionBoardCommitmentModal(
  providerId: string,
): Promise<{ ok: true; view: MissionBoardCommitmentModalView } | { ok: false; message: string }> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(providerId)}/mission-board-commitment`,
    { cache: "no-store" },
  );
  const payload = await parseJson(res);
  if (!res.ok || !payload?.ok || !payload.view) {
    return {
      ok: false,
      message: typeof payload?.error === "string" ? payload.error : "Could not load commitment.",
    };
  }
  return { ok: true, view: payload.view as MissionBoardCommitmentModalView };
}

export async function markMissionBoardEvaluationSuccessful(
  providerId: string,
): Promise<{ ok: true; alreadyMarked?: boolean } | { ok: false; message: string }> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(providerId)}/mission-board-evaluation-success`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  );
  const payload = await parseJson(res);
  if (!res.ok || !payload?.ok) {
    return {
      ok: false,
      message: typeof payload?.error === "string" ? payload.error : "Could not mark evaluation successful.",
    };
  }
  return { ok: true, alreadyMarked: Boolean(payload.alreadyMarked) };
}

export async function saveMissionBoardCommitment(input: {
  providerId: string;
  commitmentType?: ProviderCommitmentType;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(input.providerId)}/mission-board-commitment`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commitment_type: input.commitmentType ?? "structured_use",
      }),
    },
  );
  const payload = await parseJson(res);
  if (!res.ok || !payload?.ok) {
    return {
      ok: false,
      message: typeof payload?.error === "string" ? payload.error : "Could not save commitment.",
    };
  }
  return { ok: true };
}

export async function activateMissionBoardOutcomesTracking(
  providerId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(providerId)}/mission-board-outcomes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate" }),
    },
  );
  const payload = await parseJson(res);
  if (!res.ok || !payload?.ok) {
    return {
      ok: false,
      message: typeof payload?.error === "string" ? payload.error : "Could not move to Outcomes.",
    };
  }
  return { ok: true };
}

export async function logMissionBoardOutcomeUpdate(input: {
  providerId: string;
  updateType: ProviderOutcomeUpdateType;
  notes: string;
  recordedDate?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(input.providerId)}/mission-board-outcomes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "outcome_update",
        update_type: input.updateType,
        notes: input.notes,
        recorded_date: input.recordedDate ?? null,
      }),
    },
  );
  const payload = await parseJson(res);
  if (!res.ok || !payload?.ok) {
    return {
      ok: false,
      message: typeof payload?.error === "string" ? payload.error : "Could not log outcome update.",
    };
  }
  return { ok: true };
}

export async function logMissionBoardProductUse(input: {
  providerId: string;
  recordedDate?: string | null;
  productPath?: string | null;
  caseProcedure?: string | null;
  quantity?: string | null;
  notes?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(input.providerId)}/mission-board-outcomes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "product_use",
        recorded_date: input.recordedDate ?? null,
        product_path: input.productPath ?? null,
        case_procedure: input.caseProcedure ?? null,
        quantity: input.quantity ?? null,
        notes: input.notes ?? null,
      }),
    },
  );
  const payload = await parseJson(res);
  if (!res.ok || !payload?.ok) {
    return {
      ok: false,
      message: typeof payload?.error === "string" ? payload.error : "Could not log product use.",
    };
  }
  return { ok: true };
}
