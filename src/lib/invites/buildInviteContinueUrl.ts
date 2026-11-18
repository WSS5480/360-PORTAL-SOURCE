/**
 * Invite emails must NOT link straight to Supabase /auth/v1/verify.
 * Corporate scanners (Safe Links, etc.) GET that URL and burn the one-time token.
 * Instead we link to /invite/continue, which only verifies after a human clicks Continue.
 */

export type InviteAuthLinkType = "invite" | "magiclink";

export function extractAuthLinkToken(actionLink: string | null | undefined): string | null {
  if (!actionLink) return null;
  try {
    const u = new URL(actionLink);
    return u.searchParams.get("token_hash") || u.searchParams.get("token") || null;
  } catch {
    return null;
  }
}

export function buildInviteContinueUrl(args: {
  base: string;
  /** Portal account_invites.id — required for /set-password accept */
  inviteId?: string | null;
  hashedToken?: string | null;
  actionLink?: string | null;
  type?: InviteAuthLinkType;
  /** Final destination after set-password (default /portal) */
  next?: string;
}): string | null {
  const base = args.base.replace(/\/$/, "");
  if (!base) return null;

  const token = (args.hashedToken || "").trim() || extractAuthLinkToken(args.actionLink);
  if (!token) {
    // Last resort: raw Supabase link (scanner-vulnerable)
    return args.actionLink?.trim() || null;
  }

  const type: InviteAuthLinkType = args.type === "magiclink" ? "magiclink" : "invite";
  const nextRaw = typeof args.next === "string" ? args.next.trim() : "/portal";
  const next = nextRaw.startsWith("/") ? nextRaw : "/portal";

  const params = new URLSearchParams();
  params.set("token", token);
  params.set("type", type);
  params.set("next", next);
  if (args.inviteId) params.set("invite", args.inviteId);

  return `${base}/invite/continue?${params.toString()}`;
}

/** Prefer hashed_token from generateLink; fall back to parsing action_link. */
export function resolveInviteEmailActionLink(args: {
  base: string;
  inviteId?: string | null;
  linkData: { properties?: Record<string, unknown> | null } | null | undefined;
  type?: InviteAuthLinkType;
  next?: string;
}): string | null {
  const props = args.linkData?.properties ?? null;
  const actionLink = (props?.action_link as string | undefined) || null;
  const hashedToken = (props?.hashed_token as string | undefined) || null;

  return buildInviteContinueUrl({
    base: args.base,
    inviteId: args.inviteId,
    hashedToken,
    actionLink,
    type: args.type,
    next: args.next,
  });
}
