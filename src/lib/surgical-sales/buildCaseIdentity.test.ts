import { describe, expect, it } from "vitest";
import {
  activeCaseIdentitySignals,
  buildCaseDetailHeaderPresentation,
  buildCaseIdentity,
  buildObservationCaseIdentity,
  enrichCaseIdentityWithNoteCapture,
  formatCaseIdentityPageTitle,
  formatCaseIdentityProviderName,
  formatCaseIntelligenceContextLine,
  formatCaseIntelligenceSectionTitle,
} from "./buildCaseIdentity";

describe("buildCaseIdentity", () => {
  it("builds unified observation case identity without internal case numbers in display fields", () => {
    const identity = buildCaseIdentity({
      case_type: "observation",
      surgeon_display: "Dr. John Smith",
      surgeon_specialty: "General Surgery",
      account_name: "Test Hospital",
      case_date: "2026-05-29",
      status: "draft",
      observation_access_pathway: "Approved",
      observation_access_scheduling_owner: "Karen",
      observation_access_credentialing: "unknown",
      observation_key_questions: "What products are currently used?",
      case_number: "SC-052926-8",
    });

    expect(identity.caseTypeLabel).toBe("Observation Case");
    expect(identity.providerName).toBe("John Smith");
    expect(identity.specialty).toBe("General Surgery");
    expect(identity.facilityName).toBe("Test Hospital");
    expect(identity.dateLine).toMatch(/May 29/);
    expect(identity.statusLabel).toBe("Draft");
    expect(identity.openQuestionsCount).toBe(1);
    expect(identity.internalCaseNumber).toBe("SC-052926-8");
    expect(formatCaseIdentityPageTitle(identity)).toBe("Observation Case — John Smith");

    const active = activeCaseIdentitySignals(identity).map((signal) => signal.label);
    expect(active).toContain("Observation Approved");
    expect(active).toContain("Scheduler Identified");
    expect(active).not.toContain("Credentialing Complete");
  });

  it("builds coverage case identity without observation-only fields", () => {
    const identity = buildCaseIdentity({
      case_type: "product_support",
      surgeon_display: "John Smith",
      account_name: "Test Hospital",
      case_date: "2026-06-04",
      status: "scheduled",
    });

    expect(identity.caseTypeLabel).toBe("Coverage Case");
    expect(identity.openQuestionsCount).toBeNull();
    expect(identity.optionalSignals).toEqual([]);
  });

  it("normalizes provider display names", () => {
    expect(formatCaseIdentityProviderName("Dr. Jane Doe")).toBe("Jane Doe");
  });

  it("builds case detail header with provider, facility, and date/time", () => {
    const identity = buildCaseIdentity({
      case_type: "observation",
      surgeon_display: "Dr. Mark Salt",
      surgeon_specialty: "Orthopedic Surgery",
      account_name: "Metro General",
      case_date: "2026-06-15",
      case_time: "07:30",
      status: "confirmed",
    });

    const header = buildCaseDetailHeaderPresentation(identity);
    expect(header.kicker).toBe("Observation Case");
    expect(header.title).toBe("Mark Salt");
    expect(header.subtitle).toBe("Orthopedic Surgery · Metro General");
    expect(header.metaLine).toMatch(/June 15.*7:30 AM.*Confirmed/i);
  });

  it("resolves provider name from linked contact when case row has no provider fields", () => {
    const identity = buildCaseIdentity({
      case_type: "observation",
      case_date: "2026-06-15",
      providerContact: { first_name: "Mark", last_name: "Onion" },
    });

    expect(identity.providerName).toBe("Mark Onion");
    expect(formatCaseIntelligenceContextLine(identity)).toMatch(/Mark Onion/);
    expect(formatCaseIntelligenceContextLine(identity)).toMatch(/June 15/);
    expect(formatCaseIntelligenceSectionTitle("This Observation", identity)).toMatch(
      /This Observation — Mark Onion · June 15/,
    );
  });

  it("builds observation case identity with note capture time when case time is missing", () => {
    const identity = buildObservationCaseIdentity({
      caseRow: { case_type: "observation", case_date: "2026-06-15" },
      providerContact: { first_name: "Mark", last_name: "Onion" },
      activities: [{ activity_type: "note", created_at: "2026-06-16T14:06:00.000Z" }],
    });

    expect(identity.providerName).toBe("Mark Onion");
    expect(identity.dateLine).toMatch(/June 15/);
    expect(identity.dateLineWithTime).toMatch(/June 15/);
    expect(identity.dateLineWithTime).not.toBe(identity.dateLine);
  });

  it("enriches identity with full note date when case date is missing", () => {
    const base = buildCaseIdentity({ case_type: "observation" });
    const enriched = enrichCaseIdentityWithNoteCapture(base, "2026-06-16T14:06:00.000Z");

    expect(enriched.dateLine).toMatch(/June 16/);
    expect(enriched.dateLineWithTime).toMatch(/June 16/);
  });
});
