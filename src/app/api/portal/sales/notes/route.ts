import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadOpportunityForViewer } from "@/lib/sales/opportunityAccess";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import {
  CreateOperationalNoteClientSchema,
  createOperationalNote,
  mergeNoteInputWithContext,
  operationalNoteContextFromCaseRow,
  OPERATIONAL_NOTE_ENTITY_TYPES,
  type OperationalNoteContextDefaults,
  type OperationalNoteEntityType,
} from "@/lib/notes";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PostBodySchema = CreateOperationalNoteClientSchema.extend({
  entity_type: z.enum(OPERATIONAL_NOTE_ENTITY_TYPES),
  entity_id: z.string().uuid(),
}).strict();

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }
  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const entityType = parsed.data.entity_type as OperationalNoteEntityType;
  const entityId = parsed.data.entity_id;

  const context = await resolveNoteContext(entityType, entityId, uid, parsed.data.workflow_stage ?? null);
  if (!context) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const { entity_type: _et, entity_id: _ei, ...clientFields } = parsed.data;
  const merged = mergeNoteInputWithContext(clientFields, context);
  const created = await createOperationalNote({ ...merged, userId: uid });

  if (!created.ok) {
    return NextResponse.json({ ok: false, error: created.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, note: created.note });
}

async function resolveNoteContext(
  entityType: OperationalNoteEntityType,
  entityId: string,
  userId: string,
  workflowStage: string | null,
): Promise<OperationalNoteContextDefaults | null> {
  if (!UUID_RE.test(entityId)) return null;

  if (entityType === "case") {
    const row = await loadSurgicalCaseForPortalActor(entityId, userId, { includeArchived: true });
    if (!row) return null;
    return operationalNoteContextFromCaseRow(entityId, row, workflowStage);
  }

  if (entityType === "provider") {
    const { data: provider } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("*")
      .eq("id", entityId)
      .maybeSingle();
    if (!provider) return null;
    if (!isProviderRole(String((provider as { role_type?: string }).role_type || ""))) return null;
    if (!(await repCanAccessContact(userId, provider as never))) return null;
    return {
      entityType: "provider",
      entityId,
      noteType: "provider_intelligence",
      providerId: entityId,
      organizationId: String((provider as { organization_id?: string }).organization_id ?? "").trim() || null,
      workflowStage,
    };
  }

  if (entityType === "opportunity") {
    const opp = await loadOpportunityForViewer(entityId, userId);
    if (!opp) return null;
    return {
      entityType: "opportunity",
      entityId,
      noteType: "opportunity_signal",
      opportunityId: entityId,
      workflowStage,
    };
  }

  if (entityType === "organization") {
    const gate = await repCanViewSurgicalAccount(userId, entityId);
    if (!gate) return null;
    return {
      entityType: "organization",
      entityId,
      noteType: "organization_intelligence",
      organizationId: entityId,
      workflowStage,
    };
  }

  return null;
}
