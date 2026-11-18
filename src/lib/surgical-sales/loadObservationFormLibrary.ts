import { supabaseAdmin } from "@/lib/supabase/admin";
import { contactDisplayName, formatSurgicalCaseNumber, isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import {
  OBSERVATION_FORM_DOCUMENT_TYPE,
  type ObservationFormLibraryItem,
} from "@/lib/surgical-sales/observationFormLibrary";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";

type DocRow = {
  id: string;
  case_id: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
};

type CaseRow = {
  id: string;
  case_number?: string | null;
  case_date?: string | null;
  case_type?: string | null;
  account_id?: string | null;
  surgeon_contact_id?: string | null;
};

function profileLabel(row: { full_name?: string | null; email?: string | null } | undefined): string {
  const name = String(row?.full_name ?? "").trim();
  if (name) return name;
  const email = String(row?.email ?? "").trim();
  if (email) return email;
  return "Sales rep";
}

export async function loadObservationFormLibraryItems(params: {
  viewerId: string;
  canViewTeam: boolean;
}): Promise<{ ok: true; items: ObservationFormLibraryItem[] } | { ok: false; message: string }> {
  let query = supabaseAdmin
    .from("surgical_sales_case_documents")
    .select("id, case_id, file_name, uploaded_by, created_at")
    .eq("document_type", OBSERVATION_FORM_DOCUMENT_TYPE)
    .order("created_at", { ascending: false })
    .limit(800);

  if (!params.canViewTeam) {
    query = query.eq("uploaded_by", params.viewerId);
  }

  const { data: docs, error: docsErr } = await query;
  if (docsErr) return { ok: false, message: docsErr.message };

  const rows = (docs || []) as DocRow[];
  if (rows.length === 0) return { ok: true, items: [] };

  const caseIds = [...new Set(rows.map((row) => row.case_id).filter(Boolean))];
  const { data: cases, error: casesErr } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select("id, case_number, case_date, case_type, account_id, surgeon_contact_id")
    .in("id", caseIds);
  if (casesErr) return { ok: false, message: casesErr.message };

  const caseById = new Map<string, CaseRow>();
  for (const row of (cases || []) as CaseRow[]) {
    if (isSurgicalObservationCase(row.case_type)) caseById.set(row.id, row);
  }

  const contactIds = [...new Set([...caseById.values()].map((row) => String(row.surgeon_contact_id || "")).filter(Boolean))];
  const accountIds = [...new Set([...caseById.values()].map((row) => String(row.account_id || "")).filter(Boolean))];
  const uploaderIds = [...new Set(rows.map((row) => row.uploaded_by).filter(Boolean))];

  const [contactsRes, orgsRes, profilesRes] = await Promise.all([
    contactIds.length
      ? supabaseAdmin.from("surgical_sales_contacts").select("id, first_name, last_name, email").in("id", contactIds)
      : Promise.resolve({ data: [], error: null }),
    accountIds.length
      ? supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").in("id", accountIds)
      : Promise.resolve({ data: [], error: null }),
    uploaderIds.length
      ? supabaseAdmin.from("user_profiles").select("user_id, full_name, email").in("user_id", uploaderIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (contactsRes.error) return { ok: false, message: contactsRes.error.message };
  if (orgsRes.error) return { ok: false, message: orgsRes.error.message };
  if (profilesRes.error) return { ok: false, message: profilesRes.error.message };

  const contactById = new Map<string, { first_name?: string | null; last_name?: string | null; email?: string | null }>();
  for (const row of contactsRes.data || []) {
    contactById.set(String((row as { id: string }).id), row as { first_name?: string | null; last_name?: string | null; email?: string | null });
  }
  const orgById = new Map<string, string>();
  for (const row of orgsRes.data || []) {
    orgById.set(String((row as { id: string }).id), String((row as { name?: string | null }).name || "").trim());
  }
  const profileById = new Map<string, { full_name?: string | null; email?: string | null }>();
  for (const row of profilesRes.data || []) {
    profileById.set(String((row as { user_id: string }).user_id), row as { full_name?: string | null; email?: string | null });
  }

  const items: ObservationFormLibraryItem[] = [];
  for (const doc of rows) {
    const caseRow = caseById.get(doc.case_id);
    if (!caseRow) continue;
    const provider = caseRow.surgeon_contact_id ? contactById.get(String(caseRow.surgeon_contact_id)) : undefined;
    items.push({
      id: doc.id,
      fileName: doc.file_name,
      createdAt: doc.created_at,
      caseId: caseRow.id,
      caseNumber: formatSurgicalCaseNumber(caseRow.case_number) || caseRow.case_number || null,
      caseDate: caseRow.case_date ?? null,
      caseHref: `/portal/sales/cases/${encodeURIComponent(caseRow.id)}`,
      providerName: provider ? contactDisplayName(provider) : null,
      facilityName: caseRow.account_id ? orgById.get(String(caseRow.account_id)) || null : null,
      uploadedBy: doc.uploaded_by,
      uploaderName: profileLabel(profileById.get(doc.uploaded_by)),
    });
  }

  return { ok: true, items };
}

export async function loadObservationFormDocumentForViewer(params: {
  docId: string;
  viewerId: string;
  canViewTeam: boolean;
}): Promise<
  | { ok: true; doc: { id: string; case_id: string; file_name: string; storage_key: string | null; uploaded_by: string } }
  | { ok: false; status: 404 | 403 | 500; message: string }
> {
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_case_documents")
    .select("id, case_id, file_name, storage_key, uploaded_by, document_type")
    .eq("id", params.docId)
    .maybeSingle();
  if (error) return { ok: false, status: 500, message: error.message };
  if (!data || String((data as { document_type?: string }).document_type) !== OBSERVATION_FORM_DOCUMENT_TYPE) {
    return { ok: false, status: 404, message: "Not found" };
  }

  const uploadedBy = String((data as { uploaded_by: string }).uploaded_by || "");
  if (!params.canViewTeam && uploadedBy !== params.viewerId) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  const storageKey = String((data as { storage_key?: string | null }).storage_key || "").trim();
  if (!storageKey) return { ok: false, status: 404, message: "Not found" };

  return {
    ok: true,
    doc: {
      id: String((data as { id: string }).id),
      case_id: String((data as { case_id: string }).case_id),
      file_name: String((data as { file_name: string }).file_name),
      storage_key: storageKey,
      uploaded_by: uploadedBy,
    },
  };
}
