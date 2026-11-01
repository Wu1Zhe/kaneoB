import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { DashboardTask } from "@/fetchers/reporting/get-report";
import { formatDateTimeShort } from "@/lib/format";
import { statusStyle } from "@/components/requirement/status-style";
export function ReportTaskList({
  tasks,
  workspaceId,
  slug,
  historical = false,
}: {
  tasks: DashboardTask[];
  workspaceId: string;
  slug: string;
  historical?: boolean;
}) {
  const { t } = useTranslation();
  if (!tasks.length)
    return (
      <p className="flex min-h-20 items-center justify-center text-xs text-muted-foreground">
        {t("reporting:empty")}
      </p>
    );
  return (
    <div className="max-h-80 overflow-auto divide-y divide-border/50">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs"
        >
          <Link
            to="/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId"
            params={{ workspaceId, projectId: task.projectId, taskId: task.id }}
            className="min-w-0 flex-1 truncate hover:underline"
          >
            <span className="mr-2 font-mono text-muted-foreground">
              {task.requirementData?.reference || `${slug}-${task.number}`}
            </span>
            {task.title}
          </Link>
          <span className="w-20 truncate text-muted-foreground">
            {task.assigneeName || t("reporting:unassigned")}
          </span>
          <span
            className="rounded-full px-2 py-0.5"
            style={statusStyle(task.status)}
          >
            {task.statusName}
          </span>
          {task.risk === "overdue" ? (
            <span className="text-destructive-foreground">
              {t("reporting:overdueDays", { days: Math.ceil(task.riskDays) })}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {(() => {
                const dates = [
                  task.dueDate,
                  ...["design", "dev", "crossTest", "uat", "pirun", "prod"].map(
                    (stage) =>
                      task.requirementData?.[`${stage}ActualAt`]
                        ? null
                        : task.requirementData?.[`${stage}PlannedAt`],
                  ),
                ].filter((value): value is string => Boolean(value));
                dates.sort(
                  (a, b) => new Date(a).getTime() - new Date(b).getTime(),
                );
                return dates[0] ? formatDateTimeShort(dates[0]) : "—";
              })()}
            </span>
          )}
          {task.overdueStages.length > 0 && (
            <p className="w-full pl-1 text-destructive-foreground">
              {task.overdueStages
                .map((stage) =>
                  stage === "delivery" ? t("reporting:delivery") : stage,
                )
                .join(" · ")}
            </p>
          )}
          {historical && (
            <span className="text-muted-foreground">
              {t("reporting:historicalRow")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
