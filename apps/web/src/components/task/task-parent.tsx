import { client } from "@kaneo/libs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import useGetTaskRelations from "@/hooks/queries/task-relation/use-get-task-relations";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { HttpError } from "@/lib/http-error";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";
import { ParentTaskSelect } from "./parent-task-select";
import { PropertyRow } from "./properties/property-row";
export function TaskParent({ task }: { task: Task }) {
  const { t } = useTranslation();
  const { data: relations = [] } = useGetTaskRelations(task.id);
  const queryClient = useQueryClient();
  const { canUpdateTasks } = useWorkspacePermission();
  const parent =
    relations.find(
      (r) => r.relationType === "subtask" && r.targetTaskId === task.id,
    )?.sourceTaskId ?? null;
  const mutation = useMutation({
    mutationFn: async (parentTaskId: string | null) => {
      const response = await client["task-extra"][":id"].parent.$put({
        param: { id: task.id },
        json: { parentTaskId },
      });
      if (!response.ok) throw await HttpError.fromResponse(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", task.projectId],
      });
      void queryClient.invalidateQueries({
        predicate: (q) =>
          String(q.queryKey[0]).toLowerCase().includes("relation"),
      });
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <PropertyRow label={t("tasks:parent.label")}>
      <ParentTaskSelect
        projectId={task.projectId}
        taskId={task.id}
        value={parent}
        onChange={(id) => mutation.mutate(id)}
        disabled={!canUpdateTasks() || mutation.isPending}
      />
    </PropertyRow>
  );
}
