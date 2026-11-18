/**
 * Generates src/app/portal/sales/salesMobileTypeFloorCss.ts
 *
 * Sales Command was designed for dense desktop tables, so hundreds of rules use
 * 9-10.5px type. That is unreadable on a phone. This script mirrors every such
 * selector into a narrow-viewport block that raises it to the 11px floor, so the
 * desktop density stays untouched while phones get legible text.
 *
 * Run: node scripts/generate-sales-mobile-type-floor.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SEARCH_DIRS = [
  "src/app/portal/sales",
  "src/components/sales",
];
const FLOOR_PX = 11;
const NARROW_MAX_WIDTH = 640;
const OUT_FILE = "src/app/portal/sales/salesMobileTypeFloorCss.ts";

/** @returns {string[]} */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (/\.(css|ts)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

/**
 * Very small CSS scanner: tracks the selector/at-rule stack so we can attribute
 * each font-size declaration to the selector that owns it.
 */
function collectSmallTypeSelectors(css) {
  /** @type {{selector: string, size: number}[]} */
  const found = [];
  /** Selectors already raised to the floor (or above) somewhere in narrow viewports. */
  const alreadyLegible = new Set();
  /** @type {{kind: "at" | "rule", text: string}[]} */
  const stack = [];
  let buf = "";
  let i = 0;

  const desktopOnly = () =>
    stack.some((frame) => {
      if (frame.kind !== "at") return false;
      if (/^@keyframes|^@font-face|^@property/i.test(frame.text)) return true;
      const min = /min-width:\s*(\d+(?:\.\d+)?)px/i.exec(frame.text);
      return Boolean(min && Number(min[1]) > NARROW_MAX_WIDTH);
    });

  const takeDeclaration = () => {
    const decl = buf.trim();
    buf = "";
    if (!decl) return;
    const match = /^font-size\s*:\s*(\d+(?:\.\d+)?)px$/i.exec(decl);
    if (!match) return;
    const size = Number(match[1]);
    const owner = stack[stack.length - 1];
    if (!owner || owner.kind !== "rule") return;
    if (desktopOnly()) return;
    const selector = owner.text.replace(/\s+/g, " ").trim();
    if (!selector || selector.includes("@")) return;
    if (size >= FLOOR_PX) {
      alreadyLegible.add(selector);
      return;
    }
    found.push({ selector, size });
  };

  while (i < css.length) {
    const ch = css[i];
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? css.length : end + 2;
      continue;
    }
    if (ch === "{") {
      const prelude = buf.replace(/\s+/g, " ").trim();
      buf = "";
      stack.push({ kind: prelude.startsWith("@") ? "at" : "rule", text: prelude });
      i += 1;
      continue;
    }
    if (ch === "}") {
      takeDeclaration();
      stack.pop();
      i += 1;
      continue;
    }
    if (ch === ";") {
      takeDeclaration();
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  return { found, alreadyLegible };
}

/** Pulls the CSS out of `export const x = \`...\`` modules; .css files are already CSS. */
function cssFromFile(rel) {
  const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
  if (rel.endsWith(".css")) return text;
  const chunks = [];
  const re = /=\s*`/g;
  let match;
  while ((match = re.exec(text))) {
    const start = match.index + match[0].length;
    let end = start;
    while (end < text.length) {
      if (text[end] === "\\") {
        end += 2;
        continue;
      }
      if (text[end] === "`") break;
      end += 1;
    }
    chunks.push(text.slice(start, end));
    re.lastIndex = end + 1;
  }
  return chunks.join("\n");
}

const files = SEARCH_DIRS.flatMap((dir) => walk(dir)).sort();
/** @type {Map<string, {size: number, sources: Set<string>}>} */
const selectors = new Map();
/** Selectors a page already raises to the floor on narrow screens. */
const handledByPage = new Set();

for (const rel of files) {
  if (rel.endsWith(OUT_FILE.split("/").pop())) continue;
  let css;
  try {
    css = cssFromFile(rel);
  } catch {
    continue;
  }
  if (!css.includes("font-size")) continue;
  const { found, alreadyLegible } = collectSmallTypeSelectors(css);
  for (const selector of alreadyLegible) handledByPage.add(selector);
  for (const { selector, size } of found) {
    const existing = selectors.get(selector);
    if (existing) {
      existing.sources.add(rel);
      existing.size = Math.min(existing.size, size);
    } else {
      selectors.set(selector, { size, sources: new Set([rel]) });
    }
  }
}

// Never override a selector a page already sizes at or above the floor on phones:
// a blanket 11px there would shrink type the page deliberately enlarged.
const skipped = [...selectors.keys()].filter((selector) => handledByPage.has(selector));
for (const selector of skipped) selectors.delete(selector);

const ordered = [...selectors.keys()].sort();
const rules = ordered.map((selector) => `  ${selector} {\n    font-size: ${FLOOR_PX}px;\n  }`).join("\n\n");

const banner = `/**
 * GENERATED FILE - do not edit by hand.
 * Regenerate with: node scripts/generate-sales-mobile-type-floor.mjs
 *
 * Sales Command's desktop layouts lean on 9-10.5px labels. Those are illegible on a
 * phone, so every one of those selectors is mirrored here at an ${FLOOR_PX}px floor for
 * narrow viewports only. Desktop density is unchanged.
 */
`;

const out = `${banner}
export const salesMobileTypeFloorCss = \`
@media (max-width: ${NARROW_MAX_WIDTH}px) {
${rules}
}
\`;
`;

fs.writeFileSync(path.join(ROOT, OUT_FILE), out.replace(/\r\n/g, "\n"), "utf8");
console.log(
  `Wrote ${OUT_FILE}: ${ordered.length} selectors from ${files.length} scanned files ` +
    `(${skipped.length} left to their own narrow-viewport rules).`,
);
