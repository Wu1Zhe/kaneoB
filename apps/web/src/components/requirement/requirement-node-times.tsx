import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { stopCardEvents } from "@/components/task-chips/stop-card-events";
import { formatDateTimeShort } from "@/lib/format";
import type Task from "@/types/task";
import { requirementStages, stageTiming } from "./requirement-fields";

export function RequirementNodeTimes({ task }: { task: Task }) {
  const { t } = useTranslation();
  const next = requirementStages.find(
    (stage) =>
      task.requirementData?.[stage.planned] &&
      !task.requirementData?.[stage.actual],
  );
  const last = [...requirementStages]
    .reverse()
    .find((stage) => task.requirementData?.[stage.actual]);
  return (
    <Popover>
      <PopoverTrigger
        {...stopCardEvents}
        aria-label={t("tasks:requirement.nodeTimes")}
        className="min-w-0 truncate rounded px-1 py-1 text-xs text-muted-foreground hover:bg-accent"
      >
        {next
          ? `${next.label} · ${formatDateTimeShort(task.requirementData?.[next.planned] ?? "")}`
          : last
            ? `${last.label} · ${t("tasks:requirement.timing.completed")}`
            : t("tasks:requirement.notScheduled")}
      </PopoverTrigger>
      <PopoverContent
        {...stopCardEvents}
        className="w-[33rem] max-w-[95vw] p-4"
      >
        <table className="w-full text-left text-xs">
          <caption className="mb-3 text-left font-medium text-sm">
            {t("tasks:requirement.nodeTimes")}
          </caption>
          <thead className="text-muted-foreground">
            <tr>
              <th>{t("tasks:requirement.stage")}</th>
              <th>{t("tasks:requirement.planned")}</th>
              <th>{t("tasks:requirement.actual")}</th>
              <th>{t("tasks:status.label")}</th>
            </tr>
          </thead>
          <tbody>
            {requirementStages.map((stage) => {
              const planned = task.requirementData?.[stage.planned];
              const actual = task.requirementData?.[stage.actual];
              const timing = stageTiming(planned, actual);
              return (
                <tr key={stage.id} className="border-t [&>*]:py-2">
                  <th className="font-normal">{stage.label}</th>
                  <td>{planned ? formatDateTimeShort(planned) : "—"}</td>
                  <td>{actual ? formatDateTimeShort(actual) : "—"}</td>
                  <td
                    className={
                      timing === "late" || timing === "overdue"
                        ? "text-destructive-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    {t(`tasks:requirement.timing.${timing}`)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("tasks:requirement.editHint")}
        </p>
      </PopoverContent>
    </Popover>
  );
}
