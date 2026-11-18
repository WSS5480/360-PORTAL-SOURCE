export const OBSERVATION_FORM_DOCUMENT_TYPE = "observation_form";

export function canViewTeamObservationForms(flags: {
  isTerritoryManager?: boolean | null;
}): boolean {
  return flags.isTerritoryManager === true;
}

export function canViewObservationForm(params: {
  isTerritoryManager?: boolean | null;
  viewerId: string;
  uploadedBy: string;
}): boolean {
  const viewerId = String(params.viewerId || "").trim();
  const uploadedBy = String(params.uploadedBy || "").trim();
  if (!viewerId || !uploadedBy) return false;
  if (canViewTeamObservationForms({ isTerritoryManager: params.isTerritoryManager })) return true;
  return uploadedBy === viewerId;
}

export type ObservationFormLibraryItem = {
  id: string;
  fileName: string;
  createdAt: string;
  caseId: string;
  caseNumber: string | null;
  caseDate: string | null;
  caseHref: string;
  providerName: string | null;
  facilityName: string | null;
  uploadedBy: string;
  uploaderName: string;
};

export type ObservationFormLibraryGroup = {
  id: string;
  title: string;
  subtitle: string | null;
  forms: ObservationFormLibraryItem[];
};

export type ObservationFormLibraryView = {
  canViewTeam: boolean;
  total: number;
  groups: ObservationFormLibraryGroup[];
};

function monthKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthTitle(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Undated";
  return date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function sortFormsNewestFirst(a: ObservationFormLibraryItem, b: ObservationFormLibraryItem): number {
  return String(b.createdAt).localeCompare(String(a.createdAt));
}

export function buildObservationFormLibraryView(params: {
  items: ObservationFormLibraryItem[];
  canViewTeam: boolean;
}): ObservationFormLibraryView {
  const items = [...params.items].sort(sortFormsNewestFirst);
  if (!params.canViewTeam) {
    const monthMap = new Map<string, ObservationFormLibraryItem[]>();
    for (const item of items) {
      const key = monthKey(item.createdAt);
      const bucket = monthMap.get(key) ?? [];
      bucket.push(item);
      monthMap.set(key, bucket);
    }
    const groups = [...monthMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, forms]) => ({
        id: `month:${key}`,
        title: forms[0] ? monthTitle(forms[0].createdAt) : "Undated",
        subtitle: `${forms.length} form${forms.length === 1 ? "" : "s"}`,
        forms,
      }));
    return { canViewTeam: false, total: items.length, groups };
  }

  const repMap = new Map<string, ObservationFormLibraryItem[]>();
  for (const item of items) {
    const bucket = repMap.get(item.uploadedBy) ?? [];
    bucket.push(item);
    repMap.set(item.uploadedBy, bucket);
  }
  const groups = [...repMap.entries()]
    .map(([uploadedBy, forms]) => {
      const sorted = [...forms].sort(sortFormsNewestFirst);
      return {
        id: `rep:${uploadedBy}`,
        title: sorted[0]?.uploaderName || "Sales rep",
        subtitle: `${sorted.length} form${sorted.length === 1 ? "" : "s"}`,
        forms: sorted,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));

  return { canViewTeam: true, total: items.length, groups };
}

export function filterObservationFormLibraryItems(
  items: ObservationFormLibraryItem[],
  query: string,
): ObservationFormLibraryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    [item.fileName, item.uploaderName, item.providerName, item.facilityName, item.caseNumber]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}
