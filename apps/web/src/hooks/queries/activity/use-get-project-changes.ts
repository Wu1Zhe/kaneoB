import { useInfiniteQuery } from "@tanstack/react-query";
import { addDays, startOfDay } from "date-fns";
import { useEffect, useState } from "react";
import getProjectChanges from "@/fetchers/activity/get-project-changes";

type Cursor = { createdAt: string; id: string } | null;

export function useGetProjectChanges(projectId: string) {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  useEffect(() => {
    const timer = window.setInterval(
      () =>
        setDay((current) => {
          const next = startOfDay(new Date());
          return next.getTime() === current.getTime() ? current : next;
        }),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const since = day.toISOString();
  const until = addDays(day, 1).toISOString();
  return useInfiniteQuery({
    queryKey: ["project-changes", projectId, since, until],
    queryFn: ({ pageParam }) =>
      getProjectChanges(projectId, {
        since,
        until,
        limit: "50",
        ...(pageParam
          ? { before: pageParam.createdAt, beforeId: pageParam.id }
          : {}),
      }),
    initialPageParam: null as Cursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(projectId),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 30_000,
  });
}
