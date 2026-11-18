import { describe, expect, it } from "vitest";

import {
  deriveIntroCallLifecyclePrimaryAction,
  INTRO_PREPARE_LABEL,
  INTRO_RESUME_LABEL,
  INTRO_START_LABEL,
  INTRO_DICTATE_COMPLETE_LABEL,
  buildIntroCallOverviewExecutionActions,
  introCallLifecycleShowsDictateCompleteSecondary,
  introCallOverviewShowsDictateComplete,
  introCallLifecycleShowsPrepareSecondary,
  resolveIntroCallLifecyclePhase,
} from "./introCallEngagementLifecycle";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

describe("introCallEngagementLifecycle", () => {
  it("routes scheduled intro to Prepare without duplicate Prepare secondary", () => {
    const intro = {
      id: "e1",
      status: "planned",
      prepared_at: null,
      planning_status: "not_started",
    };

    expect(resolveIntroCallLifecyclePhase(intro)).toBe("scheduled");
    const action = deriveIntroCallLifecyclePrimaryAction(intro);
    expect(action.label).toBe(INTRO_PREPARE_LABEL);
    expect(action.kind).toBe("link");
    expect(action.href).toContain("/prepare");
    expect(action.requiresBeginCall).toBe(false);
    expect(introCallLifecycleShowsPrepareSecondary("scheduled")).toBe(false);
    expect(introCallLifecycleShowsDictateCompleteSecondary("scheduled")).toBe(true);
  });

  it("routes prepared intro through intro_start to begin active session", () => {
    const intro = {
      id: "e1",
      status: "planned",
      prepared_at: "2026-06-01T12:00:00Z",
      planning_status: "planned",
    };

    expect(resolveIntroCallLifecyclePhase(intro)).toBe("prepared");
    const action = deriveIntroCallLifecyclePrimaryAction(intro);
    expect(action.label).toBe(INTRO_START_LABEL);
    expect(action.kind).toBe("intro_start");
    expect(action.href).toContain("/active");
    expect(action.requiresBeginCall).toBe(true);
  });

  it("routes in-progress intro to Resume Intro Call", () => {
    const intro = {
      id: "e1",
      status: "in_progress",
      prepared_at: "2026-06-01T12:00:00Z",
      planning_status: "planned",
    };

    expect(resolveIntroCallLifecyclePhase(intro)).toBe("active");
    const action = deriveIntroCallLifecyclePrimaryAction(intro);
    expect(action.label).toBe(INTRO_RESUME_LABEL);
    expect(action.kind).toBe("link");
    expect(action.href).toContain("/active");
    expect(introCallLifecycleShowsPrepareSecondary("active")).toBe(true);
  });

  it("keeps Prepare secondary available when prepared or active", () => {
    expect(introCallLifecycleShowsPrepareSecondary("prepared")).toBe(true);
    expect(introCallLifecycleShowsPrepareSecondary("active")).toBe(true);
    expect(introCallLifecycleShowsPrepareSecondary("scheduled")).toBe(false);
  });

  it("offers Dictate & Complete for scheduled, prepared, and active intro calls on Mission Board", () => {
    expect(introCallLifecycleShowsDictateCompleteSecondary("scheduled")).toBe(true);
    expect(introCallLifecycleShowsDictateCompleteSecondary("prepared")).toBe(true);
    expect(introCallLifecycleShowsDictateCompleteSecondary("active")).toBe(true);
    expect(introCallLifecycleShowsDictateCompleteSecondary("not_scheduled")).toBe(false);
  });

  it("offers overview fast-log only for scheduled planned intro", () => {
    expect(introCallOverviewShowsDictateComplete("scheduled")).toBe(true);
    expect(introCallOverviewShowsDictateComplete("prepared")).toBe(false);
    expect(introCallOverviewShowsDictateComplete("active")).toBe(false);
  });

  it("builds overview actions for planned intro with Dictate & Complete secondary", () => {
    const actions = buildIntroCallOverviewExecutionActions({
      id: "e1",
      engagement_type: "intro_call",
      engagement_type_label: "Intro call",
      status: "planned",
      status_label: "Planned",
      pre_call_filled: 0,
      pre_call_total: 0,
      pre_call_complete: false,
      planning_status: "not_started",
      planning_status_label: "Not started",
      briefing_status: "not_started",
      briefing_status_label: "Not started",
      outcome_label: "",
    } satisfies ProviderEngagementSummary);

    expect(actions?.primary.label).toBe(INTRO_PREPARE_LABEL);
    expect(actions?.primary.href).toContain("/prepare");
    expect(actions?.secondary?.label).toBe(INTRO_DICTATE_COMPLETE_LABEL);
    expect(actions?.secondary?.engagementId).toBe("e1");
  });

  it("omits overview fast-log once intro briefing is prepared", () => {
    const actions = buildIntroCallOverviewExecutionActions({
      id: "e1",
      engagement_type: "intro_call",
      engagement_type_label: "Intro call",
      status: "planned",
      status_label: "Planned",
      prepared_at: "2026-06-01T12:00:00Z",
      planning_status: "planned",
      planning_status_label: "Planned",
      pre_call_filled: 5,
      pre_call_total: 5,
      pre_call_complete: true,
      briefing_status: "planned",
      briefing_status_label: "Planned",
      outcome_label: "",
    } satisfies ProviderEngagementSummary);

    expect(actions?.primary.label).toBe(INTRO_START_LABEL);
    expect(actions?.secondary).toBeNull();
  });
});
