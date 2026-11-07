import { or, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { activityTable, taskTable } from "../database/schema";
import {
  assertAssignableUser,
  getProjectWorkspaceId,
} from "../utils/assert-assignable-user";
import { publishEvent } from "../events";
import { withScopedTask } from "./controllers/with-scoped-task";

export function normalizeCollaborators(
  ids: readonly string[],
  owner: string | null,
) {
  return [
    ...new Set(ids.map((id) => id.trim()).filter((id) => id && id !== owner)),
  ];
}

export function taskInvolves(userId: string) {
  return or(
    eq(taskTable.userId, userId),
    sql`${taskTable.collaboratorIds} @> ${JSON.stringify([userId])}::jsonb`,
  );
}

export async function validateCollaborators(ids: string[], projectId: string) {
  if (ids.length > 50)
    throw new HTTPException(400, {
      message: "At most 50 collaborators are allowed",
    });
  const workspaceId = await getProjectWorkspaceId(projectId);
  for (const id of ids) await assertAssignableUser(id, workspaceId, projectId);
}

export async function updateCollaborators(
  id: string,
  ids: string[],
  actor: string,
  workspaceId: string,
) {
  const { before, after } = await withScopedTask(
    id,
    workspaceId,
    async (tx, task) => {
      const collaborators = normalizeCollaborators(ids, task.userId);
      await validateCollaborators(collaborators, task.projectId);
      const [updated] = await tx
        .update(taskTable)
        .set({ collaboratorIds: collaborators, updatedBy: actor })
        .where(eq(taskTable.id, id))
        .returning();
      await tx.insert(activityTable).values({
        taskId: id,
        userId: actor,
        type: "collaborators_changed",
        content: null,
        eventData: { oldIds: task.collaboratorIds, newIds: collaborators },
      });
      if (!updated)
        throw new HTTPException(500, {
          message: "Unable to update collaborators",
        });
      return updated;
    },
  );
  await publishEvent("task-relation.refresh", {
    projectId: after.projectId,
    userId: actor,
  });
  await publishEvent("task.updated", {
    ...after,
    taskId: id,
    currentUserId: actor,
  });
  await publishEvent("task.collaboration_changed", {
    userIds: [
      ...new Set([...before.collaboratorIds, ...after.collaboratorIds]),
    ],
    projectId: after.projectId,
  });
  return after;
}
