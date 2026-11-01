import { statusStyle } from "./status-style";
import { useTranslation } from "react-i18next";
import { useGetColumns } from "@/hooks/queries/column/use-get-columns";
import { getStatusDisplayLabel } from "@/lib/i18n/domain";
import type Task from "@/types/task";
import TaskStatusPopover from "@/components/task/task-status-popover";
import { RequirementTextField } from "./requirement-text-field";

export function RequirementContentFields({
  task,
  projectSlug,
  section,
}: {
  task: Task;
  projectSlug: string;
  section: "before" | "after";
}) {
  const { t } = useTranslation();
  const { data: columns = [] } = useGetColumns(task.projectId);
  const column = columns.find(
    (item) => item.slug === task.status || item.id === task.status,
  );
  if (section === "before")
    return (
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        {!task.requirementData?.type && (
          <p
            role="status"
            className="col-span-full rounded border border-warning/30 bg-warning/5 p-2 text-xs text-warning-foreground"
          >
            {t("tasks:requirement.legacyMissing")}
          </p>
        )}
        <RequirementTextField
          task={task}
          field="reference"
          placeholder={`${projectSlug}-${task.number}`}
        />
        <RequirementTextField task={task} field="type" />
        <RequirementTextField task={task} field="category" />
      </div>
    );
  return (
    <div className="mt-5 flex flex-col gap-4">
      <RequirementTextField task={task} field="benefit" multiline />
      <RequirementTextField task={task} field="notes" multiline />
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          {t("tasks:requirement.workflow")}
        </span>
        <TaskStatusPopover task={task}>
          <button
            type="button"
            data-task-action="status"
            style={statusStyle(task.status)}
            className="rounded-md border px-3 py-1.5 hover:bg-accent"
          >
            {getStatusDisplayLabel(task.status, column?.name)}
          </button>
        </TaskStatusPopover>
      </div>
    </div>
  );
}
