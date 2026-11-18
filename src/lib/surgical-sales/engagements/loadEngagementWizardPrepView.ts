import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  buildPrepareForMeetingView,
  type PrepareForMeetingView,
} from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import { getProviderExecutionContext } from "@/lib/surgical-sales/providerExecutionContext";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { listClinicalDiscoveryAnswersForProvider } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import { formatProviderActivityType } from "@/lib/surgical-sales/providerActivityLabels";
import { buildPrepareSuggestedDiscovery } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedDiscovery";
import type { PrepareSuggestedDiscovery } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedDiscovery";
import { buildIntroCallCommercializationSignals } from "@/lib/surgical-sales/engagements/buildIntroCallCommercializationSignals";
import type { IntroCallCommercializationSignals } from "@/lib/surgical-sales/engagements/buildIntroCallCommercializationSignals";
import { buildIntroCallFutureObservationGoals } from "@/lib/surgical-sales/engagements/buildIntroCallFutureObservationGoals";
import type { IntroCallFutureObservationGoals } from "@/lib/surgical-sales/engagements/buildIntroCallFutureObservationGoals";
import { buildPrepareSuggestedGoal } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedGoal";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import { buildPrepareSuggestedTalkingPoints } from "@/lib/surgical-sales/engagements/prepareForMeetingTalkingPoints";
import { buildPrepareSuggestedOpening } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedOpening";
import type { PrepareSuggestedOpening } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedOpening";
import { buildPreparationContextView } from "@/lib/surgical-sales/engagements/engagementPreparationContextContent";
import type {
  IntroCallDiscoveryFocusView,
  PreparationContextView,
  WorkflowFocusedPrepHint,
} from "@/lib/surgical-sales/engagements/engagementPreparationContextContent";
import type { EngagementPrepModeView } from "@/lib/surgical-sales/engagements/engagementPrepMode";
import { buildIntroCallWizardPrepGeneration } from "@/lib/surgical-sales/engagements/introCallWizardPrep";
import {
  buildPreparationSpecializationView,
  type PreparationSpecializationView,
} from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";
import { resolveEngagementPreparationContextState } from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  mergeIntroCallProductLineRaw,
  resolveExplicitPrepProductLine,
} from "@/lib/surgical-sales/engagements/introCallProductAlignment";

/** Planning suggestions for the New Engagement wizard only — not the full Prepare for Meeting briefing. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EngagementWizardPrepView = {
  provider_snapshot: PrepareForMeetingView["provider_snapshot"];
  known_intelligence: PrepareForMeetingView["known_intelligence"];
  intelligence_snapshot: ProviderIntelligenceSnapshot;
  suggested_goal: PrepareForMeetingView["suggested_goal"];
  suggested_talking_points: PrepareForMeetingView["suggested_talking_points"];
  suggested_opening: PrepareSuggestedOpening;
  suggested_discovery: PrepareSuggestedDiscovery;
  /** Intro Call only — observation pathway planning */
  future_observation_goals: IntroCallFutureObservationGoals | null;
  commercialization_signals: IntroCallCommercializationSignals | null;
  preparation_context: PreparationContextView | null;
  /** Intro Call — subtle banner when prep is product-neutral (no product/opportunity/case) */
  workflow_focused_hint: WorkflowFocusedPrepHint | null;
  /** Intro Call — default intelligence structure when no product focus */
  discovery_focus: IntroCallDiscoveryFocusView | null;
  /** Progressive specificity — low / medium / high */
  specialization: PreparationSpecializationView | null;
  /** @deprecated Intro Call — product-line prep only; not shown in UI */
  engagement_prep_mode: EngagementPrepModeView | null;
  /** @deprecated */
  suggested_prep_mode: null;
  /** @deprecated */
  dominant_prep_mode: EngagementPrepModeView | null;
  provider_href: string | null;
};

export async function loadEngagementWizardPrepViewForActor(
  _userId: string,
  input: {
    provider_id: string;
    engagement_type: string;
    organization_id?: string | null;
    opportunity_id?: string | null;
    engagement_date?: string | null;
    /** Wizard basics product line — takes precedence over linked opportunity */
    product_line?: string | null;
    case_id?: string | null;
    prep_mode?: string | null;
  },
): Promise<
  | { ok: true; prep: EngagementWizardPrepView }
  | { ok: false; error: string; status: 400 | 404 | 500 }
> {
  const providerId = String(input.provider_id ?? "").trim();
  const engagementType = String(input.engagement_type ?? "").trim();
  if (!UUID_RE.test(providerId)) {
    return { ok: false, error: "Invalid provider", status: 400 };
  }
  if (!engagementType) {
    return { ok: false, error: "Engagement type required", status: 400 };
  }

  const orgId = String(input.organization_id ?? "").trim() || null;
  const opportunityId = String(input.opportunity_id ?? "").trim() || null;

  const syntheticEngagement: Record<string, unknown> = {
    id: "wizard-draft",
    provider_id: providerId,
    organization_id: orgId,
    opportunity_id: opportunityId,
    engagement_type: engagementType,
    engagement_date: input.engagement_date?.trim() || null,
    scheduled_at: null,
    status: "planned",
    title: null,
  };

  const [providerRes, providerLinkRes, orgRes, oppRes, clinicalAnswers, lastPriorRes] =
    await Promise.all([
      supabaseAdmin.from("surgical_sales_contacts").select("*").eq("id", providerId).maybeSingle(),
      supabaseAdmin
        .from("surgical_sales_contact_organizations")
        .select("specialty, influence_level, preferred_hospital")
        .eq("contact_id", providerId)
        .eq("is_active", true)
        .order("is_primary_org", { ascending: false })
        .limit(1)
        .maybeSingle(),
      orgId
        ? supabaseAdmin
            .from(SALES_ORGANIZATIONS_TABLE)
            .select("id, name, surgical_crm_billing_city, surgical_crm_billing_state")
            .eq("id", orgId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      opportunityId
        ? supabaseAdmin
            .from("sales_opportunities")
            .select("id, account_name, physician_name, stage, product_line")
            .eq("id", opportunityId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      listClinicalDiscoveryAnswersForProvider(supabaseAdmin, providerId).catch(() => []),
      supabaseAdmin
        .from("surgical_sales_engagements")
        .select("id, title, engagement_type, engagement_date, scheduled_at, status")
        .eq("provider_id", providerId)
        .is("archived_at", null)
        .order("engagement_date", { ascending: false, nullsFirst: false })
        .order("scheduled_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (!providerRes.data) {
    return { ok: false, error: "Provider not found", status: 404 };
  }

  const providerRow = {
    ...providerRes.data,
    display_name: contactDisplayName(providerRes.data as Parameters<typeof contactDisplayName>[0]),
  };

  let providerTimeline: Array<{
    id: string;
    at?: string | null;
    title?: string;
    body?: string;
    href?: string | null;
  }> = [];
  try {
    const { data: providerActs } = await supabaseAdmin
      .from("surgical_sales_provider_activities")
      .select("id, activity_type, body, metadata_json, created_at")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false })
      .limit(12);
    providerTimeline = (providerActs || []).map((a) => {
      const meta = (a.metadata_json || {}) as Record<string, unknown>;
      return {
        id: String(a.id),
        at: a.created_at,
        title: formatProviderActivityType(String(a.activity_type || "")),
        body: String(meta.question_label || a.body || ""),
        href: `/portal/sales/providers/${encodeURIComponent(providerId)}`,
      };
    });
  } catch {
    providerTimeline = [];
  }

  const opportunityProductLine = (oppRes.data as { product_line?: string | null } | null)?.product_line ?? null;
  const explicitProductLine = resolveExplicitPrepProductLine(input.product_line);
  const intentionalProductFocus = Boolean(explicitProductLine);
  const effectiveProductLine = intentionalProductFocus
    ? explicitProductLine
    : mergeIntroCallProductLineRaw(input.product_line, opportunityProductLine);
  const opportunityForPrep = oppRes.data
    ? {
        ...(oppRes.data as Record<string, unknown>),
        product_line: effectiveProductLine ?? opportunityProductLine,
      }
    : effectiveProductLine
      ? { product_line: effectiveProductLine }
      : null;

  const prepare = buildPrepareForMeetingView({
    engagement: syntheticEngagement,
    provider: providerRow as Record<string, unknown>,
    providerSpecialty: providerLinkRes.data?.specialty ? String(providerLinkRes.data.specialty) : null,
    providerOrgLink: providerLinkRes.data
      ? {
          influence_level: providerLinkRes.data.influence_level
            ? String(providerLinkRes.data.influence_level)
            : null,
          preferred_hospital: providerLinkRes.data.preferred_hospital
            ? String(providerLinkRes.data.preferred_hospital)
            : null,
        }
      : null,
    organization: orgRes.data as { id?: string; name?: string } | null,
    organizationLocation: orgRes.data
      ? {
          city: (orgRes.data as { surgical_crm_billing_city?: string | null }).surgical_crm_billing_city,
          state: (orgRes.data as { surgical_crm_billing_state?: string | null }).surgical_crm_billing_state,
        }
      : null,
    lastPriorEngagement: lastPriorRes.data
      ? {
          id: String(lastPriorRes.data.id),
          title: lastPriorRes.data.title ? String(lastPriorRes.data.title) : null,
          engagement_type: lastPriorRes.data.engagement_type
            ? String(lastPriorRes.data.engagement_type)
            : null,
          engagement_date: lastPriorRes.data.engagement_date
            ? String(lastPriorRes.data.engagement_date)
            : null,
          scheduled_at: lastPriorRes.data.scheduled_at
            ? String(lastPriorRes.data.scheduled_at)
            : null,
        }
      : null,
    opportunity: opportunityForPrep as {
      id?: string;
      account_name?: string;
      physician_name?: string | null;
      stage?: string;
      product_line?: string | null;
    } | null,
    activities: [],
    providerTimeline,
    clinicalDiscoveryAnswers: clinicalAnswers,
    planProgress: { filled: 0, total: 0 },
  });

  const providerExecution = getProviderExecutionContext({
    contact: providerRow as Record<string, unknown>,
    providerId,
    specialty: providerLinkRes.data?.specialty ? String(providerLinkRes.data.specialty) : null,
  });
  const intelligence_snapshot = providerExecution.intelligenceSnapshot;

  const providerSpecialty = providerLinkRes.data?.specialty ? String(providerLinkRes.data.specialty) : null;
  const providerRelationshipStage = providerRow
    ? String((providerRow as { provider_relationship_stage?: string }).provider_relationship_stage ?? "")
    : null;
  const opportunityStage = (oppRes.data as { stage?: string } | null)?.stage ?? null;

  const prepContextState = resolveEngagementPreparationContextState({
    engagementType,
    productLine: input.product_line,
    opportunityProductLine,
    opportunityId: opportunityId,
    opportunityStage,
    caseId: input.case_id,
    providerRelationshipStage,
  });

  const introCallEngagement = normalizeEngagementType(engagementType) === "intro_call";

  const specializationInput = {
    engagementType,
    productLine: input.product_line,
    opportunityProductLine,
    opportunityId,
    opportunityStage,
    caseId: input.case_id,
    providerSpecialty,
    providerRelationshipStage,
    knownIntelligence: prepare.known_intelligence,
    prepContextState,
  };

  const specialization = introCallEngagement
    ? buildPreparationSpecializationView(specializationInput)
    : null;

  const generation = introCallEngagement
    ? buildIntroCallWizardPrepGeneration({
        engagementType,
        productLine: input.product_line,
        opportunityId,
        opportunityStage,
        caseId: input.case_id,
        providerSpecialty,
        providerRelationshipStage,
        knownIntelligence: prepare.known_intelligence,
      })
    : null;

  const prepContextStateForPrep = generation?.prep_context_state ?? prepContextState;

  const prepContext = introCallEngagement
    ? buildPreparationContextView(prepContextStateForPrep, { discoveryFocus: null })
    : null;
  const workflowFocusedHint = null;

  const emptyKnownIntelligence: PrepareKnownIntelligence = {
    bullets: [],
    last_key_insight: null,
  };
  const suggestBase = {
    engagementType,
    providerSpecialty,
    productLine: generation?.product_line ?? null,
    opportunityStage,
    providerRelationshipStage,
    knownIntelligence: prepare.known_intelligence ?? emptyKnownIntelligence,
    prepContextState: prepContextStateForPrep,
    prepSpecializationTier: generation?.product_prep_tier,
    intentionalProductFocus: generation?.intentional_product_focus ?? false,
    dominantPrep: generation ?? undefined,
  };

  const suggested_goal = introCallEngagement
    ? buildPrepareSuggestedGoal({ ...suggestBase, providerSpecialty })
    : prepare.suggested_goal;

  const suggested_talking_points = introCallEngagement
    ? buildPrepareSuggestedTalkingPoints({
        specialty: providerSpecialty,
        engagementType,
        productLine: suggestBase.productLine,
        opportunityStage,
        knownIntelligence: prepare.known_intelligence,
        prepContextState: prepContextStateForPrep,
        prepSpecializationTier: generation?.product_prep_tier ?? specialization?.tier,
        intentionalProductFocus: generation?.intentional_product_focus ?? intentionalProductFocus,
        dominantPrep: generation ?? undefined,
      })
    : prepare.suggested_talking_points;

  const suggested_opening = buildPrepareSuggestedOpening({
    ...suggestBase,
    providerSpecialty,
    relationshipStrength: providerRow
      ? String((providerRow as { relationship_strength?: string }).relationship_strength ?? "")
      : null,
  });

  const suggested_discovery = buildPrepareSuggestedDiscovery({ ...suggestBase, providerSpecialty });

  const future_observation_goals =
    introCallEngagement && generation?.include_observation_goals
      ? buildIntroCallFutureObservationGoals({
          providerSpecialty,
          productLine: suggestBase.productLine,
          knownIntelligence: suggestBase.knownIntelligence,
          prepContextState: prepContextStateForPrep,
          prepSpecializationTier: generation.product_prep_tier,
          intentionalProductFocus: generation.intentional_product_focus,
        })
      : null;

  const commercialization_signals =
    introCallEngagement && generation?.include_commercialization_signals
      ? buildIntroCallCommercializationSignals({
          providerSpecialty,
          productLine: suggestBase.productLine,
          knownIntelligence: suggestBase.knownIntelligence,
          provider: providerRow as Record<string, unknown>,
          prepContextState: prepContextStateForPrep,
          prepSpecializationTier: generation.product_prep_tier,
          intentionalProductFocus: generation.intentional_product_focus,
        })
      : null;

  return {
    ok: true,
    prep: {
      provider_snapshot: prepare.provider_snapshot,
      known_intelligence: prepare.known_intelligence,
      intelligence_snapshot,
      suggested_goal,
      suggested_talking_points,
      suggested_opening,
      suggested_discovery,
      future_observation_goals,
      commercialization_signals,
      preparation_context: introCallEngagement ? prepContext : null,
      workflow_focused_hint: workflowFocusedHint,
      discovery_focus: null,
      specialization,
      engagement_prep_mode: null,
      suggested_prep_mode: null,
      dominant_prep_mode: null,
      provider_href: prepare.provider_href,
    },
  };
}
