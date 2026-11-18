import { describe, expect, it } from "vitest";
import { buildProductSupportRepPresentationView } from "./buildProductSupportRepPresentationView";
import { extractProductSupportObservation } from "./extractProductSupportObservation";
import { extractProductSupportOutcomesFromNote } from "./extractProductSupportOutcomesFromNote";

const DR_ONION_NOTE = `Stopped by Dr. Onion's case today to provide product support. Overall things went smoothly, but there was a brief delay at the beginning of the case while the team confirmed they had the correct mesh size available.

Dr. Onion didn't have any major complaints, but he did mention that visualization can still be challenging in some of the larger abdominal wall cases. During the procedure he spent a little extra time getting the exposure where he wanted it before moving forward.

The scrub tech asked a couple questions about product sizing and available options, so there may be an opportunity for some additional staff education. Other than that, the team seemed comfortable with the workflow and there were no major issues during the case.

Worth following up on inventory planning and continuing to watch whether visualization comes up in future cases.`;

describe("buildProductSupportRepPresentationView", () => {
  it("surfaces outcome badges and follow-up for a captured support note", () => {
    const view = buildProductSupportRepPresentationView({
      caseRow: { id: "case-onion", case_type: "product_support", status: "confirmed" },
      activities: [
        {
          id: "note-1",
          activity_type: "note",
          body: DR_ONION_NOTE,
          metadata_json: {
            ai_extraction: {
              productSupport: extractProductSupportObservation(DR_ONION_NOTE),
              observation: { entities: [], summary: DR_ONION_NOTE, extractedAt: "", model: "rules" },
              outcomes: extractProductSupportOutcomesFromNote(DR_ONION_NOTE),
            },
          },
          created_at: new Date().toISOString(),
        },
      ],
      providerContact: {
        first_name: "Mark",
        last_name: "Onion",
      },
    });

    expect(view.hasCapturedNotes).toBe(true);
    expect(view.outcomeBadges.providerReaction).toBe("Positive");
    expect(view.outcomeBadges.caseResult).toBe("Successful");
    expect(view.outcomeBadges.nextStep).toBe("Training");
    expect(view.followUp.items.some((item) => /inventory planning/i.test(item.text))).toBe(true);
  });
});
