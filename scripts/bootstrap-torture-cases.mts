/**
 * Validates torture dictation cases against the current extraction engine.
 * Run: npx tsx scripts/bootstrap-torture-cases.mts
 */
import { OBSERVATION_INTELLIGENCE_TORTURE_CASES } from "../src/lib/surgical-sales/observationIntelligence/testSuite/torture/observationIntelligenceTortureCases.ts";
import {
  formatTortureSuiteReport,
  meetsObservationTorturePassRate,
  runObservationTortureSuite,
} from "../src/lib/surgical-sales/observationIntelligence/testSuite/torture/runObservationTortureSuite.ts";

const suite = runObservationTortureSuite();
console.log(formatTortureSuiteReport(suite));
console.log("");
console.log(`Cases loaded: ${OBSERVATION_INTELLIGENCE_TORTURE_CASES.length}`);
console.log(`Gate: ${meetsObservationTorturePassRate(suite) ? "PASS" : "FAIL"}`);

if (!meetsObservationTorturePassRate(suite)) {
  process.exitCode = 1;
}
