import type { PersonalInsightTask } from "@/fetchers/task/get-personal-insight-tasks";
import type {
  InsightProject,
  InsightTask,
} from "@/components/project/insights/insights-data";
import { getStatusDisplayLabel } from "@/lib/i18n/domain";

export function personalInsightModel(
  workspaceId: string,
  tasks: PersonalInsightTask[],
  labels = { planned: "Planned", archived: "Archived" },
): InsightProject {
  const groups = new Map<string, InsightProject["columns"][number]>();
  const seen = new Set<string>();
  for (const task of tasks) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    const name =
      task.statusName ??
      (task.status === "planned"
        ? labels.planned
        : task.status === "archived"
          ? labels.archived
          : getStatusDisplayLabel(task.status));
    // Projects may give the same slug different names or final-column rules.
    const key = JSON.stringify([task.status, name, task.isFinal]);
    let column = groups.get(key);
    if (!column) {
      column = { slug: key, name, isFinal: task.isFinal, tasks: [] };
      groups.set(key, column);
    }
    const insightTask: InsightTask = {
      ...task,
      description: null,
      position: 0,
      assigneeId: task.userId,
      insightStatus: key,
    };
    column.tasks.push(insightTask);
  }
  return {
    id: `personal:${workspaceId}`,
    columns: [...groups.values()],
    plannedTasks: [],
    archivedTasks: [],
  };
}
