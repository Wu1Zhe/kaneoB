import { describe, expect, it } from "vite-plus/test";
import { buildReport } from "./build-report";
import {
  addBusinessDays,
  asTask,
  assessTask,
  monday,
  taskStateAt,
  type Revision,
} from "./model";
const time = (value: string) => new Date(value).getTime();
const data = (overrides: Record<string, unknown> = {}) => ({
  id: "one",
  projectId: "collection",
  number: 1,
  title: "Example",
  description: "Details",
  status: "dev",
  statusName: "Dev",
  isFinal: false,
  priority: "medium",
  progress: 0,
  weight: 1,
  userId: null,
  assigneeName: null,
  creatorName: null,
  updaterName: null,
  createdAt: "2026-10-15T00:00:00Z",
  updatedAt: "2026-10-15T00:00:00Z",
  requirementData: {},
  ...overrides,
});
const revision = (
  id: number,
  operation: string,
  at: string,
  values = data(),
): Revision => ({
  id,
  operation,
  taskId: "one",
  recordedAt: new Date(at),
  data: values,
});
const report = (revisions: Revision[]) =>
  buildReport({
    project: {
      id: "collection",
      name: "Requests",
      slug: "REQ",
      kind: "requirement",
    },
    revisions,
    columns: [{ slug: "dev", name: "Dev", isFinal: false }],
    since: time("2026-10-12T00:00:00Z"),
    until: time("2026-11-01T12:00:00Z"),
    now: time("2026-11-01T12:00:00Z"),
    coverageStart: time("2026-10-15T00:00:00Z"),
  });

describe("dashboard historical calculations", () => {
  it("uses Shanghai weekdays without shifting an overdue deadline", () => {
    const friday = time("2026-10-30T09:00:00+08:00");
    expect(addBusinessDays(friday, 2)).toBe(time("2026-11-03T09:00:00+08:00"));
    expect(monday(time("2026-11-01T20:00:00Z"))).toBe(
      time("2026-11-02T00:00:00+08:00"),
    );
    const task = assessTask(
      asTask(data({ dueDate: "2026-10-31T00:00:00Z" }), null),
      "project",
      time("2026-11-01T12:00:00Z"),
    );
    expect(task.risk).toBe("overdue");
  });
  it("keeps baseline dwell unknown and carries an actual state-entry time across later edits", () => {
    const initial = revision(1, "baseline", "2026-10-15T00:00:00Z");
    const edit = revision(
      2,
      "update",
      "2026-10-16T00:00:00Z",
      data({ title: "Changed" }),
    );
    expect(
      taskStateAt([initial, edit], time("2026-10-17T00:00:00Z"))[0]?.enteredAt,
    ).toBeNull();
    const seeded = revision(
      3,
      "update",
      "2026-10-20T00:00:00Z",
      data({ statusEnteredAt: "2026-10-18T00:00:00Z" }),
    );
    expect(
      taskStateAt([seeded], time("2026-10-21T00:00:00Z"))[0]?.enteredAt,
    ).toBe("2026-10-18T00:00:00.000Z");
  });
  it("marks missing history unavailable and counts a corrected completion in its effective week once", () => {
    const revisions = [
      revision(1, "insert", "2026-10-15T00:00:00Z"),
      revision(
        2,
        "update",
        "2026-10-20T00:00:00Z",
        data({ requirementData: { prodActualAt: "2026-10-20T00:00:00Z" } }),
      ),
      revision(
        3,
        "update",
        "2026-10-29T00:00:00Z",
        data({ requirementData: { prodActualAt: "2026-10-28T00:00:00Z" } }),
      ),
    ];
    const result = report(revisions);
    expect(result.startCounts).toBeNull();
    expect(result.weekly[0]?.created).toBeNull();
    expect(result.weekly.reduce((sum, week) => sum + (week.prod ?? 0), 0)).toBe(
      1,
    );
    expect(result.weekly.at(-2)?.prod).toBe(0);
    expect(result.weekly.at(-1)?.prod).toBe(1);
    expect(result.weekly.at(-1)?.launched).toBe(1);
  });
  it("deduplicates requirements with multiple overdue nodes and excludes launched items", () => {
    const source = asTask(
      data({
        requirementData: {
          devPlannedAt: "2026-10-20T00:00:00Z",
          uatPlannedAt: "2026-10-22T00:00:00Z",
        },
      }),
      null,
    );
    const task = assessTask(
      source,
      "requirement",
      time("2026-11-01T00:00:00Z"),
    );
    expect(task.risk).toBe("overdue");
    expect(task.overdueStages).toEqual(["Dev", "UAT"]);
    expect(
      assessTask(
        {
          ...source,
          requirementData: {
            ...source.requirementData,
            prodActualAt: "2026-10-29T00:00:00Z",
          },
        },
        "requirement",
        time("2026-11-01T00:00:00Z"),
      ).overdueStages,
    ).toEqual([]);
  });
});
