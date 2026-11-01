import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DateTimePickerMenu } from "@/components/common/date-picker/date-time-picker-menu";
import {
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { useUpdateTaskDueDate } from "@/hooks/mutations/task/use-update-task-due-date";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";

export function DueDateSubmenu({ task }: { task: Task }) {
  const { t } = useTranslation();
  const { mutateAsync: updateTaskDueDate } = useUpdateTaskDueDate();

  const setDueDate = async (date: Date | null) => {
    try {
      await updateTaskDueDate({
        ...task,
        dueDate: date?.toISOString() ?? null,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("tasks:dueDate.updateError"),
      );
    }
  };

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <Calendar className="size-3.5 text-muted-foreground" />
        <span>{t("tasks:dueDate.label")}</span>
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-65 p-0">
        <DateTimePickerMenu
          key={task.dueDate ?? "empty"}
          label={t("tasks:dueDate.label")}
          placeholder={t("tasks:datePicker.dueDatePlaceholder")}
          clearLabel={t("tasks:dueDate.clear")}
          value={task.dueDate ? new Date(task.dueDate) : null}
          bounds={
            task.startDate ? { before: new Date(task.startDate) } : undefined
          }
          formatLimit={(date) => t("tasks:datePicker.startsOn", { date })}
          onChange={setDueDate}
        />
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
