import { describe, expect, it } from "vite-plus/test";
import {
  getOverdueEntries,
  summarizeTasks,
} from "@/components/project/insights/insights-data";
import type Task from "@/types/task";
import { stageTiming } from "./requirement-fields";

const task: Task = {
  title: "Requirement",
  number: 1,
  description: null,
  priority: "medium",
  startDate: null,
  position: 0,
  createdAt: "2026-11-01T00:00:00Z",
  userId: null,
  assigneeId: null,
  assigneeName: null,
  projectId: "requirements",
  id: "req",
  projectKind: "requirement",
  status: "todo",
  dueDate: "2026-11-01T10:00:00Z",
  requirementData: {
    designPlannedAt: "2026-11-01T09:00:00Z",
    designActualAt: "2026-11-01T09:17:00Z",
    devPlannedAt: "2026-11-01T10:30:00Z",
    crossTestPlannedAt: "2026-11-02T10:30:00Z",
  },
};
const columns = [
  { slug: "todo", name: "Todo", isFinal: false },
  { slug: "done", name: "Done", isFinal: true },
];
const now = new Date("2026-11-01T11:00:00Z");
describe("requirement milestone deadlines", () => {
  it("alerts for unfinished nodes and delivery independently, counting each requirement once in statistics", () => {
    expect(
      getOverdueEntries([task], columns, "overdue", now).map(
        (entry) => entry.stage?.id ?? "overall",
      ),
    ).toEqual(["overall", "dev"]);
    expect(
      getOverdueEntries([task], columns, "soon", now).map(
        (entry) => entry.stage?.id,
      ),
    ).toEqual(["crossTest"]);
    expect(summarizeTasks([task], columns, now).overdue).toBe(1);
  });
  it("ignores requirement fields on ordinary projects and finished requirements", () => {
    expect(
      getOverdueEntries(
        [{ ...task, projectKind: "project" }],
        columns,
        "overdue",
        now,
      ),
    ).toHaveLength(1);
    expect(
      getOverdueEntries([{ ...task, status: "done" }], columns, "overdue", now),
    ).toHaveLength(0);
  });
  it("compares actual completion independently of the current date", () => {
    expect(stageTiming("2026-11-01T10:30:00Z", "2026-11-01T10:17:00Z")).toBe(
      "onTime",
    );
    expect(stageTiming("2026-11-01T10:30:00Z", "2026-11-01T10:47:00Z")).toBe(
      "late",
    );
  });
});
