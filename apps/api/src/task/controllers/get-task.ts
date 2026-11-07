import { boundedTaskRead } from "../bounded-read";
import { alias } from "drizzle-orm/pg-core";
import { boardDescription, descriptionDeferred } from "../description-pages";
import { getSubtaskCounts } from "../get-subtask-counts";
import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  taskTable,
  userTable,
  projectTable,
  taskRelationTable,
} from "../../database/schema";

async function getTask(taskId: string, board = false, userId?: string) {
  const creator = alias(userTable, "creator");
  const task = await db
    .select({
      id: taskTable.id,
      title: taskTable.title,
      number: taskTable.number,
      description: board ? boardDescription : taskTable.description,
      ...(board
        ? {
            descriptionDeferred,
          }
        : {}),
      status: taskTable.status,
      columnId: taskTable.columnId,
      priority: taskTable.priority,
      progress: taskTable.progress,
      weight: taskTable.weight,
      requirementData: taskTable.requirementData,
      projectKind: sql<
        "project" | "requirement"
      >`(select ${projectTable.kind} from ${projectTable} where ${projectTable.id} = ${taskTable.projectId})`,
      startDate: taskTable.startDate,
      dueDate: taskTable.dueDate,
      actualStartAt: taskTable.actualStartAt,
      actualEndAt: taskTable.actualEndAt,
      recurrence: taskTable.recurrence,
      position: taskTable.position,
      createdAt: taskTable.createdAt,
      updatedAt: taskTable.updatedAt,
      collaboratorIds: taskTable.collaboratorIds,
      userId: taskTable.userId,
      createdBy: taskTable.createdBy,
      updatedBy: taskTable.updatedBy,
      updaterName: sql<
        string | null
      >`(select name from "user" where id = ${taskTable.updatedBy})`,
      assigneeName: userTable.name,
      assigneeId: userTable.id,
      creatorName: creator.name,
      creatorImage: creator.image,
      projectId: taskTable.projectId,
      workspaceId: sql<string>`(select ${projectTable.workspaceId} from ${projectTable} where ${projectTable.id} = ${taskTable.projectId})`,
    })
    .from(taskTable)
    .leftJoin(userTable, eq(taskTable.userId, userTable.id))
    .leftJoin(creator, eq(taskTable.createdBy, creator.id))
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (!task.length || !task[0]) {
    throw new HTTPException(404, {
      message: "Task not found",
    });
  }

  if (!board) return task[0];
  const { workspaceId, ...result } = task[0];
  if (!workspaceId) return result;
  const parent = alias(taskTable, "parent");
  const parents = await db
    .selectDistinct({ id: parent.id })
    .from(taskRelationTable)
    .innerJoin(parent, eq(taskRelationTable.sourceTaskId, parent.id))
    .where(
      and(
        eq(taskRelationTable.targetTaskId, taskId),
        eq(taskRelationTable.relationType, "subtask"),
        eq(parent.projectId, result.projectId),
      ),
    );
  const counts = await boundedTaskRead((tx) =>
    getSubtaskCounts(
      tx,
      [taskId, ...parents.map((task) => task.id)],
      workspaceId,
      false,
      userId,
    ),
  );
  return {
    ...result,
    subtaskCounts: counts.get(taskId) ?? { completed: 0, total: 0 },
    parentSubtaskCounts: parents.map(({ id }) => ({
      taskId: id,
      ...(counts.get(id) ?? { completed: 0, total: 0 }),
    })),
  };
}

export default getTask;
