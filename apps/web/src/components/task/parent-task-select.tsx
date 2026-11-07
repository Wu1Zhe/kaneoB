import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGetTasks } from "@/hooks/queries/task/use-get-tasks";
import useGetProjectTaskRelations from "@/hooks/queries/task-relation/use-get-project-task-relations";

type Props = {
  projectId: string;
  taskId?: string;
  value: string | null;
  onChange: (id: string | null, owner: string | null) => void;
  disabled?: boolean;
};
export function ParentTaskSelect({
  projectId,
  taskId,
  value,
  onChange,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: project, isPending, isError } = useGetTasks(projectId);
  const { data: relations = [] } = useGetProjectTaskRelations(projectId);
  const tasks = useMemo(
    () => project?.columns.flatMap((c) => c.tasks) ?? [],
    [project],
  );
  const blocked = useMemo(() => {
    const ids = new Set<string>();
    const children = new Map<string, string[]>();
    for (const relation of relations)
      if (relation.relationType === "subtask")
        children.set(relation.sourceTaskId, [
          ...(children.get(relation.sourceTaskId) ?? []),
          relation.targetTaskId,
        ]);
    const pending = taskId ? [taskId] : [];
    while (pending.length) {
      const id = pending.pop()!;
      if (ids.has(id)) continue;
      ids.add(id);
      pending.push(...(children.get(id) ?? []));
    }
    return ids;
  }, [taskId, relations]);
  const selected = tasks.find((task) => task.id === value);
  const pick = (id: string | null, owner: string | null) => {
    onChange(id, owner);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || isPending || isError}
          className="max-w-full justify-start gap-2 px-2 font-normal"
        >
          <GitBranch className="size-4 shrink-0" />
          <span className="truncate">
            {selected?.title ??
              (value ? t("tasks:parent.unavailable") : t("tasks:parent.none"))}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <Input
          aria-label={t("tasks:parent.search")}
          placeholder={t("tasks:parent.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="mt-2 max-h-64 overflow-auto">
          <button
            type="button"
            onClick={() => pick(null, null)}
            className="w-full rounded p-2 text-left text-sm hover:bg-accent"
          >
            {t("tasks:parent.none")}
          </button>
          {tasks
            .filter(
              (task) =>
                !blocked.has(task.id) &&
                `${project?.slug}-${task.number} ${task.title}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .slice(0, 100)
            .map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => pick(task.id, task.userId)}
                className="flex w-full gap-2 rounded p-2 text-left text-sm hover:bg-accent"
              >
                <span className="shrink-0 text-xs text-muted-foreground">
                  {project?.slug}-{task.number}
                </span>
                <span className="truncate">{task.title}</span>
              </button>
            ))}
        </div>
        <p className="pt-2 text-xs text-muted-foreground">
          {t("tasks:parent.hint")}
        </p>
      </PopoverContent>
    </Popover>
  );
}
