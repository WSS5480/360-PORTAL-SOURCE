import fs from "node:fs";
import path from "node:path";

import {
  renderIntelligenceRegressionModel,
  type IntelligenceRegressionFixtureType,
  type IntelligenceRegressionRenderedModel,
} from "@/lib/surgical-sales/intelligenceRegression/renderIntelligenceRegression";

export type IntelligenceRegressionFixture = {
  name: string;
  type?: IntelligenceRegressionFixtureType;
  note: string;
  mustContain: string[];
  mustNotContain: string[];
};

export type IntelligenceRegressionFixtureFile = IntelligenceRegressionFixture & {
  filePath: string;
  folder: string;
};

export type IntelligenceRegressionAssertionFailure = {
  kind: "missing_expected_output" | "forbidden_output_present";
  value: string;
};

export type IntelligenceRegressionResult = {
  fixture: IntelligenceRegressionFixtureFile;
  passed: boolean;
  rendered: IntelligenceRegressionRenderedModel;
  failures: IntelligenceRegressionAssertionFailure[];
};

export type IntelligenceRegressionReport = {
  passed: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
  results: IntelligenceRegressionResult[];
};

export const INTELLIGENCE_REGRESSION_FIXTURE_ROOT = path.join(
  process.cwd(),
  "src",
  "lib",
  "surgical-sales",
  "intelligenceRegression",
  "fixtures",
);

const FOLDER_TO_TYPE: Record<string, IntelligenceRegressionFixtureType> = {
  "intro-calls": "intro_call",
  observations: "observation",
  debriefs: "debrief",
  "product-support-cases": "product_support_case",
};

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function readJsonFixture(filePath: string, folder: string): IntelligenceRegressionFixtureFile {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as IntelligenceRegressionFixture;
  return {
    ...parsed,
    type: parsed.type ?? FOLDER_TO_TYPE[folder],
    mustContain: Array.isArray(parsed.mustContain) ? parsed.mustContain : [],
    mustNotContain: Array.isArray(parsed.mustNotContain) ? parsed.mustNotContain : [],
    filePath,
    folder,
  };
}

export function loadIntelligenceRegressionFixtures(
  root = INTELLIGENCE_REGRESSION_FIXTURE_ROOT,
): IntelligenceRegressionFixtureFile[] {
  if (!fs.existsSync(root)) return [];

  return Object.keys(FOLDER_TO_TYPE).flatMap((folder) => {
    const folderPath = path.join(root, folder);
    if (!fs.existsSync(folderPath)) return [];
    return fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map((file) => readJsonFixture(path.join(folderPath, file), folder));
  });
}

export function runIntelligenceRegressionFixture(
  fixture: IntelligenceRegressionFixtureFile,
): IntelligenceRegressionResult {
  const rendered = renderIntelligenceRegressionModel({
    fixtureType: fixture.type ?? FOLDER_TO_TYPE[fixture.folder],
    note: fixture.note,
  });
  const renderedText = normalizeForMatch(rendered.renderedText);
  const failures: IntelligenceRegressionAssertionFailure[] = [];

  for (const expected of fixture.mustContain) {
    if (!renderedText.includes(normalizeForMatch(expected))) {
      failures.push({ kind: "missing_expected_output", value: expected });
    }
  }

  for (const forbidden of fixture.mustNotContain) {
    if (renderedText.includes(normalizeForMatch(forbidden))) {
      failures.push({ kind: "forbidden_output_present", value: forbidden });
    }
  }

  return {
    fixture,
    passed: failures.length === 0,
    rendered,
    failures,
  };
}

export function runIntelligenceRegressionSuite(
  fixtures = loadIntelligenceRegressionFixtures(),
): IntelligenceRegressionReport {
  const results = fixtures.map((fixture) => runIntelligenceRegressionFixture(fixture));
  const passedCount = results.filter((result) => result.passed).length;
  const failedCount = results.length - passedCount;

  return {
    passed: failedCount === 0,
    total: results.length,
    passedCount,
    failedCount,
    results,
  };
}
