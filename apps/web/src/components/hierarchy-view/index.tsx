import { RequirementList } from "@/components/requirement/requirement-list";
import { useCallback, useMemo, useState } from "react";
import { useIsRequirement } from "@/components/project/project-kind-context";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import useGetProjectTaskRelations from "@/hooks/queries/task-relation/use-get-project-task-relations";
import { buildHierarchyRoots } from "@/lib/hierarchy-tree";
import { buildProgressMap } from "@/lib/progress";
import { buildSubtaskChildren, flattenSubtaskRows } from "@/lib/subtask-tree";
import type { ProjectWithTasks } from "@/types/project";
import { HierarchyHeader } from "./hierarchy-header";
import { HierarchyRow } from "./hierarchy-row";

type HierarchyViewProps = {
  project: ProjectWithTasks;
  workspaceId: string;
  onOpenTask: (taskId: string) => void;
};

export function HierarchyView({
  project,
  workspaceId,
  onOpenTask,
}: HierarchyViewProps) {
  const { t } = useTranslation();
  const isRequirement = useIsRequirement();
  const {
    data: relations,
    isLoading: relationsLoading,
    isError: relationsFailed,
    refetch: refetchRelations,
  } = useGetProjectTaskRelations(isRequirement ? "" : project.id);

  // Board order: columns in their configured order, tasks by position within
  // each column. A child keeps its place under its parent rather than under
  // its own status, which is what makes this a hierarchy rather than a list.
  const tasks = useMemo(
    () => project.columns.flatMap((column) => column.tasks),
    [project.columns],
  );

  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  const children = useMemo(
    () => buildSubtaskChildren(isRequirement ? [] : (relations ?? [])),
    [relations, isRequirement],
  );

  const roots = useMemo(
    () => buildHierarchyRoots(tasks, children),
    [tasks, children],
  );

  // Parent rows show the weighted roll-up of their subtasks; leaves show the
  // percentage that was reported on them. A zero without children is noise,
  // so those rows render nothing.
  const progressById = useMemo(
    () => buildProgressMap(tasksById, children),
    [tasksById, children],
  );

  // Everything starts expanded: a hierarchy whose branches are all folded
  // looks exactly like a flat list. Only collapsed rows are stored, and a
  // collapsed parent hides its descendants without forgetting their state.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const rows = useMemo(
    () =>
      flattenSubtaskRows({
        tasks: roots,
        children,
        tasksById,
        isExpanded: (rowId) => !collapsed.has(rowId),
      }),
    [roots, children, tasksById, collapsed],
  );

  const toggleExpanded = useCallback((rowId: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  if (isRequirement)
    return <RequirementList project={project} onOpenTask={onOpenTask} />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!isRequirement && relationsFailed && (
        // Without relations every task renders as a root, which reads exactly
        // like a project with no subtasks; this says it isn't.
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-2 text-sm text-muted-foreground"
        >
          <span>{t("tasks:listView.subtasksLoadError")}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetchRelations()}
          >
            {t("common:error.tryAgain")}
          </Button>
        </div>
      )}

      <div
        aria-busy={relationsLoading}
        className="min-h-0 flex-1 overflow-auto bg-muted/20"
      >
        <HierarchyHeader />
        <div className="divide-y divide-border/50">
          {rows.map((row) => {
            const progress = progressById.get(row.task.id) ?? 0;
            return (
              <HierarchyRow
                key={row.rowId}
                task={row.task}
                projectSlug={project.slug ?? ""}
                workspaceId={workspaceId}
                columns={project.columns}
                depth={row.depth}
                rowId={row.rowId}
                childCount={row.childCount}
                isExpanded={row.isExpanded}
                progress={progress}
                onToggle={toggleExpanded}
                onOpenTask={onOpenTask}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
