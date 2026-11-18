import PrepareForMeetingPortalClient from "./PrepareForMeetingPortalClient";

export default async function PrepareForMeetingPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  return <PrepareForMeetingPortalClient engagementId={engagementId} />;
}
