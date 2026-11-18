import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { signInSales } from "./helpers/signInSales";
import {
  auditViewport,
  collectRuntime,
  runtimeFindings,
  settle,
  type Finding,
  type PageAuditResult,
  type Severity,
} from "./helpers/mobileAudit";
import { MOBILE_VIEWPORTS, STATIC_SALES_ROUTES, resolveDynamicRoutes, type SalesRoute } from "./helpers/salesRoutes";

const screenshotRoot = path.resolve(process.cwd(), "playwright-screenshots", "sales-mobile-audit");
const reportRoot = path.resolve(process.cwd(), "audit-reports");

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

/** Tab panels are swept on one representative size to keep the run under 15 minutes. */
const TAB_SWEEP_VIEWPORT = "iphone-14-390";

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "tab";
}

function severityRank(severity: Severity): number {
  return SEVERITY_ORDER.indexOf(severity);
}

function writeReport(results: PageAuditResult[], unresolved: { label: string; title: string; reason: string }[]): void {
  fs.mkdirSync(reportRoot, { recursive: true });
  fs.writeFileSync(
    path.join(reportRoot, "sales-mobile-audit.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), unresolved, results }, null, 2),
    "utf8",
  );

  const totals = new Map<Severity, number>();
  for (const result of results) {
    for (const finding of result.findings) {
      totals.set(finding.severity, (totals.get(finding.severity) ?? 0) + 1);
    }
  }

  // Group identical checks across viewports so the report reads as a defect list, not a log.
  type Group = {
    check: string;
    severity: Severity;
    message: string;
    selector?: string;
    text?: string;
    detail?: Finding["detail"];
    where: Set<string>;
  };
  const byRoute = new Map<string, { route: SalesRoute; groups: Map<string, Group> }>();

  for (const result of results) {
    const bucket =
      byRoute.get(result.label) ??
      { route: { label: result.label, route: result.route, title: result.label }, groups: new Map<string, Group>() };
    for (const finding of result.findings) {
      const key = `${finding.check}|${finding.selector ?? ""}|${finding.message}`;
      const existing = bucket.groups.get(key);
      if (existing) {
        existing.where.add(result.viewport.name);
      } else {
        bucket.groups.set(key, {
          check: finding.check,
          severity: finding.severity,
          message: finding.message,
          selector: finding.selector,
          text: finding.text,
          detail: finding.detail,
          where: new Set([result.viewport.name]),
        });
      }
    }
    byRoute.set(result.label, bucket);
  }

  const lines: string[] = [];
  lines.push("# Sales Command mobile readiness audit");
  lines.push("");
  lines.push(`Generated ${new Date().toISOString()}`);
  lines.push("");
  lines.push(
    `Viewports: ${MOBILE_VIEWPORTS.map((v) => `${v.name} (${v.width}x${v.height})`).join(", ")}`,
  );
  lines.push("");
  lines.push(
    `Findings: ${SEVERITY_ORDER.map((s) => `${totals.get(s) ?? 0} ${s}`).join(", ")} across ${byRoute.size} pages.`,
  );
  lines.push("");

  if (unresolved.length > 0) {
    lines.push("## Pages that could not be audited");
    lines.push("");
    for (const item of unresolved) {
      lines.push(`- ${item.title} (${item.label}): ${item.reason}`);
    }
    lines.push("");
  }

  const sortedRoutes = [...byRoute.entries()].sort((a, b) => {
    const worst = (entry: typeof a) =>
      Math.min(...[...entry[1].groups.values()].map((g) => severityRank(g.severity)), SEVERITY_ORDER.length);
    return worst(a) - worst(b) || a[0].localeCompare(b[0]);
  });

  for (const [label, bucket] of sortedRoutes) {
    const groups = [...bucket.groups.values()].sort(
      (a, b) => severityRank(a.severity) - severityRank(b.severity) || a.check.localeCompare(b.check),
    );
    lines.push(`## ${label} — \`${bucket.route.route}\``);
    lines.push("");
    if (groups.length === 0) {
      lines.push("No findings.");
      lines.push("");
      continue;
    }
    for (const group of groups) {
      const where = [...group.where].sort().join(", ");
      lines.push(`- **${group.severity.toUpperCase()}** [${group.check}] ${group.message}`);
      if (group.selector) lines.push(`  - element: \`${group.selector}\``);
      if (group.text) lines.push(`  - text: "${group.text.replace(/"/g, "'")}"`);
      if (group.detail?.coveredBy) lines.push(`  - covered by: \`${group.detail.coveredBy}\``);
      if (group.detail?.src) lines.push(`  - src: ${group.detail.src}`);
      lines.push(`  - viewports: ${where}`);
    }
    lines.push("");
  }

  fs.writeFileSync(path.join(reportRoot, "sales-mobile-audit.md"), lines.join("\n"), "utf8");
}

test.describe("Sales Command mobile readiness", () => {
  test("audits every sales page across phone viewports", async ({ browser }) => {
    test.setTimeout(45 * 60_000);

    fs.mkdirSync(screenshotRoot, { recursive: true });
    fs.mkdirSync(reportRoot, { recursive: true });
    const progressFile = path.join(reportRoot, "sales-mobile-audit.log");
    fs.writeFileSync(progressFile, "", "utf8");
    const log = (message: string) => {
      const line = `${new Date().toISOString()} ${message}\n`;
      fs.appendFileSync(progressFile, line, "utf8");
      process.stdout.write(line);
    };

    // ---- sign in once, reuse the session for every viewport ----
    const authContext = await browser.newContext();
    const authPage = await authContext.newPage();
    await signInSales(authPage, log);

    const { routes: dynamicRoutes, unresolved } = await resolveDynamicRoutes(authPage);
    const allRoutes: SalesRoute[] = [...STATIC_SALES_ROUTES, ...dynamicRoutes];
    const storageState = await authContext.storageState();
    await authContext.close();

    log(
      `${allRoutes.length} routes x ${MOBILE_VIEWPORTS.length} viewports = ${allRoutes.length * MOBILE_VIEWPORTS.length} page audits`,
    );
    for (const route of allRoutes) log(`  route ${route.label} -> ${route.route}`);
    if (unresolved.length > 0) {
      log(`unresolved detail routes: ${unresolved.map((u) => u.label).join(", ")}`);
    }

    const results: PageAuditResult[] = [];

    for (const viewport of MOBILE_VIEWPORTS) {
      const context = await browser.newContext({
        storageState,
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.scale,
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      page.setDefaultNavigationTimeout(60_000);
      const runtime = collectRuntime(page);
      const shotDir = path.join(screenshotRoot, viewport.name);
      fs.mkdirSync(shotDir, { recursive: true });

      for (const route of allRoutes) {
        const findings: Finding[] = [];
        let finalUrl = "";
        try {
          await page.goto(route.route, { waitUntil: "domcontentloaded", timeout: 45_000 });
          await settle(page);
          finalUrl = page.url();

          if (/\/login/.test(finalUrl)) {
            findings.push({
              check: "session-lost",
              severity: "critical",
              message: "Page bounced to the sign-in screen; the audit session was not accepted.",
            });
          } else if (!new URL(finalUrl).pathname.startsWith("/portal/sales")) {
            findings.push({
              check: "unexpected-redirect",
              severity: "high",
              message: `Route redirected away from Sales Command to ${new URL(finalUrl).pathname}.`,
            });
          }

          findings.push(...(await auditViewport(page, viewport.width)));
        } catch (error) {
          findings.push({
            check: "navigation-failed",
            severity: "critical",
            message: `Could not load the page: ${(error as Error).message.split("\n")[0]}`,
          });
        }

        findings.push(...runtimeFindings(runtime.drain()));

        const screenshot = path.join(shotDir, `${route.label}.png`);
        await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);

        results.push({
          label: route.label,
          route: route.route,
          finalUrl,
          viewport: { name: viewport.name, width: viewport.width, height: viewport.height },
          screenshot: path.relative(process.cwd(), screenshot),
          findings,
        });

        const worst = findings.length
          ? SEVERITY_ORDER.find((s) => findings.some((f) => f.severity === s)) ?? "clean"
          : "clean";
        log(`${viewport.name} ${route.label}: ${findings.length} findings (worst: ${worst})`);

        // Tabbed screens hide most of their content behind the first tab. Sweep the
        // rest once, on the most common phone size, so those panels are audited too.
        if (viewport.name === TAB_SWEEP_VIEWPORT && findings.every((f) => f.check !== "navigation-failed")) {
          const tabs = await page
            .locator('[role="tab"]')
            .evaluateAll((els) =>
              els
                .map((el, index) => ({
                  index,
                  name: (el.textContent || "").replace(/\s+/g, " ").trim(),
                  rendered: (() => {
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                  })(),
                  selected: el.getAttribute("aria-selected") === "true",
                }))
                .filter((tab) => tab.rendered && !tab.selected && tab.name.length > 0 && tab.name.length < 40)
                .slice(0, 8),
            )
            .catch(() => [] as { index: number; name: string }[]);

          for (const { index, name } of tabs) {
            const tabFindings: Finding[] = [];
            try {
              // Tab strips scroll horizontally on a phone; swiping one into view is a
              // normal gesture, so reveal it before deciding the tab is unusable.
              // Centering both axes keeps the tab clear of sticky headers and of the
              // neighbouring tab, which is what a rep sees before they tap.
              const byIndex = page.locator('[role="tab"]').nth(index);
              const target = (await byIndex.count()) > 0 ? byIndex : page.getByRole("tab", { name, exact: true }).first();
              await target.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
              await page.waitForTimeout(400);
              await target.click({ timeout: 5_000 });
              await settle(page);
              tabFindings.push(...(await auditViewport(page, viewport.width)));
            } catch (error) {
              tabFindings.push({
                check: "tab-not-usable",
                severity: "high",
                message: `Tab "${name}" could not be opened: ${(error as Error).message.split("\n")[0]}`,
              });
            }
            tabFindings.push(...runtimeFindings(runtime.drain()));
            const tabShot = path.join(shotDir, `${route.label}--tab-${slug(name)}.png`);
            await page.screenshot({ path: tabShot, fullPage: true }).catch(() => undefined);
            results.push({
              label: `${route.label} · tab "${name}"`,
              route: route.route,
              finalUrl: page.url(),
              viewport: { name: viewport.name, width: viewport.width, height: viewport.height },
              screenshot: path.relative(process.cwd(), tabShot),
              findings: tabFindings,
            });
            log(`${viewport.name} ${route.label} tab "${name}": ${tabFindings.length} findings`);
          }
        }
      }

      // ---- navigation drawer, the highest-traffic mobile interaction ----
      try {
        await page.goto("/portal/sales", { waitUntil: "domcontentloaded" });
        await settle(page);
        const menuButton = page
          .locator('button[aria-label*="menu" i], button:has-text("☰"), .sales-cmd-mobile-menu, [data-testid="portal-mobile-menu"]')
          .first();
        const drawerFindings: Finding[] = [];
        if ((await menuButton.count()) === 0) {
          drawerFindings.push({
            check: "mobile-nav-missing",
            severity: "critical",
            message: "No navigation menu control is available on a phone-sized screen.",
          });
        } else {
          await menuButton.click({ timeout: 5_000 });
          await page.waitForTimeout(700);
          drawerFindings.push(...(await auditViewport(page, viewport.width)));
        }
        drawerFindings.push(...runtimeFindings(runtime.drain()));
        const shot = path.join(shotDir, "nav-drawer-open.png");
        await page.screenshot({ path: shot, fullPage: false }).catch(() => undefined);
        results.push({
          label: "nav-drawer-open",
          route: "/portal/sales (navigation drawer open)",
          finalUrl: page.url(),
          viewport: { name: viewport.name, width: viewport.width, height: viewport.height },
          screenshot: path.relative(process.cwd(), shot),
          findings: drawerFindings,
        });
        log(`${viewport.name} nav-drawer-open: ${drawerFindings.length} findings`);
      } catch (error) {
        results.push({
          label: "nav-drawer-open",
          route: "/portal/sales (navigation drawer open)",
          finalUrl: page.url(),
          viewport: { name: viewport.name, width: viewport.width, height: viewport.height },
          screenshot: "",
          findings: [
            {
              check: "mobile-nav-broken",
              severity: "critical",
              message: `Navigation drawer could not be opened: ${(error as Error).message.split("\n")[0]}`,
            },
          ],
        });
      }

      await context.close();
    }

    writeReport(results, unresolved);

    const critical = results.flatMap((r) => r.findings.filter((f) => f.severity === "critical"));
    const high = results.flatMap((r) => r.findings.filter((f) => f.severity === "high"));
    log(`complete: ${critical.length} critical, ${high.length} high. Report: audit-reports/sales-mobile-audit.md`);

    // The baseline run is a data-gathering pass; the strict run gates the work as done.
    if (process.env.AUDIT_STRICT === "1") {
      expect(
        critical.concat(high).map((f) => `${f.severity}: ${f.check} — ${f.message}`),
        "Sales Command mobile audit found blocking issues",
      ).toEqual([]);
    }
  });
});
