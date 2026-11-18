import { describe, expect, it } from "vitest";
import {
  buildEngagementCreatePayload,
  emptyEngagementBasicsDraft,
  ENGAGEMENT_LOG_OUTCOME_LABEL,
  ENGAGEMENT_PREPARE_MISSION_LABEL,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import {
  buildEngagementDetailRecord,
  parseIntelligenceChangesFromEngagementNotes,
} from "@/lib/surgical-sales/engagements/buildEngagementDetailRecord";
import {
  buildEngagementRecordView,
} from "@/lib/surgical-sales/engagements/buildEngagementRecordView";
import { INTRO_CALL_START_MISSION_OBJECTIVE } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import { resolveEngagementPreparationDisplayLabel } from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import { buildEngagementIntelligenceReadiness } from "@/lib/surgical-sales/engagements/engagementIntelligenceReadiness";
import {
  engagementAllowsOutcomeIntelligenceApply,
  outcomeGroupForIntelligenceDomain,
} from "@/lib/surgical-sales/engagements/engagementOutcomeIntelligence";
import { enrichDebriefMappingWithPartialLeads } from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";
import { buildParseResultFromOpenAiMapping } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";
import {
  mapDebriefNarrativeToOperationalSignals,
} from "@/lib/surgical-sales/operationalIntelligenceEngine";
import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import { PRE_CALL_PLAN_FIELD_CONFIGS } from "@/lib/surgical-sales/preCallPlanFields";
import {
  readTodayMatterSavedValueFromPlan,
  readTodayMatterValueFromPlan,
} from "@/lib/surgical-sales/engagements/prepareWhatMattersEditable";

const PROVIDER_ID = "00000000-0000-4000-8000-000000000001";
const ORG_ID = "00000000-0000-4000-8000-000000000002";
const ENGAGEMENT_ID = "00000000-0000-4000-8000-000000000003";

function emptyMapping(): LogUpdateOpenAiMapping {
  return {
    summary: "",
    confidence: "medium",
    reasoning: "",
    source_scope: "debrief",
    operational_signals: [],
    confirmed_updates: [],
    partial_updates: [],
    still_to_validate: [],
    recommended_next_moves: [],
    do_not_update: [],
  };
}

function introCallBasics() {
  return {
    ...emptyEngagementBasicsDraft(),
    engagement_type: "intro_call",
    provider_id: PROVIDER_ID,
    organization_id: ORG_ID,
  };
}

describe("engagement creation regression", () => {
  describe("Test 1: Intro Call + Start Mission", () => {
    it("creates a lightweight planned engagement without briefing, discovery targets, or intelligence writes", () => {
      const payload = buildEngagementCreatePayload({
        basics: introCallBasics(),
        workflowDraft: {
          observation_goal: "Should not persist on quick add",
          pre_observation_probes: "Should not persist",
          next_action: "Should not persist",
        },
        providerLabel: "Jordan Rivera",
        organizationLabel: "Metro General",
        save_mode: "final",
        creationPath: "quick_add",
      });

      expect(payload.engagement_type).toBe("intro_call");
      expect(payload.status).toBe("planned");
      expect(payload.planning_mode).toBe("quick_add");
      expect(payload.planning_status).toBe("not_planned");
      expect(payload.briefing_id).toBeNull();

      for (const field of PRE_CALL_PLAN_FIELD_CONFIGS) {
        expect(payload[field.key as keyof typeof payload]).toBeUndefined();
      }
      expect(payload.observation_goal).toBeUndefined();
      expect(payload.next_action).toBeUndefined();
      expect(payload.pre_observation_probes).toBeUndefined();

      const record = buildEngagementRecordView({
        engagementId: ENGAGEMENT_ID,
        engagement: payload as Record<string, unknown>,
      });
      expect(record.statusLabel).toBe("Planned");
      expect(record.preparationLabel).toBe("Optional");
      expect(record.isEmptyPlannedView).toBe(false);
      expect(record.objectiveLabel).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);

      const readiness = buildEngagementIntelligenceReadiness({
        engagementType: "intro_call",
        provider: { id: PROVIDER_ID },
        providerId: PROVIDER_ID,
      });
      const detail = buildEngagementDetailRecord({
        engagementId: ENGAGEMENT_ID,
        engagement: payload as Record<string, unknown>,
        preparation: {
          is_prepared: false,
          prepared_at: null,
          prepared_at_label: null,
          checklist: [],
        },
        planProgress: { filled: 0, total: 5 },
        readiness,
        providerId: PROVIDER_ID,
      });

      expect(detail.keyObjectives).toEqual([]);
      expect(detail.intelligenceChanges).toEqual([]);
      expect(parseIntelligenceChangesFromEngagementNotes(payload.notes as string | null)).toEqual([]);
    });

    it("maps not_planned planning status to Not started preparation label", () => {
      expect(
        resolveEngagementPreparationDisplayLabel({
          planning_status: "not_planned",
          planning_mode: "quick_add",
        }),
      ).toBe("Not started");
    });
  });

  describe("Test 3: Log outcome — Karen handles scheduling", () => {
    const karenNote = "Karen handles scheduling.";

    it("blocks provider intelligence apply until outcome notes are saved", () => {
      expect(
        engagementAllowsOutcomeIntelligenceApply({
          notes: null,
          debrief_completed: false,
        }),
      ).toBe(false);
      expect(
        engagementAllowsOutcomeIntelligenceApply({
          notes: "--- tactical debrief ---\n\nWhat happened:\nKaren handles scheduling.",
          debrief_completed: true,
        }),
      ).toBe(true);
    });

    it("maps Karen to access/scheduling intelligence without unrelated clinical or product fields", () => {
      const enriched = enrichDebriefMappingWithPartialLeads(emptyMapping(), karenNote);
      const parse = buildParseResultFromOpenAiMapping({
        sourceText: karenNote,
        mapping: enriched,
        context: {
          providerId: PROVIDER_ID,
          writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
        },
        existingFields: {},
      });

      const acceptedDbKeys = parse.fieldUpdates.map((f) => f.dbKey);
      expect(acceptedDbKeys.some((key) => /scheduling|observation_access|or_access|credentialing/i.test(key))).toBe(
        true,
      );
      expect(acceptedDbKeys.some((key) => /procedure|clinical|product|preference|case_mix|workflow_pain/i.test(key))).toBe(
        false,
      );
      expect(parse.fieldUpdates.some((f) => /Karen/i.test(f.proposedValue))).toBe(true);
      expect(enriched.confirmed_updates).toHaveLength(0);

      const schedulingGroup = parse.fieldUpdates
        .flatMap((f) => {
          const partial = enriched.partial_updates.find((_, i) => f.id === `ai-partial-${i}`);
          return partial ? [outcomeGroupForIntelligenceDomain(partial.domain)] : [];
        })
        .filter(Boolean);
      expect(schedulingGroup).toContain("observation_access");

      const signals = mapDebriefNarrativeToOperationalSignals({
        providerId: PROVIDER_ID,
        narrative: karenNote,
      });
      expect(signals.some((s) => s.domain === "scheduling_ownership")).toBe(true);
      expect(signals.some((s) => s.domain === "product_interest")).toBe(false);
      expect(signals.some((s) => s.domain === "evaluation_readiness")).toBe(false);
      expect(signals.find((s) => s.softContactName === "Karen")).toBeDefined();
    });
  });

  describe("Test 2: Intro Call + Prepare First", () => {
    it("keeps suggested prep separate from saved provider intelligence", () => {
      const planFields = {
        observation_goal: null,
        pre_observation_probes: null,
        pre_observation_value_hypothesis: null,
        pre_observation_planned_close: null,
        engagement_purpose: null,
        next_action: null,
      };

      expect(readTodayMatterSavedValueFromPlan("discovery_goal", planFields, "intro_call")).toBe("");
      expect(
        readTodayMatterValueFromPlan(
          "discovery_goal",
          planFields,
          "Confirm whether observation is realistic.",
          "intro_call",
        ),
      ).toBe("Confirm whether observation is realistic.");

      const payload = buildEngagementCreatePayload({
        basics: introCallBasics(),
        workflowDraft: { observation_goal: "Generated suggestion should not persist" },
        providerLabel: "Jordan Rivera",
        organizationLabel: "Metro General",
        save_mode: "draft",
        creationPath: "plan_first",
      });

      expect(payload.planning_status).toBe("not_planned");
      expect(payload.observation_goal).toBeUndefined();
      expect(payload.briefing_id).toBeNull();
    });
  });

  describe("Test 4: New planned engagement detail view", () => {
    it("loads cleanly without fake targets or intelligence and exposes mission CTAs", () => {
      const engagement = {
        engagement_type: "intro_call",
        status: "planned",
        planning_mode: "quick_add",
        planning_status: "not_planned",
        briefing_id: null,
        observation_goal: null,
        notes: null,
      };

      const record = buildEngagementRecordView({
        engagementId: ENGAGEMENT_ID,
        engagement,
      });
      expect(record.isEmptyPlannedView).toBe(false);
      expect(record.objectiveLabel).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);
      expect(record.primaryAction.label).toBe("Prepare");
      expect(record.openHref).toContain("/engagements/");
      expect(record.openHref).not.toContain("/debrief");

      const readiness = buildEngagementIntelligenceReadiness({
        engagementType: "intro_call",
        provider: { id: PROVIDER_ID },
        providerId: PROVIDER_ID,
      });
      const detail = buildEngagementDetailRecord({
        engagementId: ENGAGEMENT_ID,
        engagement,
        preparation: {
          is_prepared: false,
          prepared_at: null,
          prepared_at_label: null,
          checklist: [],
        },
        planProgress: { filled: 0, total: 5 },
        readiness,
        providerId: PROVIDER_ID,
      });

      expect(detail.keyObjectives).toEqual([]);
      expect(detail.intelligenceChanges).toEqual([]);
      expect(detail.intelligenceChanges.some((line) => /confirmed|validated|captured/i.test(line))).toBe(
        false,
      );
      expect(ENGAGEMENT_PREPARE_MISSION_LABEL).toBe("Prepare");
      expect(ENGAGEMENT_LOG_OUTCOME_LABEL).toBe("Debrief");
    });
  });
});
