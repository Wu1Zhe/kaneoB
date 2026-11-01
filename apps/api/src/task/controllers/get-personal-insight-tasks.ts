import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import db from "../../database";
import {
  columnTable,
  projectTable,
  taskTable,
  userTable,
} from "../../database/schema";
import { projectAccessCondition } from "../../project-access/project-access-condition";
import type { z } from "../../openapi";
import type { personalInsightTasksQuery } from "../schema";
import { taskIsCompleted } from "../task-is-completed";

export default async function getPersonalInsightTasks(
  userId: string,
  query: z.infer<typeof personalInsightTasksQuery>,
) {
  const statusColumn = db
    .select({ name: columnTable.name, isFinal: columnTable.isFinal })
    .from(columnTable)
    .where(
      and(
        eq(columnTable.projectId, taskTable.projectId),
        eq(columnTable.slug, taskTable.status),
      ),
    )
    .orderBy(
      sql`case when ${columnTable.id} = ${taskTable.columnId} then 0 else 1 end`,
      asc(columnTable.position),
      asc(columnTable.id),
    )
    .limit(1)
    .as("personal_insight_column");
  const rows = await db
    .select({
      id: taskTable.id,
      projectId: taskTable.projectId,
      projectKind: projectTable.kind,
      requirementData: taskTable.requirementData,
      title: taskTable.title,
      number: taskTable.number,
      status: taskTable.status,
      priority: taskTable.priority,
      dueDate: taskTable.dueDate,
      startDate: taskTable.startDate,
      createdAt: taskTable.createdAt,
      updatedAt: taskTable.updatedAt,
      actualEndAt: taskTable.actualEndAt,
      progress: taskTable.progress,
      userId: taskTable.userId,
      assigneeName: userTable.name,
      assigneeImage: userTable.image,
      projectName: projectTable.name,
      projectSlug: projectTable.slug,
      statusName: statusColumn.name,
      isFinal: sql<boolean>`case when ${taskTable.status} = 'archived' or (${projectTable.kind}='requirement' and nullif(${taskTable.requirementData}->>'prodActualAt','') is not null) then true else coalesce(${statusColumn.isFinal}, ${taskIsCompleted}) end`,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .innerJoin(userTable, eq(taskTable.userId, userTable.id))
    .leftJoinLateral(statusColumn, sql`true`)
    .where(
      and(
        eq(projectTable.workspaceId, query.workspaceId),
        query.kind ? eq(projectTable.kind, query.kind) : undefined,
        isNull(projectTable.archivedAt),
        eq(taskTable.userId, userId),
        projectAccessCondition(userId, projectTable.id),
        query.after ? gt(taskTable.id, query.after) : undefined,
      ),
    )
    .orderBy(asc(taskTable.id))
    .limit(query.limit + 1);
  const tasks = rows.slice(0, query.limit);
  return {
    tasks,
    nextCursor: rows.length > query.limit ? tasks.at(-1)!.id : null,
  };
}
