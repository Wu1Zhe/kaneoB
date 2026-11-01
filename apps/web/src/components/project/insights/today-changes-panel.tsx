import { useGetProjectChanges } from "@/hooks/queries/activity/use-get-project-changes";
import { ChangesFeed } from "./changes-feed";

export function TodayChangesPanel({
  projectId,
  workspaceId,
}: {
  projectId: string;
  workspaceId?: string;
}) {
  const query = useGetProjectChanges(projectId);
  return <ChangesFeed query={query} workspaceId={workspaceId} />;
}
