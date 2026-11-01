import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable, taskTable, userTable } from "../../database/schema";
import { hasWorkspacePermission } from "../../utils/require-workspace-permission";
import createNotification from "./create-notification";

// A manual reminder from a teammate. The notification goes to the assignee, not
// the caller, so it cannot reuse the public "create notification" route, which
// always targets the current user.
export default async function nudgeTaskAssignee(
  c: Context,
  taskId: string,
  userId: string,
) {
  const [task] = await db
    .select({
      id: taskTable.id,
      title: taskTable.title,
      projectId: taskTable.projectId,
      assigneeId: taskTable.userId,
    })
    .from(taskTable)
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (!task) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  const [project] = await db
    .select({ workspaceId: projectTable.workspaceId })
    .from(projectTable)
    .where(eq(projectTable.id, task.projectId))
    .limit(1);

  if (!project) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  // Nudging exposes the task title to the assignee, so the caller must at least
  // be able to read tasks in this workspace.
  if (
    !(await hasWorkspacePermission(c, { task: ["read"] }, project.workspaceId))
  ) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  if (!task.assigneeId || task.assigneeId === userId) return null;

  const [nudger] = await db
    .select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return createNotification({
    userId: task.assigneeId,
    type: "task_nudge",
    eventData: {
      taskTitle: task.title,
      nudgerName: nudger?.name ?? null,
      projectId: task.projectId,
      workspaceId: project.workspaceId,
    },
    resourceId: task.id,
    resourceType: "task",
  });
}
