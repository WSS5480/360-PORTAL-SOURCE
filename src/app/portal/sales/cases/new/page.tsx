import { requireInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import QuickAddCasePortalClient from "./QuickAddCasePortalClient";

export const dynamic = "force-dynamic";

export default async function PortalNewSurgicalCasePage() {
  await requireInternalSalesRep();
  return <QuickAddCasePortalClient />;
}
