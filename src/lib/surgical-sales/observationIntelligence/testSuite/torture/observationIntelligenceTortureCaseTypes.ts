import type { TortureFindingToken } from "./tortureFindingVocabulary";

export type TortureDictationStyle =
  | "short"
  | "conversational"
  | "messy"
  | "long"
  | "ambiguous"
  | "none";

export type ObservationTortureTestCase = {
  id: number;
  style: TortureDictationStyle;
  dictation: string;
  expectedFindings: TortureFindingToken[];
  forbiddenFindings: TortureFindingToken[];
  /** Prior-case dictations for cross-case confidence / dedupe validation. */
  crossCaseDictations?: string[];
  description?: string;
};
