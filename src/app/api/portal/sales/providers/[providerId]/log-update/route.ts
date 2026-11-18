import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import {
  applyLogUpdateToProvider,
  loadProviderIntelligenceFieldValues,
} from "@/lib/surgical-sales/logUpdateApplyProvider";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { discoveryIntelligenceDebug } from "@/lib/surgical-sales/discoveryIntelligenceDebug";
import { engagementAllowsOutcomeIntelligenceApply } from "@/lib/surgical-sales/engagements/engagementOutcomeIntelligence";
import { syncEngagementDebriefFollowUpTasks } from "@/lib/surgical-sales/engagements/syncEngagementDebriefFollowUpTasks";
import {
  ensureProviderFieldNoteFollowUpEngagement,
  resolveProviderFieldNoteFollowUpEngagementId,
} from "@/lib/surgical-sales/engagements/resolveProviderFieldNoteFollowUpEngagement";
import { extractFollowUpTaskLinesFromDebriefReview } from "@/lib/surgical-sales/engagements/engagementDebriefVisitRecord";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PostSchema = z
  .object({
    sourceText: z.string().min(1).max(16000),
    saveAsNote: z.boolean(),
    fieldPatches: z
      .array(
        z.object({
          dbKey: z.string().min(1).max(80),
          value: z.string().min(1).max(8000),
          mergeStrategy: z.enum(["replace", "append"]),
        }),
      )
      .max(24),
    captureContext: z
      .object({
        source_type: z.enum([
          "profile",
          "intro_call",
          "observation",
          "case",
          "engagement",
          "ai_capture",
          "promote",
        ]),
        source_label: z.string().max(200).optional(),
        source_engagement_id: z.string().uuid().optional(),
        source_case_id: z.string().uuid().optional(),
        declared_source_type: z
          .enum(["field_note", "observation_case", "debrief", "evaluation", "outcome"])
          .optional(),
      })
      .optional(),
    fieldEvidence: z.record(z.string(), z.string().max(2000)).optional(),
    engagementDebriefSync: z
      .object({
        engagement_id: z.string().uuid().optional(),
        follow_up_tasks: z.array(z.string().min(4).max(400)).max(12).optional(),
        log_update: z.record(z.string(), z.unknown()).optional(),
        proposed_contacts: z.array(z.record(z.string(), z.unknown())).max(24).optional(),
      })
      .optional(),
  })
  .strict();

async function requireRep() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid };
}

async function loadProvider(providerId: string) {
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("id, role_type")
    .eq("id", providerId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: string; role_type?: string };
}

export async function GET(_req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const row = await loadProvider(providerId);
  if (!row || !isProviderRole(String(row.role_type || ""))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  const full = await supabaseAdmin.from("surgical_sales_contacts").select("*").eq("id", providerId).maybeSingle();
  if (!full.data || !(await repCanAccessContact(gate.uid, full.data as never))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const fields = await loadProviderIntelligenceFieldValues(providerId);
  return NextResponse.json({ ok: true, fields });
}

export async function POST(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const row = await loadProvider(providerId);
  if (!row || !isProviderRole(String(row.role_type || ""))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  const full = await supabaseAdmin.from("surgical_sales_contacts").select("*").eq("id", providerId).maybeSingle();
  if (!full.data || !(await repCanAccessContact(gate.uid, full.data as never))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("full_name, email")
    .eq("user_id", gate.uid)
    .maybeSingle();
  const actorName =
    String((profile as { full_name?: string | null } | null)?.full_name ?? "").trim() ||
    String((profile as { email?: string | null } | null)?.email ?? "").trim() ||
    "Rep";

  discoveryIntelligenceDebug("api:log-update", {
    providerId,
    fieldPatches: parsed.data.fieldPatches.map((f) => f.dbKey),
    fieldEvidenceKeys: Object.keys(parsed.data.fieldEvidence ?? {}),
  });

  const captureContext = parsed.data.captureContext;
  const engagementId = captureContext?.source_engagement_id;
  if (captureContext?.source_type === "engagement" && engagementId) {
    const { data: engagementRow, error: engagementErr } = await supabaseAdmin
      .from("surgical_sales_engagements")
      .select("id, notes, debrief_completed, debrief_completed_at")
      .eq("id", engagementId)
      .maybeSingle();
    if (engagementErr || !engagementRow) {
      return NextResponse.json({ ok: false, error: "Engagement not found" }, { status: 404 });
    }
    if (!engagementAllowsOutcomeIntelligenceApply(engagementRow as Record<string, unknown>)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Log outcome notes before applying intelligence from this engagement.",
        },
        { status: 409 },
      );
    }
  }

  const result = await applyLogUpdateToProvider({
    providerId,
    actorUserId: gate.uid,
    actorName,
    sourceText: parsed.data.sourceText,
    saveAsNote: parsed.data.saveAsNote,
    fieldPatches: parsed.data.fieldPatches,
    captureContext: parsed.data.captureContext,
    fieldEvidence: parsed.data.fieldEvidence,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
  }

  const debriefSync = parsed.data.engagementDebriefSync;
  let followUpEngagementId: string | null = null;
  if (debriefSync && (debriefSync.log_update || (debriefSync.follow_up_tasks?.length ?? 0) > 0)) {
    const providerContact = full.data as Record<string, unknown>;
    const providerLabel = contactDisplayName(providerContact as Parameters<typeof contactDisplayName>[0]);
    const logUpdate = (debriefSync.log_update as LogUpdateParseResult | undefined) ?? null;
    const proposedContacts = (debriefSync.proposed_contacts ?? []) as DebriefProposedContactItem[];
    const followUpTasks =
      debriefSync.follow_up_tasks ??
      (logUpdate?.usesProviderIntelligence
        ? extractFollowUpTaskLinesFromDebriefReview({
            dictation: parsed.data.sourceText,
            logUpdate,
            proposedContacts,
            providerContact,
            providerLabel,
          })
        : []);

    if (followUpTasks.length > 0) {
      followUpEngagementId =
        debriefSync.engagement_id ??
        (await resolveProviderFieldNoteFollowUpEngagementId(supabaseAdmin, {
          providerId,
          actorUserId: gate.uid,
          preferredEngagementId: captureContext?.source_engagement_id,
        })) ??
        (await ensureProviderFieldNoteFollowUpEngagement(supabaseAdmin, {
          providerId,
          actorUserId: gate.uid,
          organizationId: String(providerContact.organization_id ?? "").trim() || null,
        }));
    }

    if (followUpEngagementId && followUpTasks.length > 0) {
      const syncResult = await syncEngagementDebriefFollowUpTasks({
        engagementId: followUpEngagementId,
        actorUserId: gate.uid,
        narrative: parsed.data.sourceText,
        logUpdate,
        providerContact,
        providerLabel,
        proposedContacts,
        followUpTasks: followUpTasks.length > 0 ? followUpTasks : undefined,
      });
      if (!syncResult.ok) {
        discoveryIntelligenceDebug("api:log-update:follow-up-sync-failed", {
          providerId,
          followUpEngagementId,
          message: syncResult.message,
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    saved: result.saved,
    ...(followUpEngagementId ? { followUpEngagementId } : {}),
  });
}
