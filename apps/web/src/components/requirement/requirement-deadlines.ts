import type Task from "@/types/task";
import { requirementStages, type RequirementStage } from "./requirement-fields";
export function taskDeadlines(
  task: Task,
): Array<{ date: string; stage?: RequirementStage }> {
  if (
    task.projectKind === "requirement" &&
    (task.requirementData?.prodActualAt ||
      ["closed", "rejected"].includes(task.status))
  )
    return [];
  const result: Array<{ date: string; stage?: RequirementStage }> = task.dueDate
    ? [{ date: task.dueDate }]
    : [];
  if (task.projectKind === "requirement")
    for (const stage of requirementStages) {
      const date = task.requirementData?.[stage.planned];
      if (date && !task.requirementData?.[stage.actual])
        result.push({ date, stage });
    }
  return result;
}
