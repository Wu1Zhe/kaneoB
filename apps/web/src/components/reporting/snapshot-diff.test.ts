import { describe, expect, it } from "vite-plus/test";
import { snapshotDiff } from "./snapshot-diff";
import { reportFixture, reportTask } from "./report-fixture.test-helper";
describe("snapshot comparison", () => {
  it("identifies added, removed, and changed requirements by identity", () => {
    const before = reportFixture([reportTask(), reportTask({ id: "removed" })]);
    const after = reportFixture([
      reportTask({ status: "uat", statusName: "UAT" }),
      reportTask({ id: "added" }),
    ]);
    const diff = snapshotDiff(before, after);
    expect(diff.added.map((task) => task.id)).toEqual(["added"]);
    expect(diff.removed.map((task) => task.id)).toEqual(["removed"]);
    expect(diff.changed.map((task) => task.id)).toEqual(["req-1"]);
    expect(before.tasks[0]?.status).toBe("dev");
  });
  it("ignores elapsed risk durations without a business-field change", () => {
    expect(
      snapshotDiff(
        reportFixture(),
        reportFixture([reportTask({ riskDays: 9, stalledDays: 5 })]),
      ).changed,
    ).toEqual([]);
  });
});
