import type { NewCaseProviderContext } from "./NewCaseProviderPanel";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export function minimalPlanningCompletion(
  overrides: Partial<ProviderPlanningCompletion> = {},
): ProviderPlanningCompletion {
  return {
    status: "in_progress",
    percent: 40,
    filled: 2,
    total: 10,
    sections: [],
    sections_complete: 1,
    sections_total: 5,
    ...overrides,
  };
}

export function minimalProviderContext(
  overrides: Partial<NewCaseProviderContext> = {},
): NewCaseProviderContext {
  return {
    provider: {
      id: "provider-1",
      first_name: "Alex",
      last_name: "Surgeon",
      provider_procedure_focus: "Hernia repair",
      provider_evaluation_openness: "interest_in_acsis_discussed",
    },
    specialty: "General surgery",
    primary_organization: { id: "org-1", name: "Metro General", territory: null },
    organization_links: [],
    planning_completion: minimalPlanningCompletion(),
    opportunities: [],
    ...overrides,
  };
}
