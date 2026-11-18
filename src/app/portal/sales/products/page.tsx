import type { Metadata } from "next";
import PortalSalesProductsClient from "./PortalSalesProductsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products",
};

export default function PortalSalesProductsPage() {
  return <PortalSalesProductsClient />;
}
