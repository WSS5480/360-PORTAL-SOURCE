import { describe, expect, it } from "vitest";
import {
  assistActionsForPrepareAsks,
  assistActionsForTacticalSection,
} from "./prepareTacticalAiAssistActions";

describe("prepareTacticalAiAssist", () => {
  it("maps intro call top asks to full assist set", () => {
    expect(assistActionsForTacticalSection("top_asks", "intro_call")).toEqual([
      "tighten_asks",
      "add_surgical_workflow_question",
      "add_access_question",
      "simplify_intro_call",
    ]);
  });

  it("offers simplify on goal for intro call prepare today", () => {
    expect(assistActionsForPrepareAsks("follow_up")).not.toContain("simplify_intro_call");
    expect(assistActionsForPrepareAsks("intro_call")).toContain("simplify_intro_call");
  });
});
