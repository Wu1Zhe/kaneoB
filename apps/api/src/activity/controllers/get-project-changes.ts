import { and, desc, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import db from "../../database";
import {
  activityTable,
  columnTable,
  projectTable,
  taskTable,
  userTable,
} from "../../database/schema";
import type { z } from "../../openapi";
import type { projectChangesQuery } from "../schema";
import { commentExcerpt } from "../comment-excerpt";
import { projectAccessCondition } from "../../project-access/project-access-condition";

const CHANGE_TYPES = [
  "status_changed",
  "progress_changed",
  "due_date_changed",
  "assignee_changed",
  "unassigned",
  "priority_changed",
];

export default async function getProjectChanges(
  scope: { projectId: string } | { workspaceId: string; userId: string },
  query: z.infer<typeof projectChangesQuery>,
) {
  const before = query.before ? new Date(query.before) : null;
  const rows = await db
    .select({
      id: activityTable.id,
      type: activityTable.type,
      createdAt: activityTable.createdAt,
      eventData: activityTable.eventData,
      content: activityTable.content,
      userId: activityTable.userId,
      userName: userTable.name,
      userImage: userTable.image,
      externalUserName: activityTable.externalUserName,
      externalUserAvatar: activityTable.externalUserAvatar,
      taskId: taskTable.id,
      taskTitle: taskTable.title,
      taskNumber: taskTable.number,
      projectId: projectTable.id,
      projectSlug: projectTable.slug,
    })
    .from(activityTable)
    .innerJoin(taskTable, eq(activityTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .leftJoin(userTable, eq(activityTable.userId, userTable.id))
    .where(
      and(
        "projectId" in scope
          ? eq(taskTable.projectId, scope.projectId)
          : and(
              eq(projectTable.workspaceId, scope.workspaceId),
              isNull(projectTable.archivedAt),
              eq(taskTable.userId, scope.userId),
              projectAccessCondition(scope.userId, projectTable.id),
            ),
        or(
          and(
            eq(projectTable.kind, "project"),
            inArray(activityTable.type, CHANGE_TYPES),
          ),
          and(
            eq(projectTable.kind, "requirement"),
            inArray(activityTable.type, [
              ...CHANGE_TYPES.filter((type) => type !== "progress_changed"),
              "requirement_plan_changed",
              "requirement_actual_changed",
            ]),
          ),
        ),
        query.kind ? eq(projectTable.kind, query.kind) : undefined,
        gte(activityTable.createdAt, new Date(query.since)),
        lt(activityTable.createdAt, new Date(query.until)),
        before && query.beforeId
          ? or(
              lt(activityTable.createdAt, before),
              and(
                eq(activityTable.createdAt, before),
                lt(activityTable.id, query.beforeId),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(activityTable.createdAt), desc(activityTable.id))
    .limit(query.limit + 1);

  const columns = await db
    .select({
      projectId: columnTable.projectId,
      slug: columnTable.slug,
      name: columnTable.name,
    })
    .from(columnTable)
    .where(
      inArray(columnTable.projectId, [
        ...new Set(rows.map((row) => row.projectId)),
      ]),
    );
  const page = rows.slice(0, query.limit);
  const last = page.at(-1);
  return {
    data: page.map(({ content, ...row }) => {
      const data =
        row.eventData &&
        typeof row.eventData === "object" &&
        !Array.isArray(row.eventData)
          ? (row.eventData as Record<string, unknown>)
          : null;
      const nameOf = (slug: unknown) => {
        const matches = columns.filter(
          (column) =>
            column.projectId === row.projectId && column.slug === slug,
        );
        return matches.length === 1 ? matches[0]?.name : undefined;
      };
      return {
        ...row,
        excerpt: commentExcerpt(content),
        eventData:
          row.type === "status_changed" && data
            ? {
                ...data,
                oldStatusName: nameOf(data.oldStatus),
                newStatusName: nameOf(data.newStatus),
              }
            : row.eventData,
      };
    }),
    nextCursor:
      rows.length > query.limit && last
        ? { createdAt: last.createdAt.toISOString(), id: last.id }
        : null,
  };
}
