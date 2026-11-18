import { describe, expect, it } from "vitest";
import {
  buildInviteContinueUrl,
  extractAuthLinkToken,
  resolveInviteEmailActionLink,
} from "./buildInviteContinueUrl";

describe("buildInviteContinueUrl", () => {
  it("wraps hashed tokens into click-to-continue URLs", () => {
    const url = buildInviteContinueUrl({
      base: "https://app.360medical.net",
      inviteId: "inv-1",
      hashedToken: "abc123",
      type: "invite",
      next: "/portal",
    });
    expect(url).toBe(
      "https://app.360medical.net/invite/continue?token=abc123&type=invite&next=%2Fportal&invite=inv-1"
    );
  });

  it("extracts token from Supabase action_link", () => {
    const token = extractAuthLinkToken(
      "https://supabase.example/auth/v1/verify?token=tok999&type=invite&redirect_to=https%3A%2F%2Fapp"
    );
    expect(token).toBe("tok999");
  });

  it("prefers hashed_token from generateLink payload", () => {
    const url = resolveInviteEmailActionLink({
      base: "https://app.360medical.net",
      inviteId: "inv-2",
      linkData: {
        properties: {
          hashed_token: "hashed",
          action_link: "https://supabase.example/auth/v1/verify?token=other",
        },
      },
    });
    expect(url).toContain("token=hashed");
    expect(url).toContain("invite=inv-2");
  });
});
