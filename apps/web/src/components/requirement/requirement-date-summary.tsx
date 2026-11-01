import { useTranslation } from "react-i18next";
import type Task from "@/types/task";
import { formatDateTimeShort } from "@/lib/format";
export function RequirementDateSummary({ task }: { task: Task }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {(
        [
          ["startDate", "plannedStart"],
          ["dueDate", "plannedEnd"],
          ["actualStartAt", "actualStart"],
          ["actualEndAt", "actualEnd"],
        ] as const
      ).map(([field, label]) => (
        <div key={field}>
          <span className="text-muted-foreground">
            {t(`tasks:properties.${label}`)} ·{" "}
          </span>
          <span>{task[field] ? formatDateTimeShort(task[field]!) : "—"}</span>
        </div>
      ))}
    </div>
  );
}
