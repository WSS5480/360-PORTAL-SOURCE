import CallForMeetingPortalClient from "../call/CallForMeetingPortalClient";

export default async function EngagementActivePage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  return <CallForMeetingPortalClient engagementId={engagementId} />;
}
