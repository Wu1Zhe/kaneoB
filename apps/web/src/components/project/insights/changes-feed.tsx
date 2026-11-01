import { useIsRequirement } from "@/components/project/project-kind-context";
import { Link, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { describeActivity } from "@/components/home/describe-activity";
import { Button } from "@/components/ui/button";
import type { useGetProjectChanges } from "@/hooks/queries/activity/use-get-project-changes";
import { formatDate, formatDateTime } from "@/lib/format";

export function ChangesFeed({
  query,
  workspaceId,
}: {
  query: ReturnType<typeof useGetProjectChanges>;
  workspaceId?: string;
}) {
  const { t } = useTranslation();
  const isRequirement = useIsRequirement();
  const search = useSearch({ strict: false });
  const changes = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="max-h-80 min-h-48 overflow-y-auto px-3 pb-3">
      {query.isPending ? (
        <p role="status" className="p-4 text-sm text-muted-foreground">
          {t("todayChanges:loading")}
        </p>
      ) : null}
      {query.isError ? (
        <div
          role="alert"
          className="space-y-2 p-3 text-sm text-muted-foreground"
        >
          <p>{t("todayChanges:error")}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => query.refetch()}
          >
            {t("todayChanges:retry")}
          </Button>
        </div>
      ) : null}
      {!query.isPending && !query.isError && !changes.length ? (
        <div className="flex min-h-44 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <p className="font-medium text-sm">{t("todayChanges:empty")}</p>
          <p className="text-xs">
            {t(
              isRequirement
                ? "tasks:requirement.changesHint"
                : "todayChanges:emptyDescription",
            )}
          </p>
        </div>
      ) : null}
      <ul className="divide-y divide-border/50">
        {changes.map((change) => (
          <li key={change.id} className="space-y-1 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <time
                dateTime={change.createdAt}
                title={formatDateTime(change.createdAt)}
                className="tabular-nums"
              >
                {formatDate(change.createdAt, {
                  hour: "2-digit",
                  minute: "2-digit",
                  hourCycle: "h23",
                })}
              </time>
              <span className="truncate">
                {change.userName ??
                  change.externalUserName ??
                  t("common:people.unknown")}
              </span>
            </div>
            <Link
              {...(workspaceId
                ? {
                    to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId" as const,
                    params: {
                      workspaceId,
                      projectId: change.projectId,
                      taskId: change.taskId,
                    },
                  }
                : {
                    to: "." as const,
                    search: { ...search, taskId: change.taskId },
                  })}
              className="block truncate rounded-sm font-medium text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {change.taskTitle}
            </Link>
            <p className="text-xs text-muted-foreground">
              {describeActivity(change, t)}
            </p>
          </li>
        ))}
      </ul>
      {query.hasNextPage ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-2 w-full"
          loading={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {t("todayChanges:more")}
        </Button>
      ) : null}
    </div>
  );
}
