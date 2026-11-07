import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
const headers = { "Content-Type": "application/json" };
async function context() {
  const member = await createWorkspaceMember();
  const other = await createWorkspaceMember();
  await db.insert(schema.workspaceUserTable).values({
    workspaceId: member.workspace.id,
    userId: other.user.id,
    role: "member",
    joinedAt: new Date(),
  });
  const fixture = await createProjectFixture({
    workspaceId: member.workspace.id,
  });
  mockAuthenticatedSession(member.user);
  return { ...member, other, ...fixture, app: createApp().app };
}
describe("API integration: collaboration, portal and update history", () => {
  beforeEach(resetTestDatabase);
  it("allows members to assign a primary owner and collaborators, deduplicates and includes collaboration in My tasks", async () => {
    const c = await context();
    const response = await c.app.request(`/api/task/${c.project.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Shared delivery",
        description: "",
        status: "to-do",
        priority: "medium",
        userId: c.other.user.id,
        collaboratorIds: [c.user.id, c.user.id, c.other.user.id],
      }),
    });
    expect(response.status).toBe(200);
    const task = await response.json();
    expect(task.collaboratorIds).toEqual([c.user.id]);
    const mine = await c.app.request(
      `/api/task/assigned?workspaceId=${c.workspace.id}`,
    );
    const result = await mine.json();
    expect(result.total).toBe(1);
    expect(result.tasks[0].involvement).toBe("collaborator");
    const outsider = await createWorkspaceMember();
    const denied = await c.app.request(
      `/api/task-extra/${task.id}/collaborators`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ collaboratorIds: [outsider.user.id] }),
      },
    );
    expect(denied.status).toBe(403);
  });
  it("creates a child atomically with its parent's assignee and rejects a cycle and a second parent", async () => {
    const c = await context();
    const [parent, otherParent] = await db
      .insert(schema.taskTable)
      .values([
        {
          projectId: c.project.id,
          title: "Parent",
          number: 1,
          status: "to-do",
          columnId: c.columns.todo.id,
          userId: c.other.user.id,
        },
        {
          projectId: c.project.id,
          title: "Another parent",
          number: 2,
          status: "to-do",
          columnId: c.columns.todo.id,
        },
      ])
      .returning();
    await db
      .update(schema.projectTable)
      .set({ lastTaskNumber: 2 })
      .where(eq(schema.projectTable.id, c.project.id));
    const created = await c.app.request(`/api/task/${c.project.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Child",
        description: "",
        status: "to-do",
        priority: "medium",
        parentTaskId: parent.id,
      }),
    });
    expect(created.status).toBe(200);
    const child = await created.json();
    expect(child.userId).toBe(c.other.user.id);
    const cycle = await c.app.request(`/api/task-extra/${parent.id}/parent`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ parentTaskId: child.id }),
    });
    expect(cycle.status).toBe(400);
    const second = await c.app.request("/api/task-relation", {
      method: "POST",
      headers,
      body: JSON.stringify({
        sourceTaskId: otherParent.id,
        targetTaskId: child.id,
        relationType: "subtask",
        workspaceId: c.workspace.id,
      }),
    });
    expect(second.status).toBe(409);
    const replace = await c.app.request(`/api/task-extra/${child.id}/parent`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ parentTaskId: otherParent.id }),
    });
    expect(replace.status).toBe(200);
    const parents = await db
      .select()
      .from(schema.taskRelationTable)
      .where(
        and(
          eq(schema.taskRelationTable.targetTaskId, child.id),
          eq(schema.taskRelationTable.relationType, "subtask"),
        ),
      );
    expect(parents).toHaveLength(1);
    expect(parents[0].sourceTaskId).toBe(otherParent.id);
  });
  it("serializes competing parent changes so concurrent links cannot form a cycle", async () => {
    const c = await context();
    const [a, b] = await db
      .insert(schema.taskTable)
      .values([
        {
          projectId: c.project.id,
          title: "A",
          number: 1,
          status: "to-do",
          columnId: c.columns.todo.id,
        },
        {
          projectId: c.project.id,
          title: "B",
          number: 2,
          status: "to-do",
          columnId: c.columns.todo.id,
        },
      ])
      .returning();
    const responses = await Promise.all(
      [
        [a.id, b.id],
        [b.id, a.id],
      ].map(([id, parentTaskId]) =>
        c.app.request(`/api/task-extra/${id}/parent`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ parentTaskId }),
        }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 400]);
  });
  it("keeps personal shortcuts private and denies members permission to edit shared shortcuts", async () => {
    const c = await context();
    const input = {
      scope: "personal",
      name: "Private system",
      url: "http://intranet.local:8080",
    };
    const saved = await c.app.request(`/api/portal/${c.workspace.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    expect(saved.status).toBe(200);
    const link = await saved.json();
    const shared = await c.app.request(`/api/portal/${c.workspace.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...input, scope: "shared" }),
    });
    expect(shared.status).toBe(403);
    mockAuthenticatedSession(c.other.user);
    const other = await c.app.request(
      `/api/portal/${c.workspace.id}?scope=personal`,
    );
    expect(await other.json()).toEqual([]);
    const steal = await c.app.request(
      `/api/portal/${c.workspace.id}/${link.id}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ...input,
          name: "Stolen",
          version: link.version,
        }),
      },
    );
    expect(steal.status).toBe(409);
    mockAuthenticatedSession(c.user);
    const bad = await c.app.request(`/api/portal/${c.workspace.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...input, url: "javascript:alert(1)" }),
    });
    expect(bad.status).toBe(400);
  });
  it("rejects stale portal sorting without losing a concurrent edit", async () => {
    const c = await context();
    const input = { scope: "personal", name: "A", url: "https://example.test" };
    const created = await c.app.request(`/api/portal/${c.workspace.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    const link = await created.json();
    const edited = await c.app.request(
      `/api/portal/${c.workspace.id}/${link.id}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ...input,
          name: "Edited",
          version: link.version,
        }),
      },
    );
    expect(edited.status).toBe(200);
    const sort = await c.app.request(`/api/portal/${c.workspace.id}/reorder`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        scope: "personal",
        entries: [{ id: link.id, version: link.version }],
      }),
    });
    expect(sort.status).toBe(409);
    const listing = await c.app.request(
      `/api/portal/${c.workspace.id}?scope=personal`,
    );
    expect((await listing.json())[0].name).toBe("Edited");
  });
  it("stores update acknowledgements per account and never moves the read position backwards", async () => {
    const c = await context();
    for (const sequence of [3, 1]) {
      const response = await c.app.request("/api/releases/read", {
        method: "POST",
        headers,
        body: JSON.stringify({ sequence }),
      });
      expect(response.status).toBe(200);
    }
    const mine = await c.app.request("/api/releases");
    expect((await mine.json()).lastReadSequence).toBe(3);
    mockAuthenticatedSession(c.other.user);
    const other = await c.app.request("/api/releases");
    expect((await other.json()).lastReadSequence).toBe(0);
    const future = await c.app.request("/api/releases/read", {
      method: "POST",
      headers,
      body: JSON.stringify({ sequence: 999 }),
    });
    expect(future.status).toBe(400);
  });
  it("stores requirement Excel bytes without S3, binds only the uploader's drafts and authorizes downloads", async () => {
    const c = await context();
    await db
      .update(schema.projectTable)
      .set({ kind: "requirement" })
      .where(eq(schema.projectTable.id, c.project.id));
    const bytes = new Uint8Array([0x50, 0x4b, 3, 4, 0, 0, 1, 2]);
    const form = new FormData();
    form.set("file", new File([bytes], "需求清单.xlsx"));
    const uploaded = await c.app.request(
      `/api/requirement-attachments/${c.project.id}/draft`,
      { method: "POST", body: form },
    );
    expect(uploaded.status).toBe(200);
    const file = await uploaded.json();
    mockAuthenticatedSession(c.other.user);
    const privateDownload = await c.app.request(
      `/api/requirement-attachments/${c.project.id}/file/${file.id}`,
    );
    expect(privateDownload.status).toBe(404);
    const payload = {
      title: "Requirement",
      description: "Details",
      priority: "medium",
      status: "to-do",
      requirementData: { type: "用户需求" },
      requirementAttachmentIds: [file.id],
    };
    const steal = await c.app.request(`/api/task/${c.project.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    expect(steal.status).toBe(400);
    mockAuthenticatedSession(c.user);
    const created = await c.app.request(`/api/task/${c.project.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    expect(created.status).toBe(200);
    mockAuthenticatedSession(c.other.user);
    const download = await c.app.request(
      `/api/requirement-attachments/${c.project.id}/file/${file.id}`,
    );
    expect(download.status).toBe(200);
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(bytes);
    expect(download.headers.get("content-disposition")).toContain(
      "attachment;",
    );
    const [stored] = await db
      .select()
      .from(schema.requirementAttachmentTable)
      .where(eq(schema.requirementAttachmentTable.id, file.id));
    expect(stored.taskId).toBeTruthy();
    expect(stored.data).toEqual(Buffer.from(bytes));
  });
});
