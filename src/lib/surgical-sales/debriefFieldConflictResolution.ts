import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";

export function fieldUpdateHasUnresolvedConflict(field: LogUpdateRoutedFieldUpdate): boolean {
  return Boolean(field.accepted && field.conflict && !field.conflict.resolution);
}

export function listUnresolvedAcceptedFieldConflicts(
  review: LogUpdateParseResult,
): LogUpdateRoutedFieldUpdate[] {
  if (!review.usesProviderIntelligence) return [];
  return review.fieldUpdates.filter(fieldUpdateHasUnresolvedConflict);
}

export function fieldUpdateIdsExcludingUnresolvedConflicts(
  review: LogUpdateParseResult,
  ids: Iterable<string>,
): string[] {
  const byId = new Map(review.fieldUpdates.map((field) => [field.id, field]));
  return [...ids].filter((id) => {
    const field = byId.get(id);
    if (!field) return false;
    return !(field.conflict && !field.conflict.resolution);
  });
}

export function canAutoAcceptFieldUpdate(field: LogUpdateRoutedFieldUpdate): boolean {
  return !(field.conflict && !field.conflict.resolution);
}

/** Conflicts the rep must resolve — accepted rows block save; selected-outcome rows are shown before accept. */
export function listDebriefFieldsNeedingConflictResolution(
  review: LogUpdateParseResult,
  selectedLinkedFieldIds: ReadonlySet<string>,
): LogUpdateRoutedFieldUpdate[] {
  if (!review.usesProviderIntelligence) return [];
  return review.fieldUpdates.filter(
    (field) =>
      field.conflict &&
      !field.conflict.resolution &&
      (field.accepted || selectedLinkedFieldIds.has(field.id)),
  );
}
