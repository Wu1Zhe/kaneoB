export type ReportTask = {
  id: string;
  projectId: string;
  number: number | null;
  title: string;
  description: string;
  status: string;
  statusName: string;
  isFinal: boolean;
  priority: string;
  progress: number;
  weight: number;
  userId: string | null;
  assigneeName: string | null;
  creatorName: string | null;
  updaterName: string | null;
  createdAt: string;
  updatedAt: string;
  startDate: string | null;
  dueDate: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  requirementData: Record<string, string | null> | null;
  enteredAt: string | null;
  risk: string;
  riskDays: number;
  overdueStages: string[];
  stalledDays: number | null;
};
export type Revision = {
  id: number;
  taskId: string;
  operation: string;
  recordedAt: Date;
  data: Record<string, unknown>;
};
export const STAGES = [
  ["design", "Design"],
  ["dev", "Dev"],
  ["crossTest", "Cross Test"],
  ["uat", "UAT"],
  ["pirun", "Pirun"],
  ["prod", "Prod"],
] as const;
export const DAY = 86400000;
export function timestamp(value: unknown): string | null {
  if (!value) return null;
  const text = String(value);
  const date = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(text) ? text : `${text}Z`);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
export function asTask(
  data: Record<string, unknown>,
  enteredAt: string | null,
): ReportTask {
  return {
    ...(data as unknown as ReportTask),
    enteredAt,
    startDate: timestamp(data.startDate),
    dueDate: timestamp(data.dueDate),
    actualStartAt: timestamp(data.actualStartAt),
    actualEndAt: timestamp(data.actualEndAt),
    createdAt: timestamp(data.createdAt)!,
    updatedAt: timestamp(data.updatedAt)!,
    risk: "normal",
    riskDays: 0,
    overdueStages: [],
    stalledDays: null,
  } as ReportTask;
}
export function taskStateAt(revisions: Revision[], at: number) {
  const tasks = new Map<string, ReportTask>();
  for (const revision of revisions) {
    if (revision.recordedAt.getTime() > at) break;
    if (revision.operation === "delete") {
      tasks.delete(revision.taskId);
      continue;
    }
    const previous = tasks.get(revision.taskId);
    const entered =
      revision.data.statusEnteredAt !== undefined
        ? timestamp(revision.data.statusEnteredAt)
        : previous && previous.status === revision.data.status
          ? previous.enteredAt
          : revision.operation === "baseline"
            ? null
            : revision.recordedAt.toISOString();
    tasks.set(revision.taskId, asTask(revision.data, entered));
  }
  return [...tasks.values()].filter((task) => task.status !== "archived");
}
export function addBusinessDays(at: number, count: number) {
  const date = new Date(at + 8 * 3600000);
  let remaining = count;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) remaining--;
  }
  return date.getTime() - 8 * 3600000;
}
export function assessTask(task: ReportTask, kind: string, at: number) {
  const finished =
    kind === "requirement"
      ? Boolean(task.requirementData?.prodActualAt) ||
        ["closed", "rejected"].includes(task.status)
      : task.isFinal;
  const deadlines: Array<{ date: string; label: string }> = [];
  if (
    task.dueDate &&
    (kind !== "requirement" || !task.requirementData?.prodPlannedAt)
  )
    deadlines.push({ date: task.dueDate, label: "delivery" });
  if (kind === "requirement")
    for (const [key, label] of STAGES) {
      const plan = task.requirementData?.[`${key}PlannedAt`];
      if (plan && !task.requirementData?.[`${key}ActualAt`])
        deadlines.push({ date: plan, label });
    }
  const overdue = finished
    ? []
    : deadlines.filter((deadline) => new Date(deadline.date).getTime() < at);
  const soon =
    !finished &&
    deadlines.some(
      (deadline) =>
        new Date(deadline.date).getTime() >= at &&
        new Date(deadline.date).getTime() <=
          (kind === "requirement" ? at + DAY : addBusinessDays(at, 2)),
    );
  const oldest = overdue.length
    ? Math.min(...overdue.map((deadline) => new Date(deadline.date).getTime()))
    : at;
  return {
    ...task,
    risk:
      kind === "requirement" && task.requirementData?.prodActualAt
        ? "launched"
        : finished
          ? task.status === "rejected"
            ? "rejected"
            : "closed"
          : overdue.length
            ? "overdue"
            : soon
              ? "soon"
              : "normal",
    riskDays: Math.max(0, (at - oldest) / DAY),
    overdueStages: overdue.map((deadline) => deadline.label),
    stalledDays:
      !finished && task.enteredAt
        ? Math.max(0, (at - new Date(task.enteredAt).getTime()) / DAY)
        : null,
  };
}
export function monday(at: number) {
  const shifted = new Date(at + 8 * 3600000);
  shifted.setUTCHours(0, 0, 0, 0);
  shifted.setUTCDate(shifted.getUTCDate() - ((shifted.getUTCDay() + 6) % 7));
  return shifted.getTime() - 8 * 3600000;
}
