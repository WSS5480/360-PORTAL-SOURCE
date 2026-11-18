/**
 * CLI reporter for the observation intelligence torture validation suite.
 * Run: npm run test:observation-torture
 */
import {
  formatTortureSuiteReport,
  meetsObservationTorturePassRate,
  OBSERVATION_INTELLIGENCE_TORTURE_MIN_PASS_RATE,
  runObservationTortureSuite,
} from "../src/lib/surgical-sales/observationIntelligence/testSuite/torture/runObservationTortureSuite.ts";

const suite = runObservationTortureSuite();
console.log(formatTortureSuiteReport(suite));
console.log("");
console.log(
  `Minimum pass rate: ${Math.round(OBSERVATION_INTELLIGENCE_TORTURE_MIN_PASS_RATE * 100)}%`,
);
console.log(`Actual pass rate: ${Math.round(suite.passRate * 100)}%`);

if (!meetsObservationTorturePassRate(suite)) {
  process.exitCode = 1;
}
