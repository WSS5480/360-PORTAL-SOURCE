import EngagementDetailPortalClient from "./EngagementDetailPortalClient";

export const dynamic = "force-dynamic";

export default async function PortalEngagementDetailPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  return <EngagementDetailPortalClient engagementId={engagementId} />;
}
