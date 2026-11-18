import { supabaseAdmin } from "@/lib/supabase/admin";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { salesStageLabel } from "@/lib/sales/stages";
import { ACTIVITY_TYPE_LABEL, type ActivityType } from "@/lib/sales/activityTypes";
import { buildProviderLongitudinalIntelligence } from "@/lib/surgical-sales/buildProviderLongitudinalIntelligence";
import { contactDisplayName, formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import {
  contactMatchesPhysicianName,
  pickPrimaryOrgLink,
  pickSpecialty,
} from "@/lib/surgical-sales/providerDirectory";
import {
  listClinicalDiscoveryAnswersForProvider,
} from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import { formatProviderActivityType } from "@/lib/surgical-sales/providerActivityLabels";
import { PROVIDER_ACTIVITY_CATEGORY_DISCOVERY } from "@/lib/surgical-sales/providerActivityLog";
import { buildProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { formatSurgicalCaseActivityType } from "@/lib/surgical-sales/caseActivityLabels";
import { loadProviderEngagementsForProfile } from "@/lib/surgical-sales/engagements/loadProviderEngagements";
import { loadLatestProviderDebriefNarrativeForProfile } from "@/lib/surgical-sales/engagements/loadLatestProviderDebriefNarrative";
import { loadUniversalFactsReadModelForProvider } from "@/lib/surgical-sales/universalExtractor/loadUniversalFactsReadModel";
import { loadOrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderProfilePayload } from "@/app/portal/sales/providers/[providerId]/providerProfileTypes";
import { buildProviderIntelligenceKnowledgeDashboardView } from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import { generateProviderAiSalesBriefingFromView } from "@/lib/surgical-sales/generateProviderAiSalesBriefing";

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

export type LoadProviderProfilePayloadResult =
  | ({ ok: true } & ProviderProfilePayload)
  | { ok: false; error: string; status: number };

export async function loadProviderProfilePayload(input: {
  providerId: string;
  salesRepId: string;
  defer?: Set<string>;
}): Promise<LoadProviderProfilePayloadResult> {
  const { providerId, salesRepId } = input;
  const defer = input.defer ?? new Set<string>();

  const { data: contact, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*, organization:sales_organizations!organization_id(id,name,surgical_crm_billing_state), account:sales_organizations!account_id(id,name,surgical_crm_billing_state)")
    .eq("id", providerId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, status: 500 };
  if (!contact) return { ok: false, error: "Not found", status: 404 };
  if (!isProviderRole(String((contact as { role_type?: string }).role_type || ""))) {
    return { ok: false, error: "Not a provider record.", status: 400 };
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

  const { data: relRows } = await supabaseAdmin
    .from("surgical_sales_contact_relationships")
    .select("*")
    .eq("primary_contact_id", providerId)
    .order("updated_at", { ascending: false })
    .limit(500);

  const relationships = (relRows || []) as Array<Record<string, unknown>>;
  const relatedIds = [...new Set(relationships.map((r) => String(r.related_contact_id || "")).filter(Boolean))];
  let relatedContacts: Record<string, unknown>[] = [];
  if (relatedIds.length > 0) {
    const { data: rc } = await supabaseAdmin.from("surgical_sales_contacts").select("*").in("id", relatedIds);
    relatedContacts = (rc || []) as Record<string, unknown>[];
  }

  const { data: caseRows } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select(
      "id, case_number, case_date, case_time, status, case_type, procedure_type, account_id, product_id, related_opportunity_id, engagement_id, observation_goal, notes, observation_access_scheduling_owner, observation_access_pathway, observation_access_credentialing, observation_quick_finding_product_interest, debrief_key_findings, live_observation_clinical_pain_points, live_observation_product_fit, live_observation_competitors, live_observation_workflow, live_observation_staff_process, live_observation_surgeon_reactions, observation_workflow_intelligence_snapshot, case_support_outcome, updated_at, created_at",
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
      const profileNames = await loadProfileNames([salesRepId]);
      const engagementLoad = await loadProviderEngagementsForProfile(supabaseAdmin, {
        providerId,
        salesRepId,
        contact: contact as Record<string, unknown>,
        actorName: profileNames.get(salesRepId) || "Rep",
        primaryOrganizationName: String(primaryAcct?.name || "").trim() || null,
        primaryOrganizationId: String(primaryLink?.account_id || primaryAcct?.id || "").trim() || null,
      });
      engagements = engagementLoad.engagements;
      if (engagementLoad.contact) {
        Object.assign(contact as Record<string, unknown>, engagementLoad.contact);
      }
    } catch (e: unknown) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to load engagements",
        status: 500,
      };
    }
  }

  const caseIds = cases.map((c) => String(c.id));
  const caseActivities: Array<Record<string, unknown>> = [];
  const skipActivity = defer.has("activity");

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
        rawType === "clinical_discovery_insight_from_case" || metaJson.activity_category === "discovery";

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

  return {
    ok: true,
    provider: contact as Record<string, unknown>,
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
      const linked_case_count = cases.filter((c) => String(c.related_opportunity_id || "") === oppId).length;
      const linked_engagement_count = engagements.filter((e) => String(e.opportunity_id || "") === oppId).length;
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
  };
}
