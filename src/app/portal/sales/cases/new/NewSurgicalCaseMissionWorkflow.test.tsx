import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/msw/server";
import { newCaseTestIds, newSurgicalCaseHandlers, productSupportPlanningCaseHandler } from "@/test/msw/newSurgicalCaseHandlers";
import { http, HttpResponse } from "msw";
import { newCaseLayoutCss } from "./newCaseLayoutCss";
import NewSurgicalCasePortalClient from "./NewSurgicalCasePortalClient";

const nav = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.mockPush, replace: nav.mockReplace }),
  useSearchParams: () => nav.searchParams,
}));

vi.mock("@/components/portal/PortalMobileMenuButton", () => ({
  PortalMobileMenuButton: () => null,
}));

vi.mock("@/components/sales/salesCommandUi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/sales/salesCommandUi")>();
  return {
    ...actual,
    SalesCommandPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

const scrollIntoViewMock = vi.fn();

afterEach(() => {
  cleanup();
  scrollIntoViewMock.mockClear();
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  nav.searchParams = new URLSearchParams();
  nav.mockPush.mockClear();
  nav.mockReplace.mockClear();
  server.use(...newSurgicalCaseHandlers);
  scrollIntoViewMock.mockImplementation(function scrollIntoView(this: Element) {
    void this;
  });
  Element.prototype.scrollIntoView = scrollIntoViewMock;
});

async function renderNewCasePage() {
  return render(
    <>
      <style dangerouslySetInnerHTML={{ __html: newCaseLayoutCss }} />
      <NewSurgicalCasePortalClient planningCaseId={newCaseTestIds.planningCaseId} />
    </>,
  );
}

async function waitForPageReady() {
  await waitFor(() => {
    expect(screen.queryByText(/^loading…$/i)).not.toBeInTheDocument();
  });
}

function desktopMissionControlPanel(container: HTMLElement) {
  const panel = container.querySelector("aside.new-case-mission-control--desktop");
  expect(panel).not.toBeNull();
  return panel as HTMLElement;
}

function observationWorkflow() {
  const workflow = document.querySelector(".new-case-mission-workflow:not(.new-case-support-mission-workflow)");
  expect(workflow).not.toBeNull();
  return workflow as HTMLElement;
}

function supportWorkflow() {
  const workflow = document.querySelector(".new-case-support-mission-workflow");
  expect(workflow).not.toBeNull();
  return workflow as HTMLElement;
}

function checklistTitles(workflow: HTMLElement) {
  const checklist = within(workflow).getByRole("region", { name: /mission checklist/i });
  return within(checklist)
    .getAllByRole("button")
    .map((btn) => btn.querySelector(".new-case-mission-checklist-title")?.textContent?.trim() ?? "");
}

function missionStepByLabel(workflow: HTMLElement, label: RegExp) {
  const steps = workflow.querySelectorAll(".new-case-mission-step");
  const match = Array.from(steps).find((step) => label.test(step.getAttribute("aria-label") ?? ""));
  expect(match).toBeTruthy();
  return match as HTMLElement;
}

async function openChecklistPhase(
  user: ReturnType<typeof userEvent.setup>,
  workflow: HTMLElement,
  titlePattern: RegExp,
) {
  const checklist = within(workflow).getByRole("region", { name: /mission checklist/i });
  const item = within(checklist)
    .getAllByRole("button")
    .find((btn) => titlePattern.test(btn.querySelector(".new-case-mission-checklist-title")?.textContent ?? ""));
  expect(item).toBeDefined();
  await user.click(item!);
}

async function completeObservationMissionSetup(user: ReturnType<typeof userEvent.setup>) {
  const workflow = observationWorkflow();
  await openChecklistPhase(user, workflow, /^mission setup$/i);

  await waitFor(() => {
    expect(within(workflow).getByText("Organization / facility")).toBeInTheDocument();
  });

  const orgSelect = within(workflow).getByRole("combobox", { name: /organization/i });
  await waitFor(() => {
    expect((orgSelect as HTMLSelectElement).options.length).toBeGreaterThan(1);
  });
  await user.selectOptions(orgSelect, newCaseTestIds.accountId);

  const procedureInput = within(workflow).getByLabelText(/procedure type or specialty/i);
  if (!(procedureInput as HTMLInputElement).value.trim()) {
    await user.type(procedureInput, "ACSIS workflow validation");
  }

  const dateInput = within(workflow).getByLabelText(/^case date/i);
  if (!(dateInput as HTMLInputElement).value.trim()) {
    fireEvent.change(dateInput, { target: { value: "2026-05-27" } });
  }

  await openChecklistPhase(user, workflow, /^access readiness$/i);
  await waitFor(() => {
    expect(missionStepByLabel(workflow, /mission setup/i).classList.contains("is-active")).toBe(false);
  });
}

async function completeMissionAccessReadiness(user: ReturnType<typeof userEvent.setup>) {
  const workflow = observationWorkflow();
  await openChecklistPhase(user, workflow, /^access readiness$/i);
  await waitFor(() => {
    expect(screen.getByText("Observation access")).toBeInTheDocument();
  });
  await user.type(
    screen.getByPlaceholderText("Who controls case timing or OR scheduling?"),
    "Jordan OR scheduler",
  );
  await user.selectOptions(
    screen.getByRole("combobox", { name: /observation access pathway/i }),
    "OR scheduler required",
  );
  await user.selectOptions(screen.getByRole("combobox", { name: /credentialing requirements/i }), "verified");
}

describe("New Surgical Case — mission workflow regressions", () => {
  describe("Observation case", () => {
    beforeEach(() => {
      nav.searchParams.set("case_type", "observation");
      nav.searchParams.set("surgeon_contact_id", newCaseTestIds.surgeonId);
    });

    it("shows mission phases in checklist order: setup, access, goals, optional planning", async () => {
      await renderNewCasePage();
      await waitForPageReady();

      const workflow = observationWorkflow();
      expect(checklistTitles(workflow)).toEqual([
        "Mission setup",
        "Access readiness",
        "Observation goals",
        "Optional planning",
      ]);

      expect(missionStepByLabel(workflow, /mission setup/i).getAttribute("aria-label")).toMatch(/1\./);
      expect(missionStepByLabel(workflow, /access readiness/i).getAttribute("aria-label")).toMatch(/2\./);
      expect(missionStepByLabel(workflow, /observation goals/i).getAttribute("aria-label")).toMatch(/3\./);
      expect(missionStepByLabel(workflow, /optional planning/i).getAttribute("aria-label")).toMatch(/4\./);
    });

    it("lists Access Readiness before Observation Goals in the mission checklist", async () => {
      await renderNewCasePage();
      await waitForPageReady();

      const titles = checklistTitles(observationWorkflow());
      expect(titles.indexOf("Access readiness")).toBeLessThan(titles.indexOf("Observation goals"));
    });

    it("targets Mission Setup in Mission Control when setup is incomplete", async () => {
      server.use(
        http.get(`/api/portal/sales/surgical-cases/${newCaseTestIds.planningCaseId}`, () =>
          HttpResponse.json({
            ok: true,
            case: {
              id: newCaseTestIds.planningCaseId,
              account_id: "",
              surgeon_contact_id: "",
              case_date: "",
              case_type: "observation",
              procedure_type: "",
              status: "draft",
            },
          }),
        ),
      );
      const user = userEvent.setup();
      const { container } = await renderNewCasePage();
      await waitForPageReady();

      const panel = desktopMissionControlPanel(container);
      await waitFor(() => {
        expect(within(panel).getByRole("status")).toHaveTextContent(/select an organization/i);
      });

      await user.click(within(panel).getByRole("button", { name: /focus next field/i }));

      const setupStep = missionStepByLabel(observationWorkflow(), /mission setup/i);
      expect(setupStep.classList.contains("is-active")).toBe(true);
      expect(within(setupStep).getByRole("heading", { name: /case type/i })).toBeInTheDocument();
    });

    it("targets Access Readiness in Mission Control and resolve next step opens scheduling owner", async () => {
      const user = userEvent.setup();
      const { container } = await renderNewCasePage();
      await waitForPageReady();
      await completeObservationMissionSetup(user);

      const panel = desktopMissionControlPanel(container);
      await waitFor(() => {
        expect(within(panel).getByText("Confirm scheduling owner.")).toBeInTheDocument();
      });

      const progressLabels = within(panel)
        .getAllByRole("listitem")
        .map((li) => li.querySelector("span")?.textContent?.trim() ?? "");
      expect(progressLabels).toEqual(
        expect.arrayContaining(["Mission setup", "Access readiness", "Observation goals"]),
      );

      await user.click(within(panel).getByRole("button", { name: /focus next field/i }));

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled();
        expect(screen.getByText("Observation access")).toBeInTheDocument();
        expect(
          container.querySelector('[data-next-field-highlight="scheduling_owner"]'),
        ).toBeInTheDocument();
      });

      const accessStep = missionStepByLabel(observationWorkflow(), /access readiness/i);
      expect(accessStep.classList.contains("is-active")).toBe(true);
    });

    it("collapses completed Mission Setup into a compact summary with Edit", async () => {
      const user = userEvent.setup();
      await renderNewCasePage();
      await waitForPageReady();
      await completeObservationMissionSetup(user);

      const setupStep = missionStepByLabel(observationWorkflow(), /mission setup/i);
      expect(setupStep.querySelector(".new-case-mission-step-body")).toBeNull();
      expect(setupStep.querySelector(".new-case-mission-step-summary")).not.toBeNull();
      expect(within(setupStep).getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
      expect(setupStep.textContent).toMatch(/Alex Surgeon/);
    });

    it("keeps Optional Planning collapsed by default", async () => {
      await renderNewCasePage();
      await waitForPageReady();

      const optionalStep = missionStepByLabel(observationWorkflow(), /optional planning/i);
      expect(optionalStep.classList.contains("is-active")).toBe(false);
      expect(optionalStep.querySelector(".new-case-mission-step-body")).toBeNull();
      expect(optionalStep.textContent).toMatch(/product interest:/i);
      expect(screen.queryByRole("button", { name: /add product interest/i })).not.toBeInTheDocument();
    });

    it("treats product interest as optional for observation cases", async () => {
      const user = userEvent.setup();
      const { container } = await renderNewCasePage();
      await waitForPageReady();

      const panel = desktopMissionControlPanel(container);
      const secondary = within(panel).getByLabelText(/secondary mission info/i);
      expect(within(secondary).getByText("Product interest optional")).toBeInTheDocument();
      expect(within(secondary).queryByText("Product line required")).not.toBeInTheDocument();

      await completeMissionAccessReadiness(user);
      await openChecklistPhase(user, observationWorkflow(), /^observation goals$/i);
      await user.type(screen.getByLabelText(/primary observation objective/i), "Validate workflow fit");

      await openChecklistPhase(user, observationWorkflow(), /^optional planning$/i);
      expect(screen.getByText("Early interest only.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add product interest/i })).toBeInTheDocument();
      expect(screen.queryByText(/product line required/i)).not.toBeInTheDocument();
    });

    it("does not render legacy flat readiness sections in Mission Control", async () => {
      const { container } = await renderNewCasePage();
      await waitForPageReady();

      const panel = desktopMissionControlPanel(container);
      for (const legacyTitle of ["Ready", "Missing intelligence", "Access risks", "Support risks", "Before save"]) {
        expect(within(panel).queryByRole("heading", { name: new RegExp(`^${legacyTitle}$`, "i") })).not.toBeInTheDocument();
      }
      expect(within(panel).getByText("Operational posture")).toBeInTheDocument();
      expect(within(panel).getByText("Progress")).toBeInTheDocument();
    });

    it("allows reopening a completed phase via Edit", async () => {
      const user = userEvent.setup();
      await renderNewCasePage();
      await waitForPageReady();
      await completeObservationMissionSetup(user);

      const setupStep = missionStepByLabel(observationWorkflow(), /mission setup/i);
      expect(setupStep.querySelector(".new-case-mission-step-body")).toBeNull();
      await user.click(within(setupStep).getByRole("button", { name: /^edit$/i }));

      await waitFor(() => {
        expect(setupStep.classList.contains("is-active")).toBe(true);
        expect(setupStep.querySelector(".new-case-mission-step-body")).not.toBeNull();
        expect(within(setupStep).getByLabelText(/procedure type or specialty/i)).toBeInTheDocument();
      });
    });

    it("avoids horizontal overflow on mobile layout", async () => {
      const { container } = await renderNewCasePage();
      await waitForPageReady();

      const root = container.querySelector(".create-case-native-root");
      expect(root).not.toBeNull();
      expect(getComputedStyle(root!).minWidth).toBe("0px");
      expect(newCaseLayoutCss).toMatch(/grid-template-columns:\s*1fr/);
    });
  });

  describe("Product support case", () => {
    beforeEach(() => {
      nav.searchParams.set("case_type", "product_support");
      server.use(productSupportPlanningCaseHandler());
    });

    it("shows Product & Inventory instead of Observation Goals", async () => {
      await renderNewCasePage();
      await waitForPageReady();

      const workflow = supportWorkflow();
      const titles = checklistTitles(workflow);
      expect(titles).toContain("Product & inventory");
      expect(titles).toContain("Case support plan");
      expect(titles).not.toContain("Observation goals");
      expect(screen.queryByText("Observation goals")).not.toBeInTheDocument();
    });

    it("requires product and SKU before save", async () => {
      await renderNewCasePage();
      await waitForPageReady();

      fireEvent.submit(document.querySelector("form.new-case-form")!);

      expect(await screen.findByText(/before you save/i)).toBeInTheDocument();
      expect(screen.getAllByText(/select a product family for this support case/i).length).toBeGreaterThan(0);
    });

    it("shows support-specific Mission Control progress without observation goals", async () => {
      const { container } = await renderNewCasePage();
      await waitForPageReady();

      const panel = desktopMissionControlPanel(container);
      expect(within(panel).getByText("Support setup")).toBeInTheDocument();
      expect(within(panel).getByText("Product & inventory")).toBeInTheDocument();
      expect(within(panel).getByText("Case support plan")).toBeInTheDocument();
      expect(within(panel).queryByText("Observation goals")).not.toBeInTheDocument();
      expect(within(panel).queryByText("Access readiness")).not.toBeInTheDocument();
    });
  });
});
