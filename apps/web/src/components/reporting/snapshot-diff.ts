import type {
  DashboardReport,
  DashboardTask,
} from "@/fetchers/reporting/get-report";
const tracked = (task: DashboardTask) =>
  JSON.stringify([
    task.title,
    task.description,
    task.priority,
    task.status,
    task.userId,
    task.dueDate,
    task.startDate,
    task.actualStartAt,
    task.actualEndAt,
    task.requirementData,
  ]);
export function snapshotDiff(before: DashboardReport, after: DashboardReport) {
  const old = new Map(before.tasks.map((task) => [task.id, task]));
  const next = new Map(after.tasks.map((task) => [task.id, task]));
  return {
    added: after.tasks.filter((task) => !old.has(task.id)),
    removed: before.tasks.filter((task) => !next.has(task.id)),
    changed: after.tasks.filter(
      (task) =>
        old.has(task.id) && tracked(old.get(task.id)!) !== tracked(task),
    ),
  };
}
