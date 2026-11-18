import { describe, expect, it } from "vitest";
import {
  isPendingInviteForOrderIntake,
  mapPendingInvitesToOrderIntakePeople,
  parseOrderIntakeSelectedPerson,
  type OrderIntakeInviteRow,
} from "./orderIntakeSelectedPerson";

const ID = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";

function invite(partial: Partial<OrderIntakeInviteRow> = {}): OrderIntakeInviteRow {
  return {
    id: ID,
    email: "preston@clinic.com",
    full_name: "Preston Clinic",
    role: "ACCOUNT_ADMIN",
    accepted_at: null,
    revoked_at: null,
    archived_at: null,
    expires_at: null,
    ...partial,
  };
}

describe("parseOrderIntakeSelectedPerson", () => {
  it("keeps existing saved-recipient and portal-member keys", () => {
    expect(parseOrderIntakeSelectedPerson(`ACCOUNT_USER:${ID}`)).toEqual({ kind: "ACCOUNT_USER", id: ID });
    expect(parseOrderIntakeSelectedPerson(`PORTAL_MEMBER:${ID}`)).toEqual({ kind: "PORTAL_MEMBER", id: ID });
  });

  it("parses invited users without changing other kinds", () => {
    expect(parseOrderIntakeSelectedPerson(`ACCOUNT_INVITE:${ID}`)).toEqual({ kind: "ACCOUNT_INVITE", id: ID });
  });

  it("rejects empty, unknown, or malformed keys", () => {
    expect(parseOrderIntakeSelectedPerson("")).toBeNull();
    expect(parseOrderIntakeSelectedPerson("ACCOUNT_USER:not-a-uuid")).toBeNull();
    expect(parseOrderIntakeSelectedPerson(`NEW_USER:${ID}`)).toBeNull();
  });
});

describe("pending invites for order intake", () => {
  it("hides accepted, revoked, archived, expired, and email-less invites", () => {
    const now = Date.parse("2026-09-15T12:00:00.000Z");
    expect(isPendingInviteForOrderIntake(invite(), now)).toBe(true);
    expect(isPendingInviteForOrderIntake(invite({ accepted_at: "2026-09-01T00:00:00.000Z" }), now)).toBe(false);
    expect(isPendingInviteForOrderIntake(invite({ revoked_at: "2026-09-01T00:00:00.000Z" }), now)).toBe(false);
    expect(isPendingInviteForOrderIntake(invite({ archived_at: "2026-09-01T00:00:00.000Z" }), now)).toBe(false);
    expect(isPendingInviteForOrderIntake(invite({ email: " " }), now)).toBe(false);
    expect(isPendingInviteForOrderIntake(invite({ expires_at: "2026-09-14T00:00:00.000Z" }), now)).toBe(false);
    expect(isPendingInviteForOrderIntake(invite({ expires_at: "2026-09-16T00:00:00.000Z" }), now)).toBe(true);
  });

  it("skips emails already shown as contacts or members, and duplicate invites", () => {
    const people = mapPendingInvitesToOrderIntakePeople(
      [
        invite({ id: ID, email: "dup@clinic.com", full_name: "Newest" }),
        invite({ id: ID2, email: "DUP@clinic.com", full_name: "Older" }),
        invite({ id: "33333333-3333-4333-8333-333333333333", email: "saved@clinic.com" }),
      ],
      ["saved@clinic.com", "member@clinic.com"]
    );

    expect(people).toEqual([
      {
        kind: "ACCOUNT_INVITE",
        id: ID,
        name: "Newest",
        email: "dup@clinic.com",
        role: "ACCOUNT_ADMIN",
      },
    ]);
  });
});
