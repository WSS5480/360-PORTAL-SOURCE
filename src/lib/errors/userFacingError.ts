/**
 * Turns an API error into copy a sales rep can act on.
 *
 * API routes return terse machine strings ("Not found", "Forbidden", "Invalid
 * engagement id"). Rendering those verbatim leaks internal vocabulary into the
 * product, so every surface that displays a caught error should pass it through here.
 */

const KNOWN_MESSAGES: { match: RegExp; copy: string }[] = [
  { match: /^unauthori[sz]ed$/i, copy: "Your session expired. Sign in again to continue." },
  { match: /^forbidden$/i, copy: "You do not have access to this record." },
  { match: /^not found$/i, copy: "This record is no longer available." },
  { match: /^invalid .*\bid\b$/i, copy: "That link is not valid. Open the record from the list instead." },
  { match: /^bad request$/i, copy: "Something in that request was incomplete. Please try again." },
  { match: /^(internal server error|unexpected failure.*)$/i, copy: "Something went wrong on our end. Please try again." },
  { match: /^(failed to fetch|network ?error|load failed)$/i, copy: "We could not reach the server. Check your connection and try again." },
  { match: /^(timeout|timed out|etimedout)$/i, copy: "That request took too long. Please try again." },
];

/** Patterns that mean the text is engineering output rather than product copy. */
const TECHNICAL_SHAPE = [
  /\b[a-z][a-z0-9]*(_[a-z0-9]+)+\b/, // snake_case identifiers
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, // record ids
  /\b(PGRST|SQLSTATE|ECONNREFUSED|ENOTFOUND|ETIMEDOUT)\b/i,
  /\b(TypeError|ReferenceError|SyntaxError|RangeError)\b/,
  /\bat \w+ \(.*:\d+:\d+\)/, // stack frames
  /\b(row-level security|violates .*constraint|duplicate key|relation ".*")\b/i,
  /\b(supabase|postgres(ql)?|webpack|hydrat(e|ion))\b/i,
  /\bHTTP \d{3}\b|\b[45]\d{2}\b/,
  /[{}[\]]|=>|\bnull\b|\bundefined\b|\bNaN\b/,
];

/**
 * @param error the caught value
 * @param fallback copy to show when the error carries nothing usable
 */
export function userFacingError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const message = raw.trim();
  if (!message) return fallback;

  for (const { match, copy } of KNOWN_MESSAGES) {
    if (match.test(message)) return copy;
  }

  // Anything that looks like engineering output is replaced rather than shown.
  if (TECHNICAL_SHAPE.some((pattern) => pattern.test(message))) return fallback;

  // Sentence-shaped messages written for users pass through unchanged.
  const looksLikeProse = /^[A-Z0-9]/.test(message) && message.length <= 200 && /[a-z]/.test(message);
  return looksLikeProse ? message : fallback;
}
