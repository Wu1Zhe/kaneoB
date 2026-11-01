import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUpdateRequirementField } from "@/hooks/mutations/task/use-update-requirement-field";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { formatDateTimeShort } from "@/lib/format";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";
import type { RequirementField } from "./requirement-fields";

export function RequirementDateField({
  task,
  field,
  label,
}: {
  task: Task;
  field: RequirementField;
  label: string;
}) {
  const { t } = useTranslation();
  const id = useId();
  const value = task.requirementData?.[field];
  const actual = field.endsWith("ActualAt");
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("00:00");
  const update = useUpdateRequirementField();
  const { canUpdateTasks } = useWorkspacePermission();
  const save = async (clear = false) => {
    const parsed = new Date(`${date}T${time}:00`);
    if (!clear && (!date || !time || !Number.isFinite(parsed.getTime())))
      return;
    try {
      await update.mutateAsync({
        taskId: task.id,
        field,
        value: clear ? null : parsed.toISOString(),
      });
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:requirement.saveError"),
      );
    }
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          const parsed = value ? new Date(value) : new Date();
          const pad = (n: number) => String(n).padStart(2, "0");
          setDate(
            `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
          );
          setTime(
            value
              ? `${pad(parsed.getHours())}:${pad(actual ? parsed.getMinutes() : Math.floor(parsed.getMinutes() / 30) * 30)}`
              : "00:00",
          );
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger
        disabled={!canUpdateTasks()}
        aria-label={label}
        data-task-action={field === "prodPlannedAt" ? "dueDate" : undefined}
        title={label}
        className="w-full rounded px-1 py-1.5 text-left text-[11px] tabular-nums outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-80"
      >
        {value ? formatDateTimeShort(value) : "—"}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="flex flex-col gap-3">
          <p className="font-medium text-sm">{label}</p>
          <label htmlFor={`${id}-date`} className="text-xs">
            {t("tasks:requirement.date")}
          </label>
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded border bg-background p-2 text-sm"
          />
          <label htmlFor={`${id}-time`} className="text-xs">
            {t("tasks:requirement.time")}
          </label>
          {actual ? (
            <input
              id={`${id}-time`}
              type="time"
              step={60}
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="rounded border bg-background p-2 text-sm"
            />
          ) : (
            <select
              id={`${id}-time`}
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="rounded border bg-background p-2 text-sm"
            >
              {Array.from({ length: 48 }, (_, index) => {
                const slot = `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`;
                return (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                );
              })}
            </select>
          )}
          <div className="flex justify-between gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={!value || update.isPending}
              onClick={() => void save(true)}
            >
              {t("tasks:requirement.clear")}
            </Button>
            <Button
              size="sm"
              disabled={!date || !time}
              loading={update.isPending}
              onClick={() => void save()}
            >
              {t("tasks:requirement.save")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
