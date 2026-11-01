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
const DAY = 86400000;
const json = (body: unknown) => ({
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
async function setup(kind: "project" | "requirement" = "requirement") {
  const member = await createWorkspaceMember();
  const project = await createProjectFixture({
    workspaceId: member.workspace.id,
  });
  await db
    .update(schema.projectTable)
    .set({ kind })
    .where(eq(schema.projectTable.id, project.project.id));
  mockAuthenticatedSession(member.user);
  const { app } = createApp();
  return { ...member, ...project, app };
}
async function taskFixture(f: Awaited<ReturnType<typeof setup>>, number = 1) {
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: f.project.id,
      number,
      title: `Work ${number}`,
      description: "Description",
      status: "to-do",
      columnId: f.columns.todo.id,
      userId: f.user.id,
      requirementData: { type: "User requirement", reference: `REQ-${number}` },
    })
    .returning();
  return task!;
}
describe("scoped dashboards and requirement rules", () => {
  beforeEach(resetTestDatabase);
  it("validates required fields at creation, generates a real reference, and leaves projects compatible", async () => {
    const f = await setup();
    const body = {
      title: "Request",
      description: "<p>Description</p>",
      priority: "medium",
      status: "to-do",
    };
    expect(
      (
        await f.app.request(`/api/task/${f.project.id}`, {
          ...json(body),
          method: "POST",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await f.app.request(`/api/task/${f.project.id}`, {
          ...json({
            ...body,
            requirementData: { type: "User" },
            description: "<p>&nbsp;</p>",
          }),
          method: "POST",
        })
      ).status,
    ).toBe(400);
    const response = await f.app.request(`/api/task/${f.project.id}`, {
      ...json({
        ...body,
        dueDate: "2026-11-04T10:30:00Z",
        requirementData: { type: "User" },
      }),
      method: "POST",
    });
    expect(response.status).toBe(200);
    const created = await response.json();
    expect(created.requirementData.reference).toBe(
      `${f.project.slug}-${created.number}`,
    );
    expect(created.requirementData.prodPlannedAt).toBe(
      "2026-11-04T10:30:00.000Z",
    );
    const other = await createProjectFixture({ workspaceId: f.workspace.id });
    expect(
      (
        await f.app.request(`/api/task/${other.project.id}`, {
          ...json({ ...body, description: "" }),
          method: "POST",
        })
      ).status,
    ).toBe(200);
  });
  it("mirrors overall and node dates atomically in both directions, including clearing and concurrent edits", async () => {
    const f = await setup();
    const task = await taskFixture(f);
    const change = (field: string, value: string | null) =>
      f.app.request(`/api/task/requirement/${task.id}`, json({ field, value }));
    expect(
      (await change("designStartPlannedAt", "2026-11-02T03:30:00Z")).status,
    ).toBe(200);
    expect(
      (await change("designStartActualAt", "2026-11-02T03:17:00Z")).status,
    ).toBe(200);
    const responses = await Promise.all([
      change("department", "MFG"),
      f.app.request(
        `/api/task/due-date/${task.id}`,
        json({ dueDate: "2026-11-06T10:30:00Z" }),
      ),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    let row = await db.query.taskTable.findFirst({
      where: eq(schema.taskTable.id, task.id),
    });
    expect(row?.startDate?.toISOString()).toBe("2026-11-02T03:30:00.000Z");
    expect(row?.actualStartAt?.toISOString()).toBe("2026-11-02T03:17:00.000Z");
    expect(row?.requirementData).toMatchObject({
      prodPlannedAt: "2026-11-06T10:30:00.000Z",
      department: "MFG",
    });
    await change("prodPlannedAt", null);
    row = await db.query.taskTable.findFirst({
      where: eq(schema.taskTable.id, task.id),
    });
    expect(row?.dueDate).toBeNull();
    expect(row?.requirementData?.prodPlannedAt).toBeNull();
  });
  it("keeps valid values when required edits are cleared and records the authenticated last editor", async () => {
    const f = await setup();
    const task = await taskFixture(f);
    for (const field of ["reference", "type"])
      expect(
        (
          await f.app.request(
            `/api/task/requirement/${task.id}`,
            json({ field, value: null }),
          )
        ).status,
      ).toBe(400);
    expect(
      (await f.app.request(`/api/task/title/${task.id}`, json({ title: " " })))
        .status,
    ).toBe(400);
    expect(
      (
        await f.app.request(
          `/api/task/description/${task.id}`,
          json({ description: "<p></p>" }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await f.app.request(
          `/api/task/title/${task.id}`,
          json({ title: "Updated request" }),
        )
      ).status,
    ).toBe(200);
    const response = await f.app.request(`/api/task/${task.id}`);
    const result = await response.json();
    expect(result).toMatchObject({
      title: "Updated request",
      updatedBy: f.user.id,
      updaterName: f.user.name,
    });
    const revisions = await db
      .select()
      .from(schema.taskRevisionTable)
      .where(eq(schema.taskRevisionTable.taskId, task.id));
    expect(revisions.at(-1)?.data.updaterName).toBe(f.user.name);
  });
  it("reports only the selected project, deduplicates milestone risks, and preserves immutable snapshots", async () => {
    const f = await setup();
    const task = await taskFixture(f);
    const launched = await taskFixture(f, 2);
    const other = await createProjectFixture({ workspaceId: f.workspace.id });
    await db
      .insert(schema.taskTable)
      .values({ projectId: other.project.id, title: "Outside report" });
    const past = new Date(Date.now() - 2 * DAY).toISOString();
    for (const field of ["devPlannedAt", "pirunPlannedAt"]) {
      const date = new Date(past);
      date.setUTCMinutes(0, 0, 0);
      expect(
        (
          await f.app.request(
            `/api/task/requirement/${task.id}`,
            json({ field, value: date.toISOString() }),
          )
        ).status,
      ).toBe(200);
    }
    await f.app.request(
      `/api/task/requirement/${launched.id}`,
      json({ field: "prodActualAt", value: past }),
    );
    const since = new Date(Date.now() - 60000).toISOString();
    const until = new Date(Date.now() + 60000).toISOString();
    const response = await f.app.request(
      `/api/reporting/${f.project.id}?since=${since}&until=${until}`,
    );
    expect(response.status).toBe(200);
    const report = await response.json();
    expect(report.counts).toEqual({ total: 2, launched: 1, overdue: 1 });
    expect(
      report.nodes.filter((node: { count: number }) => node.count === 1),
    ).toHaveLength(2);
    expect(
      report.tasks.every(
        (row: { projectId: string }) => row.projectId === f.project.id,
      ),
    ).toBe(true);
    const savedResponse = await f.app.request(
      `/api/reporting/${f.project.id}/snapshots`,
      { ...json({ since, until, name: "Before launch" }), method: "POST" },
    );
    expect(savedResponse.status).toBe(200);
    const saved = await savedResponse.json();
    await f.app.request(
      `/api/task/requirement/${task.id}`,
      json({ field: "prodActualAt", value: new Date().toISOString() }),
    );
    const snapshots = await f.app.request(
      `/api/reporting/${f.project.id}/snapshots`,
    );
    const frozen = (await snapshots.json())[0];
    expect(frozen.id).toBe(saved.id);
    expect(frozen.data.counts.overdue).toBe(1);
    expect(frozen.data.counts.launched).toBe(1);
    const live = await f.app.request(
      `/api/reporting/${f.project.id}?since=${since}&until=${until}`,
    );
    expect((await live.json()).counts).toEqual({
      total: 2,
      launched: 2,
      overdue: 0,
    });
  });
  it("records deletes for history and makes older unavailable periods explicit", async () => {
    const f = await setup();
    const task = await taskFixture(f);
    const started = new Date(Date.now() - 10 * DAY);
    await db
      .update(schema.projectTable)
      .set({ reportingStartedAt: started })
      .where(eq(schema.projectTable.id, f.project.id));
    await db
      .update(schema.taskRevisionTable)
      .set({ recordedAt: new Date(Date.now() - 5 * DAY) })
      .where(eq(schema.taskRevisionTable.taskId, task.id));
    await db.delete(schema.taskTable).where(eq(schema.taskTable.id, task.id));
    const historicalUntil = new Date(Date.now() - DAY).toISOString();
    const since = new Date(Date.now() - 6 * DAY).toISOString();
    const previous = await f.app.request(
      `/api/reporting/${f.project.id}?since=${since}&until=${historicalUntil}`,
    );
    expect((await previous.json()).counts.total).toBe(1);
    const live = await f.app.request(
      `/api/reporting/${f.project.id}?since=${since}&until=${new Date().toISOString()}`,
    );
    const report = await live.json();
    expect(report.counts.total).toBe(0);
    expect(
      report.weekly.some(
        (week: { available: boolean; created: number | null }) =>
          !week.available && week.created === null,
      ),
    ).toBe(true);
  });
  it("isolates reports and snapshots from other workspaces and filters My tasks by true source kind", async () => {
    const f = await setup();
    await taskFixture(f);
    const project = await createProjectFixture({ workspaceId: f.workspace.id });
    await db.insert(schema.taskTable).values({
      projectId: project.project.id,
      title: "Project task",
      userId: f.user.id,
    });
    const mine = await f.app.request(
      `/api/task/assigned?workspaceId=${f.workspace.id}&kind=requirement`,
    );
    const assigned = await mine.json();
    expect(assigned.total).toBe(1);
    expect(assigned.tasks[0].projectKind).toBe("requirement");
    const outsider = await createWorkspaceMember();
    mockAuthenticatedSession(outsider.user);
    const since = new Date(Date.now() - DAY).toISOString();
    const until = new Date().toISOString();
    expect(
      (
        await f.app.request(
          `/api/reporting/${f.project.id}?since=${since}&until=${until}`,
        )
      ).status,
    ).toBe(404);
    expect(
      (await f.app.request(`/api/reporting/${f.project.id}/snapshots`)).status,
    ).toBe(404);
    expect(
      (
        await f.app.request(`/api/reporting/${f.project.id}/snapshots`, {
          ...json({ since, until, name: "Forbidden" }),
          method: "POST",
        })
      ).status,
    ).toBe(404);
  });
  it("allows viewers to read reports but prevents saving snapshots", async () => {
    const f = await setup();
    await taskFixture(f);
    await db
      .update(schema.workspaceUserTable)
      .set({ role: "viewer" })
      .where(eq(schema.workspaceUserTable.userId, f.user.id));
    const since = new Date(Date.now() - DAY).toISOString();
    const until = new Date().toISOString();
    expect(
      (
        await f.app.request(
          `/api/reporting/${f.project.id}?since=${since}&until=${until}`,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await f.app.request(`/api/reporting/${f.project.id}/snapshots`, {
          ...json({ since, until, name: "Forbidden" }),
          method: "POST",
        })
      ).status,
    ).toBe(403);
  });
});
