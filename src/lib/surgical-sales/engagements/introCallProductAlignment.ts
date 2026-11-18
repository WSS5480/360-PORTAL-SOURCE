import { parseProductLineFromText } from "@/lib/surgical-sales/preCallPlanTemplateTags";
import {
  isPreCallPlanProductLine,
  type PreCallPlanProductLine,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";

/** Explicit prep product focus from wizard basics only — never inferred from opportunity. */
export function resolveExplicitPrepProductLine(
  productLine?: string | null,
): PreCallPlanProductLine | "" {
  return resolveIntroCallProductLine(productLine);
}

export function hasExplicitPrepProductFocus(productLine?: string | null): boolean {
  return Boolean(resolveExplicitPrepProductLine(productLine));
}

/** Canonical product line from wizard basics, linked opportunity, or initiative context. */
export function resolveIntroCallProductLine(
  ...sources: (string | null | undefined)[]
): PreCallPlanProductLine | "" {
  for (const raw of sources) {
    const first = String(raw ?? "")
      .split(/[,;|]/)[0]
      ?.trim();
    if (isPreCallPlanProductLine(first)) return first;
    const parsed = parseProductLineFromText(raw);
    if (parsed) return parsed;
  }
  return "";
}

export function hasIntroCallProductAlignment(input: {
  productLine?: string | null;
  opportunityProductLine?: string | null;
}): boolean {
  return Boolean(resolveIntroCallProductLine(input.productLine, input.opportunityProductLine));
}

/** First non-empty product line string for builders that accept raw `productLine` input. */
export function mergeIntroCallProductLineRaw(
  ...sources: (string | null | undefined)[]
): string | null {
  for (const raw of sources) {
    const t = String(raw ?? "").trim();
    if (t) return t;
  }
  return null;
}
