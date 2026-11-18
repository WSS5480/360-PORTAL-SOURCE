import { supabaseAdmin } from "@/lib/supabase/admin";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import { logSurgicalProviderActivity } from "@/lib/surgical-sales/providerActivityLog";
import {
  buildProviderCommitmentView,
  buildProviderOutcomesTrackingView,
  DEFAULT_PROVIDER_COMMITMENT_TYPE,
  hasStructuredCommitmentSaved,
  isProviderCommitmentType,
  isProviderOutcomeUpdateType,
  PROVIDER_COMMITMENT_TYPE_LABELS,
  PROVIDER_OUTCOME_UPDATE_TYPE_LABELS,
  type ProviderCommitmentType,
  type ProviderOutcomeUpdateType,
} from "@/lib/surgical-sales/providerCommitmentOutcomes";
import { PATHWAY_CONTACT_COMMITMENT_CONFIRMED } from "@/lib/surgical-sales/pathway/pathwayContactFlags";
import { resolveStoredEvaluationPath } from "@/lib/surgical-sales/buildProviderEvaluationPathView";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

export const MISSION_BOARD_CONFIRM_PRODUCT_COMMITMENT_LABEL = "Confirm Structured Use";
/** Compact label for Mission Board card buttons (full label stays in title/tooltips). */
export const MISSION_BOARD_CONFIRM_PRODUCT_COMMITMENT_CARD_LABEL = "Confirm structured use";
export const MISSION_BOARD_CONFIRM_STRUCTURED_USE_LABEL = "Confirm Structured Use";
export const MISSION_BOARD_CONFIRM_STRUCTURED_USE_CARD_LABEL = "Confirm structured use";
export const MISSION_BOARD_STRUCTURED_USE_COMMITMENT_DESCRIPTION =
  "Provider agrees to structured product use. This unlocks Outcomes tracking on the pathway.";
export const MISSION_BOARD_MOVE_TO_OUTCOMES_LABEL = "Move to Outcomes";
export const MISSION_BOARD_MARK_EVALUATION_SUCCESSFUL_LABEL = "Mark Evaluation Successful";
export const MISSION_BOARD_MARK_EVALUATION_SUCCESSFUL_CARD_LABEL = "Mark successful";
export const MISSION_BOARD_LOG_OUTCOME_UPDATE_LABEL = "Log Outcome Update";
export const MISSION_BOARD_LOG_PRODUCT_USE_LABEL = "Log Product Use";

export type MissionBoardCommitmentModalView = {
  providerName: string;
  organizationName: string | null;
  evaluationPath: string | null;
  productPath: string | null;
  commitmentType: ProviderCommitmentType | null;
  startDate: string | null;
  notes: string | null;
};

async function requireProviderContact(providerId: string, userId: string) {
  const { data: contact, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();

  if (error) return { ok: false as const, status: 500, message: error.message };
  if (!contact) return { ok: false as const, status: 404, message: "Not found" };
  if (!isProviderRole(String((contact as { role_type?: string }).role_type ?? ""))) {
    return { ok: false as const, status: 400, message: "Not a provider record." };
  }
  if (!(await repCanAccessContact(userId, contact as never))) {
    return { ok: false as const, status: 404, message: "Not found" };
  }
  return { ok: true as const, contact: contact as Record<string, unknown> };
}

async function loadOutcomeActivityCounts(providerId: string): Promise<{
  outcomeUpdates: number;
  productUseLogs: number;
  lastUpdateAt: string | null;
}> {
  const { data } = await supabaseAdmin
    .from("surgical_sales_provider_activities")
    .select("activity_type, created_at")
    .eq("provider_id", providerId)
    .in("activity_type", ["outcome_update", "product_use_log"])
    .order("created_at", { ascending: false })
    .limit(100);

  let outcomeUpdates = 0;
  let productUseLogs = 0;
  let lastUpdateAt: string | null = null;

  for (const row of data ?? []) {
    const type = String((row as { activity_type?: string }).activity_type ?? "");
    if (type === "outcome_update") outcomeUpdates += 1;
    if (type === "product_use_log") productUseLogs += 1;
    if (!lastUpdateAt) {
      lastUpdateAt = String((row as { created_at?: string }).created_at ?? "") || null;
    }
  }

  return { outcomeUpdates, productUseLogs, lastUpdateAt };
}

export async function loadMissionBoardCommitmentModalView(input: {
  providerId: string;
  userId: string;
}): Promise<ServiceResult<MissionBoardCommitmentModalView>> {
  const gate = await requireProviderContact(input.providerId, input.userId);
  if (!gate.ok) return gate;

  const contact = gate.contact;
  const existing = buildProviderCommitmentView(contact);

  return {
    ok: true,
    data: {
      providerName: contactDisplayName(contact as Parameters<typeof contactDisplayName>[0]),
      organizationName: String(contact.primary_organization_name ?? "").trim() || null,
      evaluationPath: resolveStoredEvaluationPath(contact),
      productPath:
        existing?.productPath ||
        String(contact.provider_commitment_product_path ?? "").trim() ||
        resolveStoredEvaluationPath(contact) ||
        null,
      commitmentType: (() => {
        const raw = String(contact.provider_commitment_type ?? "").trim();
        return isProviderCommitmentType(raw) ? raw : null;
      })(),
      startDate:
        existing?.startDate ??
        (String(contact.provider_commitment_start_date ?? "").trim() || null),
      notes:
        existing?.notes ?? (String(contact.provider_commitment_notes ?? "").trim() || null),
    },
  };
}

export async function markMissionBoardEvaluationSuccessful(input: {
  providerId: string;
  userId: string;
}): Promise<ServiceResult<{ alreadyMarked: boolean }>> {
  const gate = await requireProviderContact(input.providerId, input.userId);
  if (!gate.ok) return gate;

  const contact = gate.contact;
  const already = String(contact.provider_evaluation_marked_successful ?? "").trim().toLowerCase();
  if (already === "yes" || already === "true") {
    return { ok: true, data: { alreadyMarked: true } };
  }

  const { error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({
      provider_evaluation_marked_successful: "yes",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.providerId);

  if (error) return { ok: false, status: 500, message: error.message };

  await logSurgicalSalesCrmAudit({
    action: "evaluation_marked_successful",
    actorUserId: input.userId,
    meta: {
      entity_type: "provider",
      entity_id: input.providerId,
    },
  });

  return { ok: true, data: { alreadyMarked: false } };
}

export async function saveMissionBoardCommitment(input: {
  providerId: string;
  userId: string;
  commitmentType?: ProviderCommitmentType;
  productPath?: string | null;
  startDate?: string | null;
  notes?: string | null;
}): Promise<ServiceResult<{ updated: boolean }>> {
  const commitmentType = input.commitmentType ?? DEFAULT_PROVIDER_COMMITMENT_TYPE;
  if (!isProviderCommitmentType(commitmentType)) {
    return { ok: false, status: 400, message: "Invalid commitment type." };
  }

  const gate = await requireProviderContact(input.providerId, input.userId);
  if (!gate.ok) return gate;

  const contact = gate.contact;
  if (hasStructuredCommitmentSaved(contact)) {
    return { ok: true, data: { updated: false } };
  }

  const productPath = resolveStoredEvaluationPath(contact) || null;

  const { error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({
      [PATHWAY_CONTACT_COMMITMENT_CONFIRMED]: "yes",
      provider_commitment_type: commitmentType,
      provider_commitment_product_path: productPath,
      provider_commitment_start_date: null,
      provider_commitment_notes: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.providerId);

  if (error) return { ok: false, status: 500, message: error.message };

  await logSurgicalSalesCrmAudit({
    action: "commitment_confirmed",
    actorUserId: input.userId,
    meta: {
      entity_type: "provider",
      entity_id: input.providerId,
      commitment_type: commitmentType,
      product_path: productPath,
    },
  });

  return { ok: true, data: { updated: true } };
}

export async function activateMissionBoardOutcomesTracking(input: {
  providerId: string;
  userId: string;
}): Promise<ServiceResult<{ alreadyActive: boolean }>> {
  const gate = await requireProviderContact(input.providerId, input.userId);
  if (!gate.ok) return gate;

  const contact = gate.contact;
  const already = String(contact.provider_outcomes_tracking_active ?? "").trim().toLowerCase();
  if (already === "yes" || already === "true") {
    return { ok: true, data: { alreadyActive: true } };
  }

  if (!String(contact.provider_commitment_type ?? "").trim()) {
    return { ok: false, status: 400, message: "Confirm structured commitment before moving to Outcomes." };
  }

  const { error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({
      provider_outcomes_tracking_active: "yes",
      provider_outcomes_tracking_status: "Tracking started",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.providerId);

  if (error) return { ok: false, status: 500, message: error.message };

  await logSurgicalSalesCrmAudit({
    action: "outcomes_tracking_activated",
    actorUserId: input.userId,
    meta: {
      entity_type: "provider",
      entity_id: input.providerId,
    },
  });

  return { ok: true, data: { alreadyActive: false } };
}

export async function logMissionBoardOutcomeUpdate(input: {
  providerId: string;
  userId: string;
  updateType: ProviderOutcomeUpdateType;
  notes: string;
  recordedDate?: string | null;
}): Promise<ServiceResult<{ activityId?: string }>> {
  if (!isProviderOutcomeUpdateType(input.updateType)) {
    return { ok: false, status: 400, message: "Invalid update type." };
  }

  const gate = await requireProviderContact(input.providerId, input.userId);
  if (!gate.ok) return gate;

  const notes = String(input.notes ?? "").trim();
  if (!notes) return { ok: false, status: 400, message: "Notes are required." };

  const recordedDate = String(input.recordedDate ?? "").trim() || new Date().toISOString().slice(0, 10);
  const typeLabel = PROVIDER_OUTCOME_UPDATE_TYPE_LABELS[input.updateType];
  const body = `${typeLabel}: ${notes}`;

  const log = await logSurgicalProviderActivity({
    providerId: input.providerId,
    userId: input.userId,
    activityType: "outcome_update",
    body,
    metadataJson: {
      update_type: input.updateType,
      update_type_label: typeLabel,
      recorded_date: recordedDate,
      source: "mission_board_outcomes",
    },
  });

  if (!log.ok) return { ok: false, status: 500, message: log.message };

  const counts = await loadOutcomeActivityCounts(input.providerId);
  const statusLabel = `${counts.outcomeUpdates + counts.productUseLogs} log${
    counts.outcomeUpdates + counts.productUseLogs === 1 ? "" : "s"
  } on file`;

  await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({
      provider_outcomes_tracking_status: statusLabel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.providerId);

  return { ok: true, data: { activityId: log.activityId } };
}

export async function logMissionBoardProductUse(input: {
  providerId: string;
  userId: string;
  recordedDate?: string | null;
  productPath?: string | null;
  caseProcedure?: string | null;
  quantity?: string | null;
  notes?: string | null;
}): Promise<ServiceResult<{ activityId?: string }>> {
  const gate = await requireProviderContact(input.providerId, input.userId);
  if (!gate.ok) return gate;

  const recordedDate = String(input.recordedDate ?? "").trim() || new Date().toISOString().slice(0, 10);
  const productPath = String(input.productPath ?? "").trim() || resolveStoredEvaluationPath(gate.contact) || null;
  const caseProcedure = String(input.caseProcedure ?? "").trim() || null;
  const quantity = String(input.quantity ?? "").trim() || null;
  const notes = String(input.notes ?? "").trim() || null;

  const parts = ["Product use logged"];
  if (productPath) parts.push(productPath);
  if (caseProcedure) parts.push(caseProcedure);
  if (quantity) parts.push(`Qty ${quantity}`);
  const body = parts.join(" · ");

  const log = await logSurgicalProviderActivity({
    providerId: input.providerId,
    userId: input.userId,
    activityType: "product_use_log",
    body: notes ? `${body} — ${notes}` : body,
    metadataJson: {
      recorded_date: recordedDate,
      product_path: productPath,
      case_procedure: caseProcedure,
      quantity,
      notes,
      source: "mission_board_outcomes",
    },
  });

  if (!log.ok) return { ok: false, status: 500, message: log.message };

  const counts = await loadOutcomeActivityCounts(input.providerId);
  const statusLabel = `${counts.outcomeUpdates + counts.productUseLogs} log${
    counts.outcomeUpdates + counts.productUseLogs === 1 ? "" : "s"
  } on file`;

  await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({
      provider_outcomes_tracking_status: statusLabel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.providerId);

  return { ok: true, data: { activityId: log.activityId } };
}

export async function loadMissionBoardOutcomesSummary(input: {
  providerId: string;
  userId: string;
}): Promise<
  ServiceResult<{
    outcomes: ReturnType<typeof buildProviderOutcomesTrackingView>;
    activityCounts: Awaited<ReturnType<typeof loadOutcomeActivityCounts>>;
  }>
> {
  const gate = await requireProviderContact(input.providerId, input.userId);
  if (!gate.ok) return gate;

  const activityCounts = await loadOutcomeActivityCounts(input.providerId);
  const outcomes = buildProviderOutcomesTrackingView(gate.contact, activityCounts);

  return { ok: true, data: { outcomes, activityCounts } };
}
