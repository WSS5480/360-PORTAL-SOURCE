const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OrderIntakeSelectedPerson =
  | { kind: "ACCOUNT_USER"; id: string }
  | { kind: "PORTAL_MEMBER"; id: string }
  | { kind: "ACCOUNT_INVITE"; id: string };

export type OrderIntakeInviteRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  accepted_at?: string | null;
  revoked_at?: string | null;
  archived_at?: string | null;
  expires_at?: string | null;
};

export type OrderIntakeInvitePerson = {
  kind: "ACCOUNT_INVITE";
  id: string;
  name: string;
  email: string;
  role?: string;
};

function normEmail(raw: unknown): string {
  return String(raw || "").trim().toLowerCase();
}

function safeStr(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export function parseOrderIntakeSelectedPerson(raw: string): OrderIntakeSelectedPerson | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  const idx = s.indexOf(":");
  if (idx <= 0) return null;

  const kind = s.slice(0, idx);
  const id = s.slice(idx + 1);
  if (!UUID_RE.test(id)) return null;

  if (kind === "ACCOUNT_USER") return { kind: "ACCOUNT_USER", id };
  if (kind === "PORTAL_MEMBER") return { kind: "PORTAL_MEMBER", id };
  if (kind === "ACCOUNT_INVITE") return { kind: "ACCOUNT_INVITE", id };
  return null;
}

export function isPendingInviteForOrderIntake(inv: OrderIntakeInviteRow, nowMs = Date.now()): boolean {
  if (!safeStr(inv.id)) return false;
  if (inv.accepted_at) return false;
  if (inv.revoked_at) return false;
  if (inv.archived_at) return false;
  if (!normEmail(inv.email)) return false;
  const expiresAt = safeStr(inv.expires_at);
  if (expiresAt) {
    const expiresMs = Date.parse(expiresAt);
    if (Number.isFinite(expiresMs) && expiresMs <= nowMs) return false;
  }
  return true;
}

export function mapPendingInvitesToOrderIntakePeople(
  invites: OrderIntakeInviteRow[] | null | undefined,
  occupiedEmails: Iterable<string>,
  nowMs = Date.now()
): OrderIntakeInvitePerson[] {
  const occupied = new Set(
    Array.from(occupiedEmails, (email) => normEmail(email)).filter(Boolean)
  );
  const seenInviteEmails = new Set<string>();
  const people: OrderIntakeInvitePerson[] = [];

  for (const inv of invites || []) {
    if (!isPendingInviteForOrderIntake(inv, nowMs)) continue;
    const email = normEmail(inv.email);
    if (!email || occupied.has(email) || seenInviteEmails.has(email)) continue;
    seenInviteEmails.add(email);
    people.push({
      kind: "ACCOUNT_INVITE",
      id: safeStr(inv.id),
      name: safeStr(inv.full_name) || email.split("@")[0] || "Invited user",
      email,
      role: safeStr(inv.role) || undefined,
    });
  }

  return people;
}
