import { TaskCollaborators } from "../task-collaborators";
import { TaskParent } from "../task-parent";
import { RequirementProperties } from "@/components/requirement/requirement-properties";
import { Calendar, CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import icons from "@/constants/project-icons";
import { getColumnIcon } from "@/lib/column";
import { cn } from "@/lib/cn";
import { formatDateShort, formatDateTimeShort } from "@/lib/format";
import { getPriorityLabel } from "@/lib/i18n/domain";
import { getPriorityIcon } from "@/lib/priority";
import { TaskCustomFieldRows } from "../custom-fields/task-custom-field-rows";
import TaskAssigneePopover from "../task-assignee-popover";
import TaskDueDatePopover from "../task-due-date-popover";
import TaskLabelsPopover from "../task-labels-popover";
import TaskMovePopover from "../task-move-popover";
import TaskPriorityPopover from "../task-priority-popover";
import { TaskRecurrenceBadge } from "../task-recurrence-badge";
import TaskStartDatePopover from "../task-start-date-popover";
import TaskStatusPopover from "../task-status-popover";
import { AssigneeAvatar } from "./assignee-avatar";
import { dueDateTextClass } from "./due-date-text-class";
import { LabelsValue } from "./labels-value";
import { PropertyRow } from "./property-row";
import { PropertyValue } from "./property-value";
import { TaskActualDateRow } from "./tracking/actual-date-row";
import { TaskCreatorRow } from "./tracking/creator-row";
import { TaskProgressRow } from "./tracking/progress-row";
import { TaskWeightRow } from "./tracking/weight-row";
import { useTaskProperties } from "./use-task-properties";

type PropertiesRailProps = {
  taskId: string;
  projectId: string;
  workspaceId: string;
  className?: string;
};

export function PropertiesRail({
  taskId,
  projectId,
  workspaceId,
  className,
}: PropertiesRailProps) {
  const { t } = useTranslation();
  const { task, project, labels, status, assignee, dueStatus, canMoveTask } =
    useTaskProperties(taskId, projectId, workspaceId);

  if (!task) return null;
  const isRequirement =
    task.projectKind === "requirement" || project?.kind === "requirement";

  const ProjectIcon =
    icons[project?.icon as keyof typeof icons] || icons.Layout;
  const projectValue = (
    <>
      <ProjectIcon className="text-muted-foreground" />
      <span className="truncate">{project?.name}</span>
    </>
  );

  return (
    <aside
      aria-label={t("tasks:properties.title")}
      className={cn("flex flex-col gap-4 px-3 pt-4 pb-6", className)}
    >
      <div className="flex flex-col gap-0.5">
        <TaskCreatorRow task={task} />

        <PropertyRow
          label={t(
            isRequirement
              ? "tasks:assignee.label"
              : "tasks:collaboration.primary",
          )}
        >
          <TaskAssigneePopover task={task} workspaceId={workspaceId}>
            <PropertyValue data-task-action="assignee" shortcutId="assignTask">
              <AssigneeAvatar
                name={assignee?.user?.name || task.assigneeName}
                image={assignee?.user?.image}
                assigned={Boolean(task.userId)}
              />
              <span
                className={cn(
                  "truncate",
                  !task.userId && "text-muted-foreground",
                )}
              >
                {assignee?.user?.name ||
                  task.assigneeName ||
                  t("tasks:popover.assignee.unassigned")}
              </span>
            </PropertyValue>
          </TaskAssigneePopover>
        </PropertyRow>

        {!isRequirement && (
          <>
            <TaskCollaborators task={task} workspaceId={workspaceId} />
            <TaskParent task={task} />
          </>
        )}
        {isRequirement ? (
          <>
            {(
              [
                ["startDate", "plannedStart"],
                ["dueDate", "plannedEnd"],
                ["actualStartAt", "actualStart"],
                ["actualEndAt", "actualEnd"],
              ] as const
            ).map(([field, label]) => (
              <PropertyRow key={field} label={t(`tasks:properties.${label}`)}>
                <span
                  title={t("tasks:requirement.mappingHint")}
                  className="px-2 text-xs text-muted-foreground"
                >
                  {task[field] ? formatDateTimeShort(task[field]!) : "—"}
                </span>
              </PropertyRow>
            ))}
          </>
        ) : (
          <>
            {" "}
            <PropertyRow label={t("tasks:properties.plannedStart")}>
              <TaskStartDatePopover
                task={task}
                label={t("tasks:properties.plannedStart")}
              >
                <PropertyValue className="flex-none">
                  <CalendarDays className="text-muted-foreground" />
                  <span
                    className={cn(
                      "truncate",
                      !task.startDate && "text-muted-foreground",
                    )}
                  >
                    {task.startDate
                      ? formatDateShort(task.startDate)
                      : t("tasks:properties.plannedStart")}
                  </span>
                </PropertyValue>
              </TaskStartDatePopover>
            </PropertyRow>
            <PropertyRow label={t("tasks:properties.plannedEnd")}>
              <TaskDueDatePopover
                task={task}
                label={t("tasks:properties.plannedEnd")}
              >
                <PropertyValue
                  data-task-action="dueDate"
                  className={cn("flex-none", dueDateTextClass[dueStatus])}
                >
                  <Calendar
                    className={cn(!task.dueDate && "text-muted-foreground")}
                  />
                  <span
                    className={cn(
                      "truncate",
                      !task.dueDate && "text-muted-foreground",
                    )}
                  >
                    {task.dueDate
                      ? formatDateTimeShort(task.dueDate)
                      : t("tasks:properties.plannedEnd")}
                  </span>
                  <TaskRecurrenceBadge task={task} asText />
                </PropertyValue>
              </TaskDueDatePopover>
            </PropertyRow>
            <TaskActualDateRow task={task} field="actualStartAt" />
            <TaskActualDateRow task={task} field="actualEndAt" />
          </>
        )}

        {!isRequirement && (
          <PropertyRow label={t("tasks:status.label")}>
            <TaskStatusPopover task={task}>
              <PropertyValue
                data-task-action="status"
                shortcutId="changeStatus"
              >
                {getColumnIcon(task.status ?? "", status.isFinal, status.icon)}
                <span className="truncate">{status.label}</span>
              </PropertyValue>
            </TaskStatusPopover>
          </PropertyRow>
        )}

        <PropertyRow label={t("tasks:priority.label")}>
          <TaskPriorityPopover task={task}>
            <PropertyValue
              data-task-action="priority"
              shortcutId="changePriority"
            >
              {getPriorityIcon(task.priority ?? "")}
              <span className="truncate">
                {getPriorityLabel(task.priority ?? "")}
              </span>
            </PropertyValue>
          </TaskPriorityPopover>
        </PropertyRow>

        <PropertyRow label={t("tasks:properties.labels")} align="start">
          <TaskLabelsPopover task={task} workspaceId={workspaceId}>
            <PropertyValue
              data-task-action="labels"
              shortcutId="changeLabels"
              className="h-auto min-h-7.5 py-1.25"
            >
              <LabelsValue labels={labels} />
            </PropertyValue>
          </TaskLabelsPopover>
        </PropertyRow>

        {!isRequirement && (
          <TaskProgressRow task={task} projectId={projectId} />
        )}

        {!isRequirement && <TaskWeightRow task={task} />}

        <PropertyRow label={t("tasks:properties.project")}>
          {canMoveTask ? (
            <TaskMovePopover task={task} workspaceId={workspaceId}>
              <PropertyValue data-task-action="move" shortcutId="moveToProject">
                {projectValue}
              </PropertyValue>
            </TaskMovePopover>
          ) : (
            <div className="flex h-7.5 min-w-0 items-center gap-2 px-2 font-medium text-[13px] text-foreground [&_svg]:size-3.5 [&_svg]:shrink-0">
              {projectValue}
            </div>
          )}
        </PropertyRow>
      </div>

      {isRequirement && <RequirementProperties task={task} />}
      <TaskCustomFieldRows taskId={taskId} projectId={projectId} />
    </aside>
  );
}
