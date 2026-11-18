/**
 * Leaf types for log-update field routing — breaks circular imports between
 * logUpdateProviderRouting and debriefIntelligenceMergeCategories.
 */

import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import type { IntelligenceSaveDestination } from "@/lib/surgical-sales/intelligenceSaveDestination";

export type LogUpdateConflictResolution = "replace" | "append" | null;

export type LogUpdateFieldConflict = {
  dbKey: string;
  existingValue: string;
  newValue: string;
  resolution: LogUpdateConflictResolution;
};

export type LogUpdateRoutedFieldUpdate = {
  id: string;
  label: string;
  dbKey: string;
  proposedValue: string;
  accepted: boolean;
  conflict: LogUpdateFieldConflict | null;
  /** Intelligence scope proposed before save. */
  proposedScope: IntelligenceScope;
  scopeReason: string;
  /** User-facing save destination (Facility / Provider / Case / Engagement note). */
  proposedDestination: IntelligenceSaveDestination;
  destinationReason: string;
};
