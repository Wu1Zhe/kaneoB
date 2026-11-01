import { afterEach, expect, it, vi } from "vite-plus/test";
import getPersonalInsightTasks from "./get-personal-insight-tasks";

const request = vi.hoisted(() => vi.fn());
vi.mock("@kaneo/libs", () => ({
  client: { task: { assigned: { insights: { $get: request } } } },
}));
afterEach(() => request.mockReset());

it("loads every personal page rather than using the first 100 tasks for statistics", async () => {
  request
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: [{ id: "one" }], nextCursor: "one" }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: [{ id: "two" }], nextCursor: null }),
    });
  const signal = new AbortController().signal;
  expect(await getPersonalInsightTasks("workspace", signal)).toEqual([
    { id: "one" },
    { id: "two" },
  ]);
  expect(request.mock.calls[1]).toEqual([
    { query: { workspaceId: "workspace", limit: "100", after: "one" } },
    { init: { signal } },
  ]);
});

it("fails on a repeated cursor instead of displaying a partial total", async () => {
  request.mockResolvedValue({
    ok: true,
    json: async () => ({ tasks: [], nextCursor: "same" }),
  });
  await expect(getPersonalInsightTasks("workspace")).rejects.toThrow(
    "Repeated personal task cursor",
  );
});
