import { differenceInCalendarDays } from "date-fns";
import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { stopCardEvents } from "@/components/task-chips/stop-card-events";
import TaskDueDatePopover from "@/components/task/task-due-date-popover";
import { cn } from "@/lib/cn";
import { formatDateMedium } from "@/lib/format";
import type Task from "@/types/task";

type HierarchyDueDateCellProps = {
  task: Task;
  isCompleted: boolean;
};

/**
 * The planned completion date plus, when the task is past due, how many days
 * it is late. Calendar days rather than elapsed hours: a date-only deadline
 * is overdue the next morning, not 24 hours after midnight.
 */
export function HierarchyDueDateCell({
  task,
  isCompleted,
}: HierarchyDueDateCellProps) {
  const { t } = useTranslation();
  const dueDate = task.dueDate;
  const overdueDays = dueDate
    ? differenceInCalendarDays(new Date(dueDate), new Date())
    : 0;
  const overdue = overdueDays < 0 && !isCompleted;

  return (
    <TaskDueDatePopover task={task}>
      <button
        type="button"
        title={
          dueDate
            ? t("tasks:due.fullDate", { date: formatDateMedium(dueDate) })
            : undefined
        }
        className={cn(
          "flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-xs outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/25",
          overdue ? "text-due-overdue" : "text-muted-foreground",
        )}
        {...stopCardEvents}
      >
        <Calendar aria-hidden="true" className="size-3 shrink-0" />
        <span className={cn("truncate", !overdue && "text-foreground")}>
          {dueDate ? formatDateMedium(dueDate) : "—"}
        </span>
        {overdue && (
          <span className="shrink-0 font-medium">
            {t("tasks:due.overdueDays", { count: -overdueDays })}
          </span>
        )}
      </button>
    </TaskDueDatePopover>
  );
}
