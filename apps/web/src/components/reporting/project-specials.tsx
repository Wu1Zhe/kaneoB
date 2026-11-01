import { buildHierarchyRoots } from "@/lib/hierarchy-tree";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import useGetProjectTaskRelations from "@/hooks/queries/task-relation/use-get-project-task-relations";
import { buildSubtaskChildren } from "@/lib/subtask-tree";
import { buildProgressMap } from "@/lib/progress";
import type Task from "@/types/task";
import type { DashboardReport } from "@/fetchers/reporting/get-report";
import { ReportPanel } from "./report-panel";
export function ProjectSpecials({
  report,
  workspaceId,
}: {
  report: DashboardReport;
  workspaceId: string;
}) {
  const { t } = useTranslation();
  const relations = useGetProjectTaskRelations(report.project.id);
  const children = useMemo(
    () => buildSubtaskChildren(relations.data ?? []),
    [relations.data],
  );
  const taskMap = useMemo(
    () =>
      new Map(
        report.tasks.map((task) => [
          task.id,
          { ...task, assigneeId: task.userId, position: 0 } as Task,
        ]),
      ),
    [report.tasks],
  );
  const progress = useMemo(
    () => buildProgressMap(taskMap, children),
    [taskMap, children],
  );
  const roots = buildHierarchyRoots(report.tasks, children);
  const descendants = (id: string) => {
    const seen = new Set<string>([id]);
    const queue = [id];
    while (queue.length) {
      const parent = queue.pop()!;
      for (const child of children.get(parent) ?? []) {
        if (!seen.has(child) && taskMap.has(child)) {
          seen.add(child);
          queue.push(child);
        }
      }
    }
    seen.delete(id);
    return [...seen]
      .map((key) => report.tasks.find((task) => task.id === key)!)
      .filter(Boolean);
  };
  return (
    <ReportPanel
      title={t("reporting:specials")}
      subtitle={t("reporting:specialsHint")}
      className="col-span-full"
    >
      {relations.isError ? (
        <p role="alert" className="text-xs text-destructive-foreground">
          {t("reporting:relationsError")}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {roots.map((task) => {
            const tasks = descendants(task.id);
            const percentage = progress.get(task.id) ?? task.progress;
            return (
              <Link
                key={task.id}
                to="/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId"
                params={{
                  workspaceId,
                  projectId: task.projectId,
                  taskId: task.id,
                }}
                className="rounded-lg border p-3 transition hover:bg-accent/40"
              >
                <p className="truncate font-medium text-sm">{task.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {report.project.slug}-{task.number} ·{" "}
                  {task.assigneeName || t("reporting:unassigned")}
                </p>
                <div className="relative mt-3 h-4 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-emerald-700/70"
                    style={{ width: `${percentage}%` }}
                  />
                  <span className="absolute inset-0 text-center text-[11px] font-medium">
                    {Math.round(percentage)}%
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("reporting:specialCounts", {
                    total: tasks.length,
                    done: tasks.filter((item) => item.isFinal).length,
                    overdue: tasks.filter((item) => item.risk === "overdue")
                      .length,
                  })}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </ReportPanel>
  );
}
