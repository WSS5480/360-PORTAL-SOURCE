import { redirect } from "next/navigation";
import { requireInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";

export const dynamic = "force-dynamic";

/** @deprecated Observation planning is inline on the case detail page. */
export default async function PortalCaseOperationalPlanningPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  await requireInternalSalesRep();
  const { caseId } = await params;
  redirect(`/portal/sales/cases/${caseId}`);
}
