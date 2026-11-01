import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { columnTable, taskTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { getSubtaskParentProjects } from "../get-subtask-parent-projects";
import { publishTaskMutation } from "./task-mutation-effects";
import { withLockedTask } from "./with-locked-task";

export const PENDING_ACCEPTANCE_SLUG = "pending-acceptance";

async function updateTaskTracking({
  id,
  progress,
  weight,
  actualStartAt,
  actualEndAt,
  currentUserId,
}: {
  id: string;
  progress?: number;
  weight?: number;
  actualStartAt?: Date | null;
  actualEndAt?: Date | null;
  currentUserId: string;
}) {
  const { before: existingTask, after: updatedTask } = await withLockedTask(
    id,
    async (tx, existingTask) => {
      const changes: Partial<typeof taskTable.$inferInsert> = {};

      if (progress !== undefined) changes.progress = progress;
      if (weight !== undefined) changes.weight = weight;
      if (actualStartAt !== undefined) changes.actualStartAt = actualStartAt;
      if (actualEndAt !== undefined) changes.actualEndAt = actualEndAt;

      // A task that reaches 100% is done in the field but not yet accepted:
      // move it to Pending Acceptance unless it already sits in a final
      // column, where the user's own workflow takes precedence.
      if (progress === 100) {
        const currentColumn = existingTask.columnId
          ? await tx.query.columnTable.findFirst({
              where: eq(columnTable.id, existingTask.columnId),
            })
          : undefined;
        if (!currentColumn?.isFinal) {
          const pendingAcceptance = await tx.query.columnTable.findFirst({
            where: and(
              eq(columnTable.projectId, existingTask.projectId),
              eq(columnTable.slug, PENDING_ACCEPTANCE_SLUG),
            ),
          });
          if (pendingAcceptance) {
            changes.status = pendingAcceptance.slug;
            changes.columnId = pendingAcceptance.id;
          }
        }
      }

      if (Object.keys(changes).length === 0) return existingTask;

      const [task] = await tx
        .update(taskTable)
        .set(changes)
        .where(eq(taskTable.id, id))
        .returning();

      if (!task) {
        throw new HTTPException(500, {
          message: "Failed to update task tracking",
        });
      }

      return task;
    },
  );

  const statusChanged = existingTask.status !== updatedTask.status;

  if (statusChanged)
    await publishTaskMutation(existingTask, updatedTask, currentUserId, {
      fields: ["status"],
    });
  else
    await publishEvent("task.updated", {
      taskId: updatedTask.id,
      projectId: updatedTask.projectId,
      userId: currentUserId,
    });

  // Subtask progress feeds every parent's aggregate, so their boards need a
  // fresh read even when this task's own status stayed put.
  const progressChanged =
    existingTask.progress !== updatedTask.progress ||
    existingTask.weight !== updatedTask.weight;
  if (existingTask.progress !== updatedTask.progress)
    await publishEvent("task.progress_changed", {
      taskId: updatedTask.id,
      projectId: updatedTask.projectId,
      userId: currentUserId,
      title: updatedTask.title,
      oldProgress: existingTask.progress,
      newProgress: updatedTask.progress,
      type: "progress_changed",
    });
  if (progressChanged)
    await publishEvent("subtask-parents.refresh", {
      projects: await getSubtaskParentProjects([updatedTask.id]),
    });

  return updatedTask;
}

export default updateTaskTracking;
