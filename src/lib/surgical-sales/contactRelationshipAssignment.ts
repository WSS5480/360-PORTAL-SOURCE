/**
 * Contact relationship assignment — organization, provider, or both.
 */

import type { SchedulingContactOwnershipType } from "@/lib/surgical-sales/operationalSupportContact";

export type ContactRelationshipAssignment = SchedulingContactOwnershipType;

export type ContactRelationshipAssignmentOption = {
  value: ContactRelationshipAssignment;
  label: string;
  shortLabel: string;
  description: string;
};

export const CONTACT_RELATIONSHIP_ASSIGNMENT_OPTIONS: ContactRelationshipAssignmentOption[] = [
  {
    value: "provider",
    label: "Provider only",
    shortLabel: "Provider",
    description: "Use when this person supports this provider specifically.",
  },
  {
    value: "organization",
    label: "Organization only",
    shortLabel: "Organization",
    description: "Use when this person is a facility-level contact reusable across providers.",
  },
  {
    value: "shared",
    label: "Provider + organization",
    shortLabel: "Both",
    description:
      "Use when this person supports this provider and should also be available as an organization contact.",
  },
];

export function contactRelationshipAssignmentLabel(
  assignment: ContactRelationshipAssignment,
): string {
  return (
    CONTACT_RELATIONSHIP_ASSIGNMENT_OPTIONS.find((o) => o.value === assignment)?.label ?? assignment
  );
}

export function defaultContactRelationshipAssignment(
  organizationId: string | null | undefined,
  launchOrigin: "provider" | "organization" = "provider",
): ContactRelationshipAssignment {
  if (launchOrigin === "organization") return organizationId ? "organization" : "provider";
  return organizationId ? "shared" : "provider";
}

export function affiliationScopeFromAssignment(
  assignment: ContactRelationshipAssignment,
): "provider_only" | "organization_only" | "provider_and_organization" {
  switch (assignment) {
    case "organization":
      return "organization_only";
    case "shared":
      return "provider_and_organization";
    default:
      return "provider_only";
  }
}

export function supportContactLinkedToLines(input: {
  assignment: ContactRelationshipAssignment;
  providerLabel: string;
  organizationName?: string | null;
}): string[] {
  const provider = input.providerLabel.trim();
  const organization = input.organizationName?.trim();
  switch (input.assignment) {
    case "organization":
      return organization ? [organization] : ["Organization"];
    case "provider":
      return provider ? [provider] : ["Provider"];
    case "shared":
      return [provider, organization].filter(Boolean) as string[];
    default:
      return [];
  }
}

export function assignmentLinksToOrganization(assignment: ContactRelationshipAssignment): boolean {
  return assignment === "organization" || assignment === "shared";
}

export function assignmentLinksToProvider(assignment: ContactRelationshipAssignment): boolean {
  return assignment === "provider" || assignment === "shared";
}

export function assignmentFootnote(
  assignment: ContactRelationshipAssignment,
  organizationName?: string | null,
): string {
  const org = organizationName?.trim();
  switch (assignment) {
    case "organization":
      return org
        ? `Saved to ${org} — reusable across providers at this organization.`
        : "Saved to the organization roster — reusable across providers at this site.";
    case "provider":
      return "Saved to this provider's support contacts — not added to the organization directory.";
    case "shared":
      return org
        ? `Saved to ${org} and linked to this provider — both relationships are stored.`
        : "Saved to the organization and linked to this provider — both relationships are stored.";
    default:
      return "";
  }
}
