import { describe, expect, it } from "vitest";
import { activityEventFromSurgicalCaseActivity } from "@/lib/activity/adapters";
import { buildActivityEvent, sortActivityEventsNewestFirst } from "@/lib/activity/activityEvent";
import {
  buildAdoptionInitiativeRelatedEntities,
  resolveAdoptionStageActivityType,
} from "@/lib/activity/adoptionInitiativeActivity";
import { ACTIVITY_EVENT_TYPE_LABELS } from "@/lib/activity/activityEventTypes";
import { unifiedTypeFromLegacyCaseActivity, unifiedTypeFromLegacyEngagementActivity } from "@/lib/activity/legacyTypeMap";
import { mergeActivityFeeds } from "@/lib/activity/feed";

describe("activityEvent", () => {
  it("maps legacy engagement activity types to unified types", () => {
    expect(unifiedTypeFromLegacyEngagementActivity("engagement_created")).toBe("ENGAGEMENT_CREATED");
    expect(unifiedTypeFromLegacyEngagementActivity("engagement_converted_to_case")).toBe(
      "ENGAGEMENT_CONVERTED_TO_CASE",
    );
    expect(unifiedTypeFromLegacyEngagementActivity("pre_call_plan_updated")).toBe("PRE_CALL_PLAN_UPDATED");
  });

  it("maps legacy case activity types to unified types", () => {
    expect(unifiedTypeFromLegacyCaseActivity("note")).toBe("NOTE_ADDED");
    expect(unifiedTypeFromLegacyCaseActivity("case_created")).toBe("CASE_CREATED");
    expect(unifiedTypeFromLegacyCaseActivity("document_uploaded")).toBe("DOCUMENT_UPLOADED");
  });

  it("adapts surgical case activity rows", () => {
    const event = activityEventFromSurgicalCaseActivity({
      id: "abc-123",
      case_id: "case-1",
      activity_type: "note",
      body: "Follow-up with surgeon",
      user_id: "user-1",
      created_at: "2026-05-19T12:00:00.000Z",
      metadata_json: { workflow_stage: "follow_up" },
    });
    expect(event.type).toBe("NOTE_ADDED");
    expect(event.entityType).toBe("case");
    expect(event.entityId).toBe("case-1");
    expect(event.workflowStage).toBe("follow_up");
    expect(event.id).toBe("surgical_sales_case_activities:abc-123");
  });

  it("sorts events newest first", () => {
    const older = buildActivityEvent({
      type: "NOTE_ADDED",
      summary: "older",
      entityType: "case",
      entityId: "c1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = buildActivityEvent({
      type: "NOTE_ADDED",
      summary: "newer",
      entityType: "case",
      entityId: "c1",
      createdAt: "2026-06-01T00:00:00.000Z",
    });
    const sorted = sortActivityEventsNewestFirst([older, newer]);
    expect(sorted[0]?.summary).toBe("newer");
  });

  it("builds product opportunity related entities for cross-feed visibility", () => {
    const related = buildAdoptionInitiativeRelatedEntities(
      {
        opportunityId: "opp-1",
        accountId: "org-1",
        accountName: "Memorial",
        surgeonContactId: "prov-1",
      },
      { caseId: "case-1", engagementId: "eng-1" },
    );
    expect(related).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityType: "provider", entityId: "prov-1", role: "surgeon" }),
        expect.objectContaining({ entityType: "organization", entityId: "org-1", label: "Memorial" }),
        expect.objectContaining({ entityType: "case", entityId: "case-1", role: "linked_case" }),
        expect.objectContaining({ entityType: "engagement", entityId: "eng-1", role: "linked_engagement" }),
      ]),
    );
  });

  it("maps adoption stage transitions to milestone activity types", () => {
    expect(resolveAdoptionStageActivityType("evaluation_planned", "discovery")).toBe("EVALUATION_PLANNED");
    expect(resolveAdoptionStageActivityType("won", "adoption_expanding")).toBe("OPPORTUNITY_WON");
    expect(resolveAdoptionStageActivityType("clinical_validation", "discovery")).toBe("OPPORTUNITY_STAGE_CHANGED");
  });

  it("labels provider outcome and product-use activity", () => {
    expect(ACTIVITY_EVENT_TYPE_LABELS.OUTCOME_UPDATE_LOGGED).toBe("Outcome update logged");
    expect(ACTIVITY_EVENT_TYPE_LABELS.PRODUCT_USE_LOGGED).toBe("Product use logged");
  });

  it("dedupes merged feeds by id", () => {
    const event = buildActivityEvent({
      id: "dup-1",
      type: "CASE_CREATED",
      summary: "Created",
      entityType: "case",
      entityId: "c1",
    });
    const merged = mergeActivityFeeds([event], [event]);
    expect(merged).toHaveLength(1);
  });
});
