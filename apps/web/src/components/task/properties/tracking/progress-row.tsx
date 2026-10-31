import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useUpdateTaskTracking } from "@/hooks/mutations/task/use-update-task-tracking";
import useGetProjectTaskRelations from "@/hooks/queries/task-relation/use-get-project-task-relations";
import { useGetTasks } from "@/hooks/queries/task/use-get-tasks";
import { buildProgressMap } from "@/lib/progress";
import { buildSubtaskChildren } from "@/lib/subtask-tree";
import type Task from "@/types/task";
import { PropertyRow } from "../property-row";

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${clampPercent(value)}%` }}
      />
    </div>
  );
}

export function TaskProgressRow({
  task,
  projectId,
}: {
  task: Task;
  projectId: string;
}) {
  const { t } = useTranslation();
  const updateTracking = useUpdateTaskTracking();
  const { data: projectData } = useGetTasks(projectId);
  const { data: relations } = useGetProjectTaskRelations(projectId);

  const serverProgress = clampPercent(task.progress ?? 0);
  const [draftProgress, setDraftProgress] = useState(serverProgress);

  // A websocket refresh or a save from another window replaces the task while
  // this panel is open; follow it unless the user is mid-edit.
  useEffect(() => {
    setDraftProgress(serverProgress);
  }, [serverProgress, task.id]);

  const tasks = useMemo(
    () => projectData?.columns.flatMap((column) => column.tasks) ?? [],
    [projectData],
  );
  const tasksById = useMemo(
    () => new Map(tasks.map((candidate) => [candidate.id, candidate])),
    [tasks],
  );
  const children = useMemo(
    () => buildSubtaskChildren(relations ?? []),
    [relations],
  );
  const hasSubtasks = (children.get(task.id)?.length ?? 0) > 0;
  const aggregateProgress = useMemo(
    () =>
      hasSubtasks
        ? buildProgressMap(tasksById, children).get(task.id)
        : undefined,
    [children, hasSubtasks, task.id, tasksById],
  );

  const updateProgressDraft = (value: number) => {
    if (updateTracking.isSuccess) updateTracking.reset();
    setDraftProgress(value);
  };

  return (
    <>
      <PropertyRow label={t("tasks:properties.progress")} align="start">
        <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
          <div className="flex items-center pr-1">
            <Slider
              aria-label={t("tasks:properties.progress")}
              min={0}
              max={100}
              step={5}
              value={draftProgress}
              onValueChange={(value) =>
                updateProgressDraft(
                  clampPercent(Array.isArray(value) ? (value[0] ?? 0) : value),
                )
              }
              className="flex-1"
            />
          </div>
          <div className="flex items-center justify-between gap-2 pr-1">
            <Input
              type="number"
              min={0}
              max={100}
              size="sm"
              aria-label={t("tasks:properties.progress")}
              value={draftProgress}
              onChange={(event) =>
                updateProgressDraft(clampPercent(Number(event.target.value)))
              }
              className="w-14 text-center"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 shrink-0"
              disabled={
                updateTracking.isPending || draftProgress === serverProgress
              }
              onClick={() =>
                updateTracking.mutate({
                  taskId: task.id,
                  update: { progress: draftProgress },
                })
              }
            >
              <Check aria-hidden="true" />
              {t("tasks:properties.progressSave")}
            </Button>
          </div>
          {draftProgress === 100 && (
            <span className="text-[11px] text-muted-foreground">
              {t("tasks:properties.progressAuto")}
            </span>
          )}
          {updateTracking.isSuccess && (
            <span role="status" className="text-[11px] text-muted-foreground">
              {t("tasks:properties.progressSaved")}
            </span>
          )}
        </div>
      </PropertyRow>

      {hasSubtasks && aggregateProgress !== undefined && (
        <PropertyRow label={t("tasks:properties.aggregate")}>
          <div
            className="flex min-w-0 flex-1 items-center gap-2 pr-2"
            title={t("tasks:properties.aggregateHint")}
          >
            <ProgressBar value={aggregateProgress} />
            <span className="w-9 shrink-0 text-right font-medium text-muted-foreground text-xs tabular-nums">
              {Math.round(aggregateProgress)}%
            </span>
          </div>
        </PropertyRow>
      )}
    </>
  );
}
