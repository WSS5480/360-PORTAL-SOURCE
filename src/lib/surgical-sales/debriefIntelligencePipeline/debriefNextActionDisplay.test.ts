import { describe, expect, it } from "vitest";

import { displayFollowUpAction } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import { normalizeNextActionDisplayTitle } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefNextActionDisplay";

describe("normalizeNextActionDisplayTitle", () => {
  it("rewrites rep-offered clinical data and observation commitments", () => {
    expect(
      normalizeNextActionDisplayTitle(
        "I told him I'd be happy to bring some comparative clinical data and set up an observation case in the future",
      ),
    ).toBe("Share comparative clinical data and schedule observation case");
  });

  it("rewrites third-party email requests embedded in scheduler sentences", () => {
    expect(
      normalizeNextActionDisplayTitle(
        "Sarah, the surgery scheduler, handles all observation requests and asked me to email her a few possible dates for next month",
      ),
    ).toBe("Email proposed observation dates");
  });

  it("rewrites third-party email requests without pronouns", () => {
    expect(
      normalizeNextActionDisplayTitle("Asked me to email her a few possible dates for next month"),
    ).toBe("Email proposed observation dates");
  });

  it("rewrites connect-with scheduling intros into line-up observation tasks", () => {
    expect(
      normalizeNextActionDisplayTitle(
        "My next step is to connect with Rachel regarding scheduling requirements and determine whether observation access can be arranged for an upcoming lumbar fusion case",
      ),
    ).toBe("Connect with Rachel and line up lumbar fusion observation");
  });

  it("rewrites send-dates tasks to named contacts", () => {
    expect(
      normalizeNextActionDisplayTitle(
        "My next step is to send Sarah available observation dates and schedule my first case",
      ),
    ).toBe("Send Sarah available observation dates and schedule first case");
  });

  it("preserves already-clean imperative labels", () => {
    expect(normalizeNextActionDisplayTitle("Schedule product evaluation")).toBe("Schedule product evaluation");
    expect(normalizeNextActionDisplayTitle("Confirm credentialing pathway")).toBe("Confirm credentialing pathway");
  });

  it("delegates displayFollowUpAction through the same normalizer", () => {
    expect(displayFollowUpAction("Get Jennifer's phone or email.")).toBe("Get Jennifer contact information");
    expect(
      displayFollowUpAction(
        "Better understand what upcoming robotic hernia cases might be available for observation",
      ),
    ).toBe("Identify upcoming robotic hernia observation opportunities");
  });
});
