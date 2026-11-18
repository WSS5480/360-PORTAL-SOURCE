import SalesOpportunityDetailClient from "@/components/sales/SalesOpportunityDetailClient";

export default async function SalesOpportunityDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <SalesOpportunityDetailClient opportunityId={id} />;
}
