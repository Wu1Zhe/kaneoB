import {
  assessTask,
  DAY,
  monday,
  STAGES,
  asTask,
  taskStateAt,
  type Revision,
  type ReportTask,
  timestamp,
} from "./model";

export function buildReport({
  project,
  revisions,
  columns,
  since,
  until,
  now,
  coverageStart,
  staleDays = 3,
}: {
  project: {
    id: string;
    name: string;
    slug: string;
    kind: "project" | "requirement";
  };
  revisions: Revision[];
  columns: Array<{ slug: string; name: string; isFinal: boolean }>;
  since: number;
  until: number;
  now: number;
  coverageStart: number;
  staleDays?: number;
}) {
  const at = Math.min(until, now);
  const normalizeStatus = (status: string) =>
    project.kind === "requirement" && status === "planned" ? "backlog" : status;
  const stateAt = (time: number) =>
    taskStateAt(revisions, time).map((task) => ({
      ...task,
      status: normalizeStatus(task.status),
      statusName:
        task.status === "planned" && project.kind === "requirement"
          ? "Backlog"
          : task.statusName,
    }));
  const tasks = stateAt(at).map((task) => assessTask(task, project.kind, at));
  const summarize = (items: ReportTask[]) => ({
    total: items.length,
    launched: items.filter((task) => task.requirementData?.prodActualAt).length,
    overdue: items.filter((task) => task.risk === "overdue").length,
  });
  const startCounts =
    since >= coverageStart
      ? summarize(
          stateAt(since).map((task) => assessTask(task, project.kind, since)),
        )
      : null;
  const flow = new Map(
    columns.map((column) => [
      column.slug,
      {
        ...column,
        count: 0,
        inflow: 0,
        outflow: 0,
        averageDays: null as number | null,
        stalled: 0,
      },
    ]),
  );
  for (const task of tasks) {
    if (!flow.has(task.status))
      flow.set(task.status, {
        slug: task.status,
        name: task.statusName,
        isFinal: task.isFinal,
        count: 0,
        inflow: 0,
        outflow: 0,
        averageDays: null,
        stalled: 0,
      });
    const row = flow.get(task.status)!;
    row.count++;
    if ((task.stalledDays ?? 0) > staleDays) row.stalled++;
  }
  const previous = new Map<string, string>();
  for (const revision of revisions) {
    const old = previous.get(revision.taskId);
    const status = normalizeStatus(String(revision.data.status));
    if (revision.operation === "delete") {
      previous.delete(revision.taskId);
      continue;
    }
    if (
      revision.recordedAt.getTime() >= since &&
      revision.recordedAt.getTime() <= at &&
      revision.operation !== "baseline" &&
      old !== status
    ) {
      if (old && flow.has(old)) flow.get(old)!.outflow++;
      if (flow.has(status)) flow.get(status)!.inflow++;
    }
    previous.set(revision.taskId, status);
  }
  for (const row of flow.values()) {
    const elapsed = tasks
      .filter((task) => task.status === row.slug && task.enteredAt)
      .map((task) => (at - new Date(task.enteredAt!).getTime()) / DAY);
    row.averageDays = elapsed.length
      ? elapsed.reduce((sum, value) => sum + value, 0) / elapsed.length
      : null;
  }
  // Use the effective actual dates known at this report's cutoff. A later
  // correction moves a completion between weeks instead of counting it twice.
  // Frozen snapshots retain their original values.
  const effective = new Map<string, Record<string, unknown>>();
  for (const revision of revisions) {
    if (revision.recordedAt.getTime() > at) break;
    effective.set(revision.taskId, revision.data);
  }
  const completionDates = (field: string) =>
    [...effective.values()].flatMap((data) => {
      const actual = timestamp(
        (data.requirementData as Record<string, unknown> | null)?.[field],
      );
      return actual ? [new Date(actual).getTime()] : [];
    });
  const pirunDates = completionDates("pirunActualAt");
  const prodDates = completionDates("prodActualAt");
  const weekly = Array.from({ length: 12 }, (_, index) => {
    const start = monday(at) - (11 - index) * 7 * DAY;
    const end = Math.min(start + 7 * DAY - 1, at);
    const available = end >= coverageStart;
    const partial = start < coverageStart && available;
    const periodTasks = available
      ? stateAt(end).map((task) => assessTask(task, project.kind, end))
      : [];
    const created = new Map<string, ReportTask>();
    for (const revision of revisions) {
      if (revision.recordedAt.getTime() > end) break;
      if (
        revision.operation === "insert" &&
        revision.recordedAt.getTime() >= Math.max(start, coverageStart)
      )
        created.set(revision.taskId, revision.data as ReportTask);
    }
    const inWeek = (date: number) =>
      date >= Math.max(start, coverageStart) && date <= end;
    const composition: Record<string, Record<string, number>> = {};
    for (const task of created.values()) {
      const type = task.requirementData?.type || "__unset__";
      const category = task.requirementData?.category || "__unset__";
      composition[type] ??= {};
      composition[type]![category] = (composition[type]![category] ?? 0) + 1;
    }
    return {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      available,
      partial,
      created: available ? created.size : null,
      pirun: available ? pirunDates.filter(inWeek).length : null,
      prod: available ? prodDates.filter(inWeek).length : null,
      launched: available
        ? prodDates.filter((date) => date <= end).length
        : null,
      unlaunched: available
        ? periodTasks.filter(
            (task) => !task.requirementData?.prodActualAt && !task.isFinal,
          ).length
        : null,
      overdue: available
        ? periodTasks.filter((task) => task.risk === "overdue").length
        : null,
      composition,
      createdTasks: [...created.values()].map((task) =>
        assessTask(
          asTask(task as unknown as Record<string, unknown>, null),
          project.kind,
          end,
        ),
      ),
    };
  });
  const categories: Record<string, Record<string, number>> = {};
  for (const task of tasks) {
    const category = task.requirementData?.category || "__unset__";
    categories[category] ??= {};
    categories[category]![task.status] =
      (categories[category]![task.status] ?? 0) + 1;
  }
  return {
    project,
    since: new Date(since).toISOString(),
    until: new Date(until).toISOString(),
    asOf: new Date(at).toISOString(),
    coverageStart: new Date(coverageStart).toISOString(),
    historyComplete: since >= coverageStart,
    tasks,
    counts: summarize(tasks),
    startCounts,
    states: [...flow.values()].map((row) => ({
      ...row,
      startCount:
        since >= coverageStart
          ? stateAt(since).filter((task) => task.status === row.slug).length
          : null,
    })),
    weekly,
    categories,
    nodes: STAGES.map(([key, label]) => ({
      id: key,
      label,
      count: tasks.filter((task) => task.overdueStages.includes(label)).length,
    })),
    version: 1,
    settings: { staleDays },
  };
}
