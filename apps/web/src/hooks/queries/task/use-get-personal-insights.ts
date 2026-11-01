import { useQuery } from "@tanstack/react-query";
import getPersonalInsightTasks from "@/fetchers/task/get-personal-insight-tasks";

export function useGetPersonalInsights(workspaceId: string) {
  return useQuery({
    queryKey: ["personal-insights", workspaceId],
    queryFn: ({ signal }) => getPersonalInsightTasks(workspaceId, signal),
    enabled: Boolean(workspaceId),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 30_000,
  });
}
