import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateTaskTracking, {
  type TaskTrackingUpdate,
} from "@/fetchers/task/update-task-tracking";

export function useUpdateTaskTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      update,
    }: {
      taskId: string;
      update: TaskTrackingUpdate;
    }) => updateTaskTracking(taskId, update),
    onSuccess: (_updated, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      // Progress and weight feed every parent's roll-up, so the whole project
      // read (board columns and the hierarchy rows that display it) is stale.
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-relations"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["activities", taskId] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
