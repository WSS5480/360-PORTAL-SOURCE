export function buildProductSupportOptionalPlanningSummary(input: {
  initiativeLinked: boolean;
  notesAdded: boolean;
}): string {
  const initiative = input.initiativeLinked ? "linked" : "not linked";
  const notes = input.notesAdded ? "added" : "not added";
  return `Opportunity: ${initiative} · Notes: ${notes}`;
}
