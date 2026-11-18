import { describe, expect, it } from "vitest";

import {

  displayNextFieldMoveLine,

  formatOverviewAccessConfidence,

  formatOverviewMomentum,

  formatOverviewVisibility,

  sanitizeFieldFriendlyOverviewCopy,

  softenOverviewFocusCopy,

} from "./providerOverviewBriefingCopy";



describe("providerOverviewBriefingCopy", () => {

  it("maps visibility bands to rep-friendly language", () => {

    expect(formatOverviewVisibility("High")).toBe("Early");

    expect(formatOverviewVisibility("Medium")).toBe("Building");

    expect(formatOverviewVisibility("Low")).toBe("Strong");

  });



  it("softens punitive focus phrasing", () => {

    expect(softenOverviewFocusCopy("Primary blocker on access")).toBe(

      "current focus on access",

    );

  });



  it("replaces technical overview vocabulary", () => {

    expect(sanitizeFieldFriendlyOverviewCopy("Visibility risk is critical")).toBe(

      "visibility is priority",

    );

    expect(sanitizeFieldFriendlyOverviewCopy("Field signal captured")).toBe(

      "readiness captured",

    );

  });



  it("maps confidence to relationship-forward labels", () => {

    expect(formatOverviewAccessConfidence("Developing")).toBe("Building");

    expect(formatOverviewAccessConfidence("Validated")).toBe("Validated");

  });



  it("formats momentum as visibility and access confidence", () => {

    expect(formatOverviewMomentum("Early", "Building")).toBe(

      "Early visibility · Building access confidence",

    );

  });



  it("strips redundant next-move prefix for pathway section", () => {

    expect(displayNextFieldMoveLine("Next field move: Validate clinical fit")).toBe(

      "Validate clinical fit",

    );

    expect(displayNextFieldMoveLine("Validate clinical fit")).toBe("Validate clinical fit");

  });

});

