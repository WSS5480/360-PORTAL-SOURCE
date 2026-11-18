import { describe, expect, it } from "vitest";
import { buildObservationMissionProgress } from "./buildObservationMissionProgress";

describe("buildObservationMissionProgress", () => {
  it("marks captured dimensions as confirmed", () => {
    const view = buildObservationMissionProgress({
      caseRow: {
        live_observation_product_fit: "Portfolio mesh tray",
        live_observation_competitors: "Rival vendor",
        observation_signals_to_validate: "Workflow fit\nStaff frustration",
      },
    });

    const products = view.tracks.find((track) => track.id === "current_products");
    const competitors = view.tracks.find((track) => track.id === "competitor_presence");

    expect(products?.status).toBe("confirmed");
    expect(products?.statusIcon).toBe("✓");
    expect(competitors?.status).toBe("confirmed");
    expect(view.percentComplete).toBeGreaterThanOrEqual(40);
  });

  it("shows partial status for briefing targets not yet captured during observation", () => {
    const view = buildObservationMissionProgress({
      caseRow: {
        live_observation_product_fit: "Portfolio mesh tray",
        live_observation_competitors: "Rival vendor",
        observation_signals_to_validate: "Workflow bottlenecks\nStaff frustrations",
      },
    });

    const workflow = view.tracks.find((track) => track.id === "workflow_bottlenecks");
    const staff = view.tracks.find((track) => track.id === "staff_frustrations");

    expect(workflow?.status).toBe("partial");
    expect(workflow?.statusIcon).toBe("⚠");
    expect(staff?.status).toBe("partial");
    expect(view.percentLabel).toBe("2 of 5 dimensions captured");
  });

  it("returns open dimensions before any capture starts", () => {
    const view = buildObservationMissionProgress({
      caseRow: {},
    });

    expect(view.percentComplete).toBe(0);
    expect(view.percentLabel).toBe("5 dimensions to capture");
    expect(view.tracks.every((track) => track.status === "missing")).toBe(true);
  });
});
