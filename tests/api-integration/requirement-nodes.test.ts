import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

async function fixture(kind: "project" | "requirement" = "requirement") {
  const member = await createWorkspaceMember();
  const project = await createProjectFixture({
    workspaceId: member.workspace.id,
  });
  await db
    .update(schema.projectTable)
    .set({ kind })
    .where(eq(schema.projectTable.id, project.project.id));
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: project.project.id,
      title: "Delivery",
      columnId: project.columns.todo.id,
      status: "to-do",
      userId: member.user.id,
    })
    .returning();
  mockAuthenticatedSession(member.user);
  return { ...member, ...project, task: task!, app: createApp().app };
}
const put = (
  app: ReturnType<typeof createApp>["app"],
  path: string,
  body: unknown,
) =>
  app.request(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("requirement node tracking", () => {
  beforeEach(resetTestDatabase);

  it("rejects requirement parent-child links in both directions, preserving project links and ordinary relations", async () => {
    const f = await fixture();
    const project = await createProjectFixture({ workspaceId: f.workspace.id });
    const tasks = await db
      .insert(schema.taskTable)
      .values(
        [1, 2].map((number) => ({
          projectId: project.project.id,
          title: `Task ${number}`,
          number,
        })),
      )
      .returning();
    const link = (
      sourceTaskId: string,
      targetTaskId: string,
      relationType: string,
    ) =>
      f.app.request("/api/task-relation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceTaskId, targetTaskId, relationType }),
      });
    expect((await link(f.task.id, tasks[0]!.id, "subtask")).status).toBe(400);
    expect((await link(tasks[0]!.id, f.task.id, "subtask")).status).toBe(400);
    expect((await link(tasks[0]!.id, tasks[1]!.id, "subtask")).status).toBe(
      200,
    );
    expect((await link(f.task.id, tasks[0]!.id, "blocks")).status).toBe(200);
    expect((await link(f.task.id, tasks[1]!.id, "related")).status).toBe(200);
  });

  it("stores all six stages and keeps personal details off public board responses", async () => {
    const f = await fixture();
    await db
      .update(schema.projectTable)
      .set({ isPublic: true })
      .where(eq(schema.projectTable.id, f.project.id));
    for (const stage of [
      "design",
      "dev",
      "crossTest",
      "uat",
      "pirun",
      "prod",
    ]) {
      for (const [suffix, value] of [
        ["PlannedAt", "2026-11-02T10:30:00Z"],
        ["ActualAt", "2026-11-02T10:17:00Z"],
      ]) {
        expect(
          (
            await put(f.app, `/api/task/requirement/${f.task.id}`, {
              field: `${stage}${suffix}`,
              value,
            })
          ).status,
        ).toBe(200);
      }
    }
    const publicBoard = await f.app.request(
      `/api/public-project/${f.project.id}`,
    );
    expect(publicBoard.status).toBe(200);
    expect(
      (await publicBoard.json()).columns.flatMap(
        (column: { tasks: { requirementData: unknown }[] }) => column.tasks,
      )[0].requirementData,
    ).toBeNull();
  });

  it("saves plans, minute-precise actuals, text and clearing with atomic history and no duplicate no-op history", async () => {
    const f = await fixture();
    const path = `/api/task/requirement/${f.task.id}`;
    for (const [field, value] of [
      ["devPlannedAt", "2026-11-02T10:30:00Z"],
      ["devActualAt", "2026-11-02T10:17:00Z"],
      ["contact", "External contact"],
      ["devActualAt", null],
      ["devActualAt", null],
    ] as const) {
      expect((await put(f.app, path, { field, value })).status).toBe(200);
    }
    const task = await f.app.request(`/api/task/${f.task.id}`);
    expect((await task.json()).requirementData).toEqual({
      devPlannedAt: "2026-11-02T10:30:00.000Z",
      devActualAt: null,
      contact: "External contact",
    });
    const activities = await db
      .select()
      .from(schema.activityTable)
      .where(eq(schema.activityTable.taskId, f.task.id));
    expect(activities).toHaveLength(4);
    expect(
      activities.find(
        (row) => (row.eventData as { newValue?: unknown })?.newValue === null,
      )?.eventData,
    ).toMatchObject({
      oldValue: "2026-11-02T10:17:00.000Z",
      field: "devActualAt",
    });
    const board = await f.app.request(`/api/task/tasks/${f.project.id}`);
    expect(
      (await board.json()).data.columns.flatMap(
        (column: { tasks: unknown[] }) => column.tasks,
      )[0],
    ).toMatchObject({
      projectKind: "requirement",
      requirementData: { contact: "External contact" },
    });
    const personal = await f.app.request(
      `/api/task/assigned/insights?workspaceId=${f.workspace.id}`,
    );
    expect((await personal.json()).tasks[0]).toMatchObject({
      projectKind: "requirement",
      requirementData: { devActualAt: null },
    });
  });

  it("preserves concurrent updates to different fields", async () => {
    const f = await fixture();
    const responses = await Promise.all([
      put(f.app, `/api/task/requirement/${f.task.id}`, {
        field: "department",
        value: "MFG",
      }),
      put(f.app, `/api/task/requirement/${f.task.id}`, {
        field: "contact",
        value: "Partner",
      }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const row = await db.query.taskTable.findFirst({
      where: eq(schema.taskTable.id, f.task.id),
    });
    expect(row?.requirementData).toMatchObject({
      department: "MFG",
      contact: "Partner",
    });
  });

  it("rejects invalid fields and non-half-hour plans", async () => {
    const f = await fixture();
    for (const body of [
      { field: "devPlannedAt", value: "2026-11-02T10:17:00Z" },
      { field: "planProvidedAt", value: "bad" },
      { field: "bogus", value: "text" },
    ])
      expect(
        (await put(f.app, `/api/task/requirement/${f.task.id}`, body)).status,
      ).toBe(400);
    expect(await db.select().from(schema.activityTable)).toHaveLength(0);
  });

  it("keeps project tracking available and rejects requirement metadata on a project", async () => {
    const f = await fixture("project");
    expect(
      (
        await put(f.app, `/api/task/requirement/${f.task.id}`, {
          field: "contact",
          value: "Partner",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await put(f.app, `/api/task/tracking/${f.task.id}`, {
          progress: 60,
          weight: 2,
        })
      ).status,
    ).toBe(200);
  });

  it("rejects requirement progress and weight but retains overall actual dates", async () => {
    const f = await fixture();
    for (const body of [{ progress: 30 }, { weight: 2 }])
      expect(
        (await put(f.app, `/api/task/tracking/${f.task.id}`, body)).status,
      ).toBe(400);
    expect(
      (
        await put(f.app, `/api/task/tracking/${f.task.id}`, {
          actualStartAt: "2026-11-01T10:17:00Z",
        })
      ).status,
    ).toBe(200);
  });

  it("denies a caller from another workspace", async () => {
    const f = await fixture();
    const outsider = await createWorkspaceMember();
    mockAuthenticatedSession(outsider.user);
    expect(
      (
        await put(f.app, `/api/task/requirement/${f.task.id}`, {
          field: "department",
          value: "Other",
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await db.query.taskTable.findFirst({
          where: eq(schema.taskTable.id, f.task.id),
        })
      )?.requirementData,
    ).toEqual(f.task.requirementData);
  });

  it("shows requirement node changes today and excludes old progress events", async () => {
    const f = await fixture();
    await db
      .insert(schema.activityTable)
      .values({ taskId: f.task.id, type: "progress_changed" });
    await put(f.app, `/api/task/requirement/${f.task.id}`, {
      field: "designPlannedAt",
      value: "2026-11-02T10:30:00Z",
    });
    await put(f.app, `/api/task/requirement/${f.task.id}`, {
      field: "designActualAt",
      value: "2026-11-02T10:17:00Z",
    });
    const since = new Date(Date.now() - 60_000).toISOString();
    const until = new Date(Date.now() + 60_000).toISOString();
    const response = await f.app.request(
      `/api/activity/project/${f.project.id}/changes?since=${since}&until=${until}`,
    );
    expect(
      (await response.json()).data
        .map((row: { type: string }) => row.type)
        .sort(),
    ).toEqual(["requirement_actual_changed", "requirement_plan_changed"]);
  });
});
