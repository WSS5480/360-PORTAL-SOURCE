import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  NewCaseOperationalReadinessPanel,
  newCaseOperationalReadinessCss,
} from "./NewCaseOperationalReadinessPanel";
import { buildNewCaseOperationalReadiness } from "@/lib/surgical-sales/buildNewCaseOperationalReadiness";
import { newCaseLayoutCss } from "./newCaseLayoutCss";
import { randomUUID } from "node:crypto";

const view = buildNewCaseOperationalReadiness({
  caseType: "observation",
  surgeonId: randomUUID(),
  accountId: randomUUID(),
  relatedOpportunityId: "",
  caseDate: "2026-05-27",
  caseTime: "",
  procedureType: "",
  needsProducts: false,
  productId: "",
  skuId: "",
  expectedQty: "1",
  expectedRevenue: "",
  extraLines: [],
  productName: null,
  skuLabel: null,
  draftCaseId: null,
  observationProductExpanded: false,
  observationObjectives: {
    observation_goal: "",
    observation_key_questions: "",
    observation_signals_to_validate: "",
  },
  providerContact: null,
  observationSchedulingOwner: "",
  observationAccessPathway: "",
  observationCredentialingRequirement: "unknown",
});

describe("NewCaseOperationalReadinessPanel", () => {
  it("renders mobile variant as a collapsible Mission Control panel", () => {
    const { container } = render(
      <>
        <style dangerouslySetInnerHTML={{ __html: `${newCaseLayoutCss}\n${newCaseOperationalReadinessCss}` }} />
        <NewCaseOperationalReadinessPanel view={view} variant="mobile" onResolveNextStep={() => {}} />
      </>,
    );

    const details = container.querySelector("details.new-case-mission-control--mobile");
    expect(details).not.toBeNull();
    expect(details?.hasAttribute("open")).toBe(false);
    expect(screen.getByText("Mission Control")).toBeInTheDocument();
    expect(screen.getByText("Operational posture")).toBeInTheDocument();
    expect(screen.getByText("Focus next field")).toBeInTheDocument();
    expect(screen.queryByText("Missing intelligence")).not.toBeInTheDocument();
  });

  it("renders desktop variant with sticky positioning", () => {
    const { container } = render(
      <>
        <style dangerouslySetInnerHTML={{ __html: `${newCaseLayoutCss}\n${newCaseOperationalReadinessCss}` }} />
        <NewCaseOperationalReadinessPanel view={view} variant="desktop" onResolveNextStep={() => {}} />
      </>,
    );

    const aside = container.querySelector("aside.new-case-mission-control--desktop");
    expect(aside).not.toBeNull();
    expect(newCaseOperationalReadinessCss).toMatch(/position:\s*sticky/);
    expect(screen.getByRole("complementary", { name: /mission control/i })).toBeInTheDocument();
    expect(screen.getByText("Mission setup")).toBeInTheDocument();
    expect(screen.getByText("Access readiness")).toBeInTheDocument();
  });
});
