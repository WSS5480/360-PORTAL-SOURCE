/**
 * Map low-level fetch failures to actionable copy (Supabase auth, API routes, etc.).
 */
export function friendlyNetworkError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed")
  ) {
    return (
      "Cannot reach the authentication service from this browser. " +
      "Confirm NEXT_PUBLIC_SUPABASE_URL in .env.local matches your Supabase project (Dashboard → Settings → API), " +
      "that the hostname resolves (try another network or disable VPN), and clear site data for this site if cookies are stale."
    );
  }
  return msg || "Something went wrong.";
}
