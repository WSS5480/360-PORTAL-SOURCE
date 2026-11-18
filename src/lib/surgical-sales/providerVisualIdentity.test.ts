import { describe, expect, it } from "vitest";
import {
  formatProviderProcedureFocusBadge,
  formatProviderProcedureFocusChips,
  providerDisplayInitials,
  resolveProviderVisualIdentity,
} from "./providerVisualIdentity";

describe("providerVisualIdentity", () => {
  it("builds initials when no image", () => {
    expect(providerDisplayInitials("Jane Doe")).toBe("JD");
    expect(providerDisplayInitials("Smith")).toBe("S");
  });

  it("uses avatar and org logo from enrichment fields", () => {
    const id = resolveProviderVisualIdentity({
      displayName: "Dr. Jane Doe",
      contact: {
        provider_procedure_focus: "ACL reconstruction",
      },
      specialty: "Orthopedics",
      primaryOrganization: { name: "Sinai Hospital", logo_url: "https://cdn.example.org/logo.png" },
      enrichment: { avatarUrl: "https://cdn.example.com/jane.jpg" },
    });

    expect(id.hasAvatarImage).toBe(true);
    expect(id.hasOrganizationLogo).toBe(true);
    expect(id.specialtyBadge).toBe("Orthopedics");
    expect(id.procedureFocusBadge).toBe("ACL reconstruction");
  });

  it("falls back to compact specialty chip label when specialty unknown", () => {
    const id = resolveProviderVisualIdentity({
      displayName: "New Prospect",
      contact: {},
      specialty: null,
    });

    expect(id.specialtyBadge).toBeNull();
    expect(id.specialtyFallbackChip).toBe("Specialty not set");
    expect(id.initials).toBe("NP");
  });

  it("strips trend language from procedure focus badge chips", () => {
    const contact = {
      provider_procedure_focus:
        "Robotic ventral hernia repair · Increasing procedure volume|Abdominal wall reconstruction · Increasing procedure volume",
    };
    const badge = formatProviderProcedureFocusBadge(contact);
    expect(badge).toBe("Robotic ventral hernia repair · Abdominal wall reconstruction");
    expect(badge).not.toMatch(/Increasing procedure volume/i);
    expect(formatProviderProcedureFocusChips(contact)).toEqual([
      "Robotic ventral hernia repair",
      "Abdominal wall reconstruction",
    ]);
  });

  it("reads nested visual_identity on contact for future enrichment", () => {
    const id = resolveProviderVisualIdentity({
      displayName: "Alex Kim",
      contact: {
        visual_identity: {
          headshot_url: "/storage/providers/alex.jpg",
          specialty_label: "Spine",
        },
      },
    });

    expect(id.avatarUrl).toBe("/storage/providers/alex.jpg");
    expect(id.specialtyBadge).toBe("Spine");
  });
});
