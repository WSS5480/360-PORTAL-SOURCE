export type OptionalPlanningSummaryParts = {
  productInterest: "none" | "selected";
  initiative: "linked" | "not linked";
  notes: "added" | "not added";
};

export function buildOptionalPlanningSummaryParts(input: {
  productInterestSelected: boolean;
  initiativeLinked: boolean;
  notesAdded: boolean;
}): OptionalPlanningSummaryParts {
  return {
    productInterest: input.productInterestSelected ? "selected" : "none",
    initiative: input.initiativeLinked ? "linked" : "not linked",
    notes: input.notesAdded ? "added" : "not added",
  };
}

export function formatOptionalPlanningSummary(parts: OptionalPlanningSummaryParts): string {
  return `Product interest: ${parts.productInterest} · Opportunity: ${parts.initiative} · Notes: ${parts.notes}`;
}

export function buildOptionalPlanningSummary(input: {
  productInterestSelected: boolean;
  initiativeLinked: boolean;
  notesAdded: boolean;
}): string {
  return formatOptionalPlanningSummary(buildOptionalPlanningSummaryParts(input));
}
