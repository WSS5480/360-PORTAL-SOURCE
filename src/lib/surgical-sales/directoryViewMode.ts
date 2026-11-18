export type DirectoryViewMode = "mission" | "operations";

export function parseDirectoryViewMode(raw: string | null | undefined): DirectoryViewMode {
  return raw === "operations" ? "operations" : "mission";
}

export function readDirectoryViewModeFromStorage(key: string, fallback: DirectoryViewMode = "mission"): DirectoryViewMode {
  if (typeof window === "undefined") return fallback;
  try {
    return parseDirectoryViewMode(localStorage.getItem(key));
  } catch {
    return fallback;
  }
}

export function writeDirectoryViewModeToStorage(key: string, mode: DirectoryViewMode): void {
  try {
    localStorage.setItem(key, mode);
  } catch {
    /* ignore quota / private mode */
  }
}

export const PROVIDER_VIEW_MODE_STORAGE_KEY = "providerViewMode";
export const ORGANIZATION_VIEW_MODE_STORAGE_KEY = "organizationViewMode";
export const CASE_VIEW_MODE_STORAGE_KEY = "caseViewMode";
