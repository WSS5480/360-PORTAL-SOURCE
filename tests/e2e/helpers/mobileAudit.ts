import type { Page, Request, Response } from "@playwright/test";

export type Severity = "critical" | "high" | "medium" | "low";

export type Finding = {
  check: string;
  severity: Severity;
  message: string;
  selector?: string;
  text?: string;
  detail?: Record<string, string | number | boolean | null>;
};

export type PageAuditResult = {
  label: string;
  route: string;
  finalUrl: string;
  viewport: { name: string; width: number; height: number };
  screenshot: string;
  findings: Finding[];
};

export type RuntimeLog = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  badResponses: string[];
};

/**
 * Attaches runtime collectors. Returns a handle whose `drain()` empties the buffers,
 * so one page can be reused across many routes without cross-contaminating reports.
 */
export function collectRuntime(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];

  // Next.js dev overlay and HMR produce noise that never ships to production.
  const ignoredConsole = [
    /\[Fast Refresh\]/i,
    /react-devtools/i,
    /Download the React DevTools/i,
    /webpack-hmr/i,
    /hot-update/i,
    /favicon/i,
    /Warning: Extra attributes from the server/i,
  ];
  const ignoredUrl = [/hot-update/i, /_next\/static\/webpack/i, /__nextjs/i, /favicon\.ico/i];

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (ignoredConsole.some((re) => re.test(text))) return;
    // "Failed to load resource" messages carry the offending URL only in the location.
    const url = msg.location()?.url ?? "";
    const suffix = url && !text.includes(url) ? ` (${url})` : "";
    consoleErrors.push(`${text}${suffix}`);
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });
  page.on("requestfailed", (req: Request) => {
    const url = req.url();
    if (ignoredUrl.some((re) => re.test(url))) return;
    // Aborted navigations happen when we drive the browser away mid-fetch.
    const failure = req.failure()?.errorText ?? "";
    if (/ERR_ABORTED|NS_BINDING_ABORTED/i.test(failure)) return;
    failedRequests.push(`${req.method()} ${url} — ${failure}`);
  });
  page.on("response", (res: Response) => {
    const status = res.status();
    if (status < 400) return;
    const url = res.url();
    if (ignoredUrl.some((re) => re.test(url))) return;
    badResponses.push(`${status} ${res.request().method()} ${url}`);
  });

  return {
    drain(): RuntimeLog {
      const snapshot: RuntimeLog = {
        consoleErrors: [...consoleErrors],
        pageErrors: [...pageErrors],
        failedRequests: [...failedRequests],
        badResponses: [...badResponses],
      };
      consoleErrors.length = 0;
      pageErrors.length = 0;
      failedRequests.length = 0;
      badResponses.length = 0;
      return snapshot;
    },
  };
}

export function runtimeFindings(log: RuntimeLog): Finding[] {
  const findings: Finding[] = [];
  for (const message of log.pageErrors) {
    findings.push({ check: "runtime-exception", severity: "critical", message });
  }
  for (const message of log.consoleErrors) {
    findings.push({ check: "console-error", severity: "high", message });
  }
  for (const message of log.badResponses) {
    findings.push({
      check: "failed-response",
      severity: message.startsWith("5") ? "critical" : "high",
      message,
    });
  }
  for (const message of log.failedRequests) {
    findings.push({ check: "failed-request", severity: "high", message });
  }
  return findings;
}

/** Waits for the page to visually settle: network quiet, spinners gone, fonts loaded. */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => undefined);
  // Wait out any "Loading …" placeholder so the audit measures the real screen.
  await page
    .waitForFunction(
      () => {
        const body = document.body;
        if (!body) return false;
        const loadingPattern = /^loading\b[^.]{0,48}(\.{3}|…)?$/i;
        const nodes = Array.from(body.querySelectorAll<HTMLElement>("*"));
        return !nodes.some((el) => {
          const own = Array.from(el.childNodes)
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => (n.textContent || "").trim())
            .join(" ")
            .trim();
          if (!own || !loadingPattern.test(own)) return false;
          const style = getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      },
      undefined,
      { timeout: 15_000 },
    )
    .catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
  await page.waitForTimeout(700);
}

/**
 * The in-page audit. Runs entirely in the browser so it can read computed styles
 * and hit-test real geometry.
 */
export async function auditViewport(page: Page, deviceWidth?: number): Promise<Finding[]> {
  return page.evaluate((expectedWidth: number | undefined) => {
    const out: {
      check: string;
      severity: "critical" | "high" | "medium" | "low";
      message: string;
      selector?: string;
      text?: string;
      detail?: Record<string, string | number | boolean | null>;
    }[] = [];

    // When content is wider than the screen, mobile browsers widen the layout
    // viewport and shrink the page to fit, so window.innerWidth already hides the
    // overflow. The device width is the honest yardstick.
    const screenWidth = expectedWidth ?? Math.round(window.visualViewport?.width ?? window.innerWidth);
    const viewportWidth = Math.min(window.innerWidth, screenWidth);
    const viewportHeight = window.innerHeight;
    const SLACK = 2;

    function describe(el: Element): string {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : "";
      const cls =
        typeof el.className === "string" && el.className.trim()
          ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
          : "";
      const testId = el.getAttribute("data-testid");
      return `${tag}${id}${cls}${testId ? `[data-testid="${testId}"]` : ""}`;
    }

    function snippet(el: Element, max = 90): string {
      const text = (el instanceof HTMLElement ? el.innerText : el.textContent) || "";
      const clean = text.replace(/\s+/g, " ").trim();
      return clean.length > max ? `${clean.slice(0, max)}…` : clean;
    }

    function isRendered(el: Element): boolean {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (Number(style.opacity) === 0) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    function isHiddenFromA11y(el: Element): boolean {
      let node: Element | null = el;
      while (node) {
        if (node.getAttribute("aria-hidden") === "true") return true;
        if (node.hasAttribute("hidden")) return true;
        node = node.parentElement;
      }
      return false;
    }

    /** Nearest ancestor that legitimately scrolls horizontally (carousel, scrollable table). */
    function horizontalScrollAncestor(el: Element): Element | null {
      let node = el.parentElement;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (style.overflowX === "auto" || style.overflowX === "scroll" || style.overflowX === "hidden") {
          return node;
        }
        node = node.parentElement;
      }
      return null;
    }

    /**
     * True when an ancestor crops the element to a smaller box. Zoomed/cropped artwork
     * (a logo scaled up inside a fixed frame) has a huge bounding box but is visually
     * contained, so it must not be reported as overflowing.
     */
    function clippingAncestor(el: Element): Element | null {
      const rect = el.getBoundingClientRect();
      let node = el.parentElement;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        const crops =
          style.overflow === "hidden" ||
          style.overflow === "clip" ||
          style.overflowX === "hidden" ||
          style.overflowX === "clip";
        if (crops) {
          const parentRect = node.getBoundingClientRect();
          if (parentRect.width < rect.width + SLACK) return node;
        }
        node = node.parentElement;
      }
      return null;
    }

    const allElements = Array.from(document.querySelectorAll<HTMLElement>("body *"));

    // ---------------------------------------------------------------- overflow
    if (window.innerWidth > screenWidth + SLACK) {
      out.push({
        check: "page-scaled-down",
        severity: "critical",
        message: `Layout is ${window.innerWidth}px wide on a ${screenWidth}px screen, so the browser shrinks the whole page and every label renders smaller than designed.`,
        detail: { layoutWidth: window.innerWidth, screenWidth },
      });
    }

    const docWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body ? document.body.scrollWidth : 0,
    );
    if (docWidth > viewportWidth + SLACK) {
      out.push({
        check: "page-horizontal-overflow",
        severity: "critical",
        message: `Page scrolls sideways: content is ${docWidth}px wide in a ${viewportWidth}px viewport (${docWidth - viewportWidth}px too wide).`,
        detail: { documentWidth: docWidth, viewportWidth },
      });

      const offenders = allElements
        .filter((el) => isRendered(el) && !isHiddenFromA11y(el))
        .map((el) => ({ el, rect: el.getBoundingClientRect() }))
        .filter(({ rect }) => rect.right > viewportWidth + SLACK && rect.width > 4)
        // An element sticking out inside a scroller is intentional, not a layout break.
        .filter(({ el }) => horizontalScrollAncestor(el) === null)
        // Report the outermost offenders only; children inherit the parent's problem.
        .filter(({ el }, _i, arr) => !arr.some((other) => other.el !== el && other.el.contains(el)))
        .slice(0, 8);

      for (const { el, rect } of offenders) {
        out.push({
          check: "element-overflows-viewport",
          severity: "critical",
          message: `Element extends ${Math.round(rect.right - viewportWidth)}px past the right edge of the screen.`,
          selector: describe(el),
          text: snippet(el),
          detail: { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) },
        });
      }
    }

    // Unscrollable overflowing tables read as truncated data on a phone.
    for (const table of Array.from(document.querySelectorAll("table"))) {
      if (!isRendered(table)) continue;
      const rect = table.getBoundingClientRect();
      if (rect.width <= viewportWidth + SLACK) continue;
      const scroller = horizontalScrollAncestor(table);
      const scrollable =
        scroller !== null &&
        (getComputedStyle(scroller).overflowX === "auto" || getComputedStyle(scroller).overflowX === "scroll");
      if (!scrollable) {
        out.push({
          check: "table-not-scrollable",
          severity: "high",
          message: `Table is ${Math.round(rect.width)}px wide but has no horizontal scroll container, so columns are unreachable.`,
          selector: describe(table),
          text: snippet(table, 60),
        });
      }
    }

    // ------------------------------------------------------------ tap targets
    const interactiveSelector = [
      "a[href]",
      "button",
      "input:not([type=hidden])",
      "select",
      "textarea",
      "summary",
      '[role="button"]',
      '[role="tab"]',
      '[role="switch"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="menuitem"]',
      "[onclick]",
    ].join(",");

    const interactive = Array.from(document.querySelectorAll<HTMLElement>(interactiveSelector)).filter(
      (el) => isRendered(el) && !isHiddenFromA11y(el) && !(el as HTMLButtonElement).disabled,
    );

    /**
     * Controls that flow inside a sentence are exempt from the minimum target size
     * (WCAG 2.5.8). This covers link-styled buttons too, not just anchors, because
     * the exemption is about the control sitting in running text.
     */
    function isInlineTextControl(el: HTMLElement): boolean {
      if (el.tagName !== "A" && el.tagName !== "BUTTON") return false;
      if (getComputedStyle(el).display !== "inline") return false;
      const parent = el.parentElement;
      if (!parent) return false;
      const parentText = (parent.innerText || "").replace(/\s+/g, " ").trim();
      const ownText = (el.innerText || "").replace(/\s+/g, " ").trim();
      return parentText.length > ownText.length + 4;
    }

    const MIN_TARGET = 44;
    const reportedTargets = new Set<string>();
    for (const el of interactive) {
      if (isInlineTextControl(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > document.documentElement.scrollHeight) continue;
      const w = rect.width;
      const h = rect.height;
      if (w >= MIN_TARGET && h >= MIN_TARGET) continue;
      // Toggles/checkboxes are often small but wrapped in a large label.
      const label = el.closest("label");
      if (label) {
        const lr = label.getBoundingClientRect();
        if (lr.width >= MIN_TARGET && lr.height >= MIN_TARGET) continue;
      }
      const key = `${describe(el)}|${snippet(el, 30)}|${Math.round(w)}x${Math.round(h)}`;
      if (reportedTargets.has(key)) continue;
      reportedTargets.add(key);
      out.push({
        check: "tap-target-too-small",
        severity: w < 32 || h < 32 ? "high" : "medium",
        message: `Touch target is ${Math.round(w)}×${Math.round(h)}px, below the 44×44px minimum.`,
        selector: describe(el),
        text: snippet(el, 40),
        detail: { width: Math.round(w), height: Math.round(h) },
      });
    }

    // ------------------------------------------------- occluded / covered UI
    /**
     * Drawers, dialogs and the Next.js dev overlay are meant to cover the page behind
     * them, so controls underneath are expected — not a layout defect.
     */
    const intentionalCoverSelector = [
      "nextjs-portal",
      ".portal-sidebar",
      ".portal-sidebar-overlay",
      '[role="dialog"]',
      '[aria-modal="true"]',
    ].join(",");

    function isIntentionalCover(el: Element): boolean {
      return el.closest(intentionalCoverSelector) !== null;
    }

    /** Returns the element painted over `el`'s center, or null when `el` is tappable. */
    function blockerAtCenter(el: HTMLElement): HTMLElement | null {
      const rect = el.getBoundingClientRect();
      if (rect.width < 6 || rect.height < 6) return null;
      if (rect.bottom <= 0 || rect.top >= viewportHeight) return null;
      if (rect.right <= 0 || rect.left >= viewportWidth) return null;
      const cx = Math.min(Math.max(rect.left + rect.width / 2, 1), viewportWidth - 1);
      const cy = Math.min(Math.max(rect.top + rect.height / 2, 1), viewportHeight - 1);
      const hit = document.elementFromPoint(cx, cy);
      if (!hit) return null;
      if (hit === el || el.contains(hit) || hit.contains(el)) return null;
      if (isIntentionalCover(hit) && !isIntentionalCover(el)) return null;
      return hit as HTMLElement;
    }

    const reportedOcclusions = new Set<string>();
    const scrollRestore = { x: window.scrollX, y: window.scrollY };
    for (const el of interactive) {
      let blocker = blockerAtCenter(el);
      if (!blocker) continue;
      // A sticky footer or floating bar overlapping mid-page content is only a real
      // defect if the control stays unreachable after the user scrolls to it.
      el.scrollIntoView({ block: "center", inline: "nearest" });
      blocker = blockerAtCenter(el);
      if (!blocker) continue;
      const blockerStyle = getComputedStyle(blocker);
      const key = `${describe(el)}|${describe(blocker)}`;
      if (reportedOcclusions.has(key)) continue;
      reportedOcclusions.add(key);
      out.push({
        check: "control-covered",
        severity: blockerStyle.position === "fixed" || blockerStyle.position === "sticky" ? "high" : "medium",
        message: `Control cannot be tapped — its center stays covered by another element (${blockerStyle.position}) even after scrolling to it.`,
        selector: describe(el),
        text: snippet(el, 40),
        detail: { coveredBy: describe(blocker), blockerPosition: blockerStyle.position },
      });
    }
    window.scrollTo(scrollRestore.x, scrollRestore.y);

    // ------------------------------------------------- control accessible name
    /**
     * Icon-only controls carry no hover tooltip on a phone, so a missing name
     * leaves the rep guessing what the button does (and breaks screen readers).
     */
    function accessibleName(el: HTMLElement): string {
      const aria = (el.getAttribute("aria-label") || "").trim();
      if (aria) return aria;
      const labelledBy = (el.getAttribute("aria-labelledby") || "").trim();
      if (labelledBy) {
        const named = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id))
          .filter(Boolean)
          .map((node) => (node!.innerText || node!.textContent || "").trim())
          .join(" ")
          .trim();
        if (named) return named;
      }
      const own = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
      if (own) return own;
      const altText = Array.from(el.querySelectorAll("img[alt], svg title, [role=img][aria-label]"))
        .map((node) =>
          (node.getAttribute("alt") || node.getAttribute("aria-label") || node.textContent || "").trim(),
        )
        .join(" ")
        .trim();
      if (altText) return altText;
      const title = (el.getAttribute("title") || "").trim();
      if (title) return title;
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        const labels = Array.from(el.labels || [])
          .map((label) => (label.innerText || "").trim())
          .join(" ")
          .trim();
        if (labels) return labels;
        const placeholder = (el.getAttribute("placeholder") || "").trim();
        if (placeholder) return placeholder;
      }
      const wrappingLabel = el.closest("label");
      if (wrappingLabel) {
        const text = (wrappingLabel.innerText || "").replace(/\s+/g, " ").trim();
        if (text) return text;
      }
      return "";
    }

    const reportedNames = new Set<string>();
    for (const el of interactive) {
      if (el.getAttribute("tabindex") === "-1") continue;
      if (accessibleName(el)) continue;
      const key = describe(el);
      if (reportedNames.has(key)) continue;
      reportedNames.add(key);
      out.push({
        check: "control-missing-label",
        severity: "medium",
        message: "Control has no visible text or accessible name, so its purpose is unclear on a touch screen.",
        selector: key,
      });
    }

    // ------------------------------------------------------------- typography
    const reportedText = new Set<string>();
    for (const el of allElements) {
      if (!isRendered(el) || isHiddenFromA11y(el)) continue;
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => (n.textContent || "").trim())
        .join(" ")
        .trim();
      if (ownText.length < 3) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (!Number.isFinite(size) || size >= 11) continue;
      const key = `${describe(el)}|${size}`;
      if (reportedText.has(key)) continue;
      reportedText.add(key);
      out.push({
        check: "text-too-small",
        severity: size < 9 ? "high" : "medium",
        message: `Text renders at ${size.toFixed(1)}px, too small to read comfortably on a phone.`,
        selector: describe(el),
        text: ownText.slice(0, 60),
        detail: { fontSize: size },
      });
    }

    // iOS Safari zooms the whole page when a focused field is under 16px.
    for (const el of Array.from(
      document.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea"),
    )) {
      if (!isRendered(el)) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (!Number.isFinite(size) || size >= 16) continue;
      out.push({
        check: "input-triggers-ios-zoom",
        severity: "medium",
        message: `Field font size is ${size.toFixed(1)}px; iOS zooms the page in when anything under 16px is focused.`,
        selector: describe(el),
        detail: { fontSize: size },
      });
    }

    // ----------------------------------------------------------------- images
    for (const img of Array.from(document.querySelectorAll("img"))) {
      if (!isRendered(img)) continue;
      if (img.complete && img.naturalWidth === 0) {
        out.push({
          check: "broken-image",
          severity: "high",
          message: "Image failed to load and renders as a broken placeholder.",
          selector: describe(img),
          detail: { src: img.getAttribute("src") },
        });
      }
      const rect = img.getBoundingClientRect();
      if (rect.width > viewportWidth + SLACK && clippingAncestor(img) === null) {
        out.push({
          check: "image-wider-than-screen",
          severity: "high",
          message: `Image is ${Math.round(rect.width)}px wide on a ${viewportWidth}px screen.`,
          selector: describe(img),
        });
      }
    }

    // ------------------------------------------------------ stuck / empty page
    const bodyText = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
    if (bodyText.length < 40) {
      out.push({
        check: "page-effectively-blank",
        severity: "critical",
        message: `Page rendered almost no content (${bodyText.length} characters of visible text).`,
        text: bodyText,
      });
    }
    // "Loading", "Loading…", "Loading provider…", "Please wait" — any wording.
    const loadingPlaceholder = /^(loading\b[^.]{0,48}(\.{3}|…)?|please wait[.…]{0,3})$/i;
    const spinnerish = Array.from(document.querySelectorAll<HTMLElement>("body *")).filter((el) => {
      if (!isRendered(el)) return false;
      const t = (el.innerText || "").trim();
      return loadingPlaceholder.test(t);
    });
    if (spinnerish.length > 0) {
      out.push({
        check: "stuck-loading-state",
        severity: "high",
        message: "A loading placeholder is still on screen after the page settled.",
        selector: describe(spinnerish[0]),
      });
    }

    // ------------------------------------------------------- developer-facing text
    const bannedPatterns: { re: RegExp; label: string; severity: "critical" | "high" | "medium" }[] = [
      { re: /\bundefined\b/, label: "the word “undefined”", severity: "critical" },
      { re: /\bNaN\b/, label: "“NaN”", severity: "critical" },
      { re: /\[object [A-Z]\w*\]/, label: "a raw object placeholder", severity: "critical" },
      { re: /\bnull\b/, label: "the word “null”", severity: "critical" },
      { re: /\bInvalid Date\b/i, label: "“Invalid Date”", severity: "critical" },
      { re: /\bInfinity\b/, label: "“Infinity”", severity: "high" },
      { re: /\b(TODO|FIXME|WIP|HACK|XXX)\b/, label: "a developer note", severity: "critical" },
      { re: /Lorem ipsum/i, label: "placeholder copy", severity: "critical" },
      { re: /\b(TypeError|ReferenceError|SyntaxError|RangeError)\b/, label: "a JavaScript error name", severity: "critical" },
      { re: /\bat \w+ \(.*:\d+:\d+\)/, label: "a stack trace", severity: "critical" },
      { re: /\b(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed|Failed to fetch)\b/i, label: "a network error string", severity: "critical" },
      { re: /\bPGRST\d+|\bduplicate key\b|\bviolates .*constraint\b|\brow-level security\b|\bRLS\b/i, label: "a database error", severity: "critical" },
      { re: /\bsupabase\b|\bpostgres(ql)?\b/i, label: "an internal service name", severity: "high" },
      { re: /process\.env|NEXT_PUBLIC_[A-Z_]+/, label: "an environment variable", severity: "critical" },
      { re: /\$\{[^}]*\}|\{\{[^}]*\}\}/, label: "an unrendered template placeholder", severity: "critical" },
      { re: /\bconsole\.(log|error|warn)\b/, label: "a console call", severity: "critical" },
      { re: /\bis_internal_sales_rep\b|\bis_admin\b|\bis_staff\b/, label: "an internal permission flag", severity: "high" },
      { re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, label: "a raw record identifier", severity: "high" },
      { re: /\b(payload|stringify|serializ(e|ed)|nullable|boolean|enum|schema|mutation|endpoint|middleware)\b/i, label: "programming jargon", severity: "medium" },
      { re: /\b[a-z][a-z0-9]*(_[a-z0-9]+){1,}\b/, label: "a raw database field name", severity: "medium" },
      { re: /\bHTTP \d{3}\b|\b(4|5)\d{2} (Bad Request|Unauthorized|Forbidden|Not Found|Internal Server Error)\b/i, label: "an HTTP status code", severity: "critical" },
      { re: /\bunknown error\b/i, label: "an unhelpful generic error", severity: "medium" },
    ];

    /**
     * Terse machine statuses returned by API routes. These are only a problem when they
     * are the whole message, so they are matched against the element's full text.
     */
    const bannedExactCopy: { re: RegExp; label: string; severity: "critical" | "high" | "medium" }[] = [
      { re: /^unauthori[sz]ed\.?$/i, label: "a raw authorization status", severity: "high" },
      { re: /^forbidden\.?$/i, label: "a raw authorization status", severity: "high" },
      { re: /^not found\.?$/i, label: "a raw API status", severity: "high" },
      { re: /^bad request\.?$/i, label: "a raw API status", severity: "high" },
      { re: /^invalid [a-z ]*\bid\b\.?$/i, label: "a raw validation message", severity: "high" },
      { re: /^(error|failure|failed)\.?$/i, label: "a bare error label", severity: "high" },
      { re: /^internal server error\.?$/i, label: "a raw server error", severity: "critical" },
    ];

    // Field names that are legitimate product vocabulary, not leaked internals.
    const snakeCaseAllowlist = /^(e_g|i_e|non_stick)$/i;

    const textOwners = allElements.filter((el) => {
      if (!isRendered(el) || isHiddenFromA11y(el)) return false;
      if (/^(script|style|noscript|template|svg|path)$/i.test(el.tagName)) return false;
      return Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim().length > 0,
      );
    });

    const reportedCopy = new Set<string>();
    for (const el of textOwners) {
      const raw = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => (n.textContent || "").trim())
        .filter(Boolean)
        .join(" ");
      const text = raw.replace(/\s+/g, " ").trim();
      if (!text) continue;
      for (const { re, label, severity } of bannedExactCopy) {
        if (!re.test(text)) continue;
        const key = `exact|${label}|${text}|${describe(el)}`;
        if (reportedCopy.has(key)) continue;
        reportedCopy.add(key);
        out.push({
          check: "developer-facing-copy",
          severity,
          message: `Visible text is ${label}: “${text}”.`,
          selector: describe(el),
          text,
        });
      }
      for (const { re, label, severity } of bannedPatterns) {
        const match = re.exec(text);
        if (!match) continue;
        if (label === "a raw database field name" && snakeCaseAllowlist.test(match[0])) continue;
        const key = `${label}|${match[0]}|${describe(el)}`;
        if (reportedCopy.has(key)) continue;
        reportedCopy.add(key);
        out.push({
          check: "developer-facing-copy",
          severity,
          message: `Visible text contains ${label}: “${match[0]}”.`,
          selector: describe(el),
          text: text.slice(0, 120),
        });
      }
    }

    // Attribute-level copy shown to users via tooltips / labels.
    for (const el of allElements) {
      if (!isRendered(el)) continue;
      for (const attr of ["title", "aria-label", "placeholder", "alt"]) {
        const value = el.getAttribute(attr);
        if (!value || !value.trim()) continue;
        for (const { re, label, severity } of bannedPatterns) {
          if (label === "a raw database field name" || label === "programming jargon") continue;
          const match = re.exec(value);
          if (!match) continue;
          const key = `attr|${attr}|${match[0]}|${describe(el)}`;
          if (reportedCopy.has(key)) continue;
          reportedCopy.add(key);
          out.push({
            check: "developer-facing-copy",
            severity,
            message: `The ${attr} text contains ${label}: “${match[0]}”.`,
            selector: describe(el),
            text: value.slice(0, 120),
          });
        }
      }
    }

    // ----------------------------------------------------------- page structure
    const h1s = Array.from(document.querySelectorAll("h1")).filter((el) => isRendered(el));
    if (h1s.length === 0) {
      out.push({
        check: "missing-page-heading",
        severity: "low",
        message: "Page has no visible top-level heading.",
      });
    } else if (h1s.length > 1) {
      out.push({
        check: "duplicate-page-heading",
        severity: "low",
        message: `Page renders ${h1s.length} top-level headings; only one is expected.`,
        text: h1s.map((el) => snippet(el, 30)).join(" / "),
      });
    }

    if (!document.querySelector('meta[name="viewport"]')) {
      out.push({
        check: "missing-viewport-meta",
        severity: "critical",
        message: "Document has no viewport meta tag, so mobile browsers will render it desktop-width.",
      });
    }

    // Body locked against scrolling while content overflows traps the user.
    if (document.body) {
      const bodyStyle = getComputedStyle(document.body);
      const contentTaller = document.body.scrollHeight > viewportHeight + 8;
      if (contentTaller && bodyStyle.overflowY === "hidden" && bodyStyle.position !== "fixed") {
        out.push({
          check: "scroll-locked",
          severity: "critical",
          message: "Page content is taller than the screen but vertical scrolling is disabled.",
        });
      }
    }

    return out;
  }, deviceWidth);
}
