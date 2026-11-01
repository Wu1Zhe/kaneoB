import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RequirementField } from "@/components/requirement/requirement-fields";
import updateRequirementField from "@/fetchers/task/update-requirement-field";
import { invalidateMyWork } from "@/lib/invalidate-my-work";
export function useUpdateRequirementField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      field,
      value,
    }: {
      taskId: string;
      field: RequirementField;
      value: string | null;
    }) => updateRequirementField(taskId, field, value),
    onSuccess: (_data, { taskId }) => {
      for (const queryKey of [
        ["task", taskId],
        ["tasks"],
        ["activities", taskId],
        ["project-changes"],
      ])
        void queryClient.invalidateQueries({ queryKey });
      invalidateMyWork(queryClient);
    },
  });
}
