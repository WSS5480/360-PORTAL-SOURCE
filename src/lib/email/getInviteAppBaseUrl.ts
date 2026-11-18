/**
 * Public URL embedded in invite emails and Supabase Auth redirectTo.
 * - APP_URL_FOR_INVITES wins when set (explicit override).
 * - On localhost, prefers NEXT_PUBLIC_APP_URL / APP_BASE_URL so links stay on the real app port
 *   (e.g. :3000) even if the incoming request hit another port (e.g. :3001).
 */
export function getInviteAppBaseUrl(req: Request): string {
  const override = process.env.APP_URL_FOR_INVITES?.trim();
  if (override) return override.replace(/\/$/, "");

  const url = new URL(req.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  const envCanon = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (isLocal && envCanon) return envCanon;

  if (isLocal) return url.origin.replace(/\/$/, "");

  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    url.origin.replace(/\/$/, "")
  ).replace(/\/$/, "");
}
