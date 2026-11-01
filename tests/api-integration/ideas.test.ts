import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import * as storage from "../../apps/api/src/storage/s3";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
const request = (body: unknown, method = "POST") => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
async function fixture() {
  const member = await createWorkspaceMember();
  const { project, columns } = await createProjectFixture({
    workspaceId: member.workspace.id,
  });
  mockAuthenticatedSession(member.user);
  const { app } = createApp();
  const path = `/api/ideas/${project.id}`;
  const create = async (body: unknown = { title: "A useful idea" }) => {
    const result = await app.request(path, request(body));
    expect(result.status).toBe(200);
    return result.json();
  };
  return { ...member, project, columns, app, path, create };
}
describe("project ideas", () => {
  beforeEach(resetTestDatabase);
  it("captures and edits ideas without increasing task totals, supports filters and pins", async () => {
    const f = await fixture();
    const idea = await f.create({
      title: "Reduce manual work",
      description: "A workflow improvement",
      tags: ["Workflow", "Workflow"],
    });
    expect(idea.tags).toEqual(["Workflow"]);
    expect(idea.creatorName).toBe(f.user.name);
    expect(await db.select().from(schema.taskTable)).toHaveLength(0);
    const updated = await f.app.request(
      `${f.path}/${idea.id}`,
      request(
        {
          title: idea.title,
          description: idea.description,
          tags: idea.tags,
          pinned: true,
          status: "evaluating",
          version: idea.version,
        },
        "PUT",
      ),
    );
    expect(updated.status).toBe(200);
    const value = await updated.json();
    expect(value.version).toBe(2);
    expect(value.updatedBy).toBe(f.user.id);
    await f.create({ title: "Another idea" });
    const filtered = await (
      await f.app.request(
        `${f.path}?search=manual&tag=Workflow&status=evaluating`,
      )
    ).json();
    expect(filtered.total).toBe(1);
    expect(filtered.items[0].pinned).toBe(true);
    expect(filtered.tags).toEqual(["Workflow"]);
    const all = await (await f.app.request(f.path)).json();
    expect(all.items[0].id).toBe(idea.id);
    expect(all.counts).toEqual({
      all: 2,
      inbox: 1,
      evaluating: 1,
      adopted: 0,
      parked: 0,
    });
  });
  it("rejects blank titles, invalid states, long tags and stale edits", async () => {
    const f = await fixture();
    for (const body of [
      { title: " " },
      { title: "Idea", status: "invalid" },
      { title: "Idea", tags: ["a".repeat(33)] },
    ])
      expect((await f.app.request(f.path, request(body))).status).toBe(400);
    const idea = await f.create();
    const body = { title: "Updated", version: 1 };
    expect(
      (await f.app.request(`${f.path}/${idea.id}`, request(body, "PUT")))
        .status,
    ).toBe(200);
    expect(
      (await f.app.request(`${f.path}/${idea.id}`, request(body, "PUT")))
        .status,
    ).toBe(409);
    expect(
      (await (await f.app.request(`${f.path}/${idea.id}`)).json()).title,
    ).toBe("Updated");
  });
  it("isolates projects, requirement containers, other workspaces and viewer writes", async () => {
    const f = await fixture();
    const idea = await f.create();
    const other = await createProjectFixture({ workspaceId: f.workspace.id });
    expect(
      (await f.app.request(`/api/ideas/${other.project.id}/${idea.id}`)).status,
    ).toBe(404);
    expect(
      (
        await f.app.request(
          `/api/ideas/${other.project.id}/${idea.id}/convert`,
          request({ version: 1 }),
        )
      ).status,
    ).toBe(404);
    await db
      .update(schema.projectTable)
      .set({ kind: "requirement" })
      .where(eq(schema.projectTable.id, other.project.id));
    expect((await f.app.request(`/api/ideas/${other.project.id}`)).status).toBe(
      404,
    );
    await db
      .update(schema.workspaceUserTable)
      .set({ role: "viewer" })
      .where(eq(schema.workspaceUserTable.userId, f.user.id));
    expect((await f.app.request(f.path)).status).toBe(200);
    expect(
      (await f.app.request(f.path, request({ title: "Forbidden" }))).status,
    ).toBe(403);
    expect(
      (
        await f.app.request(
          `${f.path}/${idea.id}`,
          request({ title: "Forbidden", version: 1 }, "PUT"),
        )
      ).status,
    ).toBe(403);
    const outsider = await createWorkspaceMember();
    mockAuthenticatedSession(outsider.user);
    expect((await f.app.request(f.path)).status).toBe(404);
  });
  it("converts atomically and idempotently, keeps the original, and never recreates deleted linked tasks", async () => {
    const f = await fixture();
    const idea = await f.create({
      title: "Make this happen",
      description: "Full idea content",
    });
    const responses = await Promise.all(
      [1, 2].map(() =>
        f.app.request(`${f.path}/${idea.id}/convert`, request({ version: 1 })),
      ),
    );
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const results = await Promise.all(
      responses.map((response) => response.json()),
    );
    expect(results[0].taskId).toBe(results[1].taskId);
    expect(results.some((result) => result.existing)).toBe(true);
    const tasks = await db.select().from(schema.taskTable);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe(idea.title);
    expect(tasks[0].status).toBe(f.columns.todo.slug);
    expect(tasks[0].description).toContain(`/ideas?ideaId=${idea.id}`);
    const saved = await (await f.app.request(`${f.path}/${idea.id}`)).json();
    expect(saved.status).toBe("adopted");
    expect(saved.description).toBe("Full idea content");
    expect(saved.convertedTaskId).toBe(tasks[0].id);
    await db
      .delete(schema.taskTable)
      .where(eq(schema.taskTable.id, tasks[0].id));
    expect(
      (
        await f.app.request(
          `${f.path}/${idea.id}/convert`,
          request({ version: saved.version }),
        )
      ).status,
    ).toBe(409);
    expect(await db.select().from(schema.taskTable)).toHaveLength(0);
  });
  it("honors required task custom fields and rolls back a failed conversion", async () => {
    const f = await fixture();
    const idea = await f.create();
    const [field] = await db
      .insert(schema.customFieldDefinitionTable)
      .values({
        projectId: f.project.id,
        name: "Customer",
        type: "text",
        required: true,
      })
      .returning();
    expect(
      (
        await f.app.request(
          `${f.path}/${idea.id}/convert`,
          request({ version: 1 }),
        )
      ).status,
    ).toBe(400);
    expect(await db.select().from(schema.taskTable)).toHaveLength(0);
    expect(
      (await (await f.app.request(`${f.path}/${idea.id}`)).json()).convertedAt,
    ).toBeNull();
    const converted = await f.app.request(
      `${f.path}/${idea.id}/convert`,
      request({
        version: 1,
        customFields: [{ fieldId: field.id, value: "Customer A" }],
      }),
    );
    expect(converted.status).toBe(200);
    const values = await db.select().from(schema.customFieldValueTable);
    expect(values[0].value).toBe("Customer A");
  });
  it("claims only the uploader's drafts and copies assets when converting", async () => {
    const f = await fixture();
    const [asset] = await db
      .insert(schema.assetTable)
      .values({
        workspaceId: f.workspace.id,
        projectId: f.project.id,
        taskId: null,
        createdBy: f.user.id,
        objectKey: "idea-image",
        filename: "note.png",
        mimeType: "image/png",
        size: 99,
        kind: "image",
        surface: "draft",
      })
      .returning();
    const idea = await f.create({
      title: "Image idea",
      description: `![note](/api/asset/${asset.id})`,
    });
    const [claimed] = await db
      .select()
      .from(schema.assetTable)
      .where(eq(schema.assetTable.id, asset.id));
    expect(claimed.surface).toBe(`idea-${idea.id}`);
    expect(
      (
        await f.app.request(
          f.path,
          request({ title: "Stolen image", description: idea.description }),
        )
      ).status,
    ).toBe(400);
    const copy = vi
      .spyOn(storage, "copyTaskAssetObject")
      .mockResolvedValue("copied-idea-image");
    const response = await f.app.request(
      `${f.path}/${idea.id}/convert`,
      request({ version: 1 }),
    );
    expect(response.status).toBe(200);
    const converted = await response.json();
    expect(copy).toHaveBeenCalledOnce();
    const assets = await db
      .select()
      .from(schema.assetTable)
      .where(eq(schema.assetTable.taskId, converted.taskId));
    expect(assets).toHaveLength(1);
    expect(assets[0].id).not.toBe(asset.id);
    const [task] = await db
      .select()
      .from(schema.taskTable)
      .where(eq(schema.taskTable.id, converted.taskId));
    expect(task.description).toContain(`/api/asset/${assets[0].id}`);
    expect(task.description).not.toContain(`/api/asset/${asset.id}`);
    const [original] = await db
      .select()
      .from(schema.assetTable)
      .where(
        and(
          eq(schema.assetTable.id, asset.id),
          eq(schema.assetTable.surface, `idea-${idea.id}`),
        ),
      );
    expect(original.taskId).toBeNull();
  });
  it("rolls back task creation and removes copied objects when a later copy fails", async () => {
    const f = await fixture();
    const assets = await db
      .insert(schema.assetTable)
      .values(
        [1, 2].map((number) => ({
          workspaceId: f.workspace.id,
          projectId: f.project.id,
          createdBy: f.user.id,
          objectKey: `source-${number}`,
          filename: `note-${number}.png`,
          mimeType: "image/png",
          size: 99,
          surface: "draft",
        })),
      )
      .returning();
    const idea = await f.create({
      title: "Two images",
      description: assets
        .map((asset) => `![note](/api/asset/${asset.id})`)
        .join("\n"),
    });
    vi.spyOn(storage, "copyTaskAssetObject")
      .mockResolvedValueOnce("copied-first")
      .mockRejectedValueOnce(new Error("Copy unavailable"));
    const cleanup = vi
      .spyOn(storage, "deleteS3Object")
      .mockResolvedValue(undefined);
    expect(
      (
        await f.app.request(
          `${f.path}/${idea.id}/convert`,
          request({ version: 1 }),
        )
      ).status,
    ).toBe(500);
    expect(await db.select().from(schema.taskTable)).toHaveLength(0);
    expect(cleanup).toHaveBeenCalledWith("copied-first");
    const preserved = await (
      await f.app.request(`${f.path}/${idea.id}`)
    ).json();
    expect(preserved.convertedAt).toBeNull();
    expect(preserved.status).toBe("inbox");
    expect(await db.select().from(schema.assetTable)).toHaveLength(2);
  });
});
