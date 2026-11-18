import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { loadOpportunityForViewer } from "@/lib/sales/opportunityAccess";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { createOperationalNote, operationalNoteContextFromCaseRow } from "@/lib/notes/createOperationalNote";
import type { OperationalNoteType } from "@/lib/notes/operationalNote";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import { logSurgicalProviderActivity } from "@/lib/surgical-sales/providerActivityLog";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import { detectSurgicalPhiPatternKinds } from "@/lib/surgical-sales/phiContentHeuristics";
import { recordSurgicalPhiPatternEvent } from "@/lib/surgical-sales/phiWarningLogger";
import { applyProviderPlanningWorkflowField, isProviderPlanningWorkflowItem } from "./applyWorkflowField";
import { AI_NOTE_CAPTURE_ACTIVITY_TYPE } from "./labels";
import type { AiNoteCaptureClassification, AiNoteCaptureCommitItem, AiNoteCaptureContext } from "./types";

function stampLine(body: string): string {
  return `[${new Date().toLocaleString()}] ${body.trim()}`;
}

function prefixForClassification(c: AiNoteCaptureClassification): string {
  switch (c) {
    case "product_usage":
      return "[Product usage]";
    case "resource_or_document_note":
      return "[Resource]";
    case "opportunity_signal":
      return "[Signal]";
    case "organization_intelligence":
      return "[Org intel]";
    case "provider_intelligence":
      return "[Provider intel]";
    case "competitive_intelligence":
      return "[Competitive]";
    case "case_observation":
      return "[Case observation]";
    case "follow_up_task":
      return "[Follow-up]";
    case "workflow_field_suggestion":
      return "[Planning field]";
    default:
      return "";
  }
}

function formattedBody(classification: AiNoteCaptureClassification, body: string): string {
  const p = prefixForClassification(classification);
  return p ? `${p} ${body.trim()}` : body.trim();
}

async function appendContactAccessNotes(contactId: string, line: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("access_notes")
    .eq("id", contactId)
    .maybeSingle();
  if (error || !data) return { ok: false, message: error?.message || "Contact not found" };
  const prev = String((data as { access_notes?: string | null }).access_notes || "").trim();
  const next = prev ? `${prev}\n${line}` : line;
  const { error: upErr } = await supabaseAdmin.from("surgical_sales_contacts").update({ access_notes: next }).eq("id", contactId);
  if (upErr) return { ok: false, message: upErr.message };
  return { ok: true };
}

async function appendOrgNotes(accountId: string, line: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("surgical_crm_notes").eq("id", accountId).maybeSingle();
  if (error || !data) return { ok: false, message: error?.message || "Organization not found" };
  const prev = String((data as { surgical_crm_notes?: string | null }).surgical_crm_notes || "").trim();
  const next = prev ? `${prev}\n\n${line}` : line;
  const { error: upErr } = await supabaseAdmin
    .from(SALES_ORGANIZATIONS_TABLE)
    .update({ surgical_crm_notes: next, surgical_crm_updated_at: new Date().toISOString() })
    .eq("id", accountId);
  if (upErr) return { ok: false, message: upErr.message };
  return { ok: true };
}

export async function commitAiNoteCaptureItems(params: {
  actorUserId: string;
  context: AiNoteCaptureContext;
  items: AiNoteCaptureCommitItem[];
  inputMode?: string | null;
  sourceExcerpt?: string;
}): Promise<{ ok: true; saved: number } | { ok: false; message: string }> {
  const { actorUserId, context, items } = params;
  let saved = 0;
  const activityBodies: string[] = [];

  for (const item of items) {
    if (item.destination === "unclassified" || item.category === "unclassified") {
      return { ok: false, message: "Unclassified items must be re-assigned before saving." };
    }

    const body = formattedBody(item.category, item.body);
    const line = stampLine(body);
    activityBodies.push(`${item.category}: ${body.slice(0, 120)}`);

    const kinds = detectSurgicalPhiPatternKinds(body);
    if (kinds.length) {
      void recordSurgicalPhiPatternEvent({
        actorUserId,
        caseId: item.destination === "case" ? item.targetId : context.caseId ?? null,
        surface: "ai_note_capture",
        kinds,
      });
    }

    if (item.destination === "case" || item.category === "case_observation" || item.category === "resource_or_document_note") {
      const caseId = item.destination === "case" ? item.targetId : context.caseId;
      if (!caseId) return { ok: false, message: "Case target required for this observation." };
      const row = await loadSurgicalCaseForPortalActor(caseId, actorUserId, { includeArchived: true });
      if (!row) return { ok: false, message: "Case not found." };
      if ((row as { archived_at?: string | null }).archived_at) {
        return { ok: false, message: "Restore the case before saving notes." };
      }
      const noteType: OperationalNoteType =
        item.category === "case_observation"
          ? "case_observation"
          : item.category === "product_usage"
            ? "product_usage"
            : "general";
      const noteCtx = operationalNoteContextFromCaseRow(caseId, row);
      const created = await createOperationalNote({
        body,
        userId: actorUserId,
        entityType: "case",
        entityId: caseId,
        note_type: noteType,
        source: "ai",
        tags: ["capture_intelligence", "ai"],
        provider_id: noteCtx.providerId,
        organization_id: noteCtx.organizationId,
        opportunity_id: noteCtx.opportunityId,
        case_id: caseId,
      });
      if (!created.ok) return { ok: false, message: created.message };
      saved += 1;
      continue;
    }

    if (isProviderPlanningWorkflowItem(item)) {
      const providerId = item.targetId || context.providerId;
      if (!providerId) return { ok: false, message: "Provider target required for workflow field." };
      const applied = await applyProviderPlanningWorkflowField({
        providerId,
        actorUserId,
        item,
      });
      if (!applied.ok) return { ok: false, message: applied.message };
      saved += 1;
      continue;
    }

    if (item.destination === "provider" || item.category === "provider_intelligence" || item.category === "competitive_intelligence") {
      const providerId = item.targetId || context.providerId;
      if (!providerId) return { ok: false, message: "Provider target required." };
      const appended = await appendContactAccessNotes(providerId, line);
      if (!appended.ok) return { ok: false, message: appended.message };
      const log = await logSurgicalProviderActivity({
        providerId,
        userId: actorUserId,
        activityType: AI_NOTE_CAPTURE_ACTIVITY_TYPE,
        body: `AI note capture — ${item.category.replace(/_/g, " ")}: ${body.slice(0, 200)}`,
        metadataJson: { classification: item.category, ai_note_capture: true, destination: item.destination },
      });
      if (!log.ok) return { ok: false, message: log.message };
      saved += 1;
      continue;
    }

    if (item.destination === "organization" || item.category === "organization_intelligence") {
      const orgId = item.targetId || context.organizationId;
      if (!orgId) return { ok: false, message: "Organization target required." };
      const gate = await repCanViewSurgicalAccount(actorUserId, orgId);
      if (!gate) return { ok: false, message: "Organization not found." };
      const appended = await appendOrgNotes(orgId, line);
      if (!appended.ok) return { ok: false, message: appended.message };
      saved += 1;
      continue;
    }

    if (item.destination === "opportunity" || item.category === "opportunity_signal") {
      const oppId = item.targetId || context.opportunityId;
      if (!oppId) return { ok: false, message: "Opportunity target required." };
      const opp = await loadOpportunityForViewer(oppId, actorUserId);
      if (!opp) return { ok: false, message: "Opportunity not found." };
      const { error } = await supabaseAdmin.from("sales_activities").insert({
        opportunity_id: oppId,
        owner_user_id: actorUserId,
        activity_type: "note",
        summary: body,
        activity_at: new Date().toISOString(),
      });
      if (error) return { ok: false, message: error.message };
      saved += 1;
      continue;
    }

    if (item.destination === "product" || item.category === "product_usage") {
      const caseId = context.caseId || (item.targetId && item.destination === "product" ? item.targetId : null);
      if (caseId) {
        const row = await loadSurgicalCaseForPortalActor(caseId, actorUserId, { includeArchived: true });
        if (!row) return { ok: false, message: "Case not found for product usage." };
        const noteCtx = operationalNoteContextFromCaseRow(caseId, row);
        const created = await createOperationalNote({
          body,
          userId: actorUserId,
          entityType: "case",
          entityId: caseId,
          note_type: "product_usage",
          source: "ai",
          tags: ["capture_intelligence", "product_usage", "ai"],
          provider_id: noteCtx.providerId,
          organization_id: noteCtx.organizationId,
          opportunity_id: noteCtx.opportunityId,
          case_id: caseId,
        });
        if (!created.ok) return { ok: false, message: created.message };
        saved += 1;
        continue;
      }
      const providerId = context.providerId || item.targetId;
      if (providerId) {
        const appended = await appendContactAccessNotes(providerId, line);
        if (!appended.ok) return { ok: false, message: appended.message };
        await logSurgicalProviderActivity({
          providerId,
          userId: actorUserId,
          activityType: AI_NOTE_CAPTURE_ACTIVITY_TYPE,
          body: `AI note capture — product usage: ${body.slice(0, 200)}`,
          metadataJson: { classification: "product_usage", ai_note_capture: true },
        });
        saved += 1;
        continue;
      }
      return { ok: false, message: "Case or provider target required for product usage." };
    }

    if (item.destination === "task" || item.category === "follow_up_task") {
      const oppId = item.targetId || context.opportunityId;
      if (!oppId) return { ok: false, message: "Link an opportunity to create follow-up tasks." };
      const opp = await loadOpportunityForViewer(oppId, actorUserId);
      if (!opp) return { ok: false, message: "Opportunity not found." };
      const due = new Date();
      due.setDate(due.getDate() + 7);
      const title = body.length > 120 ? `${body.slice(0, 117)}…` : body;
      const { error } = await supabaseAdmin.from("sales_tasks").insert({
        opportunity_id: oppId,
        owner_user_id: actorUserId,
        title,
        due_date: due.toISOString().slice(0, 10),
        notes: body,
        updated_at: new Date().toISOString(),
      });
      if (error) return { ok: false, message: error.message };
      saved += 1;
      continue;
    }

    return { ok: false, message: `Unsupported destination: ${item.destination}` };
  }

  if (context.caseId && saved > 0) {
    await logSurgicalCaseActivity({
      caseId: context.caseId,
      userId: actorUserId,
      activityType: AI_NOTE_CAPTURE_ACTIVITY_TYPE,
      body: `AI-assisted note capture saved ${saved} item${saved === 1 ? "" : "s"}.`,
      metadataJson: { ai_note_capture: true, input_mode: params.inputMode, saved_count: saved, audit_only: true },
    });
  }
  if (context.providerId && saved > 0) {
    await logSurgicalProviderActivity({
      providerId: context.providerId,
      userId: actorUserId,
      activityType: AI_NOTE_CAPTURE_ACTIVITY_TYPE,
      body: `AI-assisted note capture saved ${saved} item${saved === 1 ? "" : "s"}.`,
      metadataJson: { ai_note_capture: true, input_mode: params.inputMode, saved_count: saved, audit_only: true },
    });
  }

  return { ok: true, saved };
}
