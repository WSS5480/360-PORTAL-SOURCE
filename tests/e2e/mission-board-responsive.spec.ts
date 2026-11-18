import { expect, test } from "@playwright/test";
import { signIn } from "./helpers/signIn";

const PROVIDERS_RESPONSE = {
  ok: true,
  filter_options: { specialties: ["Orthopedics"], territories: ["TX"] },
  providers: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      first_name: "Mark",
      last_name: "Onion",
      specialty: "Orthopedics",
      primary_organization_name: "Pilot Hospital",
      primary_organization_id: "org-1",
      organization_count: 1,
      additional_organizations_count: 0,
      territory: "TX",
      planning_status: "not_started",
      linked_opportunities_count: 0,
      recent_case_count: 0,
      last_activity_at: new Date().toISOString(),
      relationship_pathway_stage_id: "discovery",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      first_name: "Tom",
      last_name: "Lettuce",
      specialty: "Orthopedics",
      primary_organization_name: "Test Hospital",
      primary_organization_id: "org-1",
      organization_count: 1,
      additional_organizations_count: 0,
      territory: "TX",
      planning_status: "not_started",
      linked_opportunities_count: 0,
      recent_case_count: 0,
      last_activity_at: new Date().toISOString(),
      relationship_pathway_stage_id: "debrief",
      observation_count: 5,
    },
  ],
};

async function stubProviderDirectory(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("providerViewMode", "mission");
  });
  await page.route("**/api/portal/sales/surgical-accounts?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        organizations: [{ id: "org-1", name: "Pilot Hospital" }],
      }),
    });
  });
  await page.route("**/api/portal/sales/providers?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROVIDERS_RESPONSE),
    });
  });
}

test.describe("Mission Board responsive layout", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await stubProviderDirectory(page);
  });

  test("keeps desktop Kanban and drag cards visible", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/portal/sales/providers", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("mission-board-desktop-kanban")).toBeVisible();
    await expect(page.getByTestId("mission-board-mobile-layout")).toBeHidden();
    await expect(page.locator(".mission-board-column")).toHaveCount(6);
    await expect(page.locator('[data-testid="mission-board-desktop-kanban"] article[draggable="true"]').first()).toBeVisible();
  });

  test("uses mobile next-action layout with stage move buttons", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/portal/sales/providers", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("mission-board-mobile-layout")).toBeVisible();
    await expect(page.getByTestId("mission-board-desktop-kanban")).toBeHidden();
    await expect(page.getByTestId("mission-board-mobile-primary-card")).toContainText("Mark Onion");
    await expect(page.getByTestId("mission-board-mobile-stage-move")).toHaveText(/Move to Observation/i);
    await expect(page.getByTestId("mission-board-mobile-field-note")).toBeVisible();
    await expect(page.getByTestId("mission-board-mobile-add-case")).toHaveText(/Add Case/i);

    await page.getByLabel("Mark Onion actions").click();
    await expect(page.getByRole("menuitem", { name: "View Profile" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Add Support Contact" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Edit Provider" })).toBeVisible();

    await page.getByRole("button", { name: /Show Tom Lettuce mission card/i }).click();
    await expect(page.getByTestId("mission-board-mobile-primary-card")).toContainText("Tom Lettuce");
    await expect(page.getByRole("button", { name: /Show Mark Onion mission card/i })).toBeVisible();
  });
});
