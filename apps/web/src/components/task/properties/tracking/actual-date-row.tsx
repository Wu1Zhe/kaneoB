import { CalendarCheck, CalendarClock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DatePickerMenu } from "@/components/common/date-picker/date-picker-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUpdateTaskTracking } from "@/hooks/mutations/task/use-update-task-tracking";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/format";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";
import { PropertyRow } from "../property-row";
import { PropertyValue } from "../property-value";

type ActualDateField = "actualStartAt" | "actualEndAt";

export function TaskActualDateRow({
  task,
  field,
}: {
  task: Task;
  field: ActualDateField;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const updateTracking = useUpdateTaskTracking();
  const { canUpdateTasks } = useWorkspacePermission();
  const canEdit = canUpdateTasks();

  const isStart = field === "actualStartAt";
  const label = isStart
    ? t("tasks:properties.actualStart")
    : t("tasks:properties.actualEnd");
  const value = task[field] ?? null;
  const Icon = isStart ? CalendarClock : CalendarCheck;

  const handleDateChange = (date: Date | null) => {
    updateTracking.mutate(
      { taskId: task.id, update: { [field]: date?.toISOString() ?? null } },
      {
        onSuccess: () => setOpen(false),
        onError: (error) =>
          toast.error(
            error instanceof Error
              ? error.message
              : t("tasks:properties.actualDateError"),
          ),
      },
    );
  };

  const trigger = (
    <PropertyValue className="flex-none">
      <Icon className="text-muted-foreground" />
      <span className={cn("truncate", !value && "text-muted-foreground")}>
        {value ? formatDateShort(value) : label}
      </span>
    </PropertyValue>
  );

  return (
    <PropertyRow label={label}>
      {canEdit ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent className="w-65 p-0" align="start">
            <DatePickerMenu
              label={label}
              placeholder={t("tasks:datePicker.datePlaceholder")}
              clearLabel={t("tasks:popover.dueDate.clear")}
              value={value ? new Date(value) : null}
              onChange={handleDateChange}
            />
          </PopoverContent>
        </Popover>
      ) : (
        trigger
      )}
    </PropertyRow>
  );
}
