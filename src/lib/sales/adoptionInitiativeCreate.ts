import type { SalesStage } from "@/lib/sales/stages";

export type AdoptionInitiativeCreateLaunch = "standalone" | "provider" | "engagement" | "case";

export type AdoptionInitiativeOrgOption = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  is_primary?: boolean;
};

export type AdoptionInitiativeCreatePrefill = {
  launch: AdoptionInitiativeCreateLaunch;
  provider_id: string | null;
  provider_name: string | null;
  procedure_focus: string | null;
  competitive_product: string | null;
  preference_card_target: string | null;
  account_id: string | null;
  account_name: string | null;
  city: string | null;
  state: string | null;
  organizations: AdoptionInitiativeOrgOption[];
  linked_engagement_id: string | null;
  linked_engagement_label: string | null;
  linked_case_id: string | null;
  linked_case_label: string | null;
  adoption_goal: string | null;
  evaluation_needed: boolean;
};

export type AdoptionInitiativeCreateForm = {
  surgeon_contact_id: string;
  account_id: string;
  account_name: string;
  primary_family_id: string;
  product_labels: string[];
  procedure_focus: string;
  adoption_goal: string;
  stage: SalesStage;
  evaluation_needed: boolean;
  preference_card_target: string;
  linked_engagement_id: string;
  linked_case_id: string;
  competitive_product: string;
  value_dollars: string;
  next_action: string;
  practice_setting: import("@/lib/sales/practiceSetting").PracticeSetting;
  city: string;
  state: string;
  notes: string;
  closed_lost_reason: string;
};

export const emptyAdoptionInitiativeCreateForm = (): AdoptionInitiativeCreateForm => ({
  surgeon_contact_id: "",
  account_id: "",
  account_name: "",
  primary_family_id: "",
  product_labels: [],
  procedure_focus: "",
  adoption_goal: "",
  stage: "discovery",
  evaluation_needed: false,
  preference_card_target: "",
  linked_engagement_id: "",
  linked_case_id: "",
  competitive_product: "",
  value_dollars: "",
  next_action: "",
  practice_setting: "private_practice",
  city: "",
  state: "",
  notes: "",
  closed_lost_reason: "",
});

export function applyAdoptionInitiativePrefill(
  base: AdoptionInitiativeCreateForm,
  prefill: AdoptionInitiativeCreatePrefill,
): AdoptionInitiativeCreateForm {
  const primaryOrg =
    prefill.organizations.find((o) => o.is_primary) ||
    (prefill.account_id
      ? prefill.organizations.find((o) => o.id === prefill.account_id) || {
          id: prefill.account_id,
          name: prefill.account_name || "Organization",
          city: prefill.city || undefined,
          state: prefill.state || undefined,
        }
      : null);

  return {
    ...base,
    surgeon_contact_id: prefill.provider_id || base.surgeon_contact_id,
    account_id: primaryOrg?.id || prefill.account_id || base.account_id,
    account_name: primaryOrg?.name || prefill.account_name || base.account_name,
    city: primaryOrg?.city || prefill.city || base.city,
    state: primaryOrg?.state || prefill.state || base.state,
    procedure_focus: prefill.procedure_focus || base.procedure_focus,
    competitive_product: prefill.competitive_product || base.competitive_product,
    preference_card_target: prefill.preference_card_target || base.preference_card_target,
    adoption_goal: prefill.adoption_goal || base.adoption_goal,
    evaluation_needed: prefill.evaluation_needed || base.evaluation_needed,
    linked_engagement_id: prefill.linked_engagement_id || base.linked_engagement_id,
    linked_case_id: prefill.linked_case_id || base.linked_case_id,
  };
}

export function validateAdoptionInitiativeCreateForm(form: AdoptionInitiativeCreateForm): string | null {
  if (!form.surgeon_contact_id.trim()) return "Select a provider.";
  if (!form.account_id.trim() && !form.account_name.trim()) return "Select or enter an organization.";
  if (!form.primary_family_id.trim()) return "Choose a product line.";
  if (!form.procedure_focus.trim()) return "Enter procedure focus.";
  if (!form.adoption_goal.trim()) return "Enter goal / desired outcome.";
  if (!form.stage.trim()) return "Select a stage.";
  if (form.stage === "lost" && !form.closed_lost_reason.trim()) {
    return "Select a loss reason when stage is Lost.";
  }
  return null;
}
