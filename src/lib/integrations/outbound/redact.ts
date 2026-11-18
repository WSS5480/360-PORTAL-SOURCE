const BEARER_RE = /Bearer\s+\S+/gi;
const URL_RE = /https?:\/\/[^\s"'<>]+/gi;

/** Removes credentials and query strings before anything is written to an attempt log. */
export function redactSyncText(value: string | null | undefined, maxLength = 500): string | null {
  if (!value) return null;
  const redacted = value
    .replace(BEARER_RE, "Bearer [redacted]")
    .replace(URL_RE, (match) => {
      try {
        const url = new URL(match);
        if (url.hostname === "checkout.stripe.com") return "[redacted-payment-url]";
        return `${url.origin}${url.pathname}`;
      } catch {
        return "[redacted-url]";
      }
    })
    .slice(0, maxLength);
  return redacted || null;
}
