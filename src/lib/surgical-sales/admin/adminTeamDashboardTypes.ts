export const ADMIN_INTEL_STALE_DAYS = 60;

export type AdminTeamDashboardQuestion = "executing" | "progressing" | "products_used";

export type AdminRepAttention = "low_activity" | "doc_risk" | "stale_providers" | null;

export type AdminTeamDashboardPayload = {
  period: { key: string; label: string; start: string; end: string; prior_label: string };
  read_model_enabled: boolean;
  pathway_funnel: Array<{
    stage_id: string;
    label: string;
    provider_count: number;
    sublabel?: string;
  }>;
  kpis: Array<{
    id: string;
    label: string;
    value: number;
    prior_value: number;
    hint: string;
    question: AdminTeamDashboardQuestion;
  }>;
  reps: Array<{
    user_id: string;
    display_name: string;
    email: string | null;
    metrics: {
      scheduled: number;
      completed: number;
      observations: number;
      supported_product_cases: number;
      debriefs: number;
      notes_30d: number;
      doc_gaps: number;
      stale_providers: number;
      expected_revenue: number;
      actual_revenue: number;
    };
    attention: AdminRepAttention;
    composite_score: number;
  }>;
  case_revenue: {
    expected: number;
    actual: number;
    prior_expected: number;
    prior_actual: number;
    cases_in_period: number;
    cases_with_expected: number;
    cases_with_actual: number;
    product_support_missing_expected: number;
  };
  providers: Array<{
    contact_id: string;
    display_name: string;
    organization_name: string;
    rep_name: string;
    rep_user_id: string | null;
    stage_id: string;
    stage_label: string;
    funnel_stage_id: string;
    case_count: number;
    last_case_date: string | null;
    last_captured_at: string | null;
    has_signals: boolean;
    is_stale: boolean;
    intelligence_bullets: string[];
    portal_href: string;
  }>;
};
