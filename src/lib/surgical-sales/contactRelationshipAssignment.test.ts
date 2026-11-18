import { describe, expect, it } from "vitest";
import {
  affiliationScopeFromAssignment,
  defaultContactRelationshipAssignment,
  supportContactLinkedToLines,
} from "./contactRelationshipAssignment";

describe("contactRelationshipAssignment", () => {
  it("defaults to provider + organization when launched from provider with org", () => {
    expect(defaultContactRelationshipAssignment("org-1", "provider")).toBe("shared");
  });

  it("defaults to organization only when launched from organization page", () => {
    expect(defaultContactRelationshipAssignment("org-1", "organization")).toBe("organization");
  });

  it("defaults to provider only when no organization exists", () => {
    expect(defaultContactRelationshipAssignment(null, "provider")).toBe("provider");
  });

  it("maps assignment to affiliation scope metadata", () => {
    expect(affiliationScopeFromAssignment("provider")).toBe("provider_only");
    expect(affiliationScopeFromAssignment("organization")).toBe("organization_only");
    expect(affiliationScopeFromAssignment("shared")).toBe("provider_and_organization");
  });

  it("builds linked-to lines for review summary", () => {
    expect(
      supportContactLinkedToLines({
        assignment: "shared",
        providerLabel: "John Apple",
        organizationName: "Test Hospital",
      }),
    ).toEqual(["John Apple", "Test Hospital"]);

    expect(
      supportContactLinkedToLines({
        assignment: "provider",
        providerLabel: "John Apple",
        organizationName: "Test Hospital",
      }),
    ).toEqual(["John Apple"]);
  });
});
