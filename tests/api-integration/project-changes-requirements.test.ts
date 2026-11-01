import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

const since = "2026-10-31T16:00:00.000Z";
const until = "2026-11-01T16:00:00.000Z";

describe("requirements and daily project changes", () => {
  beforeEach(resetTestDatabase);

  it("shows changes made through the normal task APIs for a requirement", async () => {
    const member = await createWorkspaceMember();
    const fixture = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    await db
      .update(schema.projectTable)
      .set({ kind: "requirement" })
      .where(eq(schema.projectTable.id, fixture.project.id));
    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: fixture.project.id,
        title: "Requirement task",
        status: "to-do",
        columnId: fixture.columns.todo.id,
      })
      .returning();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    for (const [path, body] of [
      ["status", { status: "in-progress" }],
      ["requirement", { field: "devPlannedAt", value: "2026-11-03T10:30:00Z" }],
    ] as const) {
      const response = await app.request(`/api/task/${path}/${task!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(200);
    }
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    await vi.waitFor(async () => {
      const response = await app.request(
        `/api/activity/project/${fixture.project.id}/changes?since=${start.toISOString()}&until=${end.toISOString()}`,
      );
      const { data } = await response.json();
      expect(data.map((row: { type: string }) => row.type).sort()).toEqual([
        "requirement_plan_changed",
        "status_changed",
      ]);
      expect(
        data.every((row: { userId: string }) => row.userId === member.user.id),
      ).toBe(true);
    });
  });

  it("defaults existing callers to projects and creates requirements with the same workflow", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    for (const kind of [undefined, "requirement"] as const) {
      const response = await app.request("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: member.workspace.id,
          name: kind ?? "Project",
          slug: kind ?? "PROJ",
          icon: "Folder",
          kind,
        }),
      });
      expect(response.status).toBe(200);
      const project = await response.json();
      expect(project.kind).toBe(kind ?? "project");
      const columns = await db
        .select()
        .from(schema.columnTable)
        .where(eq(schema.columnTable.projectId, project.id));
      expect(columns).toHaveLength(kind === "requirement" ? 11 : 5);
      expect(columns.some((column) => column.isFinal)).toBe(true);
    }
    const list = await app.request(
      `/api/project?workspaceId=${member.workspace.id}`,
    );
    expect(
      (await list.json())
        .map((project: { kind: string }) => project.kind)
        .sort(),
    ).toEqual(["project", "requirement"]);
  });

  it("rejects unknown categories", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const response = await app.request("/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: member.workspace.id,
        name: "Invalid",
        slug: "BAD",
        icon: "Folder",
        kind: "other",
      }),
    });
    expect(response.status).toBe(400);
  });

  it("returns only the five change categories within the selected project's local day", async () => {
    const member = await createWorkspaceMember();
    const project = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    const other = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    const tasks = await db
      .insert(schema.taskTable)
      .values([
        { projectId: project.project.id, title: "Our task", status: "to-do" },
        { projectId: other.project.id, title: "Other task", status: "to-do" },
      ])
      .returning();
    const types = [
      "status_changed",
      "progress_changed",
      "due_date_changed",
      "assignee_changed",
      "unassigned",
      "priority_changed",
    ];
    await db.insert(schema.activityTable).values([
      ...types.map((type, index) => ({
        id: `today-${index}`,
        taskId: tasks[0]!.id,
        type,
        userId: member.user.id,
        createdAt: new Date(Date.parse(since) + index * 1000),
        eventData:
          index === 1 ? null : { oldStatus: "to-do", newStatus: "in-progress" },
        content: index === 1 ? "Legacy progress update" : null,
      })),
      {
        id: "before",
        taskId: tasks[0]!.id,
        type: "status_changed",
        createdAt: new Date(Date.parse(since) - 1),
      },
      {
        id: "tomorrow",
        taskId: tasks[0]!.id,
        type: "status_changed",
        createdAt: new Date(until),
      },
      {
        id: "comment",
        taskId: tasks[0]!.id,
        type: "comment",
        createdAt: new Date(since),
      },
      {
        id: "other-project",
        taskId: tasks[1]!.id,
        type: "status_changed",
        createdAt: new Date(since),
      },
    ]);
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const response = await app.request(
      `/api/activity/project/${project.project.id}/changes?since=${since}&until=${until}`,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.map((row: { id: string }) => row.id)).toEqual([
      "today-5",
      "today-4",
      "today-3",
      "today-2",
      "today-1",
      "today-0",
    ]);
    expect(body.data.at(-1).eventData.oldStatusName).toBe("To Do");
    expect(
      body.data.find((row: { id: string }) => row.id === "today-1").excerpt,
    ).toBe("Legacy progress update");
    expect(body.data.every((row: object) => !("content" in row))).toBe(true);
    expect(body.nextCursor).toBeNull();
  });

  it("paginates changes with identical timestamps without losing or repeating rows", async () => {
    const member = await createWorkspaceMember();
    const project = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    const [task] = await db
      .insert(schema.taskTable)
      .values({ projectId: project.project.id, title: "Task" })
      .returning();
    await db.insert(schema.activityTable).values(
      ["a", "b", "c"].map((id) => ({
        id,
        taskId: task!.id,
        type: "progress_changed",
        createdAt: new Date(since),
      })),
    );
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const url = `/api/activity/project/${project.project.id}/changes?since=${since}&until=${until}&limit=2`;
    const first = await (await app.request(url)).json();
    expect(first.data.map((row: { id: string }) => row.id)).toEqual(["c", "b"]);
    const second = await (
      await app.request(
        `${url}&before=${first.nextCursor.createdAt}&beforeId=${first.nextCursor.id}`,
      )
    ).json();
    expect(second.data.map((row: { id: string }) => row.id)).toEqual(["a"]);
    expect(second.nextCursor).toBeNull();
  });

  it("rejects another workspace and invalid date windows", async () => {
    const member = await createWorkspaceMember();
    const foreign = await createWorkspaceMember();
    const project = await createProjectFixture({
      workspaceId: foreign.workspace.id,
    });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const response = await app.request(
      `/api/activity/project/${project.project.id}/changes?since=${since}&until=${until}`,
    );
    expect([403, 404]).toContain(response.status);
    const own = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    for (const suffix of [
      `since=${since}&until=2026-11-05T16:00:00.000Z`,
      `since=${since}&until=${until}&before=${since}`,
    ]) {
      expect(
        (
          await app.request(
            `/api/activity/project/${own.project.id}/changes?${suffix}`,
          )
        ).status,
      ).toBe(400);
    }
  });
});
