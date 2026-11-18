import { z } from "zod";

export const AdminProviderIntelligenceReportSchema = z.object({
  headline: z.string().min(8).max(180),
  summary: z.string().min(20).max(900),
  what_we_know: z.array(z.string().min(8).max(220)).min(1).max(5),
  friction_or_risks: z.array(z.string().min(8).max(220)).max(4),
  commercial_outlook: z.string().min(8).max(400),
  manager_actions: z.array(z.string().min(8).max(220)).min(1).max(3),
});

export type AdminProviderIntelligenceReport = z.infer<typeof AdminProviderIntelligenceReportSchema>;

export type AdminProviderPreviewPayload = {
  provider: {
    id: string;
    display_name: string;
    organization_name: string;
    rep_name: string;
    specialty: string | null;
    stage_label: string;
    case_count: number;
    last_case_date: string | null;
    last_captured_at: string | null;
  };
  dossier: {
    page_title: string;
    subtitle: string;
    has_any_knowledge: boolean;
    sections: Array<{
      id: string;
      label: string;
      purpose: string;
      known: Array<{ label: string; value: string }>;
      unknown: Array<{ label: string }>;
    }>;
  };
  cases: Array<{
    id: string;
    case_number: string;
    case_date: string | null;
    case_type: string | null;
    status: string;
    product_id?: string | null;
    rep_name: string;
  }>;
  engagements: Array<{
    id: string;
    type_label: string;
    status_label: string;
    date_label: string | null;
    rep_name: string;
  }>;
};
