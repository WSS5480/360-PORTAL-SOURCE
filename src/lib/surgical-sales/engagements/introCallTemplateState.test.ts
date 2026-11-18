import { describe, expect, it } from "vitest";
import {
  buildGeneratedSuggestions,
  buildIntroCallTemplateState,
  computeHasManualEdits,
  removeAppliedTemplateFromDraft,
  resolveSelectedProductFocus,
  snapshotFromTemplate,
} from "@/lib/surgical-sales/engagements/introCallTemplateState";
import { applyIntroCallTemplateToDraft } from "@/lib/surgical-sales/engagements/introCallTemplateApply";

describe("introCallTemplateState", () => {
  it("product focus changes generated suggestions without touching draft", () => {
    const generic = buildGeneratedSuggestions({ productLine: "" });
    const acsis = buildGeneratedSuggestions({ productLine: "ACSIS" });
    expect(generic.smartObjective).not.toBe(acsis.smartObjective);
    expect(acsis.smartObjective.toLowerCase()).toMatch(/hernia/);
  });

  it("general surgery with no product stays generic", () => {
    const focus = resolveSelectedProductFocus("");
    const template = buildGeneratedSuggestions({
      productLine: "",
      providerSpecialty: "General Surgery",
    });
    expect(focus).toBe("generic");
    expect(template.smartObjective.toLowerCase()).not.toMatch(/hernia/);
  });

  it("detects manual edits after template apply", () => {
    const template = buildGeneratedSuggestions({ productLine: "ACSIS" });
    const snapshot = snapshotFromTemplate(template);
    const applied = applyIntroCallTemplateToDraft({}, template, { replace: true });
    expect(computeHasManualEdits(applied, snapshot, snapshotFromTemplate(template))).toBe(
      false,
    );
    const edited = { ...applied, observation_goal: "My custom goal" };
    expect(computeHasManualEdits(edited, snapshot, snapshotFromTemplate(template))).toBe(
      true,
    );
  });

  it("remove template clears only applied snapshot fields", () => {
    const template = buildGeneratedSuggestions({ productLine: "ACSIS" });
    const snapshot = snapshotFromTemplate(template);
    const draft = {
      ...applyIntroCallTemplateToDraft({}, template, { replace: true }),
      observation_goal: "Kept manual objective",
    };
    const next = removeAppliedTemplateFromDraft(draft, snapshot);
    expect(next.observation_goal).toBe("Kept manual objective");
    expect(next.pre_observation_impact_opening_statement).toBe("");
  });

  it("status badge shows applied vs preview vs custom", () => {
    const template = buildGeneratedSuggestions({ productLine: "ACSIS" });
    const snapshot = snapshotFromTemplate(template);
    const applied = applyIntroCallTemplateToDraft({}, template, { replace: true });

    const appliedState = buildIntroCallTemplateState({
      productLine: "ACSIS",
      draft: applied,
      appliedTemplateId: "acsis",
      appliedSnapshot: snapshot,
    });
    expect(appliedState.statusLabel).toBe("ACSIS in your plan");

    const previewState = buildIntroCallTemplateState({
      productLine: "ACSIS",
      draft: {},
      appliedTemplateId: null,
      appliedSnapshot: null,
    });
    expect(previewState.statusLabel).toBe("ACSIS suggestions");

    const customState = buildIntroCallTemplateState({
      productLine: "ACSIS",
      draft: { ...applied, observation_goal: "Edited" },
      appliedTemplateId: "acsis",
      appliedSnapshot: snapshot,
    });
    expect(customState.statusLabel).toBe("Custom edited");
  });
});
