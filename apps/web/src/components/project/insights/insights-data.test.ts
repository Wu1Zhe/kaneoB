import { describe, expect, it } from "vite-plus/test";
import type Task from "@/types/task";
import {
  buildPeopleTable,
  buildStatusCounts,
  buildTrend,
  getOverdueEntries,
  summarizeTasks,
  UNASSIGNED_KEY,
  type InsightColumn,
} from "./insights-data";

const columns: InsightColumn[] = [
  { slug: "to-do", name: "To Do", isFinal: false },
  { slug: "in-progress", name: "In Progress", isFinal: false },
  { slug: "done", name: "Done", isFinal: true },
];

const now = new Date(2026, 9, 14, 12);

function task(overrides: Partial<Task>): Task {
  return {
    id: "t",
    title: "Task",
    number: 1,
    description: null,
    status: "to-do",
    priority: "low",
    startDate: null,
    dueDate: null,
    position: 0,
    createdAt: new Date(2026, 9, 14, 8).toISOString(),
    userId: null,
    assigneeId: null,
    assigneeName: null,
    projectId: "p",
    ...overrides,
  };
}

describe("getOverdueEntries", () => {
  it("keeps open overdue tasks and sorts by priority, then lateness", () => {
    const entries = getOverdueEntries(
      [
        task({
          id: "low-late",
          priority: "low",
          dueDate: new Date(2026, 9, 10).toISOString(),
        }),
        task({
          id: "high-recent",
          priority: "high",
          dueDate: new Date(2026, 9, 14, 9).toISOString(),
        }),
        task({
          id: "high-late",
          priority: "high",
          dueDate: new Date(2026, 9, 11).toISOString(),
        }),
        task({
          id: "done",
          status: "done",
          priority: "urgent",
          dueDate: new Date(2026, 9, 10).toISOString(),
        }),
      ],
      columns,
      "overdue",
      now,
    );

    expect(entries.map((entry) => entry.task.id)).toEqual([
      "high-late",
      "high-recent",
      "low-late",
    ]);
  });

  it("limits the soon band to the next 24 hours and sorts soonest first", () => {
    const entries = getOverdueEntries(
      [
        task({
          id: "tomorrow",
          dueDate: new Date(2026, 9, 15, 9).toISOString(),
        }),
        task({ id: "in-2h", dueDate: new Date(2026, 9, 14, 14).toISOString() }),
        task({ id: "next-week", dueDate: new Date(2026, 9, 20).toISOString() }),
        task({ id: "late", dueDate: new Date(2026, 9, 13).toISOString() }),
      ],
      columns,
      "soon",
      now,
    );

    expect(entries.map((entry) => entry.task.id)).toEqual([
      "in-2h",
      "tomorrow",
    ]);
  });
});

describe("buildPeopleTable", () => {
  it("counts each status per person and keeps unassigned last", () => {
    const rows = buildPeopleTable(
      [
        task({ id: "1", userId: "u1", assigneeName: "Ada", status: "to-do" }),
        task({ id: "2", userId: "u1", assigneeName: "Ada", status: "done" }),
        task({ id: "3", userId: "u1", assigneeName: "Ada", status: "to-do" }),
        task({ id: "4", userId: null, assigneeName: null }),
      ],
      columns,
    );

    expect(rows[0]).toMatchObject({
      key: "u1",
      name: "Ada",
      counts: { "to-do": 2, done: 1 },
      total: 3,
    });
    expect(rows[1]).toMatchObject({ key: UNASSIGNED_KEY, total: 1 });
  });

  it("sorts each person's tasks by column order, then title", () => {
    const rows = buildPeopleTable(
      [
        task({ id: "done", userId: "u1", assigneeName: "Ada", status: "done" }),
        task({
          id: "progress-b",
          userId: "u1",
          assigneeName: "Ada",
          status: "in-progress",
          title: "B task",
        }),
        task({
          id: "todo",
          userId: "u1",
          assigneeName: "Ada",
          status: "to-do",
          title: "A task",
        }),
        task({
          id: "progress-a",
          userId: "u1",
          assigneeName: "Ada",
          status: "in-progress",
          title: "A task",
        }),
      ],
      columns,
    );

    expect(rows[0].tasks.map((entry) => entry.id)).toEqual([
      "todo",
      "progress-a",
      "progress-b",
      "done",
    ]);
  });
});

describe("buildStatusCounts and summarizeTasks", () => {
  const tasks = [
    task({ id: "1", status: "to-do" }),
    task({
      id: "2",
      status: "to-do",
      dueDate: new Date(2026, 9, 13).toISOString(),
    }),
    task({ id: "3", status: "done" }),
    task({ id: "4", status: "in-progress" }),
  ];

  it("counts tasks per column", () => {
    expect(
      buildStatusCounts(tasks, columns).map((status) => status.count),
    ).toEqual([2, 1, 1]);
  });

  it("computes completion and overdue rates over all tasks", () => {
    expect(summarizeTasks(tasks, columns, now)).toEqual({
      total: 4,
      completed: 1,
      completionRate: 0.25,
      overdue: 1,
      overdueRate: 0.25,
    });
  });
});

describe("buildTrend", () => {
  it("buckets created and completed tasks per day", () => {
    const points = buildTrend(
      [
        task({ id: "1", createdAt: new Date(2026, 9, 13, 9).toISOString() }),
        task({ id: "2", createdAt: new Date(2026, 9, 14, 9).toISOString() }),
        task({
          id: "3",
          status: "done",
          createdAt: new Date(2026, 9, 10, 9).toISOString(),
          actualEndAt: new Date(2026, 9, 14, 10).toISOString(),
        }),
      ],
      columns,
      7,
      now,
    );

    expect(points).toHaveLength(7);
    expect(points[6]).toMatchObject({ created: 1, completed: 1 });
    expect(points[5]).toMatchObject({ created: 1, completed: 0 });
  });
});
