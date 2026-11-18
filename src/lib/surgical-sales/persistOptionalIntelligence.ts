/**
 * Persist optional intelligence — never validates fields or advances pathway.
 */

import {
  OPTIONAL_INTELLIGENCE_CAPTURE_CONTEXT,
  OPTIONAL_INTELLIGENCE_CATEGORY_BY_ID,
  isOptionalIntelligenceSupportContactCategory,
  type OptionalIntelligenceCategoryId,
} from "@/lib/surgical-sales/optionalIntelligenceCategories";

export async function persistOptionalIntelligence(input: {
  providerId: string;
  categoryId: OptionalIntelligenceCategoryId;
  value: string;
}): Promise<Record<string, unknown>> {
  if (isOptionalIntelligenceSupportContactCategory(input.categoryId)) {
    throw new Error("Support contacts must be added through the support contact workflow.");
  }

  const category = OPTIONAL_INTELLIGENCE_CATEGORY_BY_ID[input.categoryId];
  const trimmed = input.value.trim();
  if (!trimmed) {
    throw new Error("Enter a note before saving.");
  }

  const body: Record<string, unknown> = category.intelligenceKey
    ? {
        intelligence: {
          [category.intelligenceKey]: trimmed,
        },
      }
    : {
        planning: {
          [category.primaryDbKey]: trimmed,
        },
        planning_capture_context: OPTIONAL_INTELLIGENCE_CAPTURE_CONTEXT,
        intelligence_discovery_stances: {
          [category.primaryDbKey]: { stance: "not_relevant" },
        },
      };

  const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(input.providerId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await res.json()) as {
    ok?: boolean;
    provider?: Record<string, unknown>;
    error?: string;
  };
  if (!res.ok || !payload.provider) {
    throw new Error(payload.error ?? "Could not save optional intelligence.");
  }
  return payload.provider;
}
