import { client } from "@kaneo/libs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { HttpError } from "@/lib/http-error";
import { invalidateMyWork } from "@/lib/invalidate-my-work";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";
import { CollaboratorSelect } from "./collaborator-select";
import { PropertyRow } from "./properties/property-row";
export function TaskCollaborators({
  task,
  workspaceId,
}: {
  task: Task;
  workspaceId: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canAssignTasks } = useWorkspacePermission();
  const mutation = useMutation({
    mutationFn: async (collaboratorIds: string[]) => {
      const response = await client["task-extra"][":id"].collaborators.$put({
        param: { id: task.id },
        json: { collaboratorIds },
      });
      if (!response.ok) throw await HttpError.fromResponse(response);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["task", task.id] });
      void queryClient.invalidateQueries({
        queryKey: ["tasks", task.projectId],
      });
      void queryClient.invalidateQueries({ queryKey: ["activities", task.id] });
      invalidateMyWork(queryClient);
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <PropertyRow label={t("tasks:collaboration.label")}>
      <CollaboratorSelect
        projectId={task.projectId}
        workspaceId={workspaceId}
        ownerId={task.userId}
        value={task.collaboratorIds ?? []}
        onChange={(ids) => mutation.mutate(ids)}
        disabled={!canAssignTasks() || mutation.isPending}
      />
    </PropertyRow>
  );
}
