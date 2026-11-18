import { describe, expect, it } from "vitest";
import {
  buildDebriefDiscoveryPersistPayload,
  loadDiscoveryMappingFromContact,
} from "@/lib/surgical-sales/debriefDiscoveryMappingPipeline";

const JOHN_SMITH_INTRO_DEBRIEF =
  "Met with Dr. John Smith at Test Hospital today for an initial intro discussion. Main goal was understanding whether there is a realistic pathway to observe one of his robotic hernia cases. He mentioned they are doing more robotic abdominal wall and hernia work. Observation was not directly approved but he did not seem opposed. Karen from the office came up a few times. Sounds like she helps coordinate scheduling and probably works with the OR scheduling team. I still need to get her info and understand how much control the office has versus hospital side.";
import { buildDiscoveryMappingQuestionView } from "@/lib/surgical-sales/buildDiscoveryMappingQuestionView";
import { buildProviderOverviewOperationalCommandWithEngagements } from "@/lib/surgical-sales/buildProviderOverviewOperationalCommand";
import {
  flattenDebriefOperationalReviewText,
  buildDebriefOperationalReview,
} from "@/lib/surgical-sales/buildDebriefOperationalReview";
import {
  buildOperationalSignalsFromDebriefText,
  buildProviderOperationalState,
  mapDebriefNarrativeToOperationalSignals,
  sanitizeOperationalUserText,
} from "@/lib/surgical-sales/operationalIntelligenceEngine";
const KAREN_SCHEDULING =
  "Karen from the office helps coordinate scheduling and works with the OR scheduling team.";

const OBSERVATION_OPEN =
  "Observation was not directly approved but he did not seem opposed.";

const ACSIS_INTEREST = "ACSIS was discussed and he seemed interested.";

describe("operationalIntelligenceEngine", () => {
  it("maps scheduling language to scheduling_ownership and soft contact without auto-confirming contact", () => {
    const signals = mapDebriefNarrativeToOperationalSignals({
      providerId: "provider-1",
      narrative: KAREN_SCHEDULING,
    });

    expect(signals.some((s) => s.domain === "scheduling_ownership" && s.signalType === "evidence")).toBe(
      true,
    );
    const soft = signals.find((s) => s.signalType === "soft_contact");
    expect(soft?.softContactName).toBe("Karen");
    expect(soft?.status).toBe("partial");
    expect(signals.some((s) => s.signalType === "confirmed_fact")).toBe(false);
    expect(signals.some((s) => s.suggestedAnswer === "shared_scheduling_workflow")).toBe(true);
  });

  it("maps observation openness to access_readiness with approval blocker", () => {
    const signals = mapDebriefNarrativeToOperationalSignals({
      providerId: "provider-1",
      narrative: OBSERVATION_OPEN,
    });

    const access = signals.find((s) => s.domain === "access_readiness" && s.signalType === "evidence");
    expect(access?.status).toBe("partial");
    expect(access?.summary).toMatch(/not directly approved|not opposed|possible/i);

    const blocker = signals.find((s) => s.domain === "access_readiness" && s.signalType === "blocker");
    expect(blocker).toBeDefined();
    expect(blocker?.summary).toMatch(/approv/i);
  });

  it("product interest guardrail — ACSIS is early interest only", () => {
    const signals = mapDebriefNarrativeToOperationalSignals({
      providerId: "provider-1",
      narrative: ACSIS_INTEREST,
    });

    expect(signals.some((s) => s.domain === "product_interest" && s.signalType === "early_signal")).toBe(
      true,
    );
    expect(signals.some((s) => s.domain === "evaluation_readiness")).toBe(false);
    expect(signals.some((s) => s.domain === "case_commitment")).toBe(false);

    const state = buildProviderOperationalState({
      providerId: "provider-1",
      contact: {},
      pendingDebrief: { narrative: ACSIS_INTEREST },
    });
    expect(state.readinessByDomain.evaluation_readiness.unlocked).toBe(false);
    expect(state.readinessByDomain.case_commitment.unlocked).toBe(false);
  });

  it("evidence persistence across discovery mapping, overview, and engagement surfaces", () => {
    const { parse } = buildOperationalSignalsFromDebriefText({
      providerId: "provider-test-1",
      narrative: JOHN_SMITH_INTRO_DEBRIEF,
      sourceLabel: "Intro Call debrief",
    });

    const payload = buildDebriefDiscoveryPersistPayload({
      logUpdate: parse,
      sourceLabel: "Intro Call debrief",
    });

    const loader = loadDiscoveryMappingFromContact({
      providerId: "provider-test-1",
      contact: payload.contactPatch,
    });

    const scheduling = loader.items.find((i) => i.signalId === "scheduling_owner");
    expect(scheduling?.evidence).toMatch(/Karen/i);

    const overview = buildProviderOverviewOperationalCommandWithEngagements({
      providerId: "provider-test-1",
      contact: payload.contactPatch,
    });
    expect(overview.latestSignals.some((s) => /Karen|scheduling/i.test(s))).toBe(true);

    expect(scheduling?.currentUnderstanding).toMatch(/Karen|scheduling/i);
    expect(scheduling?.evidence).not.toMatch(/on file/i);
  });

  it("UI safety — no raw enum keys in operational review text", () => {
    const review = buildDebriefOperationalReview({
      providerId: "provider-1",
      narrative: `${KAREN_SCHEDULING} ${OBSERVATION_OPEN} ${ACSIS_INTEREST}`,
      contact: {
        provider_observation_feasibility: "credentialing_required",
        provider_observation_scheduling_control: "shared_workflow",
      },
    });
    const text = flattenDebriefOperationalReviewText(review);
    expect(text).not.toMatch(/discussed_only/);
    expect(text).not.toMatch(/credentialing_required/);
    expect(text).not.toMatch(/observation_scheduling_control/);
    expect(text).not.toMatch(/shared_workflow/);
    expect(text).not.toMatch(/provider_office/);
  });

  it("suppresses generic pending when canonical evidence exists", () => {
    const contact = {
      provider_observation_feasibility: "partial",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          evidence_text: OBSERVATION_OPEN,
          source_label: "Intro debrief",
          source_type: "engagement",
          updated_at: "2026-05-20T12:00:00.000Z",
          lifecycle_state: "captured",
        },
      },
    };

    const view = buildDiscoveryMappingQuestionView({
      dbKey: "provider_observation_feasibility",
      contact,
      providerId: "provider-1",
    });

    expect(view?.currentState.summary).toMatch(/not directly approved|not opposed/i);
    expect(view?.currentState.summary).not.toMatch(/No validated answer yet/i);
    expect(view?.currentState.summary).not.toMatch(/Pending on file/i);
  });

  it("pathway guardrail blocks product evaluation before 5 observations", () => {
    const state = buildProviderOperationalState({
      providerId: "provider-1",
      contact: {
        provider_competitive_products: "ACSIS interest noted",
        provider_preference_card_signals: "trial interest",
      },
      gateInput: {
        contact: {
          provider_competitive_products: "ACSIS interest noted",
        },
        engagements: [],
        cases: [],
      },
    });

    expect(state.readinessByDomain.evaluation_readiness.unlocked).toBe(false);
    expect(state.readinessByDomain.case_commitment.unlocked).toBe(false);
    expect(sanitizeOperationalUserText(state.readinessByDomain.evaluation_readiness.blockReason ?? "")).toMatch(
      /observed|surgeon|validated/i,
    );
  });

  it("provider overview operational command reads canonical scheduling evidence", () => {
    const command = buildProviderOverviewOperationalCommandWithEngagements({
      providerId: "provider-1",
      contact: {
        provider_observation_scheduling_control: "shared_workflow",
        provider_intelligence_field_metadata: {
          provider_observation_scheduling_control: {
            evidence_text: KAREN_SCHEDULING,
            source_label: "Debrief",
            source_type: "engagement",
          },
        },
      },
    });

    expect(command.latestSignals.some((s) => /Karen|scheduling/i.test(s))).toBe(true);
    expect(command.discoveryMappingHref).toContain("provider-1");
  });
});
