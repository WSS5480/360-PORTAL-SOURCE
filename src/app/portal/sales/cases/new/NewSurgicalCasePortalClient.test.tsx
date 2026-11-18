import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/msw/server";
import { newCaseTestIds, newSurgicalCaseHandlers, productSupportPlanningCaseHandler } from "@/test/msw/newSurgicalCaseHandlers";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import {
  containsOpportunityWording,
  containsRawIntelligenceLabel,
} from "@/lib/surgical-sales/newSurgicalCasePageLogic";
import { newCaseLayoutCss } from "./newCaseLayoutCss";

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

import NewSurgicalCasePortalClient from "./NewSurgicalCasePortalClient";

import { http, HttpResponse } from "msw";
import { randomUUID } from "node:crypto";

let postedBody: Record<string, unknown> | null = null;
let patchedBody: Record<string, unknown> | null = null;

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  postedBody = null;
  patchedBody = null;
  localStorage.clear();
  sessionStorage.clear();
  nav.searchParams = new URLSearchParams();
  nav.mockPush.mockClear();
  nav.mockReplace.mockClear();
  server.use(
    ...newSurgicalCaseHandlers,
    http.post("/api/portal/sales/surgical-cases", async ({ request }) => {
      postedBody = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ ok: true, case: { id: randomUUID() } });
    }),
    http.patch(`/api/portal/sales/surgical-cases/${newCaseTestIds.planningCaseId}`, async ({ request }) => {
      patchedBody = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        ok: true,
        case: { id: newCaseTestIds.planningCaseId, ...patchedBody },
      });
    }),
  );
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

async function openMissionChecklistPhase(user: ReturnType<typeof userEvent.setup>, titlePattern: RegExp) {
  const checklist = screen.getByRole("region", { name: /mission checklist/i });
  const item = within(checklist)
    .getAllByRole("button")
    .find((btn) => titlePattern.test(btn.querySelector(".new-case-mission-checklist-title")?.textContent ?? ""));
  expect(item).toBeDefined();
  await user.click(item!);
}

async function openMissionSetupPhase(user: ReturnType<typeof userEvent.setup>) {
  await openMissionChecklistPhase(user, /^mission setup$/i);
  await waitFor(() => {
    expect(screen.getByRole("group", { name: /case type/i })).toBeInTheDocument();
  });
}

async function selectCaseTypeInSetup(
  user: ReturnType<typeof userEvent.setup>,
  next: "observation" | "product_support",
) {
  await openMissionSetupPhase(user);
  const caseTypeGroup = screen.getByRole("group", { name: /case type/i });
  const pattern = next === "observation" ? /observation case/i : /product support case/i;
  await user.click(within(caseTypeGroup).getByRole("button", { name: pattern }));
}

async function completeMissionAccessReadiness(user: ReturnType<typeof userEvent.setup>) {
  await openMissionChecklistPhase(user, /^access readiness$/i);
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

function expectNoRawIntelligenceLabels(root: HTMLElement) {
  expect(containsRawIntelligenceLabel(root.textContent || "")).toBe(false);
}

describe("NewSurgicalCasePortalClient — UX regression", () => {
  describe("1. Provider context from profile", () => {
    it("renders compact Provider Context card with Open profile and Change actions", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("surgeon_contact_id", newCaseTestIds.surgeonId);
      nav.searchParams.set("case_type", "observation");

      await renderNewCasePage();
      await waitForPageReady();
      await openMissionSetupPhase(user);

      expect(screen.getByRole("heading", { name: /provider context/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /open profile/i })).toHaveAttribute(
        "href",
        `/portal/sales/providers/${encodeURIComponent(newCaseTestIds.surgeonId)}`,
      );
      expect(screen.getByRole("button", { name: /^change$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ switch provider/i })).toBeInTheDocument();
    });

    it("does not show large Create Provider button or full provider search when preselected", async () => {
      nav.searchParams.set("surgeon_contact_id", newCaseTestIds.surgeonId);
      nav.searchParams.set("case_type", "observation");

      const { container } = await renderNewCasePage();
      await waitForPageReady();

      expect(screen.queryByText("Provider / surgeon")).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/search providers/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /\+ create new provider/i })).not.toBeInTheDocument();
    });

    it("shows full provider search and Create Provider link when surgeon_contact_id is absent", async () => {
      server.use(
        http.get(`/api/portal/sales/surgical-cases/${newCaseTestIds.planningCaseId}`, () =>
          HttpResponse.json({
            ok: true,
            case: {
              id: newCaseTestIds.planningCaseId,
              account_id: newCaseTestIds.accountId,
              surgeon_contact_id: "",
              case_date: "2026-05-27",
              case_type: "observation",
              procedure_type: "",
              status: "draft",
            },
          }),
        ),
      );
      nav.searchParams.set("case_type", "observation");

      const { container } = await renderNewCasePage();
      await waitForPageReady();

      await waitFor(() => {
        expect(screen.getByText("Provider / surgeon")).toBeInTheDocument();
      });
      expect(screen.getByText(/search providers/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /\+ create new provider/i })).toBeInTheDocument();
    });
  });

  describe("2. Mission Control panel", () => {
    it("shows compact mission control with progress and resolve action when provider is preselected", async () => {
      nav.searchParams.set("surgeon_contact_id", newCaseTestIds.surgeonId);
      nav.searchParams.set("case_type", "observation");

      const { container } = await renderNewCasePage();
      await waitForPageReady();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /mission setup alex surgeon · metro general/i }),
        ).toBeInTheDocument();
      });

      const panel = desktopMissionControlPanel(container);
      expect(within(panel).getByText("Mission Control")).toBeInTheDocument();
      expect(within(panel).getByText("Operational posture")).toBeInTheDocument();
      expect(within(panel).getByText("Confirm scheduling owner.")).toBeInTheDocument();
      expect(within(panel).getByText("Mission setup")).toBeInTheDocument();
      expect(within(panel).getByText("Access readiness")).toBeInTheDocument();
      expect(within(panel).getByText("Observation goals")).toBeInTheDocument();
      expect(within(panel).getByRole("button", { name: /focus next field/i })).toBeInTheDocument();
      expect(within(panel).queryByText("Missing intelligence")).not.toBeInTheDocument();
    });

    it("highlights the scheduling owner field for the current next action and clears on edit", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("surgeon_contact_id", newCaseTestIds.surgeonId);
      nav.searchParams.set("case_type", "observation");

      const { container } = await renderNewCasePage();
      await waitForPageReady();

      const panel = desktopMissionControlPanel(container);
      await waitFor(() => {
        expect(within(panel).getByText("Confirm scheduling owner.")).toBeInTheDocument();
      });

      await user.click(within(panel).getByRole("button", { name: /focus next field/i }));

      const highlight = await waitFor(() =>
        container.querySelector('[data-next-field-highlight="scheduling_owner"]'),
      );
      expect(highlight).not.toBeNull();
      expect(highlight).toHaveClass("new-case-field-label--next");

      await user.type(
        screen.getByPlaceholderText("Who controls case timing or OR scheduling?"),
        "Jordan OR scheduler",
      );

      await waitFor(() => {
        expect(container.querySelector('[data-next-field-highlight="scheduling_owner"]')).toBeNull();
      });
    });
  });

  describe("3. Case type selector", () => {
    it("does not show a duplicate top-level selected badge outside the case type cards", async () => {
      nav.searchParams.set("case_type", "observation");

      const { container } = await renderNewCasePage();
      await waitForPageReady();

      expect(screen.queryByText(/observation case selected/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/product support case selected/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/observation selected/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/product support selected/i)).not.toBeInTheDocument();
    });

    it("marks the active case type card as selected", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("case_type", "observation");

      await renderNewCasePage();
      await waitForPageReady();
      await openMissionSetupPhase(user);

      const caseTypeGroup = screen.getByRole("group", { name: /case type/i });
      const observationBtn = within(caseTypeGroup).getByRole("button", { name: /observation case/i });
      const productSupportBtn = within(caseTypeGroup).getByRole("button", { name: /product support case/i });

      expect(observationBtn).toHaveAttribute("aria-pressed", "true");
      expect(observationBtn).toHaveClass("is-selected");
      expect(within(observationBtn).getByText("Selected")).toBeInTheDocument();

      expect(productSupportBtn).toHaveAttribute("aria-pressed", "false");
      expect(productSupportBtn).not.toHaveClass("is-selected");
    });
  });

  describe("4. Observation case", () => {
    it("keeps optional planning collapsed with summary until opened", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("case_type", "observation");
      nav.searchParams.set("surgeon_contact_id", newCaseTestIds.surgeonId);

      await renderNewCasePage();
      await waitForPageReady();

      expect(
        screen.getAllByText(/product interest: none · opportunity: not linked · notes: not added/i).length,
      ).toBeGreaterThan(0);
      expect(screen.queryByRole("button", { name: /add product interest/i })).not.toBeInTheDocument();

      await completeMissionAccessReadiness(user);
      await openMissionChecklistPhase(user, /^observation goals$/i);
      await user.type(screen.getByLabelText(/primary observation objective/i), "Validate workflow fit");

      await openMissionChecklistPhase(user, /^optional planning$/i);
      expect(screen.getByText("Early interest only.")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /^related opportunity$/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /^notes & follow-up$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add product interest/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /add product anyway/i })).not.toBeInTheDocument();
    });

    it("shows Observation access section for observation case only", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("case_type", "observation");
      nav.searchParams.set("surgeon_contact_id", newCaseTestIds.surgeonId);

      await renderNewCasePage();
      await waitForPageReady();

      await openMissionChecklistPhase(user, /^access readiness$/i);
      expect(screen.getByText("Observation access")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Who controls case timing or OR scheduling?"),
      ).toBeInTheDocument();
      expect(screen.getByText("Observation access pathway")).toBeInTheDocument();
      expect(screen.getByText("Credentialing requirements")).toBeInTheDocument();
    });

    it("uses observation access inputs to clear readiness unknown states", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("case_type", "observation");
      nav.searchParams.set("surgeon_contact_id", newCaseTestIds.surgeonId);

      const { container } = await renderNewCasePage();
      await waitForPageReady();
      const missionControl = desktopMissionControlPanel(container);

      await waitFor(() => {
        expect(within(missionControl).getByText("Confirm scheduling owner.")).toBeInTheDocument();
      });

      await user.click(within(missionControl).getByRole("button", { name: /focus next field/i }));

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
      await user.selectOptions(
        screen.getByRole("combobox", { name: /credentialing requirements/i }),
        "verified",
      );

      await waitFor(() => {
        expect(within(missionControl).queryByText("Confirm scheduling owner.")).not.toBeInTheDocument();
      });
      expect(within(missionControl).getByText("Add observation objective.")).toBeInTheDocument();
    });

    it("saves an observation case without product or SKU", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("case_type", "observation");
      nav.searchParams.set("surgeon_contact_id", newCaseTestIds.surgeonId);

      await renderNewCasePage();
      await waitForPageReady();

      await openMissionChecklistPhase(user, /^mission setup$/i);
      const orgSection = await screen.findByText("Organization / facility");
      const orgSelect = within(orgSection.closest("section")!).getByRole("combobox");
      await waitFor(() => {
        expect((orgSelect as HTMLSelectElement).value).toBe(newCaseTestIds.accountId);
      });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /save draft observation case/i })).not.toBeDisabled();
        expect(screen.getByRole("button", { name: /^save draft$/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /save draft observation case/i }));

      await waitFor(() => {
        expect(screen.getByText(/draft saved/i)).toBeInTheDocument();
      });

      expect(
        screen.queryByText(/select a product family/i),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/select a sku/i)).not.toBeInTheDocument();

      if (patchedBody) {
        expect(patchedBody.case_type).toBe("observation");
        expect(patchedBody.product_id).toBeNull();
      }
    });
  });

  describe("5. Product support case", () => {
    it("uses phased support workflow without observation goals", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("case_type", "product_support");
      server.use(productSupportPlanningCaseHandler());

      const { container } = await renderNewCasePage();
      await waitForPageReady();

      expect(document.getElementById("new-case-obs-objectives-title")).not.toBeInTheDocument();
      expect(screen.queryByText("Observation goals")).not.toBeInTheDocument();
      expect(screen.getAllByText("Support setup").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Product & inventory").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Case support plan").length).toBeGreaterThan(0);

      await openMissionChecklistPhase(user, /^support setup$/i);
      const workflow = document.querySelector(".new-case-support-mission-workflow") as HTMLElement;
      await waitFor(() => {
        expect(within(workflow).getAllByRole("combobox")[0]).toBeInTheDocument();
      });
      await user.selectOptions(within(workflow).getAllByRole("combobox")[0]!, newCaseTestIds.accountId);
      fireEvent.change(within(workflow).getByLabelText(/^case date/i), { target: { value: "2026-05-27" } });
      fireEvent.change(within(workflow).getByPlaceholderText(/lap chole tray support/i), {
        target: { value: "Lap chole support" },
      });

      await waitFor(() => {
        expect(within(workflow).getByText("Product & inventory").closest("button")).toBeEnabled();
      });
      await openMissionChecklistPhase(user, /^product & inventory$/i);
      await waitFor(() => {
        expect(within(workflow).getByRole("heading", { name: /product & sku/i })).toBeInTheDocument();
      });
      expect(screen.getByText(/po and invoice uploads are completed on the case detail page/i)).toBeInTheDocument();

      expect(screen.queryByText("Observation access")).not.toBeInTheDocument();
    });

    it("blocks save until product and SKU are selected", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("case_type", "product_support");
      server.use(productSupportPlanningCaseHandler());

      await renderNewCasePage();
      await waitForPageReady();

      await openMissionChecklistPhase(user, /^support setup$/i);
      const workflow = document.querySelector(".new-case-support-mission-workflow");
      expect(workflow).not.toBeNull();
      const orgSelect = within(workflow as HTMLElement).getAllByRole("combobox")[0]!;
      await user.selectOptions(orgSelect, newCaseTestIds.accountId);

      fireEvent.submit(document.querySelector("form.new-case-form")!);

      expect(await screen.findByText(/before you save/i)).toBeInTheDocument();
      expect(screen.getAllByText(/select a product family for this support case/i).length).toBeGreaterThan(0);
      expect(postedBody).toBeNull();
    });

    it("switches from observation to product support and updates the workflow", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("case_type", "observation");

      await renderNewCasePage();
      await waitForPageReady();
      await selectCaseTypeInSetup(user, "product_support");

      await waitFor(() => {
        expect(screen.getByText("Support planning")).toBeInTheDocument();
      });
      expect(screen.getAllByText("Support setup").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Product & inventory").length).toBeGreaterThan(0);
      expect(document.getElementById("new-case-obs-objectives-title")).not.toBeInTheDocument();
    });
  });

  describe("6. Opportunity language", () => {
    it("uses opportunity wording in optional planning copy", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("case_type", "observation");
      nav.searchParams.set("surgeon_contact_id", newCaseTestIds.surgeonId);

      await renderNewCasePage();
      await waitForPageReady();

      expect(screen.queryByRole("button", { name: /create engagement/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /create engagement/i })).not.toBeInTheDocument();

      await completeMissionAccessReadiness(user);
      await openMissionChecklistPhase(user, /^observation goals$/i);
      await user.type(screen.getByLabelText(/primary observation objective/i), "Validate workflow fit");
      await openMissionChecklistPhase(user, /^optional planning$/i);

      const bodyText = document.body.textContent || "";
      expect(containsOpportunityWording(bodyText)).toBe(true);
      expect(bodyText).toMatch(/related opportunity/i);
      expect(screen.getByRole("heading", { name: /^related opportunity$/i })).toBeInTheDocument();
      expect(bodyText).toContain(OPPORTUNITY_UI.newCaseNoLinkedInitiative);
    });
  });

  describe("7. Raw intelligence (no snake_case in rep-facing UI)", () => {
    it("formats provider context, unresolved signals, procedural context, and readiness without raw keys", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("case_type", "observation");
      nav.searchParams.set("surgeon_contact_id", newCaseTestIds.surgeonId);

      const { container } = await renderNewCasePage();
      await waitForPageReady();
      await openMissionSetupPhase(user);

      const providerContext = screen.getByRole("heading", { name: /provider context/i }).closest("section")!;
      expectNoRawIntelligenceLabels(providerContext);
      expect(providerContext.textContent).toMatch(/acsis/i);

      const procedureInput = await screen.findByLabelText(/procedure type or specialty/i);
      await user.clear(procedureInput);
      await user.type(procedureInput, "ACSIS");

      await waitFor(() => {
        expect(screen.getByText("Known procedural context")).toBeInTheDocument();
      });
      const proceduralSection = screen.getByText("Known procedural context").closest("section")!;
      expectNoRawIntelligenceLabels(proceduralSection);

      await completeMissionAccessReadiness(user);
      await openMissionChecklistPhase(user, /^observation goals$/i);
      await waitFor(() => {
        expect(screen.getByText("Known unresolved signals")).toBeInTheDocument();
      });
      const signalsSection = screen.getByText("Known unresolved signals").closest("details")!;
      expectNoRawIntelligenceLabels(signalsSection);

      expectNoRawIntelligenceLabels(desktopMissionControlPanel(container));
    });
  });

  describe("8. Mobile layout", () => {
    it("uses a collapsible mobile mission control panel and avoids horizontal overflow", async () => {
      nav.searchParams.set("case_type", "observation");

      const { container } = await renderNewCasePage();
      await waitForPageReady();

      const details = container.querySelector("details.new-case-mission-control--mobile");
      expect(details).not.toBeNull();
      expect(details?.querySelector("summary")).toHaveTextContent(/mission control/i);

      const root = container.querySelector(".create-case-native-root");
      expect(root).not.toBeNull();
      expect(getComputedStyle(root!).minWidth).toBe("0px");

      const layout = container.querySelector(".new-case-layout");
      expect(layout).not.toBeNull();
      expect(newCaseLayoutCss).toMatch(/grid-template-columns:\s*1fr/);
    });
  });

  describe("Additional pathway and compliance regressions", () => {
    it("shows observation pathway context in header by default", async () => {
      nav.searchParams.set("case_type", "observation");

      await renderNewCasePage();
      await waitForPageReady();

      expect(screen.getByText(/pathway stage:/i)).toBeInTheDocument();
      expect(screen.getByText("Discovery → Observe")).toBeInTheDocument();
      expect(screen.getByText("Operational planning phase")).toBeInTheDocument();
      expect(screen.getByText(/access, objectives, and field intelligence enrichment/i)).toBeInTheDocument();
    });

    it("updates pathway context when product support is selected", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("case_type", "observation");

      await renderNewCasePage();
      await waitForPageReady();
      await selectCaseTypeInSetup(user, "product_support");

      await waitFor(() => {
        expect(screen.getByText("Experience / Support")).toBeInTheDocument();
      });
      expect(screen.getByText(/product, coverage, and field execution details/i)).toBeInTheDocument();
      expect(screen.queryByText("Operational planning phase")).not.toBeInTheDocument();
    });

    it("shows compact PHI compliance banner at top of form", async () => {
      nav.searchParams.set("case_type", "observation");

      await renderNewCasePage();
      await waitForPageReady();

      const banner = screen.getByRole("status", { name: /phi restricted: do not enter patient identifiers/i });
      expect(banner).toHaveClass("new-case-phi-banner");
      expect(banner.closest("form.new-case-form")?.querySelector(".new-case-phi-banner")).toBe(banner);
      expect(screen.queryByText(/patient names, DOBs, MRNs/i)).not.toBeInTheDocument();
    });

    it("carries unresolved signals into observation goals", async () => {
      const user = userEvent.setup();
      nav.searchParams.set("case_type", "observation");
      nav.searchParams.set("surgeon_contact_id", newCaseTestIds.surgeonId);

      const { container } = await renderNewCasePage();
      await waitForPageReady();

      await completeMissionAccessReadiness(user);
      await openMissionChecklistPhase(user, /^observation goals$/i);

      await waitFor(() => {
        expect(screen.getByText("Known unresolved signals")).toBeInTheDocument();
      });

      // Signals start collapsed so objective fields stay visually primary.
      const unresolvedDetails = container.querySelector("details.new-case-unresolved-signals");
      expect(unresolvedDetails).not.toBeNull();
      expect(unresolvedDetails?.hasAttribute("open")).toBe(false);
      expect(screen.getByText(/\+\d+ more/i)).toBeInTheDocument();

      await user.click(screen.getByText("Known unresolved signals"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /carry selected into objectives/i })).toBeInTheDocument();
      });

      const carrySelected = screen.getByRole("button", { name: /carry selected into objectives/i });
      const carryAll = screen.getByRole("button", { name: /^carry all$/i });
      expect(carrySelected).toBeDisabled();
      expect(carryAll).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /carry into observation goals/i })).not.toBeInTheDocument();

      const signalCheckboxes = container.querySelectorAll(".new-case-unresolved-signal-checkbox");
      expect(signalCheckboxes.length).toBeGreaterThan(0);
      await user.click(signalCheckboxes[0] as HTMLInputElement);
      expect(carrySelected).not.toBeDisabled();

      await user.click(carrySelected);
      expect(await screen.findByText(/signals? added to objectives/i)).toBeInTheDocument();
    });
  });
});
