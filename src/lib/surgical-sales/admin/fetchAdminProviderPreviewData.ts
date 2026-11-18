import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildProviderDossierView } from "@/lib/surgical-sales/buildProviderDossierView";
import {
  ADMIN_PATHWAY_CASE_SELECT,
  ADMIN_PATHWAY_ENGAGEMENT_SELECT,
  adminProviderPathwayLabels,
  deriveAdminProviderPathwayState,
} from "@/lib/surgical-sales/admin/adminProviderPathway";
import { formatEngagementStatus, formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { formatEngagementWhenLabel } from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { contactDisplayName, formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import { buildProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { AdminProviderPreviewPayload } from "@/lib/surgical-sales/admin/adminProviderPreviewTypes";
import {
  loadUniversalFactsForProvider,
  loadUniversalFactsGroupedByCapture,
} from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { isUniversalFactsReadModelEnabled } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelFlag";
import { intelligenceChipTextFromFact } from "@/lib/surgical-sales/universalExtractor/intelligenceDisplayFromFact";

const INTELLIGENCE_FIELD_PREFIX = "provider_";

function linesFromField(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export type AdminProviderReportCorpus = {
  provider_name: string;
  organization_name: string;
  rep_name: string;
  stage_label: string;
  case_count: number;
  last_case_date: string | null;
  last_captured_at: string | null;
  crm_lines: string[];
  uf_lines: string[];
  case_lines: string[];
  engagement_lines: string[];
  evidence_lines: string[];
};

function cleanEvidenceText(raw: unknown, max = 520): string {
  const text = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

function pushEvidenceLine(lines: string[], source: string, raw: unknown) {
  const text = cleanEvidenceText(raw);
  if (!text) return;
  lines.push(`${source}: ${text}`);
}

export async function fetchAdminProviderReportCorpus(providerId: string): Promise<AdminProviderReportCorpus | null> {
  const preview = await fetchAdminProviderPreviewData(providerId);
  if (!preview) return null;

  const { data: contact } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();

  const crm_lines: string[] = [];
  if (contact) {
    for (const [key, value] of Object.entries(contact as Record<string, unknown>)) {
      if (!key.startsWith(INTELLIGENCE_FIELD_PREFIX)) continue;
      for (const line of linesFromField(value)) {
        crm_lines.push(`${key.replace(/^provider_/, "").replace(/_/g, " ")}: ${line}`);
      }
    }
  }

  const uf_lines: string[] = [];
  const evidence_lines: string[] = [];
  if (isUniversalFactsReadModelEnabled()) {
    const facts = await loadUniversalFactsForProvider(providerId, { limit: 40 });
    for (const fact of facts) {
      const chip = intelligenceChipTextFromFact(fact);
      if (chip) {
        uf_lines.push(
          [
            fact.source_type ? `[${fact.source_type}]` : "",
            fact.assertion_level ? `[${fact.assertion_level}]` : "",
            chip,
            fact.evidence_text ? `Evidence: ${cleanEvidenceText(fact.evidence_text, 220)}` : "",
          ]
            .filter(Boolean)
            .join(" "),
        );
      }
    }

    const runs = await loadUniversalFactsGroupedByCapture({ provider_id: providerId, capture_limit: 12 });
    for (const run of runs) {
      const factSummary = run.facts
        .slice(0, 4)
        .map((fact) => `${fact.concept}: ${fact.normalized_label}`)
        .join("; ");
      pushEvidenceLine(
        evidence_lines,
        `AI extraction ${run.declared_source_type} ${run.created_at?.slice(0, 10) ?? ""}${factSummary ? ` (${factSummary})` : ""}`,
        run.facts.length ? run.facts.map((fact) => fact.evidence_text).filter(Boolean).join(" | ") : null,
      );
    }
  }

  for (const c of preview.cases.slice(0, 12)) {
    const row = c as Record<string, unknown>;
    const date = c.case_date?.slice(0, 10) ?? "undated";
    const source = `${date} ${c.case_type ?? "case"} ${c.case_number}`;
    pushEvidenceLine(evidence_lines, `${source} quick note`, row.notes);
    pushEvidenceLine(evidence_lines, `${source} observation goal`, row.observation_goal);
    pushEvidenceLine(evidence_lines, `${source} observation workflow`, row.live_observation_workflow);
    pushEvidenceLine(evidence_lines, `${source} observation pain points`, row.live_observation_clinical_pain_points);
    pushEvidenceLine(evidence_lines, `${source} observation product fit`, row.live_observation_product_fit);
    pushEvidenceLine(evidence_lines, `${source} observation competitors`, row.live_observation_competitors);
    pushEvidenceLine(evidence_lines, `${source} observation staff/process`, row.live_observation_staff_process);
    pushEvidenceLine(evidence_lines, `${source} observation surgeon reaction`, row.live_observation_surgeon_reactions);
    pushEvidenceLine(evidence_lines, `${source} debrief findings`, row.debrief_key_findings);
    pushEvidenceLine(evidence_lines, `${source} support outcome`, row.case_support_outcome);
  }

  const caseIds = preview.cases.map((c) => c.id).filter(Boolean);
  const noteQuery = supabaseAdmin
    .from("sales_operational_notes")
    .select("id, body, note_type, source, workflow_stage, case_id, provider_id, created_at")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false })
    .limit(25);
  const { data: directNoteRows } = await noteQuery;
  const operationalNotes = [...(directNoteRows || [])] as Record<string, unknown>[];
  if (caseIds.length > 0) {
    const { data: caseNoteRows } = await supabaseAdmin
      .from("sales_operational_notes")
      .select("id, body, note_type, source, workflow_stage, case_id, provider_id, created_at")
      .in("case_id", caseIds)
      .order("created_at", { ascending: false })
      .limit(25);
    const seen = new Set(operationalNotes.map((row) => String(row.id)));
    for (const row of (caseNoteRows || []) as Record<string, unknown>[]) {
      if (seen.has(String(row.id))) continue;
      operationalNotes.push(row);
      seen.add(String(row.id));
    }
  }
  for (const row of operationalNotes
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, 25)) {
    const sourceParts = [
      String(row.created_at ?? "").slice(0, 10),
      String(row.note_type ?? "note"),
      row.workflow_stage ? `stage ${row.workflow_stage}` : "",
      row.case_id ? "linked case note" : "provider note",
      row.source ? `source ${row.source}` : "",
    ].filter(Boolean);
    pushEvidenceLine(evidence_lines, sourceParts.join(" · "), row.body);
  }

  const { data: engagementNoteRows } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select(
      "id, engagement_type, status, notes, pre_observation_additional_notes, engagement_date, scheduled_at, updated_at",
    )
    .eq("provider_id", providerId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(25);
  for (const row of (engagementNoteRows || []) as Record<string, unknown>[]) {
    const date =
      String(row.engagement_date ?? "").slice(0, 10) ||
      String(row.scheduled_at ?? "").slice(0, 10) ||
      String(row.updated_at ?? "").slice(0, 10) ||
      "undated";
    const source = `${date} engagement ${String(row.engagement_type ?? "unknown")} · ${String(row.status ?? "unknown")}`;
    pushEvidenceLine(evidence_lines, `${source} notes/debrief dictation`, row.notes);
    pushEvidenceLine(evidence_lines, `${source} pre-observation planning`, row.pre_observation_additional_notes);
  }

  return {
    provider_name: preview.provider.display_name,
    organization_name: preview.provider.organization_name,
    rep_name: preview.provider.rep_name,
    stage_label: preview.provider.stage_label,
    case_count: preview.provider.case_count,
    last_case_date: preview.provider.last_case_date,
    last_captured_at: preview.provider.last_captured_at,
    crm_lines: crm_lines.slice(0, 40),
    uf_lines: uf_lines.slice(0, 30),
    case_lines: preview.cases.slice(0, 12).map((c) => {
      const date = c.case_date?.slice(0, 10) ?? "—";
      const productLabel = c.product_id ? "product linked" : "no product linked";
      return `${date} · ${c.case_type ?? "case"} · ${c.status} · ${productLabel} · ${c.case_number} (${c.rep_name})`;
    }),
    engagement_lines: preview.engagements.slice(0, 10).map((e) => {
      return `${e.date_label ?? "—"} · ${e.type_label} · ${e.status_label} (${e.rep_name})`;
    }),
    evidence_lines: evidence_lines.slice(0, 50),
  };
}

export async function fetchAdminProviderPreviewData(providerId: string): Promise<AdminProviderPreviewPayload | null> {
  const { data: contact, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*, organization:sales_organizations!organization_id(id,name), account:sales_organizations!account_id(id,name)")
    .eq("id", providerId)
    .maybeSingle();

  if (error || !contact) return null;

  const contactRow = contact as Record<string, unknown>;
  const org =
    (contactRow.organization as { name?: string | null } | null)?.name ||
    (contactRow.account as { name?: string | null } | null)?.name ||
    "—";

  const { data: caseRows } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select(ADMIN_PATHWAY_CASE_SELECT)
    .eq("surgeon_contact_id", providerId)
    .is("archived_at", null)
    .order("case_date", { ascending: false, nullsFirst: false })
    .limit(50);

  const cases = (caseRows || []) as Array<{
    id: string;
    case_number: string;
    case_date: string | null;
    case_type: string | null;
    status: string;
    sales_rep_id: string;
    updated_at: string;
  }>;

  const repIds = [...new Set(cases.map((c) => c.sales_rep_id).filter(Boolean))];
  const repNameById = new Map<string, string>();
  if (repIds.length > 0) {
    const { data: reps } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, full_name, email")
      .in("user_id", repIds);
    for (const rep of reps || []) {
      const fn = String((rep as { full_name?: string | null }).full_name ?? "").trim();
      const em = String((rep as { email?: string | null }).email ?? "").trim();
      repNameById.set(String((rep as { user_id: string }).user_id), fn || em || "Rep");
    }
  }

  const latestCase = cases[0];
  const repName = latestCase ? repNameById.get(latestCase.sales_rep_id) ?? "—" : "—";

  const { data: engagementRows } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select(ADMIN_PATHWAY_ENGAGEMENT_SELECT)
    .eq("provider_id", providerId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(30);

  const engagements = (engagementRows || []).map((row) => {
    const e = row as {
      id: string;
      engagement_type: string;
      status: string;
      engagement_date?: string | null;
      scheduled_at?: string | null;
      sales_rep_id: string;
    };
    return {
      id: e.id,
      type_label: formatEngagementType(e.engagement_type),
      status_label: formatEngagementStatus(e.status),
      date_label: formatEngagementWhenLabel({
        engagement_date: e.engagement_date,
        scheduled_at: e.scheduled_at,
      }),
      rep_name: repNameById.get(e.sales_rep_id) ?? "—",
    };
  });
  const providerEngagementSummaries: ProviderEngagementSummary[] = (engagementRows || []).map((row) => {
    const e = row as {
      id: string;
      engagement_type: string;
      status: string;
      updated_at?: string;
      debrief_completed?: boolean | null;
      debrief_completed_at?: string | null;
    };
    return {
      id: e.id,
      engagement_type: e.engagement_type,
      engagement_type_label: formatEngagementType(e.engagement_type),
      status: e.status,
      status_label: formatEngagementStatus(e.status),
      pre_call_filled: 0,
      pre_call_total: 0,
      pre_call_complete: false,
      briefing_status: "not_planned",
      briefing_status_label: "Not Started",
      planning_status: "not_planned",
      planning_status_label: "Not Started",
      outcome_label: formatEngagementStatus(e.status),
      updated_at: e.updated_at,
      debrief_completed: Boolean(e.debrief_completed),
      debrief_completed_at: e.debrief_completed_at ?? null,
    };
  });

  const pathway = deriveAdminProviderPathwayState({
    providerId,
    contact: contactRow,
    cases: cases as never[],
    engagements: (engagementRows || []) as never[],
  });
  const pathwayLabels = adminProviderPathwayLabels(pathway);

  const planning = buildProviderPlanningCompletion({ contact: contactRow });
  const dossierView = buildProviderDossierView({
    contact: contactRow,
    providerId,
    planning,
    cases,
    engagements: providerEngagementSummaries,
  });

  const lastCaseDate = cases.map((c) => c.case_date).filter(Boolean).sort().reverse()[0] ?? null;
  const contactUpdated = String(contactRow.updated_at ?? "");

  return {
    provider: {
      id: providerId,
      display_name: contactDisplayName(contactRow),
      organization_name: String(org).trim() || "—",
      rep_name: repName,
      specialty: String(contactRow.title ?? "").trim() || null,
      stage_label: pathwayLabels.stage_label,
      case_count: cases.length,
      last_case_date: lastCaseDate,
      last_captured_at: contactUpdated || null,
    },
    dossier: {
      page_title: dossierView.pageTitle,
      subtitle: dossierView.subtitle,
      has_any_knowledge: dossierView.hasAnyKnowledge,
      sections: dossierView.sections.map((section) => ({
        id: section.id,
        label: section.title,
        purpose: section.purpose,
        known: section.known.map((row) => ({ label: row.label, value: row.value })),
        unknown: section.unknown.map((row) => ({ label: row.label })),
      })),
    },
    cases: cases.map((c) => ({
      id: c.id,
      case_number: formatSurgicalCaseNumber(c.case_number),
      case_date: c.case_date,
      case_type: c.case_type,
      status: c.status,
      product_id: (c as { product_id?: string | null }).product_id ?? null,
      rep_name: repNameById.get(c.sales_rep_id) ?? "—",
    })),
    engagements,
  };
}
