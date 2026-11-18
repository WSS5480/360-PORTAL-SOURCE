export const PROVIDER_REMOVE_SCOPES = ["everywhere", "keep_as_contact", "delete"] as const;

export type ProviderRemoveScope = (typeof PROVIDER_REMOVE_SCOPES)[number];

export function isProviderRemoveScope(value: string | null | undefined): value is ProviderRemoveScope {
  return (PROVIDER_REMOVE_SCOPES as readonly string[]).includes(String(value || "").trim());
}

export function isMissingHiddenFromProviderDirectoryColumn(message: string | null | undefined): boolean {
  const text = String(message || "").toLowerCase();
  return text.includes("hidden_from_provider_directory_at") && (text.includes("schema cache") || text.includes("column"));
}

export function providerHiddenFromProviderDirectory(row: {
  archived_at?: string | null;
  hidden_from_provider_directory_at?: string | null;
}): boolean {
  return Boolean(String(row.archived_at ?? "").trim() || String(row.hidden_from_provider_directory_at ?? "").trim());
}

export const PROVIDER_REMOVE_SCOPE_COPY: Record<
  ProviderRemoveScope,
  { label: string; description: string }
> = {
  everywhere: {
    label: "Remove from everywhere",
    description: "Take them off Providers, Contacts, and organization people lists. Existing cases and history stay.",
  },
  keep_as_contact: {
    label: "Keep as a contact",
    description: "Hide them from Providers. They still appear in Contacts and on the organization if they are linked there.",
  },
  delete: {
    label: "Delete permanently",
    description: "Erase this record. Only available when there are no cases, engagements, notes, or intelligence.",
  },
};
