export const SALES_COMMAND_DOCUMENT_ACCESS_LEVELS = [
  "all_reps",
  "territory_managers",
  "admin_only",
] as const;

export type SalesCommandDocumentAccessLevel = (typeof SALES_COMMAND_DOCUMENT_ACCESS_LEVELS)[number];

export const SALES_COMMAND_DOCUMENT_ACCESS_LABELS: Record<SalesCommandDocumentAccessLevel, string> = {
  all_reps: "All sales reps",
  territory_managers: "Territory managers only",
  admin_only: "Admin only (hidden from reps)",
};

/** Short labels for pills, tree, and compact UI. */
export const SALES_COMMAND_DOCUMENT_ACCESS_SHORT_LABELS: Record<SalesCommandDocumentAccessLevel, string> = {
  all_reps: "All reps",
  territory_managers: "Managers only",
  admin_only: "Admin only",
};

/** Plain-language “who can see this folder” copy. */
export const SALES_COMMAND_DOCUMENT_ACCESS_DESCRIPTIONS: Record<SalesCommandDocumentAccessLevel, string> = {
  all_reps: "Every sales rep can see this folder in Sales Command Documents.",
  territory_managers: "Only territory managers (and admins) can see this folder. Regular reps cannot.",
  admin_only: "Admin only — hidden from all reps. Use for drafts or internal files.",
};

export type SalesCommandDocumentFile = {
  id: string;
  folder_id: string;
  title: string;
  filename: string | null;
  storage_bucket: string;
  storage_path: string | null;
  content_type: string | null;
  size_bytes: number | null;
  external_url: string | null;
  sort_order: number;
  created_at: string;
};

export type SalesCommandDocumentFolder = {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  access_level: SalesCommandDocumentAccessLevel;
  sort_order: number;
  created_at: string;
  files?: SalesCommandDocumentFile[];
  subfolders?: SalesCommandDocumentFolder[];
};

export function isSalesCommandDocumentAccessLevel(raw: string): raw is SalesCommandDocumentAccessLevel {
  return (SALES_COMMAND_DOCUMENT_ACCESS_LEVELS as readonly string[]).includes(raw);
}
