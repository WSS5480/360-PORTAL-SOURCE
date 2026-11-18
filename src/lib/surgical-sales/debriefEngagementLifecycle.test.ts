import { describe, expect, it } from "vitest";
import {
  DEBRIEF_COMPLETE_LABEL,
  DEBRIEF_PREPARE_LABEL,
  DEBRIEF_RESUME_LABEL,
  DEBRIEF_SCHEDULE_LABEL,
  DEBRIEF_START_LABEL,
  DEBRIEF_STATUS_ACTIVE,
  DEBRIEF_STATUS_COMPLETE,
  DEBRIEF_STATUS_NEEDS_COMPLETION,
  DEBRIEF_STATUS_NOT_SCHEDULED,
  DEBRIEF_STATUS_SCHEDULED,
  deriveDebriefLifecyclePrimaryAction,
  resolveDebriefLifecyclePhase,
} from "./debriefEngagementLifecycle";

describe("debriefEngagementLifecycle", () => {
  it("maps not scheduled to Schedule Debrief fast modal", () => {
    const action = deriveDebriefLifecyclePrimaryAction(null);
    expect(action.phase).toBe("not_scheduled");
    expect(action.statusLine).toBe(DEBRIEF_STATUS_NOT_SCHEDULED);
    expect(action.label).toBe(DEBRIEF_SCHEDULE_LABEL);
    expect(action.kind).toBe("fast_debrief");
  });

  it("maps scheduled planned debrief to Prepare Debrief link", () => {
    const debrief = { id: "eng-1", status: "planned", debrief_completed: false };
    expect(resolveDebriefLifecyclePhase(debrief)).toBe("scheduled");
    const action = deriveDebriefLifecyclePrimaryAction(debrief);
    expect(action.statusLine).toBe(DEBRIEF_STATUS_SCHEDULED);
    expect(action.label).toBe(DEBRIEF_PREPARE_LABEL);
    expect(action.kind).toBe("link");
    expect(action.href).toContain("/prepare");
    expect(action.requiresBeginCall).toBe(false);
  });

  it("maps prepared debrief to Start Debrief begin-call action", () => {
    const debrief = {
      id: "eng-1",
      status: "planned",
      debrief_completed: false,
      prepared_at: "2026-06-11T12:00:00Z",
    };
    expect(resolveDebriefLifecyclePhase(debrief)).toBe("prepared");
    const action = deriveDebriefLifecyclePrimaryAction(debrief);
    expect(action.label).toBe(DEBRIEF_START_LABEL);
    expect(action.kind).toBe("debrief_start");
    expect(action.requiresBeginCall).toBe(true);
  });

  it("maps in_progress debrief to Resume Debrief active link", () => {
    const debrief = { id: "eng-1", status: "in_progress", debrief_completed: false };
    expect(resolveDebriefLifecyclePhase(debrief)).toBe("active");
    const action = deriveDebriefLifecyclePrimaryAction(debrief);
    expect(action.statusLine).toBe(DEBRIEF_STATUS_ACTIVE);
    expect(action.label).toBe(DEBRIEF_RESUME_LABEL);
    expect(action.kind).toBe("link");
    expect(action.href).toContain("/active");
  });

  it("maps completed engagement without debrief notes to Complete Debrief", () => {
    const debrief = { id: "eng-1", status: "completed", debrief_completed: false };
    expect(resolveDebriefLifecyclePhase(debrief)).toBe("complete_debrief");
    const action = deriveDebriefLifecyclePrimaryAction(debrief);
    expect(action.statusLine).toBe(DEBRIEF_STATUS_NEEDS_COMPLETION);
    expect(action.label).toBe(DEBRIEF_COMPLETE_LABEL);
    expect(action.href).toContain("/debrief");
  });

  it("maps debrief_completed to Review Debrief", () => {
    const debrief = { id: "eng-1", status: "completed", debrief_completed: true };
    expect(resolveDebriefLifecyclePhase(debrief)).toBe("complete");
    const action = deriveDebriefLifecyclePrimaryAction(debrief);
    expect(action.statusLine).toBe(DEBRIEF_STATUS_COMPLETE);
    expect(action.href).toContain("mode=review");
  });
});
