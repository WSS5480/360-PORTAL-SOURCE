/**
 * Shared types for live surgical-case dictation E2E fixtures.
 * Assertions target rep-facing UI surfaces after the real intelligence pipeline runs.
 */

export type CaseType = "observation" | "product_support";

export type IntelligenceSurface =
  | "case_intelligence"
  | "provider_dossier"
  | "people_access"
  | "relationship_map"
  | "provider_timeline"
  | "evidence";

export type IntelligenceExpectation = {
  id: string;
  /** Human-readable label used in failure messages. */
  label: string;
  /** All patterns must match the surface text. */
  match: RegExp[];
  /** Optional category heading under which the fact should appear. */
  category?: RegExp;
  surfaces?: IntelligenceSurface[];
};

export type IntelligenceForbidden = {
  id: string;
  label: string;
  /** Any match fails the assertion (invented / negated / miscategorized junk). */
  match: RegExp[];
  surfaces?: IntelligenceSurface[];
};

export type ExpectedContact = {
  name: RegExp;
  /** Role / importance hints when present on Relationship Map. */
  roleHint?: RegExp;
  /**
   * When true, contact must also appear in People & Access or Relationship Map.
   * Default false for single-note fixtures (case capture is the hard gate);
   * accumulation fixtures set this true after repeated mentions.
   */
  requireProviderSurfaces?: boolean;
};

export type SurgicalCaseDictationFixture = {
  id: string;
  name: string;
  caseType: CaseType;
  procedureType: string;
  specialty?: string;
  /** Unique provider last-name stem; setup appends a run suffix. */
  providerLastNameStem: string;
  providerFirstName: string;
  dictation: string;
  expected: IntelligenceExpectation[];
  forbidden: IntelligenceForbidden[];
  expectedContacts?: ExpectedContact[];
  /** Quotes / snippets that should appear inside Evidence disclosures. */
  expectedEvidence?: RegExp[];
};

export type AccumulationNoteStep = {
  dictation: string;
  /** Facts that must be visible after this note finishes processing. */
  expectedAfter: IntelligenceExpectation[];
  forbiddenAfter?: IntelligenceForbidden[];
};

export type AccumulationFixture = {
  id: string;
  name: string;
  caseType: CaseType;
  procedureType: string;
  specialty?: string;
  providerLastNameStem: string;
  providerFirstName: string;
  notes: AccumulationNoteStep[];
  /** Patterns proving a repeated fact strengthened instead of duplicating. */
  strengthenMatchers: RegExp[];
  /** Product / fact lines that must not appear more than once as distinct dossier rows. */
  noDuplicateMatchers: RegExp[];
  /** Facts from earlier notes that must still be present after later notes. */
  retainedAcrossNotes: RegExp[];
  /** Facts introduced only in later notes. */
  addedLater: RegExp[];
  expectedContacts?: ExpectedContact[];
};

export type IntelligenceFailureKind =
  | "missing_expected"
  | "forbidden_present"
  | "duplicate_fact"
  | "miscategorized"
  | "non_accumulating"
  | "missing_contact"
  | "missing_evidence"
  | "missing_timeline";

export type IntelligenceFailure = {
  kind: IntelligenceFailureKind;
  fixtureId: string;
  surface: IntelligenceSurface | "setup";
  detail: string;
};
