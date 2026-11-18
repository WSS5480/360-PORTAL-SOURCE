import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { salesStageLabel } from "@/lib/sales/stages";
import { ACTIVITY_TYPE_LABEL, type ActivityType } from "@/lib/sales/activityTypes";
import { buildProviderLongitudinalIntelligence } from "@/lib/surgical-sales/buildProviderLongitudinalIntelligence";
import { contactDisplayName, formatSurgicalCaseNumber, PROVIDER_CRM_STATUSES } from "@/lib/surgical-sales/labels";
import { PROVIDER_RELATIONSHIP_STAGES } from "@/lib/surgical-sales/providerRelationshipStage";
import {
  mergeContactSalesIntelligenceIntoPatch,
  repCanAccessContact,
  SURGICAL_CONTACT_RELATIONSHIP_TYPES,
  type ContactSalesIntelligenceInput,
} from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import { isMissingHiddenFromProviderDirectoryColumn } from "@/lib/surgical-sales/providerRemoveScope";
import {
  contactMatchesPhysicianName,
  pickPrimaryOrgLink,
  pickSpecialty,
} from "@/lib/surgical-sales/providerDirectory";
import { engagementStrategyKeysInProviderPlanningPatch } from "@/lib/surgical-sales/intelligenceLayerArchitecture";
import { buildSchedulingSupportContactCommercialIntelligencePatch } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import {
  intelligenceMetadataFromContact,
  mergeProviderWizardFieldsPatch,
} from "@/lib/surgical-sales/providerCreateWizard";
import {
  mergeIntelligenceDiscoveryStances,
  mergeOrganizationInheritanceResolutions,
  type OrganizationInheritanceResolutionInput,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { isOrganizationInheritanceDbKey } from "@/lib/surgical-sales/organizationIntelligenceInheritance";
import {
  markIntelligenceFieldsValidated,
  type IntelligenceCaptureContext,
  type IntelligenceCaptureSourceType,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  listClinicalDiscoveryAnswersForProvider,
  touchProviderPlanningUpdatedAt,
  upsertClinicalDiscoveryAnswers,
} from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import { logClinicalDiscoveryAnswerActivities } from "@/lib/surgical-sales/clinicalDiscoveryActivityLog";
import { formatProviderActivityType } from "@/lib/surgical-sales/providerActivityLabels";
import { PROVIDER_ACTIVITY_CATEGORY_DISCOVERY } from "@/lib/surgical-sales/providerActivityLog";
import {
  buildProviderPlanningCompletion,
  buildProviderPlanningSections,
  type ProviderPlanningSectionId,
} from "@/lib/surgical-sales/providerPlanningCompletion";
import { voidRecordActivityEventDual } from "@/lib/activity/dualWrite";
import { formatSurgicalCaseActivityType } from "@/lib/surgical-sales/caseActivityLabels";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { loadProviderEngagementsForProfile } from "@/lib/surgical-sales/engagements/loadProviderEngagements";
import { loadLatestProviderDebriefNarrativeForProfile } from "@/lib/surgical-sales/engagements/loadLatestProviderDebriefNarrative";
import { loadUniversalFactsReadModelForProvider } from "@/lib/surgical-sales/universalExtractor/loadUniversalFactsReadModel";
import { reconcileObservationAccessPlanningPatch } from "@/lib/surgical-sales/observationAccessWorkflowState";
import { loadOrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { assessProviderHardDeleteFromCounts } from "@/lib/surgical-sales/providerLifecyclePolicy";
import { buildProviderIntelligenceKnowledgeDashboardView } from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import { generateProviderAiSalesBriefingFromView } from "@/lib/surgical-sales/generateProviderAiSalesBriefing";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PatchSchema = z
  .object({
    crm_status: z.enum(PROVIDER_CRM_STATUSES).optional(),
    relationship_stage: z.enum(PROVIDER_RELATIONSHIP_STAGES).optional(),
    planning: z.record(z.string(), z.union([z.string(), z.null()])).optional(),
    planning_capture_context: z
      .object({
        source_type: z
          .enum(["profile", "intro_call", "observation", "case", "engagement", "ai_capture", "promote"])
          .optional(),
        source_label: z.string().max(120).optional(),
        source_engagement_id: z.string().uuid().optional(),
        source_case_id: z.string().uuid().optional(),
        source_case_number: z.string().max(40).optional(),
      })
      .optional(),
    intelligence_discovery_stances: z
      .record(
        z.string(),
        z.object({
          stance: z.enum([
            "skipped",
            "unknown",
            "needs_validation",
            "ask_next_touch",
            "not_relevant",
          ]),
          uncertainty_kind: z.enum(["unexplored", "opaque"]).optional(),
        }),
      )
      .optional(),
    organization_inheritance_resolutions: z
      .record(
        z.string(),
        z.object({
          stance: z.enum(["applies", "does_not_apply", "exception"]),
          provider_value: z.union([z.string(), z.null()]).optional(),
          facility_display_line: z.string().max(500).optional(),
          facility_value: z.string().max(2000).optional(),
          linked_contact_id: z.string().uuid().optional(),
          workflow_role: z.string().max(120).optional(),
          relationship_type: z.enum(SURGICAL_CONTACT_RELATIONSHIP_TYPES).optional(),
        }),
      )
      .optional(),
    intelligence: z
      .object({
        preferred_contact_method: z.string().optional(),
        best_time_to_contact: z.union([z.string(), z.null()]).optional(),
        access_notes: z.union([z.string(), z.null()]).optional(),
        personality_notes: z.union([z.string(), z.null()]).optional(),
        do_not_contact: z.boolean().optional(),
        last_contacted_at: z.union([z.string(), z.null()]).optional(),
        next_follow_up_at: z.union([z.string(), z.null()]).optional(),
      })
      .optional(),
    intelligence_validate_fields: z.array(z.string().max(80)).max(32).optional(),
    intelligence_field_evidence: z.record(z.string(), z.string().max(2000)).optional(),
    intelligence_field_access_blockers: z
      .record(z.string(), z.union([z.string().max(80), z.null()]))
      .optional(),
    archive: z.boolean().optional(),
  })
  .strict();

async function loadProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(userIds.filter(Boolean))];
  if (!uniq.length) return new Map();
  const { data } = await supabaseAdmin.from("user_profiles").select("user_id, full_name, email").in("user_id", uniq);
  const map = new Map<string, string>();
  for (const row of data || []) {
    const id = String((row as { user_id: string }).user_id);
    const name = String((row as { full_name?: string | null }).full_name || "").trim();
    const email = String((row as { email?: string | null }).email || "").trim();
    map.set(id, name || email || id);
  }
  return map;
}

async function requireRep() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid };
}

function accountIdsForContact(contact: Record<string, unknown>, links: Array<Record<string, unknown>>): Set<string> {
  const ids = new Set<string>();
  const primary = pickPrimaryOrgLink(links as never);
  const pid = String(
    primary?.account_id || (primary?.accounts as { id?: string } | null)?.id || contact.organization_id || contact.account_id || "",
  );
  if (pid) ids.add(pid);
  for (const l of links) {
    const aid = String(l.account_id || (l.accounts as { id?: string } | null)?.id || "");
    if (aid) ids.add(aid);
  }
  return ids;
}

async function ensureProviderSupportContactRelationship(input: {
  providerId: string;
  supportContactId: string;
  relationshipType?: string | null;
  workflowRole?: string | null;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const providerId = input.providerId.trim();
  const supportContactId = input.supportContactId.trim();
  if (!providerId || !supportContactId) return { ok: true };
  if (providerId === supportContactId) return { ok: false, error: "A provider cannot be linked to itself." };

  const { data: supportContact } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", supportContactId)
    .maybeSingle();
  if (!supportContact || !(await repCanAccessContact(input.userId, supportContact as never))) {
    return { ok: false, error: "Support contact not found." };
  }

  const relationshipType = input.relationshipType?.trim() || "scheduler";
  const workflowRole = input.workflowRole?.trim() || "observation_scheduling_owner";
  const notes = "Applied from suggested facility support contact.";
  const nowIso = new Date().toISOString();

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("surgical_sales_contact_relationships")
    .select("id, ownership_type, workflow_role, relationship_type, notes")
    .eq("primary_contact_id", providerId)
    .eq("related_contact_id", supportContactId)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (existingError) return { ok: false, error: existingError.message };

  const existing = existingRows?.[0];
  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("surgical_sales_contact_relationships")
      .update({
        relationship_type: String(existing.relationship_type || relationshipType),
        ownership_type: String(existing.ownership_type || "shared"),
        workflow_role: String(existing.workflow_role || workflowRole),
        notes: String(existing.notes || notes),
        updated_at: nowIso,
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };

    const duplicateIds = (existingRows ?? [])
      .slice(1)
      .map((row) => String(row.id ?? "").trim())
      .filter(Boolean);
    if (duplicateIds.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("surgical_sales_contact_relationships")
        .delete()
        .in("id", duplicateIds);
      if (deleteError) return { ok: false, error: deleteError.message };
    }
    return { ok: true };
  }

  const { error } = await supabaseAdmin.from("surgical_sales_contact_relationships").insert({
    primary_contact_id: providerId,
    related_contact_id: supportContactId,
    relationship_type: relationshipType,
    ownership_type: "shared",
    workflow_role: workflowRole,
    notes,
    created_by: input.userId,
    created_at: nowIso,
    updated_at: nowIso,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

function parseDeferSections(req: Request): Set<string> {
  const raw = new URL(req.url).searchParams.get("defer") || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function GET(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const defer = parseDeferSections(req);
  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const { data: contact, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*, organization:sales_organizations!organization_id(id,name,surgical_crm_billing_state), account:sales_organizations!account_id(id,name,surgical_crm_billing_state)")
    .eq("id", providerId)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!contact) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!isProviderRole(String((contact as { role_type?: string }).role_type || ""))) {
    return NextResponse.json({ ok: false, error: "Not a provider record." }, { status: 400 });
  }
  if (!(await repCanAccessContact(gate.uid, contact as never))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const { data: orgLinks } = await supabaseAdmin
    .from("surgical_sales_contact_organizations")
    .select("id, account_id, role_type, specialty, is_primary_org, is_active, preferred_hospital, relationship_notes, influence_level, accounts:sales_organizations!account_id(id,name,surgical_crm_billing_state)")
    .eq("contact_id", providerId)
    .order("is_primary_org", { ascending: false })
    .limit(100);

  const links = (orgLinks || []) as Array<Record<string, unknown>>;
  const primaryLink = pickPrimaryOrgLink(links as never);
  const primaryAcct = primaryLink?.accounts as { id?: string; name?: string | null; surgical_crm_billing_state?: string | null } | null;
  const specialty = pickSpecialty(links as never, (contact as { title?: string }).title);
  const accountIds = accountIdsForContact(contact as Record<string, unknown>, links);

  const { data: rels } = await supabaseAdmin
    .from("surgical_sales_contact_relationships")
    .select("*")
    .eq("primary_contact_id", providerId)
    .order("updated_at", { ascending: false })
    .limit(500);

  const relationships = (rels || []) as Array<Record<string, unknown>>;
  const relatedIds = [...new Set(relationships.map((r) => String(r.related_contact_id || "")).filter(Boolean))];
  let relatedContacts: Record<string, unknown>[] = [];
  if (relatedIds.length > 0) {
    const { data: rc } = await supabaseAdmin.from("surgical_sales_contacts").select("*").in("id", relatedIds);
    relatedContacts = (rc || []) as Record<string, unknown>[];
  }

  const { data: caseRows } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select(
      "id, case_number, case_date, case_time, status, case_type, procedure_type, account_id, product_id, related_opportunity_id, engagement_id, observation_goal, notes, observation_access_scheduling_owner, observation_access_pathway, observation_access_credentialing, observation_quick_finding_product_interest, debrief_key_findings, live_observation_clinical_pain_points, live_observation_product_fit, live_observation_competitors, live_observation_workflow, live_observation_staff_process, live_observation_surgeon_reactions, observation_workflow_intelligence_snapshot, case_support_outcome, observation_completed_at, updated_at, created_at",
    )
    .eq("surgeon_contact_id", providerId)
    .order("case_date", { ascending: false, nullsFirst: false })
    .limit(200);

  const productIds = [
    ...new Set(
      ((caseRows || []) as Array<Record<string, unknown>>)
        .map((row) => String(row.product_id ?? "").trim())
        .filter(Boolean),
    ),
  ];
  const productNameById = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: products } = await supabaseAdmin
      .from("surgical_sales_products")
      .select("id, name")
      .in("id", productIds);
    for (const product of products || []) {
      productNameById.set(String((product as { id: string }).id), String((product as { name?: string | null }).name ?? ""));
    }
  }

  const accountNameById = new Map<string, string>();
  for (const l of links as Array<Record<string, unknown>>) {
    const aid = String(l.account_id || "").trim();
    const acct = l.accounts as { id?: string; name?: string | null } | null;
    const name = String(acct?.name || "").trim();
    if (aid && name) accountNameById.set(aid, name);
  }
  if (primaryAcct?.id && primaryAcct?.name) {
    accountNameById.set(String(primaryAcct.id), String(primaryAcct.name).trim());
  }

  const { data: oppsRaw } = await supabaseAdmin
    .from("sales_opportunities")
    .select(
      "id, account_id, account_name, physician_name, stage, product_line, next_action, value_cents, close_date, updated_at, created_at",
    )
    .order("updated_at", { ascending: false })
    .limit(500);

  const opportunities = ((oppsRaw || []) as Array<Record<string, unknown>>).filter((o) => {
    const aid = String(o.account_id || "");
    const nameMatch = contactMatchesPhysicianName(contact as never, String(o.physician_name || ""));
    return nameMatch || (aid && accountIds.has(aid));
  });

  const oppLabelById = new Map<string, string>();
  for (const o of opportunities) {
    const id = String(o.id || "");
    const label = String(o.product_line || o.account_name || "Evaluation").trim();
    if (id && label) oppLabelById.set(id, label);
  }

  const cases: Array<Record<string, unknown>> = ((caseRows || []) as Array<Record<string, unknown>>).map((c) => {
    const accountId = String(c.account_id || "").trim();
    const relatedOppId = String(c.related_opportunity_id || "").trim();
    const productId = String(c.product_id || "").trim();
    return {
      ...c,
      case_number: formatSurgicalCaseNumber(String(c.case_number ?? "")),
      account_name: accountId ? accountNameById.get(accountId) ?? null : null,
      product_name: productId ? productNameById.get(productId) ?? null : null,
      related_opportunity_label: relatedOppId ? oppLabelById.get(relatedOppId) ?? null : null,
    };
  });

  let engagements: ProviderEngagementSummary[] = [];
  if (!defer.has("engagements")) {
    try {
      const profileNames = await loadProfileNames([gate.uid]);
      const engagementLoad = await loadProviderEngagementsForProfile(supabaseAdmin, {
        providerId,
        salesRepId: gate.uid,
        contact: contact as Record<string, unknown>,
        actorName: profileNames.get(gate.uid) || "Rep",
        primaryOrganizationName: String(primaryAcct?.name || "").trim() || null,
        primaryOrganizationId: String(primaryLink?.account_id || primaryAcct?.id || "").trim() || null,
      });
      engagements = engagementLoad.engagements;
      if (engagementLoad.contact) {
        Object.assign(contact as Record<string, unknown>, engagementLoad.contact);
      }
    } catch (e: unknown) {
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : "Failed to load engagements" },
        { status: 500 },
      );
    }
  }

  const caseIds = cases.map((c) => String(c.id));
  const caseActivities: Array<Record<string, unknown>> = [];
  const skipActivity = defer.has("activity");

  // Always load case note activities for observation intelligence (nested on case rows).
  // Timeline / provider-activity feeds stay deferred when skipActivity is set.
  if (caseIds.length > 0) {
    const { data: acts } = await supabaseAdmin
      .from("surgical_sales_case_activities")
      .select("id, case_id, activity_type, body, user_id, metadata_json, created_at")
      .in("case_id", caseIds)
      .order("created_at", { ascending: false })
      .limit(600);
    const pipelineActivitiesByCase = new Map<string, Record<string, unknown>[]>();
    for (const a of (acts || []) as Array<Record<string, unknown>>) {
      const caseRow = cases.find((c) => String(c.id) === String(a.case_id));
      const rawType = String(a.activity_type || "").trim().toLowerCase();
      const metaJson = (a.metadata_json || {}) as Record<string, unknown>;
      const isDiscovery =
        rawType === "clinical_discovery_insight_from_case"
        || metaJson.activity_category === "discovery";

      if (!skipActivity) {
        caseActivities.push({
          kind: "case_activity",
          category: isDiscovery ? "discovery" : "case",
          activity_type: rawType,
          id: String(a.id),
          at: a.created_at,
          user_id: String(a.user_id || ""),
          title: formatSurgicalCaseActivityType(rawType),
          body: String(a.body || ""),
          href: caseRow ? `/portal/sales/cases/${String(caseRow.id)}` : null,
          meta: caseRow ? String(caseRow.case_number || "Case") : null,
          question_label: metaJson.question_label ? String(metaJson.question_label) : null,
        });
      }

      const activityCaseId = String(a.case_id ?? "").trim();
      if (activityCaseId) {
        const bucket = pipelineActivitiesByCase.get(activityCaseId) ?? [];
        bucket.push({
          id: String(a.id ?? ""),
          activity_type: rawType,
          body: String(a.body ?? ""),
          metadata_json: metaJson,
          created_at: a.created_at,
        });
        pipelineActivitiesByCase.set(activityCaseId, bucket);
      }
    }

    if (pipelineActivitiesByCase.size > 0) {
      for (let index = 0; index < cases.length; index += 1) {
        const caseId = String(cases[index]?.id ?? "").trim();
        const nestedActivities = caseId ? pipelineActivitiesByCase.get(caseId) : undefined;
        if (!nestedActivities?.length) continue;
        cases[index] = {
          ...cases[index],
          activities: [...nestedActivities].reverse(),
        };
      }
    }
  }

  const providerActivities: Array<Record<string, unknown>> = [];
  let providerActs: Array<Record<string, unknown>> = [];
  if (!skipActivity) {
    try {
      const { data, error: providerActsErr } = await supabaseAdmin
        .from("surgical_sales_provider_activities")
        .select("id, activity_type, body, user_id, metadata_json, created_at")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })
        .limit(150);
      if (!providerActsErr) providerActs = (data || []) as Array<Record<string, unknown>>;
    } catch {
      providerActs = [];
    }
  }

  for (const a of providerActs) {
    const rawType = String(a.activity_type || "").trim().toLowerCase();
    const metaJson = (a.metadata_json || {}) as Record<string, unknown>;
    providerActivities.push({
      kind: "provider_activity",
      category:
        metaJson.activity_category === PROVIDER_ACTIVITY_CATEGORY_DISCOVERY || rawType === "clinical_discovery_updated"
          ? "discovery"
          : "general",
      activity_type: rawType,
      id: String(a.id),
      at: a.created_at,
      user_id: String(a.user_id || ""),
      title: formatProviderActivityType(rawType),
      body: String(metaJson.question_label || a.body || ""),
      href: null,
      meta: null,
      question_label: metaJson.question_label ? String(metaJson.question_label) : String(a.body || ""),
    });
  }

  const oppIds = opportunities.map((o) => String(o.id));
  const oppActivities: Array<Record<string, unknown>> = [];
  if (!skipActivity && oppIds.length > 0) {
    const { data: salesActs } = await supabaseAdmin
      .from("sales_activities")
      .select("id, opportunity_id, activity_type, summary, activity_at, created_at")
      .in("opportunity_id", oppIds)
      .order("activity_at", { ascending: false })
      .limit(100);
    for (const a of (salesActs || []) as Array<Record<string, unknown>>) {
      const opp = opportunities.find((o) => String(o.id) === String(a.opportunity_id));
      const typeKey = String(a.activity_type || "note") as ActivityType;
      oppActivities.push({
        kind: "opportunity_activity",
        category: "opportunity",
        id: String(a.id),
        at: a.activity_at || a.created_at,
        title: ACTIVITY_TYPE_LABEL[typeKey] || typeKey,
        body: String(a.summary || ""),
        href: opp ? `/portal/sales/opportunities/${String(opp.id)}` : null,
        meta: opp ? String(opp.account_name || OPPORTUNITY_UI.fallbackRecordLabel) : null,
      });
    }
  }

  const timeline: Array<Record<string, unknown>> = [];
  if (!skipActivity) {
    const profileIds = [
      ...caseActivities.map((e) => String(e.user_id || "")),
      ...providerActivities.map((e) => String(e.user_id || "")),
    ].filter(Boolean);
    const profileBy = await loadProfileNames(profileIds);
    for (const e of [...caseActivities, ...providerActivities]) {
      const uid = String(e.user_id || "");
      if (uid) e.actor_display_name = profileBy.get(uid) ?? uid;
    }

    timeline.push(
      ...[...caseActivities, ...providerActivities, ...oppActivities]
        .filter((e) => e.at)
        .sort((a, b) => new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime())
        .slice(0, 80),
    );
  }

  const latestCaseDate = cases.length > 0 ? String(cases[0].case_date || "") : null;
  let clinical_discovery_answers: Awaited<ReturnType<typeof listClinicalDiscoveryAnswersForProvider>> = [];
  try {
    clinical_discovery_answers = await listClinicalDiscoveryAnswersForProvider(supabaseAdmin, providerId);
  } catch {
    clinical_discovery_answers = [];
  }
  const planning_completion = buildProviderPlanningCompletion(
    contact as Record<string, unknown>,
    { latestCaseDate },
    links as never,
  );
  const relationship_status = String((contact as { relationship_strength?: string }).relationship_strength || "unknown");

  const organizationId = String(primaryLink?.account_id || primaryAcct?.id || "").trim();
  const organizationName = String(primaryAcct?.name || "").trim() || "this facility";
  const organization_intelligence_baseline = await loadOrganizationIntelligenceBaseline({
    organizationId,
    organizationName,
    excludeProviderId: providerId,
  });
  const longitudinal_intelligence = buildProviderLongitudinalIntelligence(cases);
  const universal_facts_read_model = await loadUniversalFactsReadModelForProvider(providerId);
  const debrief_narrative_context = await loadLatestProviderDebriefNarrativeForProfile(
    supabaseAdmin,
    providerId,
  );
  const provider_ai_summary = !defer.has("engagements")
    ? await generateProviderAiSalesBriefingFromView({
        providerName: contactDisplayName(contact as Record<string, unknown>),
        organizationName: String(primaryAcct?.name || "").trim() || null,
        engagements,
        cases,
        view: buildProviderIntelligenceKnowledgeDashboardView({
          contact: contact as Record<string, unknown>,
          providerId,
          accountId: organizationId || null,
          organizationName: String(primaryAcct?.name || "").trim() || null,
          organizationBaseline: organization_intelligence_baseline,
          planning: planning_completion,
          engagements,
          cases,
          activityTimeline: timeline,
          relatedContacts,
          clinicalDiscoveryAnswers: clinical_discovery_answers,
          universalFactsReadModel: universal_facts_read_model,
        }),
      })
    : null;

  return NextResponse.json({
    ok: true,
    provider: contact,
    specialty,
    primary_organization: {
      id: String(primaryLink?.account_id || primaryAcct?.id || ""),
      name: String(primaryAcct?.name || "").trim() || null,
      territory: String(primaryAcct?.surgical_crm_billing_state || "").trim() || null,
    },
    organization_links: links,
    related_contacts: relatedContacts,
    relationships,
    cases,
    opportunities: opportunities.map((o) => {
      const oppId = String(o.id || "");
      const linked_case_count = cases.filter(
        (c) => String(c.related_opportunity_id || "") === oppId,
      ).length;
      const linked_engagement_count = engagements.filter(
        (e) => String(e.opportunity_id || "") === oppId,
      ).length;
      return {
        ...o,
        stage_label: salesStageLabel(String(o.stage || "")),
        linked_case_count,
        linked_engagement_count,
      };
    }),
    engagements,
    activity_timeline: timeline,
    clinical_discovery_answers,
    planning_completion,
    relationship_status,
    organization_intelligence_baseline,
    longitudinal_intelligence,
    universal_facts_read_model,
    debrief_narrative_context,
    provider_ai_summary,
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (loadErr) return NextResponse.json({ ok: false, error: loadErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!isProviderRole(String((existing as { role_type?: string }).role_type || ""))) {
    return NextResponse.json({ ok: false, error: "Not a provider record." }, { status: 400 });
  }
  if (!(await repCanAccessContact(gate.uid, existing as never))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const planningBefore = buildProviderPlanningSections(existing as Record<string, unknown>);
  let intelligenceValidateFields = [...(parsed.data.intelligence_validate_fields ?? [])];

  if (parsed.data.crm_status !== undefined) {
    patch.provider_crm_status = parsed.data.crm_status;
  }
  if (parsed.data.relationship_stage !== undefined) {
    patch.provider_relationship_stage = parsed.data.relationship_stage;
  }

  let clinicalUpserts: ReturnType<typeof mergeProviderWizardFieldsPatch> = [];
  if (parsed.data.planning) {
    const engagementStrategyRejected = engagementStrategyKeysInProviderPlanningPatch(
      parsed.data.planning,
    );
    if (engagementStrategyRejected.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Engagement strategy fields belong in Engagement Preparation (Prepare for Meeting), not Provider Intelligence.",
          rejected_keys: engagementStrategyRejected.map((r) => r.key),
        },
        { status: 400 },
      );
    }
    const profileNames = await loadProfileNames([gate.uid]);
    const actorName = profileNames.get(gate.uid) || "Rep";
    const captureCtx: IntelligenceCaptureContext = {
      source_type: (parsed.data.planning_capture_context?.source_type ?? "profile") as IntelligenceCaptureSourceType,
      source_label: parsed.data.planning_capture_context?.source_label,
      source_engagement_id: parsed.data.planning_capture_context?.source_engagement_id,
      source_case_id: parsed.data.planning_capture_context?.source_case_id,
      source_case_number: parsed.data.planning_capture_context?.source_case_number,
    };
    const reconcilePatch = reconcileObservationAccessPlanningPatch({
      existingContact: existing as Record<string, unknown>,
      planningPatch: parsed.data.planning,
    });
    const planningWithReconcile = {
      ...parsed.data.planning,
      ...reconcilePatch,
    };
    clinicalUpserts = mergeProviderWizardFieldsPatch(patch, planningWithReconcile, {
      captureContext: captureCtx,
      actor: { userId: gate.uid, userName: actorName },
      existingMetadata: intelligenceMetadataFromContact(existing as Record<string, unknown>),
      existingContact: existing as Record<string, unknown>,
      fieldEvidence: parsed.data.intelligence_field_evidence,
      fieldAccessBlockers: parsed.data.intelligence_field_access_blockers,
    });
    Object.assign(
      patch,
      buildSchedulingSupportContactCommercialIntelligencePatch(
        existing as Record<string, unknown>,
        planningWithReconcile,
      ) ?? {},
    );
    if (reconcilePatch.provider_observation_feasibility === "easy") {
      intelligenceValidateFields = [
        ...new Set([...intelligenceValidateFields, "provider_observation_feasibility"]),
      ];
    }
    const planningComplete =
      buildProviderPlanningCompletion({ ...existing, ...patch } as Record<string, unknown>).status === "complete";
    if (planningComplete) {
      patch.provider_onboarding_status = "active";
    }
  }

  if (
    parsed.data.organization_inheritance_resolutions &&
    Object.keys(parsed.data.organization_inheritance_resolutions).length > 0
  ) {
    const profileNames = await loadProfileNames([gate.uid]);
    const actorName = profileNames.get(gate.uid) || "Rep";
    const captureCtx: IntelligenceCaptureContext = {
      source_type: (parsed.data.planning_capture_context?.source_type ?? "profile") as IntelligenceCaptureContext["source_type"],
      source_label: parsed.data.planning_capture_context?.source_label,
      source_engagement_id: parsed.data.planning_capture_context?.source_engagement_id,
      source_case_id: parsed.data.planning_capture_context?.source_case_id,
      source_case_number: parsed.data.planning_capture_context?.source_case_number,
    };
    const organizationId = String(
      (existing as { account_id?: string }).account_id ||
        (existing as { organization_id?: string }).organization_id ||
        "",
    ).trim();
    const orgName =
      String((existing as { account?: { name?: string } }).account?.name ?? "").trim() ||
      "this facility";
    const baseline = organizationId
      ? await loadOrganizationIntelligenceBaseline({
          organizationId,
          organizationName: orgName,
          excludeProviderId: providerId,
        })
      : null;

    const resolutions = Object.fromEntries(
      Object.entries(parsed.data.organization_inheritance_resolutions).filter(([dbKey]) =>
        isOrganizationInheritanceDbKey(dbKey),
      ),
    ) as Record<string, OrganizationInheritanceResolutionInput>;

    const { metadata, fieldValues } = mergeOrganizationInheritanceResolutions({
      existing: intelligenceMetadataFromContact({
        ...(existing as Record<string, unknown>),
        ...patch,
      } as Record<string, unknown>),
      resolutions,
      captureContext: captureCtx,
      actor: { userId: gate.uid, userName: actorName },
      baseline,
    });

    patch.provider_intelligence_field_metadata = metadata;
    for (const [dbKey, value] of Object.entries(fieldValues)) {
      patch[dbKey] = value;
    }
    for (const row of Object.values(resolutions)) {
      if (row.stance !== "applies" || !row.linked_contact_id) continue;
      const linked = await ensureProviderSupportContactRelationship({
        providerId,
        supportContactId: row.linked_contact_id,
        relationshipType: row.relationship_type,
        workflowRole: row.workflow_role,
        userId: gate.uid,
      });
      if (!linked.ok) return NextResponse.json({ ok: false, error: linked.error }, { status: 400 });
    }
    patch.provider_planning_updated_at = new Date().toISOString();
  }

  if (parsed.data.intelligence_discovery_stances && Object.keys(parsed.data.intelligence_discovery_stances).length > 0) {
    const profileNames = await loadProfileNames([gate.uid]);
    const actorName = profileNames.get(gate.uid) || "Rep";
    const captureCtx: IntelligenceCaptureContext = {
      source_type: (parsed.data.planning_capture_context?.source_type ?? "profile") as IntelligenceCaptureSourceType,
      source_label: parsed.data.planning_capture_context?.source_label,
      source_engagement_id: parsed.data.planning_capture_context?.source_engagement_id,
      source_case_id: parsed.data.planning_capture_context?.source_case_id,
      source_case_number: parsed.data.planning_capture_context?.source_case_number,
    };
    patch.provider_intelligence_field_metadata = mergeIntelligenceDiscoveryStances({
      existing: intelligenceMetadataFromContact({
        ...(existing as Record<string, unknown>),
        ...patch,
      } as Record<string, unknown>),
      stances: parsed.data.intelligence_discovery_stances,
      captureContext: captureCtx,
      actor: { userId: gate.uid, userName: actorName },
    });
    patch.provider_planning_updated_at = new Date().toISOString();
  }

  if (parsed.data.intelligence) {
    const intelErr = mergeContactSalesIntelligenceIntoPatch(
      patch,
      parsed.data.intelligence as ContactSalesIntelligenceInput,
    );
    if (intelErr) return NextResponse.json({ ok: false, error: intelErr }, { status: 400 });
  }

  if (intelligenceValidateFields.length > 0) {
    const profileNames = await loadProfileNames([gate.uid]);
    const actorName = profileNames.get(gate.uid) || "Rep";
    const mergedContact = { ...(existing as Record<string, unknown>), ...patch };
    patch.provider_intelligence_field_metadata = markIntelligenceFieldsValidated({
      existing: intelligenceMetadataFromContact(existing as Record<string, unknown>),
      dbKeys: intelligenceValidateFields,
      fieldValues: mergedContact,
      actor: { userId: gate.uid, userName: actorName },
    });
    patch.provider_planning_updated_at = new Date().toISOString();
  }

  if (parsed.data.archive === true) {
    const now = new Date().toISOString();
    patch.archived_at = now;
    patch.hidden_from_provider_directory_at = now;
  } else if (parsed.data.archive === false) {
    patch.archived_at = null;
    patch.hidden_from_provider_directory_at = null;
  }

  let { data, error } = await supabaseAdmin.from("surgical_sales_contacts").update(patch).eq("id", providerId).select("*").single();
  if (error && isMissingHiddenFromProviderDirectoryColumn(error.message) && "hidden_from_provider_directory_at" in patch) {
    const fallbackPatch = { ...patch };
    delete fallbackPatch.hidden_from_provider_directory_at;
    const fallback = await supabaseAdmin.from("surgical_sales_contacts").update(fallbackPatch).eq("id", providerId).select("*").single();
    data = fallback.data;
    error = fallback.error;
  }
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  if (clinicalUpserts.length > 0) {
    try {
      const priorAnswers = await listClinicalDiscoveryAnswersForProvider(supabaseAdmin, providerId);
      const priorKeys = new Set(priorAnswers.map((a) => a.questionKey));
      const saved = await upsertClinicalDiscoveryAnswers(supabaseAdmin, providerId, gate.uid, clinicalUpserts);
      await touchProviderPlanningUpdatedAt(supabaseAdmin, providerId);
      for (const answer of saved) {
        const activityLog = await logClinicalDiscoveryAnswerActivities({
          providerId,
          userId: gate.uid,
          questionKey: answer.questionKey,
          questionLabel: answer.questionLabel,
          sourceCaseId: answer.sourceCaseId,
          isCreate: !priorKeys.has(answer.questionKey),
        });
        if (!activityLog.ok) {
          return NextResponse.json({ ok: false, error: activityLog.message }, { status: 500 });
        }
      }
    } catch (e: unknown) {
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : "Clinical discovery save failed" },
        { status: 400 },
      );
    }
  }

  let clinical_discovery_answers: Awaited<ReturnType<typeof listClinicalDiscoveryAnswersForProvider>> = [];
  try {
    clinical_discovery_answers = await listClinicalDiscoveryAnswersForProvider(supabaseAdmin, providerId);
  } catch {
    clinical_discovery_answers = [];
  }

  await logSurgicalSalesCrmAudit({
    actorUserId: gate.uid,
    action: "provider_profile_updated",
    meta: { contact_id: providerId, provider_id: providerId },
    req,
  });

  if (parsed.data.planning) {
    const changedPlanningKeys = Object.keys(parsed.data.planning).filter(
      (k) => parsed.data.planning![k] !== undefined,
    );
    voidRecordActivityEventDual({
      type: "PROVIDER_PLANNING_UPDATED",
      summary:
        changedPlanningKeys.length > 0
          ? `Planning fields updated: ${changedPlanningKeys.slice(0, 6).join(", ")}${changedPlanningKeys.length > 6 ? "…" : ""}`
          : "Provider planning updated.",
      entityType: "provider",
      entityId: providerId,
      createdBy: { userId: gate.uid },
      metadata: { fields: changedPlanningKeys },
      tags: ["planning"],
    });

    const planningAfter = buildProviderPlanningSections({ ...existing, ...patch } as Record<string, unknown>);
    for (const section of planningAfter) {
      const prior = planningBefore.find((s) => s.id === section.id);
      if (prior?.status !== "complete" && section.status === "complete") {
        voidRecordActivityEventDual({
          type: "PLANNING_SECTION_COMPLETED",
          summary: `${section.label} marked complete.`,
          entityType: "provider",
          entityId: providerId,
          createdBy: { userId: gate.uid },
          metadata: {
            section_id: section.id as ProviderPlanningSectionId,
            section_label: section.label,
            filled: section.filled,
            total: section.total,
          },
          tags: [section.id, "planning"],
        });
      }
    }
  }

  if (parsed.data.intelligence) {
    voidRecordActivityEventDual({
      type: "PROVIDER_UPDATED",
      summary: "Provider relationship intelligence updated.",
      entityType: "provider",
      entityId: providerId,
      createdBy: { userId: gate.uid },
      metadata: { area: "intelligence" },
      tags: ["intelligence"],
    });
  }

  return NextResponse.json({
    ok: true,
    provider: data,
    clinical_discovery_answers,
    planning_completion: buildProviderPlanningCompletion(data as Record<string, unknown>),
  });
}

async function loadProviderRetentionCounts(providerId: string, salesRepId: string) {
  const [engagementsRes, casesRes, activitiesRes, answersRes] = await Promise.all([
    supabaseAdmin
      .from("surgical_sales_engagements")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", providerId),
    supabaseAdmin
      .from("surgical_sales_cases")
      .select("id", { count: "exact", head: true })
      .eq("surgeon_contact_id", providerId),
    supabaseAdmin
      .from("surgical_sales_provider_activities")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", providerId),
    supabaseAdmin
      .from("provider_clinical_discovery_answers")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", providerId),
  ]);

  return {
    engagementCount: engagementsRes.count ?? 0,
    caseCount: casesRes.count ?? 0,
    providerActivityCount: activitiesRes.count ?? 0,
    clinicalDiscoveryAnswerCount: answersRes.count ?? 0,
  };
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (loadErr) return NextResponse.json({ ok: false, error: loadErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!isProviderRole(String((existing as { role_type?: string }).role_type || ""))) {
    return NextResponse.json({ ok: false, error: "Not a provider record." }, { status: 400 });
  }
  if (!(await repCanAccessContact(gate.uid, existing as never))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const counts = await loadProviderRetentionCounts(providerId, gate.uid);
  const retention = assessProviderHardDeleteFromCounts({
    contact: existing as Record<string, unknown>,
    ...counts,
  });
  if (!retention.hardDeleteAllowed) {
    return NextResponse.json(
      {
        ok: false,
        error: retention.blockHardDeleteReason ?? "Archive this provider instead of deleting it.",
        retention,
      },
      { status: 409 },
    );
  }

  await supabaseAdmin.from("surgical_sales_contact_organizations").delete().eq("contact_id", providerId);
  await supabaseAdmin
    .from("surgical_sales_contact_relationships")
    .delete()
    .or(`primary_contact_id.eq.${providerId},related_contact_id.eq.${providerId}`);

  const { error: deleteErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .delete()
    .eq("id", providerId);
  if (deleteErr) {
    return NextResponse.json({ ok: false, error: deleteErr.message }, { status: 500 });
  }

  await logSurgicalSalesCrmAudit({
    actorUserId: gate.uid,
    action: "provider_deleted",
    meta: { contact_id: providerId, provider_id: providerId },
    req: _req,
  });

  return NextResponse.json({ ok: true, provider_id: providerId });
}
