import type { NewCaseType } from "@/lib/surgical-sales/newSurgicalCasePageLogic";

export type MissionBoardCaseType = NewCaseType;

export function missionBoardObservationDefaultDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildMissionBoardCasePayload(input: {
  caseType: MissionBoardCaseType;
  providerId: string;
  accountId: string;
  caseDate: string;
  procedureType?: string | null;
  note?: string | null;
  markComplete?: boolean;
}): Record<string, unknown> {
  const markComplete = input.caseType === "observation" && Boolean(input.markComplete);
  const status = input.caseType === "product_support" ? "draft" : markComplete ? "completed" : "scheduled";
  return {
    case_type: input.caseType,
    account_id: input.accountId,
    surgeon_contact_id: input.providerId,
    case_date: input.caseDate,
    procedure_type: input.procedureType?.trim() || null,
    notes: input.note?.trim() || null,
    status,
  };
}

export function buildMissionBoardObservationCasePayload(input: {
  providerId: string;
  accountId: string;
  caseDate: string;
  procedureType?: string | null;
  note?: string | null;
  markComplete?: boolean;
}): Record<string, unknown> {
  return buildMissionBoardCasePayload({ ...input, caseType: "observation" });
}

async function postMissionBoardCase(
  body: Record<string, unknown>,
  failureMessage: string,
): Promise<{ caseId: string; caseNumber: string | null }> {
  const res = await fetch("/api/portal/sales/surgical-cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    case?: { id?: string; case_number?: string | null };
  };
  if (!res.ok || !payload?.ok || !payload.case?.id) {
    throw new Error(typeof payload?.error === "string" ? payload.error : failureMessage);
  }
  return {
    caseId: String(payload.case.id),
    caseNumber: payload.case.case_number ?? null,
  };
}

export async function createMissionBoardCase(input: {
  caseType: MissionBoardCaseType;
  providerId: string;
  accountId: string;
  caseDate: string;
  procedureType?: string | null;
  note?: string | null;
  markComplete?: boolean;
}): Promise<{ caseId: string; caseNumber: string | null }> {
  const label = input.caseType === "product_support" ? "product support case" : "observation case";
  return postMissionBoardCase(
    buildMissionBoardCasePayload(input),
    `Could not create ${label}.`,
  );
}

export async function createMissionBoardObservationCase(input: {
  providerId: string;
  accountId: string;
  caseDate: string;
  procedureType?: string | null;
  note?: string | null;
  markComplete?: boolean;
}): Promise<{ caseId: string; caseNumber: string | null }> {
  return createMissionBoardCase({ ...input, caseType: "observation" });
}
