import { describe, expect, it } from "vitest";
import { applyConversationFocusToTemplatePreview } from "@/lib/surgical-sales/engagements/introCallConversationFocus";
import { buildIntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import {
  applyIntroCallAiRecommendationSectionToDraft,
  mergeIntroCallAppliedSnapshotForSection,
} from "@/lib/surgical-sales/engagements/introCallAiRecommendationSections";
import { applyIntroCallTemplateToDraft } from "@/lib/surgical-sales/engagements/introCallTemplateApply";
import { buildIntroCallAiRecommendationsSummary } from "@/lib/surgical-sales/engagements/introCallAiRecommendationsSummary";
import { buildIntroCallTemplateState, snapshotFromTemplate } from "@/lib/surgical-sales/engagements/introCallTemplateState";
import { removeAppliedTemplateFromDraft } from "@/lib/surgical-sales/engagements/introCallTemplateState";

describe("Intro Call Preparation UX contracts", () => {
  it("product focus change updates AI recommendation template without mutating call plan draft", () => {
    const acsis = buildIntroCallPrepTemplate({ productFocus: "acsis" });
    const generic = buildIntroCallPrepTemplate({ productFocus: "generic" });
    const draft = { observation_goal: "Rep-written objective only" };

    const acsisState = buildIntroCallTemplateState({
      productLine: "ACSIS",
      draft,
      appliedTemplateId: null,
      appliedSnapshot: null,
    });
    const genericState = buildIntroCallTemplateState({
      productLine: "",
      draft,
      appliedTemplateId: null,
      appliedSnapshot: null,
    });

    expect(acsisState.generatedSuggestions.smartObjective).not.toBe(
      genericState.generatedSuggestions.smartObjective,
    );
    expect(buildIntroCallAiRecommendationsSummary({
      templateState: acsisState,
      productLine: "ACSIS",
      conversationFocus: [],
      readiness: {
        level: "minimal",
        level_label: "Minimal",
        percent_complete: 0,
        met_count: 0,
        total_count: 4,
        signals: [],
      },
    }).templateName).toBe("ACSIS");

    expect(draft.observation_goal).toBe("Rep-written objective only");
  });

  it("conversation focus reorders probes only in preview/apply path", () => {
    const template = buildIntroCallPrepTemplate({ productFocus: "generic" });
    const baseProbes = [...template.probesInformationToGather];
    const focused = applyConversationFocusToTemplatePreview(template, ["observation_access"]);

    expect(focused.smartObjective).toBe(template.smartObjective);
    expect(focused.probesInformationToGather[0]).not.toBe(baseProbes[0]);
    expect(focused.probesInformationToGather.join("|")).not.toBe(baseProbes.join("|"));
  });

  it("full insert updates draft; clear inserted removes template-aligned fields", () => {
    const template = buildIntroCallPrepTemplate({ productFocus: "generic" });
    const empty = {};
    const inserted = applyIntroCallTemplateToDraft(empty, template, { replace: true });
    expect(String(inserted.observation_goal ?? "").length).toBeGreaterThan(20);

    const snapshot = snapshotFromTemplate(template);
    const cleared = removeAppliedTemplateFromDraft(inserted, snapshot);
    expect(String(cleared.observation_goal ?? "").trim()).toBe("");
  });

  it("section insert tracks snapshot so clear-inserted can remove that section", () => {
    const template = buildIntroCallPrepTemplate({ productFocus: "generic" });
    const focused = applyConversationFocusToTemplatePreview(template, ["product_fit"]);
    const draft = { observation_goal: "Keep this" };
    const next = applyIntroCallAiRecommendationSectionToDraft(draft, focused, "priority_probes", {
      replace: true,
    });
    const snapshot = mergeIntroCallAppliedSnapshotForSection(null, focused, "priority_probes");
    const cleared = removeAppliedTemplateFromDraft(next, snapshot);

    expect(cleared.observation_goal).toBe("Keep this");
    expect(String(cleared.pre_observation_probes ?? "").trim()).toBe("");
  });
});
