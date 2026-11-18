import { describe, expect, it } from "vitest";
import {
  appendIntelligenceCaptureToNotes,
  bootstrapTacticalAsksFromProbes,
  createTacticalAsk,
  dismissTacticalAsk,
  mergeBriefQuestionsIntoAsks,
  parsePrepareTacticalAsksDocument,
  reconcileTacticalAsksWithProbes,
  serializePrepareTacticalAsks,
  syncProbesFromTacticalAsks,
  asksForFieldExecution,
} from "@/lib/surgical-sales/engagements/prepareTacticalAsks";

describe("prepareTacticalAsks", () => {
  it("bootstraps from probe lines when stored is empty", () => {
    const asks = bootstrapTacticalAsksFromProbes({
      stored: null,
      probes: "What workflow creates friction?\nWho controls OR access?",
      suggestedPoints: [],
    });
    expect(asks).toHaveLength(2);
    expect(asks[0]?.source).toBe("ai_recommended");
    expect(asks[0]?.status).toBe("unanswered");
  });

  it("syncs active asks back to probes text", () => {
    const asks = [
      createTacticalAsk({ text: "Workflow friction?", source: "ai_recommended" }),
      createTacticalAsk({ text: "Custom territory ask", source: "custom" }),
    ];
    asks[1] = { ...asks[1]!, status: "answered", answer_summary: "Uses XYZ" };
    const probes = syncProbesFromTacticalAsks(asks);
    expect(probes).toContain("Workflow friction");
    expect(probes).not.toContain("Custom territory");
  });

  it("dismiss maps already_answered to answered status", () => {
    const base = [createTacticalAsk({ text: "Q1", source: "ai_recommended" })];
    const id = base[0]!.id;
    const next = dismissTacticalAsk(base, id, "already_answered");
    expect(next[0]?.status).toBe("answered");
    expect(next[0]?.dismiss_reason).toBe("already_answered");
  });

  it("serializes and parses document", () => {
    const asks = [createTacticalAsk({ text: "Test?", source: "custom" })];
    const doc = serializePrepareTacticalAsks(asks);
    const parsed = parsePrepareTacticalAsksDocument(doc);
    expect(parsed?.asks).toHaveLength(1);
    expect(parsed?.asks[0]?.text).toContain("Test");
  });

  it("reconcile keeps custom ask when probes tighten", () => {
    const custom = createTacticalAsk({ text: "My custom Q", source: "custom" });
    const ai = createTacticalAsk({ text: "Old AI line", source: "ai_recommended" });
    const reconciled = reconcileTacticalAsksWithProbes(
      [custom, ai],
      "New tightened ask?",
    );
    expect(reconciled.some((a) => a.text.includes("custom"))).toBe(true);
    expect(reconciled.some((a) => a.text.includes("New tightened"))).toBe(true);
    expect(asksForFieldExecution(reconciled).length).toBeGreaterThan(0);
  });

  it("mergeBriefQuestionsIntoAsks reorders active and preserves handled", () => {
    const ai = createTacticalAsk({ text: "First?", source: "ai_recommended", priority: 0 });
    const second = createTacticalAsk({ text: "Second?", source: "ai_recommended", priority: 1 });
    second.status = "answered";
    second.answer_summary = "Done";
    const merged = mergeBriefQuestionsIntoAsks([ai, second], [
      { id: ai.id, text: "Rewritten first?" },
      { id: null, text: "Brand new ask?" },
    ]);
    const active = asksForFieldExecution(merged);
    expect(active.map((a) => a.text)).toEqual(["Rewritten first?", "Brand new ask?"]);
    expect(active[0]?.source).toBe("custom");
    expect(merged.some((a) => a.id === second.id && a.status === "answered")).toBe(true);
  });

  it("appends intelligence capture without duplicate lines", () => {
    const ask = createTacticalAsk({ text: "Access path?", source: "ai_recommended" });
    ask.status = "answered";
    ask.answer_summary = "Needs committee";
    const line = `[Top ask] Access path? → Needs committee`;
    const notes = appendIntelligenceCaptureToNotes("Existing", line);
    expect(notes).toContain("Existing");
    expect(notes).toContain("Needs committee");
    const again = appendIntelligenceCaptureToNotes(notes, line);
    expect(again).toBe(notes);
  });
});
