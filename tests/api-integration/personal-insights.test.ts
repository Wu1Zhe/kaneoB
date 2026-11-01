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

const since = "2026-10-31T16:00:00.000Z";
const until = "2026-11-01T16:00:00.000Z";

describe("personal task insights", () => {
  beforeEach(resetTestDatabase);

  it("includes my completed and planned requirement tasks, excluding other people and workspaces", async () => {
    const member = await createWorkspaceMember();
    const other = await createWorkspaceMember();
    const project = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    const requirement = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    const foreign = await createProjectFixture({
      workspaceId: other.workspace.id,
    });
    await db
      .update(schema.projectTable)
      .set({ kind: "requirement" })
      .where(eq(schema.projectTable.id, requirement.project.id));
    await db.insert(schema.taskTable).values([
      {
        id: "mine-open",
        number: 1,
        projectId: project.project.id,
        title: "My open task",
        userId: member.user.id,
        status: "to-do",
        columnId: project.columns.todo.id,
      },
      {
        id: "mine-done",
        number: 2,
        projectId: project.project.id,
        title: "My completed task",
        userId: member.user.id,
        status: "done",
        columnId: project.columns.done.id,
      },
      {
        id: "mine-planned",
        projectId: requirement.project.id,
        title: "My planned requirement",
        userId: member.user.id,
        status: "planned",
      },
      {
        id: "other-person",
        number: 3,
        projectId: project.project.id,
        title: "Other task",
        userId: other.user.id,
      },
      {
        id: "other-workspace",
        projectId: foreign.project.id,
        title: "Other workspace",
        userId: member.user.id,
      },
    ]);
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const response = await app.request(
      `/api/task/assigned/insights?workspaceId=${member.workspace.id}&userId=${other.user.id}`,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tasks.map((task: { id: string }) => task.id)).toEqual([
      "mine-done",
      "mine-open",
      "mine-planned",
    ]);
    expect(body.tasks[0]).toMatchObject({
      isFinal: true,
      statusName: "Done",
      assigneeName: member.user.name,
    });
    expect(body.tasks[1].isFinal).toBe(false);
    expect(body.nextCursor).toBeNull();
  });

  it("enforces project grants and excludes archived projects", async () => {
    const member = await createWorkspaceMember();
    const visible = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    const hidden = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    const archived = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    await db.insert(schema.workspaceMemberAccessTable).values({
      workspaceId: member.workspace.id,
      userId: member.user.id,
      projectAccess: "selected",
    });
    await db.insert(schema.workspaceMemberProjectTable).values({
      workspaceId: member.workspace.id,
      userId: member.user.id,
      projectId: visible.project.id,
    });
    await db
      .update(schema.projectTable)
      .set({ archivedAt: new Date() })
      .where(eq(schema.projectTable.id, archived.project.id));
    for (const fixture of [visible, hidden, archived]) {
      const [task] = await db
        .insert(schema.taskTable)
        .values({
          projectId: fixture.project.id,
          title: fixture.project.id,
          userId: member.user.id,
        })
        .returning();
      await db.insert(schema.activityTable).values({
        taskId: task!.id,
        type: "progress_changed",
        createdAt: new Date(since),
        eventData: { oldProgress: 0, newProgress: 10 },
      });
    }
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const tasks = await (
      await app.request(
        `/api/task/assigned/insights?workspaceId=${member.workspace.id}`,
      )
    ).json();
    expect(
      tasks.tasks.map((task: { projectId: string }) => task.projectId),
    ).toEqual([visible.project.id]);
    const changes = await (
      await app.request(
        `/api/activity/workspace/${member.workspace.id}/my-changes?since=${since}&until=${until}`,
      )
    ).json();
    expect(
      changes.data.map((change: { projectId: string }) => change.projectId),
    ).toEqual([visible.project.id]);
  });

  it("paginates the whole personal task set beyond the ordinary 100-task list", async () => {
    const member = await createWorkspaceMember();
    const project = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    await db.insert(schema.taskTable).values(
      Array.from({ length: 105 }, (_, index) => ({
        id: `personal-${String(index).padStart(3, "0")}`,
        number: index + 1,
        projectId: project.project.id,
        title: `Task ${index}`,
        userId: member.user.id,
      })),
    );
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const first = await (
      await app.request(
        `/api/task/assigned/insights?workspaceId=${member.workspace.id}`,
      )
    ).json();
    expect(first.tasks).toHaveLength(100);
    const last = await (
      await app.request(
        `/api/task/assigned/insights?workspaceId=${member.workspace.id}&after=${first.nextCursor}`,
      )
    ).json();
    expect(last.tasks).toHaveLength(5);
    expect(
      new Set(
        [...first.tasks, ...last.tasks].map((task: { id: string }) => task.id),
      ).size,
    ).toBe(105);
    expect(last.nextCursor).toBeNull();
  });

  it("shows five change categories on my tasks, including changes by another person, within today only", async () => {
    const member = await createWorkspaceMember();
    const other = await createWorkspaceMember();
    const project = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    const [mine, theirs] = await db
      .insert(schema.taskTable)
      .values([
        {
          projectId: project.project.id,
          title: "Mine",
          number: 1,
          userId: member.user.id,
        },
        {
          projectId: project.project.id,
          title: "Theirs",
          number: 2,
          userId: other.user.id,
        },
      ])
      .returning();
    const types = [
      "status_changed",
      "progress_changed",
      "due_date_changed",
      "assignee_changed",
      "priority_changed",
    ];
    await db.insert(schema.activityTable).values([
      ...types.map((type, index) => ({
        id: `mine-${index}`,
        taskId: mine!.id,
        type,
        userId: other.user.id,
        createdAt: new Date(since),
      })),
      {
        taskId: theirs!.id,
        type: "status_changed",
        userId: member.user.id,
        createdAt: new Date(since),
      },
      { taskId: mine!.id, type: "comment", createdAt: new Date(since) },
      {
        taskId: mine!.id,
        type: "status_changed",
        createdAt: new Date(until),
      },
    ]);
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const base = `/api/activity/workspace/${member.workspace.id}/my-changes?since=${since}&until=${until}&limit=2`;
    const all: Array<{ id: string; taskId: string; userId: string }> = [];
    let cursor = "";
    do {
      const response = await app.request(base + cursor);
      expect(response.status).toBe(200);
      const page = await response.json();
      all.push(...page.data);
      cursor = page.nextCursor
        ? `&before=${page.nextCursor.createdAt}&beforeId=${page.nextCursor.id}`
        : "";
    } while (cursor);
    expect(all.map((change) => change.id)).toEqual([
      "mine-4",
      "mine-3",
      "mine-2",
      "mine-1",
      "mine-0",
    ]);
    expect(
      all.every(
        (change) =>
          change.taskId === mine!.id && change.userId === other.user.id,
      ),
    ).toBe(true);
  });

  it("denies another workspace on both personal endpoints", async () => {
    const member = await createWorkspaceMember();
    const other = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    for (const path of [
      `/api/task/assigned/insights?workspaceId=${other.workspace.id}`,
      `/api/activity/workspace/${other.workspace.id}/my-changes?since=${since}&until=${until}`,
    ]) {
      expect([403, 404]).toContain((await app.request(path)).status);
    }
  });
});
