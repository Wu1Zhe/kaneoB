import { useInfiniteQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import getPersonalChanges from "@/fetchers/activity/get-personal-changes";
import { useLocalDay } from "@/hooks/use-local-day";

type Cursor = { createdAt: string; id: string } | null;

export function useGetPersonalChanges(
  workspaceId: string,
  kind?: "project" | "requirement",
) {
  const day = useLocalDay();
  const since = new Date(day).toISOString();
  const until = addDays(new Date(day), 1).toISOString();
  return useInfiniteQuery({
    queryKey: ["personal-changes", workspaceId, since, until, kind],
    queryFn: ({ pageParam }) =>
      getPersonalChanges(workspaceId, {
        kind,
        since,
        until,
        limit: "50",
        ...(pageParam
          ? { before: pageParam.createdAt, beforeId: pageParam.id }
          : {}),
      }),
    initialPageParam: null as Cursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(workspaceId),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 30_000,
  });
}
