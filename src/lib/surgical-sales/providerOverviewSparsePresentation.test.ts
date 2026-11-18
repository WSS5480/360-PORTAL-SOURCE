import { describe, expect, it } from "vitest";

import {

  extractLatestNoteHighlight,

  isOverviewAbsenceCopy,

  resolveIntelligenceReferencePageLead,

  shouldIncludeOverviewContextBullet,

} from "./providerOverviewSparsePresentation";



describe("providerOverviewSparsePresentation", () => {

  it("filters absence-framed overview bullets", () => {

    expect(

      shouldIncludeOverviewContextBullet({

        id: "eng-none",

        text: "No engagements on the books yet",

      }),

    ).toBe(false);

    expect(

      shouldIncludeOverviewContextBullet({

        id: "eng-progress",

        text: "Intro call is in progress — close the loop while it is fresh",

      }),

    ).toBe(true);

    expect(isOverviewAbsenceCopy("Limited procedural understanding captured")).toBe(true);

  });



  it("uses a sparse intelligence page lead when no field evidence exists", () => {

    expect(resolveIntelligenceReferencePageLead(false)).toMatch(/no need to fill everything/i);

    expect(resolveIntelligenceReferencePageLead(true)).toMatch(/what we know/i);

  });



  it("extracts the latest note highlight for thin accounts", () => {

    expect(

      extractLatestNoteHighlight([

        { kind: "engagement", summary: "Intro call completed" },

        { kind: "note", summary: "Provider open to observing a robotic ventral case next month" },

      ]),

    ).toMatch(/robotic ventral/i);

  });

});

