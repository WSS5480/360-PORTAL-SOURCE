import { describe, expect, it } from "vitest";
import {
  findCredentialingPlatformMatch,
  mergeCredentialingPlatformAliases,
  normalizeCredentialingPlatformName,
  parseCredentialingAliasesInput,
} from "./credentialingPlatforms";
import type { CredentialingPlatformRecord } from "./credentialingPlatforms";

const PLATFORMS: CredentialingPlatformRecord[] = [
  {
    id: "1",
    name: "RepTrax",
    name_normalized: "reptrax",
    aliases: ["Rep Trax"],
    active: true,
  },
  {
    id: "2",
    name: "Symplr",
    name_normalized: "symplr",
    aliases: ["Symplr Access"],
    active: true,
  },
];

describe("credentialingPlatforms", () => {
  it("normalizes names for duplicate detection", () => {
    expect(normalizeCredentialingPlatformName(" RepTrax ")).toBe("reptrax");
    expect(normalizeCredentialingPlatformName("Green   Security")).toBe("green security");
  });

  it("parses alias input from comma and newline separated text", () => {
    expect(parseCredentialingAliasesInput("Rep Trax, VendorMate\nSEC3URE")).toEqual([
      "Rep Trax",
      "VendorMate",
      "SEC3URE",
    ]);
  });

  it("merges aliases without duplicates", () => {
    expect(
      mergeCredentialingPlatformAliases(["Rep Trax"], ["rep trax", "VendorMate", "Rep Trax"]),
    ).toEqual(["Rep Trax", "VendorMate"]);
  });

  it("finds existing platform by name or alias", () => {
    expect(findCredentialingPlatformMatch(PLATFORMS, "reptrax")?.id).toBe("1");
    expect(findCredentialingPlatformMatch(PLATFORMS, "Rep Trax")?.id).toBe("1");
    expect(findCredentialingPlatformMatch(PLATFORMS, "Symplr Access")?.id).toBe("2");
    expect(findCredentialingPlatformMatch(PLATFORMS, "New Platform")).toBeNull();
  });
});
