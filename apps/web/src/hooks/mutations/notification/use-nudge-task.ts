import { useMutation } from "@tanstack/react-query";
import nudgeTask from "@/fetchers/notification/nudge-task";

export function useNudgeTask() {
  return useMutation({
    mutationFn: (taskId: string) => nudgeTask(taskId),
  });
}
