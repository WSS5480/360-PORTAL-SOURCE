/**
 * Reports selectors that the generated mobile type floor would shrink: any selector
 * that also declares a font-size of 11px or more in a narrow-viewport context.
 *
 * Run: node scripts/check-type-floor-conflicts.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SEARCH_DIRS = ["src/app/portal/sales", "src/components/sales"];
const NARROW_MAX_WIDTH = 640;
const FLOOR_PX = 11;
const GENERATED = "salesMobileTypeFloorCss.ts";

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (/\.(css|ts)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

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

function scan(css, onDeclaration) {
  const stack = [];
  let buf = "";
  let i = 0;
  const take = () => {
    const decl = buf.trim();
    buf = "";
    const match = /^font-size\s*:\s*(\d+(?:\.\d+)?)px/i.exec(decl);
    if (!match) return;
    const owner = stack[stack.length - 1];
    if (!owner || owner.kind !== "rule") return;
    const desktopOnly = stack.some((frame) => {
      if (frame.kind !== "at") return false;
      if (/^@keyframes|^@font-face|^@property/i.test(frame.text)) return true;
      const min = /min-width:\s*(\d+(?:\.\d+)?)px/i.exec(frame.text);
      return Boolean(min && Number(min[1]) > NARROW_MAX_WIDTH);
    });
    onDeclaration(owner.text.replace(/\s+/g, " ").trim(), Number(match[1]), desktopOnly);
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
      take();
      stack.pop();
      i += 1;
      continue;
    }
    if (ch === ";") {
      take();
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
}

const files = SEARCH_DIRS.flatMap(walk).filter((rel) => !rel.endsWith(GENERATED));
/** selector -> { small: number[], large: number[] } for narrow-viewport declarations */
const bySelector = new Map();

for (const rel of files) {
  const css = cssFromFile(rel);
  if (!css.includes("font-size")) continue;
  scan(css, (selector, size, desktopOnly) => {
    if (desktopOnly) return;
    const entry = bySelector.get(selector) ?? { small: [], large: [], files: new Set() };
    if (size < FLOOR_PX) entry.small.push(size);
    else entry.large.push(size);
    entry.files.add(rel);
    bySelector.set(selector, entry);
  });
}

const conflicts = [...bySelector.entries()].filter(([, v]) => v.small.length > 0 && v.large.length > 0);
console.log(`${bySelector.size} selectors with narrow-viewport font sizes; ${conflicts.length} would be shrunk by the floor.`);
for (const [selector, value] of conflicts.slice(0, 60)) {
  console.log(`  ${selector} small=${value.small.join(",")} large=${value.large.join(",")} in ${[...value.files].join(", ")}`);
}
