import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { fetchAdminPlaybookById } from "@/lib/surgical-sales/preCallPlanTemplateAdminDb";
import AdminPlaybookEditorClient from "./AdminPlaybookEditorClient";

export const dynamic = "force-dynamic";

export default async function AdminPlaybookDetailPage(props: { params: Promise<{ templateId: string }> }) {
  await requireAdmin();
  const { templateId } = await props.params;
  const playbook = await fetchAdminPlaybookById(templateId);
  if (!playbook) notFound();
  return <AdminPlaybookEditorClient playbook={playbook} />;
}
