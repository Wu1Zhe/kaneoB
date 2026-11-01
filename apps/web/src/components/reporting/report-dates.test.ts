import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { reportBounds, reportPreset, shanghaiDay } from "./report-dates";
afterEach(() => vi.useRealTimers());
describe("report calendar", () => {
  it("uses Shanghai days and includes the selected last day", () => {
    expect(shanghaiDay(new Date("2026-10-31T17:00:00Z").getTime())).toBe(
      "2026-11-01",
    );
    expect(reportBounds("2026-10-26", "2026-11-01")).toEqual({
      since: "2026-10-25T16:00:00.000Z",
      until: "2026-11-01T15:59:59.999Z",
    });
  });
  it("uses Monday-to-Sunday weeks and preserves the end of a full prior week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T07:00:00Z"));
    expect(reportPreset("week")).toEqual({
      start: "2026-10-26",
      end: "2026-11-01",
    });
    expect(reportPreset("lastWeek")).toEqual({
      start: "2026-10-19",
      end: "2026-10-25",
    });
  });
});
