import { describe, expect, it } from "vite-plus/test";
import type { PersonalInsightTask } from "@/fetchers/task/get-personal-insight-tasks";
import {
  buildPeopleTable,
  buildStatusCounts,
  collectInsightTasks,
  getInsightColumns,
  getOverdueEntries,
  summarizeTasks,
} from "@/components/project/insights/insights-data";
import { personalInsightModel } from "./personal-insight-model";

function task(overrides: Partial<PersonalInsightTask>): PersonalInsightTask {
  return {
    id: "task",
    projectId: "project",
    title: "My task",
    number: 1,
    status: "custom",
    statusName: "Review",
    isFinal: false,
    priority: "low",
    dueDate: "2026-11-01T00:00:00.000Z",
    startDate: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    actualEndAt: null,
    progress: 0,
    userId: "me",
    assigneeName: "Me",
    assigneeImage: null,
    projectName: "Project",
    projectSlug: "P",
    ...overrides,
  };
}

describe("personal insight model", () => {
  it("keeps different projects' completion rules separate without changing editable task statuses", () => {
    const open = task({ id: "open" });
    const done = task({ id: "done", projectId: "requirement", isFinal: true });
    const model = personalInsightModel("workspace", [open, done, open]);
    const tasks = collectInsightTasks(model);
    const columns = getInsightColumns(model);
    expect(tasks.map((entry) => entry.status)).toEqual(["custom", "custom"]);
    expect(columns).toHaveLength(2);
    expect(
      buildStatusCounts(tasks, columns).map((entry) => entry.count),
    ).toEqual([1, 1]);
    const now = new Date("2026-11-01T12:00:00.000Z");
    expect(summarizeTasks(tasks, columns, now)).toMatchObject({
      total: 2,
      completed: 1,
      overdue: 1,
      completionRate: 0.5,
    });
    expect(
      getOverdueEntries(tasks, columns, "overdue", now).map(
        (entry) => entry.task.id,
      ),
    ).toEqual(["open"]);
    expect(buildPeopleTable(tasks, columns)).toMatchObject([
      { key: "me", name: "Me", total: 2 },
    ]);
    expect(open.status).toBe("custom");
  });

  it("merges equivalent statuses, translates backlog labels and keeps an empty personal overview valid", () => {
    const model = personalInsightModel(
      "workspace",
      [
        task({ id: "one" }),
        task({ id: "two", projectId: "other" }),
        task({ id: "planned", status: "planned", statusName: null }),
      ],
      { planned: "已计划", archived: "已归档" },
    );
    expect(
      model.columns.map((column) => [column.name, column.tasks.length]),
    ).toEqual([
      ["Review", 2],
      ["已计划", 1],
    ]);
    const empty = personalInsightModel("workspace", []);
    expect(
      summarizeTasks(collectInsightTasks(empty), getInsightColumns(empty)),
    ).toMatchObject({ total: 0, completionRate: 0, overdueRate: 0 });
  });
});
