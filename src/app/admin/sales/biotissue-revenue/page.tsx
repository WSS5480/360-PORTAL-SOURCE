import { requireAdmin } from "@/lib/admin/requireAdmin";
import AdminBiotissueRevenueClient from "./AdminBiotissueRevenueClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "BioTissue revenue · Admin",
  description: "Manufacturer closed sales vs quota for BioTissue RGV and Laredo.",
};

export default async function AdminBiotissueRevenuePage() {
  await requireAdmin();
  return <AdminBiotissueRevenueClient />;
}
