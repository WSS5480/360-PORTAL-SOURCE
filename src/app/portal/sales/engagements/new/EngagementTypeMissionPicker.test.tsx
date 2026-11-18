import { cleanup, render, screen } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import React from "react";

import { afterEach, describe, expect, it, vi } from "vitest";

import { buildRecommendedEngagementMission } from "@/lib/surgical-sales/engagements/buildRecommendedEngagementMission";

import { createEngagementWizardCss } from "./createEngagementWizardCss";

import { EngagementTypeMissionPicker } from "./EngagementTypeMissionPicker";

import { missionCardByName } from "./engagementMissionTestUtils";

import type { EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";



afterEach(() => {

  cleanup();

});



function renderPicker(selectedType: "" | EngagementType = "") {

  const onSelect = vi.fn();

  const recommendedMission = buildRecommendedEngagementMission({});

  const view = render(

    <>

      <style dangerouslySetInnerHTML={{ __html: createEngagementWizardCss }} />

      <EngagementTypeMissionPicker

        selectedType={selectedType}

        recommendedMission={recommendedMission}

        onSelect={onSelect}

      />

    </>,

  );

  return { ...view, onSelect, recommendedMission };

}



function StatefulPicker() {

  const [selectedType, setSelectedType] = React.useState<EngagementType | "">("");

  const recommendedMission = buildRecommendedEngagementMission({});

  return (

    <>

      <style dangerouslySetInnerHTML={{ __html: createEngagementWizardCss }} />

      <EngagementTypeMissionPicker

        selectedType={selectedType}

        recommendedMission={recommendedMission}

        onSelect={setSelectedType}

      />

    </>

  );

}



function missionCard(name: string): HTMLElement {

  return missionCardByName(name);

}



describe("EngagementTypeMissionPicker", () => {

  it("shows recommended mission and browse categories without listing every type at once", () => {

    renderPicker();



    expect(screen.getByRole("heading", { name: /Recommended Next Mission/i })).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /What are you trying to accomplish/i })).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: "Discover" })).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: "Observe" })).toBeInTheDocument();

    const cardCount = document.querySelectorAll(".create-engagement-mission-card").length;

    expect(cardCount).toBeGreaterThan(0);

    expect(cardCount).toBeLessThan(6);

    expect(screen.queryByText(/Creates:/i)).not.toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /^Schedule touchpoint$/i })).not.toBeInTheDocument();

  });



  it("shows only missions in the selected browse category", async () => {

    const user = userEvent.setup();

    render(<StatefulPicker />);



    await user.click(screen.getByRole("tab", { name: "Observe" }));



    expect(missionCard("Observation Debrief")).toBeInTheDocument();

    expect(document.querySelectorAll(".create-engagement-mission-card").length).toBe(1);

  });



  it("selects a mission from the active category", async () => {

    const user = userEvent.setup();

    const { onSelect } = renderPicker();



    await user.click(screen.getByRole("tab", { name: "Observe" }));

    await user.click(missionCard("Observation Debrief"));



    expect(onSelect).toHaveBeenCalledWith("provider_debrief");

  });



  it("hides Recommended Next Mission when the launching workflow already chose the type", () => {

    const recommendedMission = buildRecommendedEngagementMission({});

    render(

      <EngagementTypeMissionPicker

        selectedType="provider_debrief"

        recommendedMission={recommendedMission}

        showRecommendedMission={false}

        onSelect={vi.fn()}

      />,

    );



    expect(screen.queryByText(/Recommended Next Mission/i)).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /What are you trying to accomplish/i })).toBeInTheDocument();

    // Browse opens on the selected mission's category.

    expect(screen.getByRole("tab", { name: "Observe" })).toHaveAttribute("aria-selected", "true");

  });



  it("selects the recommended mission from the hero card", async () => {

    const user = userEvent.setup();

    const { onSelect, recommendedMission } = renderPicker();



    await user.click(
      screen.getByRole("button", { name: /Select recommended mission:/i }),
    );



    expect(onSelect).toHaveBeenCalledWith(recommendedMission.type);

  });

});

