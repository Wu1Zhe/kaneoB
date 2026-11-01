import { format, startOfDay, subDays } from "date-fns";
import { isTaskCompleted } from "@/lib/due-date-status";
import type Task from "@/types/task";
import type { ProjectWithTasks } from "@/types/project";

export type InsightColumn = {
  slug: string;
  name: string;
  isFinal: boolean;
};

export type StatusCount = InsightColumn & { count: number };

export type PersonStatusRow = {
  key: string;
  name: string | null;
  image: string | null;
  counts: Record<string, number>;
  total: number;
  tasks: Task[];
};

export type OverdueBand = "overdue" | "soon";

export type OverdueEntry = {
  task: Task;
  /** Positive for an overdue task, positive time remaining for a soon task. */
  distanceMs: number;
};

export type TrendPoint = {
  date: Date;
  label: string;
  created: number;
  completed: number;
};

export type TaskSummary = {
  total: number;
  completed: number;
  completionRate: number;
  overdue: number;
  overdueRate: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const UNASSIGNED_KEY = "__unassigned__";

const priorityRank: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function getInsightColumns(project: ProjectWithTasks): InsightColumn[] {
  return project.columns.map((column) => ({
    slug: column.slug,
    name: column.name,
    isFinal: column.isFinal,
  }));
}

/** Each task once, even if a column view repeats it. */
export function collectInsightTasks(project: ProjectWithTasks): Task[] {
  const seen = new Set<string>();
  const tasks: Task[] = [];
  for (const column of project.columns) {
    for (const task of column.tasks) {
      if (seen.has(task.id)) continue;
      seen.add(task.id);
      tasks.push(task);
    }
  }
  return tasks;
}

function isCompleted(task: Task, columns: InsightColumn[]) {
  return isTaskCompleted(task.status, columns);
}

export function getOverdueEntries(
  tasks: Task[],
  columns: InsightColumn[],
  band: OverdueBand,
  now: Date = new Date(),
): OverdueEntry[] {
  const entries: OverdueEntry[] = [];
  for (const task of tasks) {
    if (!task.dueDate || isCompleted(task, columns)) continue;
    const remaining = new Date(task.dueDate).getTime() - now.getTime();
    if (band === "overdue" && remaining < 0) {
      entries.push({ task, distanceMs: -remaining });
    } else if (band === "soon" && remaining >= 0 && remaining <= DAY_MS) {
      entries.push({ task, distanceMs: remaining });
    }
  }

  return entries.sort((a, b) => {
    const priority =
      (priorityRank[b.task.priority ?? ""] ?? 0) -
      (priorityRank[a.task.priority ?? ""] ?? 0);
    if (priority !== 0) return priority;
    // Overdue: longest overdue first. Due soon: soonest first.
    return band === "overdue"
      ? b.distanceMs - a.distanceMs
      : a.distanceMs - b.distanceMs;
  });
}

export function buildStatusCounts(
  tasks: Task[],
  columns: InsightColumn[],
): StatusCount[] {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
  }
  return columns.map((column) => ({
    ...column,
    count: counts.get(column.slug) ?? 0,
  }));
}

export function buildPeopleTable(
  tasks: Task[],
  columns: InsightColumn[],
): PersonStatusRow[] {
  const rows = new Map<string, PersonStatusRow>();
  for (const task of tasks) {
    const key = task.userId ?? UNASSIGNED_KEY;
    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        name: task.assigneeName ?? null,
        image: task.assigneeImage ?? null,
        counts: {},
        total: 0,
        tasks: [],
      };
      rows.set(key, row);
    }
    row.counts[task.status] = (row.counts[task.status] ?? 0) + 1;
    row.total += 1;
    row.tasks.push(task);
  }

  const columnOrder = new Map(
    columns.map((column, index) => [column.slug, index]),
  );
  for (const row of rows.values()) {
    row.tasks.sort((a, b) => {
      const aOrder = columnOrder.get(a.status) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = columnOrder.get(b.status) ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.title.localeCompare(b.title);
    });
  }

  return [...rows.values()].sort((a, b) => {
    if (a.key === UNASSIGNED_KEY) return 1;
    if (b.key === UNASSIGNED_KEY) return -1;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}

export function summarizeTasks(
  tasks: Task[],
  columns: InsightColumn[],
  now: Date = new Date(),
): TaskSummary {
  const total = tasks.length;
  let completed = 0;
  let overdue = 0;
  for (const task of tasks) {
    if (isCompleted(task, columns)) {
      completed += 1;
      continue;
    }
    if (task.dueDate && new Date(task.dueDate).getTime() < now.getTime()) {
      overdue += 1;
    }
  }

  return {
    total,
    completed,
    completionRate: total === 0 ? 0 : completed / total,
    overdue,
    overdueRate: total === 0 ? 0 : overdue / total,
  };
}

function completionDate(task: Task): Date | null {
  // actualEndAt is the explicit tracking value; otherwise the last edit of a
  // task sitting in a final column is the best available completion signal.
  const value = task.actualEndAt ?? task.updatedAt;
  return value ? new Date(value) : null;
}

export function buildTrend(
  tasks: Task[],
  columns: InsightColumn[],
  days: number,
  now: Date = new Date(),
): TrendPoint[] {
  const end = startOfDay(now);
  const start = subDays(end, days - 1);
  const points: TrendPoint[] = Array.from({ length: days }, (_, index) => {
    const date = subDays(end, days - 1 - index);
    return { date, label: format(date, "M/d"), created: 0, completed: 0 };
  });
  const indexByDay = new Map(
    points.map((point, index) => [point.date.getTime(), index]),
  );

  const bucket = (value: Date | null) => {
    if (!value) return undefined;
    const day = startOfDay(value);
    if (day < start || day > now) return undefined;
    return indexByDay.get(day.getTime());
  };

  for (const task of tasks) {
    const createdIndex = bucket(new Date(task.createdAt));
    if (createdIndex !== undefined) points[createdIndex].created += 1;

    if (!isCompleted(task, columns)) continue;
    const completedIndex = bucket(completionDate(task));
    if (completedIndex !== undefined) points[completedIndex].completed += 1;
  }

  return points;
}
