import { describe, expect, it } from "vitest";
import { routeLogUpdateToProviderFields, valuesConflict } from "./logUpdateProviderRouting";

const EXAMPLE =
  "OR access goes through vendor credentialing and the scheduler approves observation requests.";

describe("routeLogUpdateToProviderFields", () => {
  it("routes example note to provider intelligence fields", () => {
    const updates = routeLogUpdateToProviderFields(EXAMPLE, {});
    const dbKeys = updates.map((u) => u.dbKey);
    expect(dbKeys).toContain("provider_observation_access_path");
    expect(dbKeys).toContain("provider_credentialing_status");
    expect(dbKeys).toContain("provider_observation_coordinator_contact");
    const coordinator = updates.find((u) => u.dbKey === "provider_observation_coordinator_contact");
    expect(coordinator?.proposedScope).toBe("organization");
    expect(coordinator?.proposedDestination).toBe("facility");
    expect(updates.map((u) => u.label)).toContain("Field readiness improved");
    expect(updates.every((u) => u.conflict === null)).toBe(true);
  });

  it("flags conflict when existing value differs", () => {
    const updates = routeLogUpdateToProviderFields(EXAMPLE, {
      provider_observation_access_path: "Committee approval only — no vendor path",
    });
    const access = updates.find((u) => u.dbKey === "provider_observation_access_path");
    expect(access?.conflict).not.toBeNull();
    expect(access?.conflict?.existingValue).toMatch(/Committee/);
  });

  it("does not route low-value fair-amount case mix as procedure focus", () => {
    const updates = routeLogUpdateToProviderFields(
      "He does a fair amount of robotic colorectal and hernia work.",
      {},
    );
    const dbKeys = updates.map((update) => update.dbKey);

    expect(dbKeys).not.toContain("provider_procedure_focus");
    expect(dbKeys).not.toContain("provider_technique_preferences");
  });
});

describe("valuesConflict", () => {
  it("does not conflict when existing is empty", () => {
    expect(valuesConflict("", "new note")).toBe(false);
  });

  it("does not conflict when new is substring of existing", () => {
    expect(valuesConflict("scheduler approves all requests", "scheduler approves")).toBe(false);
  });
});
