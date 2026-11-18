import { requireInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { SalesCommandChrome } from "@/components/sales/SalesCommandChrome";
import "./sales-command.css";

export default async function SalesCommandLayout({ children }: { children: React.ReactNode }) {
  await requireInternalSalesRep();
  return <SalesCommandChrome>{children}</SalesCommandChrome>;
}
