import { describe, expect, it } from "vitest";

import {
  buildRepFriendlyIntelligenceBriefing,
  groupRepFriendlyIntelligenceItems,
} from "./repFriendlyIntelligenceGroups";

function groupItems(lines: string[]) {
  return groupRepFriendlyIntelligenceItems(
    lines.map((text, index) => ({
      id: `item-${index}`,
      text,
      evidenceText: text,
      sourceNoteText: text,
      extractedFactId: `item-${index}`,
    })),
  );
}

describe("groupRepFriendlyIntelligenceItems", () => {
  it("groups extracted observation facts into rep-friendly universal categories", () => {
    const groups = groupItems([
      "Current setup: standard rigid suction irrigation",
      "MiraMesh was used during the case",
      "Access was difficult in tight anatomy; assistant repositioning was needed",
      "FlexiScope interest: Asked a few questions about FlexiScope and how it compares to what they're using now",
      "Jennifer — Scheduling Coordinator",
      "Follow up with Jennifer and identify an appropriate evaluation case",
    ]);

    expect(groups.find((group) => group.id === "current_workflow")?.items.map((item) => item.text)).toEqual([
      "Current setup: standard rigid suction irrigation",
      "MiraMesh was used during the case",
    ]);
    expect(groups.find((group) => group.id === "challenges_friction")?.items.map((item) => item.text)).toEqual([
      "Access was difficult in tight anatomy; assistant repositioning was needed",
    ]);
    expect(groups.find((group) => group.id === "product_signals")?.items.map((item) => item.text)).toEqual([
      "FlexiScope interest: Asked a few questions about FlexiScope and how it compares to what they're using now",
    ]);
    expect(groups.find((group) => group.id === "people_access")?.items.map((item) => item.text)).toEqual([
      "Jennifer — Scheduling Coordinator",
    ]);
    expect(groups.find((group) => group.id === "next_steps")?.items.map((item) => item.text)).toEqual([
      "Follow up with Jennifer and identify an appropriate evaluation case",
    ]);
  });

  it("hides low-value metadata and merges duplicate themes", () => {
    const groups = groupItems([
      "Robotic ventral hernia repair",
      "Colorectal",
      "Procedure Focus",
      "Visualization or access issue",
      "Visualization was challenging in deeper portions of the case",
      "Visualization was challenging in deeper portions of the case.",
    ]);

    const allItems = groups.flatMap((group) => group.items.map((item) => item.text));
    expect(allItems).toEqual(["Visualization was challenging in deeper portions of the case"]);
  });

  it("uses business metadata before wording when classifying cross-domain intelligence", () => {
    const briefing = buildRepFriendlyIntelligenceBriefing([
      {
        text: "Provider is receptive to future discussion",
        evidenceText: "Provider is receptive to future discussion",
        sourceNoteText: "Provider is receptive to future discussion",
        concept: "provider_sentiment",
      },
      {
        text: "Morgan — Office Manager",
        evidenceText: "Morgan — Office Manager",
        sourceNoteText: "Morgan — Office Manager",
        concept: "contact_role",
        personMentioned: "Morgan",
      },
      {
        text: "Requested compatibility literature",
        evidenceText: "Requested compatibility literature",
        sourceNoteText: "Requested compatibility literature",
        concept: "requested_item",
      },
    ]);

    expect(briefing.groups.find((group) => group.id === "product_signals")?.items[0]?.text).toBe(
      "Provider is receptive to future discussion",
    );
    expect(briefing.groups.find((group) => group.id === "people_access")?.items[0]?.text).toBe(
      "Morgan — Office Manager",
    );
    expect(briefing.groups.find((group) => group.id === "next_steps")?.items[0]?.text).toBe(
      "Requested compatibility literature",
    );
    expect(briefing.summary).toMatch(/Product signal|Access path|Next step/i);
  });

  it("suppresses items missing evidence or whose evidence cannot prove the claim", () => {
    const briefing = buildRepFriendlyIntelligenceBriefing([
      {
        text: "FlexiScope was used during the case",
        evidenceText: "Asked about FlexiScope and compared it to current setup.",
        sourceNoteText: "Asked about FlexiScope and compared it to current setup.",
        concept: "current_product",
      },
      {
        text: "Follow up with the office manager",
      },
      {
        text: "Access was difficult in tight anatomy",
        evidenceText: "Access was difficult in tight anatomy.",
        sourceNoteText: "Access was difficult in tight anatomy.",
        concept: "visualization_or_access_issue",
      },
    ]);

    const allItems = briefing.groups.flatMap((group) => group.items);
    expect(allItems.map((item) => item.text)).toEqual(["Access was difficult in tight anatomy"]);
    expect(allItems[0]?.verification).toEqual({
      claim: "Access was difficult in tight anatomy",
      evidenceText: "Access was difficult in tight anatomy.",
      sourceNoteText: "Access was difficult in tight anatomy.",
      extractedFactId: "challenges_friction:access was difficult in tight anatomy",
      assignedCategory: "challenges_friction",
      verificationStatus: "Verified",
    });
  });
});
