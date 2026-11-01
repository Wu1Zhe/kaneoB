import db from "../../database";
import { eq } from "drizzle-orm";
import { activityTable, taskTable } from "../../database/schema";
import { publishEvent } from "../../events";

async function createActivity(
  taskId: string,
  type: string,
  userId: string,
  content: string | null,
  eventData?: Record<string, unknown> | null,
) {
  const [activity] = await db
    .insert(activityTable)
    .values({
      taskId,
      type,
      userId,
      content,
      eventData: eventData ?? null,
    })
    .returning();
  const task = await db.query.taskTable.findFirst({
    columns: { projectId: true },
    where: eq(taskTable.id, taskId),
  });
  if (task)
    await publishEvent("activity.created", {
      taskId,
      projectId: task.projectId,
    });
  return activity;
}

export default createActivity;
