import type { Metadata } from "next";
import PortalSalesDocumentsClient from "./PortalSalesDocumentsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Documents",
};

export default function PortalSalesDocumentsPage() {
  return <PortalSalesDocumentsClient />;
}
