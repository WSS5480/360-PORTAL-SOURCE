import { describe, expect, it } from "vitest";
import { buildPrepareWhatMattersMost } from "@/lib/surgical-sales/engagements/buildPrepareWhatMattersMost";

describe("buildPrepareWhatMattersMost", () => {
  it("returns four operational focus lines", () => {
    const card = buildPrepareWhatMattersMost({
      engagementType: "intro_call",
      opportunityStage: "discovery",
      providerSpecialty: "General Surgery",
      provider: {
        id: "p1",
        relationship_strength: "weak",
        provider_relationship_stage: "prospect",
      },
      opportunity: null,
      prepContextState: "discovery",
      suggestedGoal: {
        goal: "Clear picture of procedural workflow and case mix",
        why: "Context",
      },
      talkingPoints: ["Which procedures drive the highest volume today?"],
      risks: {
        risks: [{ key: "limited_or_access", label: "Limited OR access — confirm coordinator" }],
      },
      nextActions: {
        actions: ["Schedule observation access with coordinator"],
        primary_cta: { kind: "add_follow_up_task", label: "Add follow-up task", href: "/e" },
      },
    });

    expect(card.title).toMatch(/Tactical Priorities/i);
    expect(card.lines).toHaveLength(4);
    expect(card.lines[0].value).toMatch(/procedural workflow/i);
    expect(card.lines[1].value.length).toBeGreaterThan(10);
    expect(card.lines[2].value).toMatch(/OR access|coordinator/i);
    expect(card.lines[3].value).toMatch(/Schedule observation/i);
  });

  it("prioritizes intelligence-gap unknown when provider fields are empty", () => {
    const card = buildPrepareWhatMattersMost({
      engagementType: "intro_call",
      opportunityStage: "discovery",
      providerSpecialty: "General Surgery",
      provider: { id: "p1" },
      opportunity: null,
      prepContextState: "discovery",
      suggestedGoal: { goal: "Mapped vendor access process", why: "" },
      talkingPoints: [],
      risks: { risks: [] },
      nextActions: {
        actions: ["Capture provider intelligence after meeting"],
        primary_cta: { kind: "open_engagement", label: "Open engagement", href: "/e" },
      },
    });

    expect(card.lines[1].value.length).toBeGreaterThan(12);
  });
});
