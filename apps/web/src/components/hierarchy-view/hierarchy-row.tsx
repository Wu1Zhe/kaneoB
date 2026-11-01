import { RequirementNodeTimes } from "@/components/requirement/requirement-node-times";
import { ChevronRight } from "lucide-react";
import { useIsRequirement } from "@/components/project/project-kind-context";
import { useTranslation } from "react-i18next";
import { AssigneeAvatar } from "@/components/task/properties/assignee-avatar";
import TaskPriorityPopover from "@/components/task/task-priority-popover";
import { AssigneeButton } from "@/components/task-chips/assignee-button";
import { ChecklistChip } from "@/components/task-chips/checklist-chip";
import { LabelChips } from "@/components/task-chips/label-chips";
import { stopCardEvents } from "@/components/task-chips/stop-card-events";
import { SubtasksChip } from "@/components/task-chips/subtasks-chip";
import { useTaskHoverPrefetch } from "@/hooks/use-task-hover-prefetch";
import { cn } from "@/lib/cn";
import { getColumnIcon } from "@/lib/column";
import { isTaskCompleted } from "@/lib/due-date-status";
import { getPriorityLabel } from "@/lib/i18n/domain";
import { getPriorityIcon } from "@/lib/priority";
import { useUserPreferencesStore } from "@/store/user-preferences";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";
import {
  HIERARCHY_CELL_CLASS,
  HIERARCHY_COLUMNS,
  HIERARCHY_ROW_MIN_WIDTH_CLASS,
} from "./hierarchy-columns";
import { HierarchyDueDateCell } from "./hierarchy-due-date-cell";
import { HierarchyProgress } from "./hierarchy-progress";

type HierarchyRowProps = {
  task: Task;
  projectSlug: string;
  workspaceId: string;
  columns: ProjectWithTasks["columns"];
  depth: number;
  rowId: string;
  childCount: number;
  isExpanded: boolean;
  /** Weighted roll-up for parents, or the task's own reported progress. */
  progress: number;
  onToggle: (rowId: string) => void;
  onOpenTask: (taskId: string) => void;
};

const [
  creatorColumn,
  assigneeColumn,
  priorityColumn,
  statusColumn,
  progressColumn,
  dueDateColumn,
  subtasksColumn,
] = HIERARCHY_COLUMNS;

export function HierarchyRow({
  task,
  projectSlug,
  workspaceId,
  columns,
  depth,
  rowId,
  childCount,
  isExpanded,
  progress,
  onToggle,
  onOpenTask,
}: HierarchyRowProps) {
  const { t } = useTranslation();
  const isRequirement = useIsRequirement();
  const hoverPrefetch = useTaskHoverPrefetch(task.id);
  const { showTaskNumbers, showLabels, showTaskItemCounts } =
    useUserPreferencesStore();
  const taskStatusColumn = columns.find((column) => column.id === task.status);
  const isCompleted = isTaskCompleted(task.status, columns);
  const priorityLabel = `${t("tasks:priority.label")}: ${getPriorityLabel(task.priority ?? "")}`;
  const assigneeLabel = task.userId
    ? task.assigneeName || t("common:people.unknown")
    : t("tasks:assignee.unassigned");
  const creatorLabel = task.creatorName || t("common:people.unknown");

  return (
    <div
      className={cn(
        "group/row flex items-stretch border-b border-border/50 transition-colors duration-150",
        HIERARCHY_ROW_MIN_WIDTH_CLASS,
      )}
    >
      <div
        className="flex shrink-0 items-center"
        // Indentation is capped so a deep chain cannot push the title out of
        // the row; the chevrons still convey the nesting.
        style={{ paddingLeft: `${0.875 + Math.min(depth, 8) * 1.25}rem` }}
      >
        {childCount > 0 ? (
          <button
            type="button"
            onClick={() => onToggle(rowId)}
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? t("tasks:listView.collapseSubtasks", { title: task.title })
                : t("tasks:listView.expandSubtasks", { title: task.title })
            }
            className="touch-hitbox relative shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "size-3 transition-transform duration-150 ease-out",
                isExpanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span aria-hidden="true" className="w-5 shrink-0" />
        )}
      </div>

      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the row is a button-like control; the chips in each cell stop their own events */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenTask(task.id)}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onOpenTask(task.id);
        }}
        {...hoverPrefetch}
        className="group flex h-10 min-w-0 flex-1 cursor-pointer items-center outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        data-task-id={task.id}
        data-task-row-id={rowId}
        data-shortcut-surface
      >
        {depth > 0 && (
          <span className="sr-only">
            {t("tasks:listView.subtaskLevel", { level: depth })}
          </span>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
          {showTaskNumbers && (
            <span className="w-13 shrink-0 truncate font-mono text-muted-foreground text-xs">
              {isRequirement && task.requirementData?.reference
                ? task.requirementData.reference
                : `${projectSlug}-${task.number}`}
            </span>
          )}
          <span className="truncate text-foreground text-sm">{task.title}</span>
          {showLabels && (
            <LabelChips task={task} workspaceId={workspaceId} max={2} />
          )}
          {showTaskItemCounts && <ChecklistChip task={task} />}
        </div>

        <div className={cn(HIERARCHY_CELL_CLASS, creatorColumn.widthClass)}>
          {task.createdBy ? (
            <>
              <AssigneeAvatar
                name={task.creatorName}
                image={task.creatorImage}
                assigned
                className="size-5"
              />
              <span
                title={creatorLabel}
                className="truncate text-muted-foreground text-xs"
              >
                {creatorLabel}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </div>

        <div className={cn(HIERARCHY_CELL_CLASS, assigneeColumn.widthClass)}>
          <AssigneeButton
            task={task}
            workspaceId={workspaceId}
            name={task.assigneeName}
            image={task.assigneeImage}
            avatarClassName="size-5"
          />
          <span
            aria-hidden="true"
            title={assigneeLabel}
            className="truncate text-muted-foreground text-xs"
          >
            {assigneeLabel}
          </span>
        </div>

        <div className={cn(HIERARCHY_CELL_CLASS, priorityColumn.widthClass)}>
          <TaskPriorityPopover task={task}>
            <button
              type="button"
              aria-label={priorityLabel}
              title={priorityLabel}
              className="flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-xs outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/25"
              {...stopCardEvents}
            >
              {getPriorityIcon(task.priority ?? "")}
              <span className="truncate text-muted-foreground">
                {getPriorityLabel(task.priority ?? "")}
              </span>
            </button>
          </TaskPriorityPopover>
        </div>

        <div className={cn(HIERARCHY_CELL_CLASS, statusColumn.widthClass)}>
          {taskStatusColumn ? (
            <>
              <span className="shrink-0">
                {getColumnIcon(
                  taskStatusColumn.id,
                  taskStatusColumn.isFinal,
                  taskStatusColumn.icon,
                )}
              </span>
              <span className="truncate text-muted-foreground text-xs">
                {taskStatusColumn.name}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </div>

        <div
          className={cn(
            HIERARCHY_CELL_CLASS,
            isRequirement ? "w-[11rem]" : progressColumn.widthClass,
          )}
        >
          {isRequirement ? (
            <RequirementNodeTimes task={task} />
          ) : (
            <HierarchyProgress value={progress} />
          )}
        </div>

        <div className={cn(HIERARCHY_CELL_CLASS, dueDateColumn.widthClass)}>
          <HierarchyDueDateCell task={task} isCompleted={isCompleted} />
        </div>

        {!isRequirement && (
          <div className={cn(HIERARCHY_CELL_CLASS, subtasksColumn.widthClass)}>
            {task.subtaskCounts?.total ? (
              <SubtasksChip
                task={task}
                workspaceId={workspaceId}
                className="h-5"
              />
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
