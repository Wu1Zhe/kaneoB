import { ChangesFeed } from "@/components/project/insights/changes-feed";
import { useGetPersonalChanges } from "@/hooks/queries/activity/use-get-personal-changes";

export function PersonalTodayChanges({
  workspaceId,
  kind,
}: {
  workspaceId: string;
  kind?: "project" | "requirement";
}) {
  const query = useGetPersonalChanges(workspaceId, kind);
  return <ChangesFeed query={query} workspaceId={workspaceId} />;
}
