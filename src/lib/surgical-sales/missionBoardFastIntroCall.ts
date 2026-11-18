import {
  buildEngagementCreatePayload,
  type EngagementBasicsDraft,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";

export function buildMissionBoardIntroCallPayload(input: {
  providerId: string;
  organizationId: string;
  providerLabel: string;
  organizationLabel: string;
  engagementDate: string;
  engagementTime: string;
  note?: string;
}): Record<string, unknown> {
  const basics: EngagementBasicsDraft = {
    provider_id: input.providerId,
    organization_id: input.organizationId,
    engagement_type: "intro_call",
    engagement_date: input.engagementDate,
    engagement_time: input.engagementTime,
    opportunity_id: "",
    case_id: "",
    product_line: "",
    source_observation_id: "",
    prep_mode: "",
    intro_call_conversation_focus: "",
  };

  const payload = buildEngagementCreatePayload({
    basics,
    workflowDraft: {},
    providerLabel: input.providerLabel,
    organizationLabel: input.organizationLabel,
    save_mode: "final",
    planningMode: "quick_add",
    postCreateAction: "save",
  });

  const note = input.note?.trim();
  if (note) payload.notes = note;

  return payload;
}

export async function createMissionBoardIntroCall(input: {
  providerId: string;
  organizationId: string;
  providerLabel: string;
  organizationLabel: string;
  engagementDate: string;
  engagementTime: string;
  note?: string;
}): Promise<void> {
  const body = buildMissionBoardIntroCallPayload(input);
  const res = await fetch("/api/portal/sales/engagements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };
  if (!res.ok || !payload?.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Could not create intro call.");
  }
}
