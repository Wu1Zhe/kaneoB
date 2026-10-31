import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { useUpdateTaskTracking } from "@/hooks/mutations/task/use-update-task-tracking";
import type Task from "@/types/task";
import { PropertyRow } from "../property-row";

export function TaskWeightRow({ task }: { task: Task }) {
  const { t } = useTranslation();
  const updateTracking = useUpdateTaskTracking();

  const serverWeight = task.weight ?? 1;
  const [draftWeight, setDraftWeight] = useState(String(serverWeight));

  // A websocket refresh or a save from another window replaces the task while
  // this panel is open; follow it unless the user is mid-edit.
  useEffect(() => {
    setDraftWeight(String(serverWeight));
  }, [serverWeight, task.id]);

  const weightValue = Number(draftWeight);
  const canSaveWeight =
    Number.isFinite(weightValue) &&
    weightValue > 0 &&
    weightValue !== serverWeight;

  return (
    <PropertyRow label={t("tasks:properties.weight")}>
      <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
        <Input
          type="number"
          min={0.1}
          step={0.1}
          size="sm"
          aria-label={t("tasks:properties.weight")}
          value={draftWeight}
          onChange={(event) => setDraftWeight(event.target.value)}
          onBlur={() => {
            if (!canSaveWeight) {
              setDraftWeight(String(serverWeight));
              return;
            }
            updateTracking.mutate({
              taskId: task.id,
              update: { weight: weightValue },
            });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="w-16 text-center"
          title={t("tasks:properties.weightHint")}
        />
        <span className="truncate text-[11px] text-muted-foreground">
          {t("tasks:properties.weightHint")}
        </span>
      </div>
    </PropertyRow>
  );
}
