import { describe, expect, it } from "vitest";
import { parseLogUpdateFreeform } from "./logUpdateParseFreeform";
import {
  buildLogUpdateProviderCommitPayload,
  type LogUpdateProviderCommitPayload,
} from "./logUpdateReviewCommit";
import { routeLogUpdateToProviderFields } from "./logUpdateProviderRouting";

const CTX = {
  providerId: "00000000-0000-4000-8000-000000000001",
  providerLabel: "Dr. Example",
  organizationId: "00000000-0000-4000-8000-000000000004",
  organizationLabel: "Memorial",
};

function autoRoute(text: string, existing: Record<string, string> = {}) {
  const result = parseLogUpdateFreeform(text, CTX, existing);
  expect(result.usesProviderIntelligence).toBe(true);
  expect(result.fieldUpdates.length).toBeGreaterThan(0);
  expect(result.fieldUpdates.every((u) => u.accepted)).toBe(true);
  expect(result.fieldUpdates.every((u) => u.conflict === null)).toBe(true);

  const commit = buildLogUpdateProviderCommitPayload(result);
  expect(commit).not.toHaveProperty("error");
  const payload = commit as LogUpdateProviderCommitPayload;
  expect(payload.saveAsNote).toBe(true);
  expect(payload.sourceText).toBe(text);

  const byKey = Object.fromEntries(
    result.fieldUpdates.map((u) => [u.dbKey, u.proposedValue] as const),
  );

  return { result, payload, byKey, dbKeys: result.fieldUpdates.map((u) => u.dbKey) };
}

function patchValue(
  payload: LogUpdateProviderCommitPayload,
  dbKey: string,
): string | undefined {
  return payload.fieldPatches.find((p) => p.dbKey === dbKey)?.value;
}

describe("log update routing scenarios", () => {
  it("1 — OR access, credentialing, scheduler approval; saves original note", () => {
    const text =
      "OR access goes through vendor credentialing and the scheduler approves observation requests.";
    const { result, payload, byKey, dbKeys } = autoRoute(text);

    expect(dbKeys).toContain("provider_observation_access_path");
    expect(dbKeys).toContain("provider_credentialing_status");
    expect(dbKeys).toContain("provider_observation_coordinator_contact");
    expect(byKey.provider_observation_coordinator_contact).toMatch(/scheduler/i);

    expect(payload.saveAsNote).toBe(true);
    expect(result.saveAsNoteAccepted).toBe(true);
    expect(patchValue(payload, "provider_observation_access_path")).toBeTruthy();
  });

  it("2 — laparoscopic hernia on Wednesday and Friday", () => {
    const text = "He mostly does laparoscopic hernia cases on Wednesdays and Fridays.";
    const { byKey, dbKeys, result } = autoRoute(text);

    expect(dbKeys).toContain("provider_technique_preferences");
    expect(byKey.provider_technique_preferences).toMatch(/laparoscopic/i);

    expect(dbKeys).toContain("provider_procedure_focus");
    expect(byKey.provider_procedure_focus).toMatch(/hernia/i);

    expect(dbKeys).toContain("provider_observation_best_days_case_types");
    expect(byKey.provider_observation_best_days_case_types).toMatch(/wednesday/i);
    expect(byKey.provider_observation_best_days_case_types).toMatch(/friday/i);

    expect(result.stillMissing).not.toContain("Best days or case posting window");
  });

  it("3 — supply chain approval before trial; evaluation readiness still open", () => {
    const text = "Supply chain has to approve new products before a trial.";
    const { byKey, dbKeys, result } = autoRoute(text);

    expect(dbKeys).toContain("provider_preference_card_signals");
    expect(byKey.provider_preference_card_signals).toMatch(/supply\s+chain/i);

    expect(dbKeys).toContain("provider_decision_maker_status");
    expect(byKey.provider_decision_maker_status).toMatch(/supply\s+chain/i);

    expect(dbKeys).not.toContain("provider_evaluation_openness");
    expect(result.intelligenceReview.partiallyConfirmed.map((p) => p.label)).toContain(
      "Evaluation readiness confirmed",
    );
    expect(result.stillMissing).not.toContain("Evaluation readiness confirmed");
  });

  it("4 — same-day response via text; prompts for coordinator when not named", () => {
    const text = "The office usually responds same day if I text the coordinator.";
    const { byKey, dbKeys, result } = autoRoute(text);

    expect(dbKeys).toContain("provider_responsiveness");
    expect(byKey.provider_responsiveness).toMatch(/same\s+day/i);

    expect(dbKeys).toContain("provider_communication_style");
    expect(byKey.provider_communication_style).toMatch(/text/i);

    expect(dbKeys).not.toContain("provider_observation_coordinator_contact");
    expect(result.intelligenceReview.partiallyConfirmed.map((p) => p.label)).toContain(
      "Scheduling owner / coordinator named",
    );
    expect(result.stillMissing).not.toContain("Scheduling owner / coordinator named");
  });

  it("5 — observation allowed only after credentialing; blocker gaps remain", () => {
    const text = "Observation is allowed, but only after credentialing is complete.";
    const { byKey, dbKeys, result } = autoRoute(text);

    expect(dbKeys).toContain("provider_observation_feasibility");
    expect(byKey.provider_observation_feasibility).toMatch(/allowed\s+after\s+credentialing/i);

    expect(dbKeys).toContain("provider_observation_credentialing_needed");

    const labels = result.fieldUpdates.map((u) => u.label);
    expect(labels).not.toContain("Field readiness improved");

    expect(dbKeys).toContain("provider_credentialing_status");
    expect(result.intelligenceReview.partiallyConfirmed.map((p) => p.label)).toContain(
      "Credentialing turnaround time",
    );
    expect(result.stillMissing).not.toContain("Vendor credentialing status confirmed");
  });
});

describe("routeLogUpdateToProviderFields — auto-accepts all routed fields", () => {
  it("does not require manual field selection for multi-route notes", () => {
    const updates = routeLogUpdateToProviderFields(
      "He mostly does laparoscopic hernia cases on Wednesdays and Fridays.",
      {},
    );
    expect(updates.length).toBeGreaterThanOrEqual(3);
    expect(updates.every((u) => u.accepted)).toBe(true);
    expect(updates.every((u) => u.conflict === null)).toBe(true);
  });
});
