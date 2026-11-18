import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { contactDisplayName, formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import { pickPrimaryOrgLink } from "@/lib/surgical-sales/providerDirectory";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import type {
  AdoptionInitiativeCreateLaunch,
  AdoptionInitiativeCreatePrefill,
  AdoptionInitiativeOrgOption,
} from "@/lib/sales/adoptionInitiativeCreate";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function loadProviderOrganizations(
  contact: Record<string, unknown>,
  contactId: string,
): Promise<AdoptionInitiativeOrgOption[]> {
  const { data: links } = await supabaseAdmin
    .from("surgical_sales_contact_organizations")
    .select("account_id, is_primary_org, is_active, accounts:sales_organizations!account_id(id, name, surgical_crm_billing_city, surgical_crm_billing_state)")
    .eq("contact_id", contactId)
    .limit(100);

  const orgs: AdoptionInitiativeOrgOption[] = [];
  const seen = new Set<string>();

  const addOrg = (id: string, name: string, city?: string, state?: string, is_primary?: boolean) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    orgs.push({ id, name, city, state, is_primary });
  };

  for (const row of (links || []) as Array<Record<string, unknown>>) {
    if (row.is_active === false) continue;
    const acct = row.accounts as {
      id?: string;
      name?: string | null;
      surgical_crm_billing_city?: string | null;
      surgical_crm_billing_state?: string | null;
    } | null;
    const id = String(row.account_id || acct?.id || "").trim();
    if (!id) continue;
    addOrg(
      id,
      String(acct?.name || "Organization").trim(),
      String(acct?.surgical_crm_billing_city || "").trim() || undefined,
      String(acct?.surgical_crm_billing_state || "").trim() || undefined,
      Boolean(row.is_primary_org),
    );
  }

  const primaryLink = pickPrimaryOrgLink((links || []) as never);
  const legacyId = String(contact.organization_id || contact.account_id || "").trim();
  if (legacyId && !seen.has(legacyId)) {
    const { data: acct } = await supabaseAdmin
      .from(SALES_ORGANIZATIONS_TABLE)
      .select("id, name, surgical_crm_billing_city, surgical_crm_billing_state")
      .eq("id", legacyId)
      .maybeSingle();
    if (acct) {
      addOrg(
        String(acct.id),
        String(acct.name || "Organization").trim(),
        String(acct.surgical_crm_billing_city || "").trim() || undefined,
        String(acct.surgical_crm_billing_state || "").trim() || undefined,
        !primaryLink,
      );
    }
  }

  orgs.sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)));
  return orgs;
}

export async function loadAdoptionInitiativeCreatePrefill(
  params: {
    surgeonContactId?: string;
    engagementId?: string;
    caseId?: string;
  },
  actorUserId: string,
): Promise<{ ok: true; prefill: AdoptionInitiativeCreatePrefill } | { ok: false; error: string }> {
  let providerId = String(params.surgeonContactId || "").trim();
  let engagementId: string | null = null;
  let caseId: string | null = null;
  let adoptionGoal: string | null = null;
  let evaluationNeeded = false;
  let linkedEngagementLabel: string | null = null;
  let linkedCaseLabel: string | null = null;

  if (params.engagementId && UUID_RE.test(params.engagementId)) {
    const engagement = await loadEngagementForPortalActor(params.engagementId, actorUserId);
    if (!engagement) return { ok: false, error: "Engagement not found" };
    providerId = String(engagement.provider_id);
    engagementId = params.engagementId;
    const title = String(engagement.title || "").trim();
    const type = String(engagement.engagement_type || "").replace(/_/g, " ");
    linkedEngagementLabel = title || type || params.engagementId;
    const obsGoal = String(engagement.observation_goal || "").trim();
    if (obsGoal) adoptionGoal = obsGoal;
    if (
      engagement.engagement_type === "evaluation_planning" ||
      engagement.engagement_type === "product_demo" ||
      engagement.engagement_type === "evaluation_discussion" ||
      engagement.engagement_type === "product_demo"
    ) {
      evaluationNeeded = true;
    }
  }

  if (params.caseId && UUID_RE.test(params.caseId)) {
    const { data: caseRow } = await supabaseAdmin
      .from("surgical_sales_cases")
      .select(
        "id, case_number, account_id, surgeon_contact_id, related_opportunity_id, debrief_suggested_next_action, observation_goal",
      )
      .eq("id", params.caseId)
      .maybeSingle();
    if (!caseRow) return { ok: false, error: "Case not found" };
    caseId = params.caseId;
    providerId = String(caseRow.surgeon_contact_id || providerId || "").trim();
    linkedCaseLabel =
      formatSurgicalCaseNumber(String((caseRow as { case_number?: string | null }).case_number || "")) || params.caseId;
    const nextAction = String(caseRow.debrief_suggested_next_action || "").trim();
    if (nextAction && !adoptionGoal) adoptionGoal = nextAction;
    const caseGoal = String((caseRow as { observation_goal?: string | null }).observation_goal || "").trim();
    if (caseGoal && !adoptionGoal) adoptionGoal = caseGoal;
    if (!engagementId && caseRow.surgeon_contact_id) {
      const { data: linkedEng } = await supabaseAdmin
        .from("surgical_sales_cases")
        .select("engagement_id")
        .eq("id", params.caseId)
        .maybeSingle();
      const eid = String((linkedEng as { engagement_id?: string | null } | null)?.engagement_id || "").trim();
      if (UUID_RE.test(eid)) {
        engagementId = eid;
        const eng = await loadEngagementForPortalActor(eid, actorUserId);
        if (eng) {
          linkedEngagementLabel =
            String(eng.title || "").trim() || String(eng.engagement_type || "").replace(/_/g, " ") || eid;
        }
      }
    }
  }

  if (!UUID_RE.test(providerId)) {
    return {
      ok: true,
      prefill: {
        launch: "standalone",
        provider_id: null,
        provider_name: null,
        procedure_focus: null,
        competitive_product: null,
        preference_card_target: null,
        account_id: null,
        account_name: null,
        city: null,
        state: null,
        organizations: [],
        linked_engagement_id: engagementId,
        linked_engagement_label: linkedEngagementLabel,
        linked_case_id: caseId,
        linked_case_label: linkedCaseLabel,
        adoption_goal: adoptionGoal,
        evaluation_needed: evaluationNeeded,
      },
    };
  }

  const { data: contact } = await supabaseAdmin.from("surgical_sales_contacts").select("*").eq("id", providerId).maybeSingle();
  if (!contact || !(await repCanAccessContact(actorUserId, contact as never))) {
    return { ok: false, error: "Provider not found" };
  }

  const organizations = await loadProviderOrganizations(contact as Record<string, unknown>, providerId);
  const primary = organizations.find((o) => o.is_primary) || organizations[0];

  let accountId = primary?.id || null;
  let accountName = primary?.name || null;
  let city = primary?.city || null;
  let state = primary?.state || null;

  if (params.engagementId && UUID_RE.test(params.engagementId)) {
    const engagement = await loadEngagementForPortalActor(params.engagementId, actorUserId);
    const orgId = engagement?.organization_id ? String(engagement.organization_id) : "";
    if (orgId) {
      const hit = organizations.find((o) => o.id === orgId);
      if (hit) {
        accountId = hit.id;
        accountName = hit.name;
        city = hit.city || city;
        state = hit.state || state;
      } else {
        const { data: acct } = await supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name, surgical_crm_billing_city, surgical_crm_billing_state").eq("id", orgId).maybeSingle();
        if (acct) {
          accountId = String(acct.id);
          accountName = String(acct.name || "").trim();
          city = String(acct.surgical_crm_billing_city || "").trim() || city;
          state = String(acct.surgical_crm_billing_state || "").trim() || state;
        }
      }
    }
  }

  if (params.caseId && UUID_RE.test(params.caseId)) {
    const { data: caseRow } = await supabaseAdmin.from("surgical_sales_cases").select("account_id").eq("id", params.caseId).maybeSingle();
    const aid = String(caseRow?.account_id || "").trim();
    if (aid) {
      const hit = organizations.find((o) => o.id === aid);
      if (hit) {
        accountId = hit.id;
        accountName = hit.name;
        city = hit.city || city;
        state = hit.state || state;
      }
    }
  }

  const providerName = contactDisplayName(contact as Parameters<typeof contactDisplayName>[0]);
  const procedureFocus = String((contact as { provider_procedure_focus?: string | null }).provider_procedure_focus || "").trim();
  const competitive = String((contact as { provider_competitive_products?: string | null }).provider_competitive_products || "").trim();
  const prefCard = String((contact as { provider_preference_card_signals?: string | null }).provider_preference_card_signals || "").trim();

  const resolvedLaunch: AdoptionInitiativeCreateLaunch =
    params.engagementId && UUID_RE.test(params.engagementId)
      ? "engagement"
      : params.caseId && UUID_RE.test(params.caseId)
        ? "case"
        : params.surgeonContactId && UUID_RE.test(params.surgeonContactId)
          ? "provider"
          : "standalone";

  return {
    ok: true,
    prefill: {
      launch: resolvedLaunch,
      provider_id: providerId,
      provider_name: providerName === "—" ? null : providerName,
      procedure_focus: procedureFocus || null,
      competitive_product: competitive || null,
      preference_card_target: prefCard || null,
      account_id: accountId,
      account_name: accountName,
      city,
      state,
      organizations,
      linked_engagement_id: engagementId,
      linked_engagement_label: linkedEngagementLabel,
      linked_case_id: caseId,
      linked_case_label: linkedCaseLabel,
      adoption_goal: adoptionGoal,
      evaluation_needed: evaluationNeeded,
    },
  };
}
