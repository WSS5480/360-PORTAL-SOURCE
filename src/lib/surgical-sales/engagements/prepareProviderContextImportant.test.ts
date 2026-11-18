import { describe, expect, it } from "vitest";
import { shouldExpandPrepareProviderContext } from "./prepareProviderContextImportant";

describe("shouldExpandPrepareProviderContext", () => {
  it("stays collapsed when only baseline fields would be empty intel", () => {
    expect(
      shouldExpandPrepareProviderContext({
        knownIntelligence: { bullets: [], last_key_insight: null },
        supportContactsSummary: null,
      }),
    ).toBe(false);
  });

  it("expands when last key insight exists", () => {
    expect(
      shouldExpandPrepareProviderContext({
        knownIntelligence: {
          bullets: [],
          last_key_insight: {
            body: "Prefers morning blocks",
            at_label: "May 2",
            source_label: "Visit",
            href: null,
          },
        },
        supportContactsSummary: null,
      }),
    ).toBe(true);
  });

  it("expands when support contacts are linked", () => {
    expect(
      shouldExpandPrepareProviderContext({
        knownIntelligence: { bullets: [], last_key_insight: null },
        supportContactsSummary: "Karen Smith · Scheduler",
      }),
    ).toBe(true);
  });
});
