import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AssigneeAvatar } from "@/components/task/properties/assignee-avatar";
import { cn } from "@/lib/cn";
import type { InsightColumn, PersonStatusRow } from "./insights-data";
import { UNASSIGNED_KEY } from "./insights-data";

export function PeopleStatusTable({
  rows,
  columns,
  colors,
  workspaceId,
}: {
  rows: PersonStatusRow[];
  columns: InsightColumn[];
  colors: Record<string, string>;
  workspaceId?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const openTask = (taskId: string, projectId: string) => {
    if (workspaceId)
      navigate({
        to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
        params: { workspaceId, projectId, taskId },
      });
    else navigate({ to: ".", search: { taskId }, replace: true });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-max border-collapse text-xs">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-border/60 border-b">
            <th className="sticky left-0 z-10 bg-card px-2 py-1.5 text-left font-medium text-muted-foreground">
              {t("tasks:insights.person")}
            </th>
            {columns.map((column) => (
              <th
                key={column.slug}
                className="px-2 py-1.5 text-center font-medium text-muted-foreground"
              >
                <span className="inline-flex items-center gap-1">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: colors[column.slug] }}
                  />
                  {column.name}
                </span>
              </th>
            ))}
            <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">
              {t("tasks:insights.total")}
            </th>
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
              {t("tasks:insights.taskColumn")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const unassigned = row.key === UNASSIGNED_KEY;
            return (
              <tr
                key={row.key}
                className="group border-border/40 border-b last:border-0 hover:bg-accent/40"
              >
                <td className="sticky left-0 z-10 max-w-36 bg-card px-2 py-1 group-hover:bg-accent">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <AssigneeAvatar
                      name={row.name}
                      image={row.image}
                      assigned={!unassigned}
                      className="size-4"
                    />
                    <span className="truncate">
                      {unassigned
                        ? t("tasks:insights.unassigned")
                        : (row.name ?? t("tasks:insights.unassigned"))}
                    </span>
                  </span>
                </td>
                {columns.map((column) => {
                  const count = row.counts[column.slug] ?? 0;
                  return (
                    <td
                      key={column.slug}
                      className={cn(
                        "px-2 py-1 text-center tabular-nums",
                        count === 0 && "text-muted-foreground/45",
                      )}
                    >
                      {count}
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-center font-medium tabular-nums">
                  {row.total}
                </td>
                <td className="px-2 py-1">
                  <div className="flex max-w-[28rem] flex-wrap gap-1">
                    {row.tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        title={task.title}
                        onClick={() => openTask(task.id, task.projectId)}
                        className="max-w-40 truncate rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] text-foreground/80 transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground"
                      >
                        {task.title}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length > 0 && (
            <tr className="bg-muted/30 font-medium">
              <td className="sticky left-0 z-10 bg-muted/30 px-2 py-1">
                {t("tasks:insights.total")}
              </td>
              {columns.map((column) => (
                <td
                  key={column.slug}
                  className="px-2 py-1 text-center tabular-nums"
                >
                  {rows.reduce(
                    (sum, row) => sum + (row.counts[column.slug] ?? 0),
                    0,
                  )}
                </td>
              ))}
              <td className="px-2 py-1 text-center tabular-nums">
                {rows.reduce((sum, row) => sum + row.total, 0)}
              </td>
              <td />
            </tr>
          )}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="px-3 py-6 text-center text-muted-foreground text-xs">
          {t("tasks:insights.emptyStats")}
        </p>
      )}
    </div>
  );
}
