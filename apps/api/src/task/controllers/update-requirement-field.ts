import { recordTaskMutation } from "./task-mutation-effects";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { activityTable, projectTable, taskTable } from "../../database/schema";
import { publishEvent } from "../../events";
import type { z } from "../../openapi";
import type { updateRequirementFieldBody } from "../requirement-fields";
import { withLockedTask } from "./with-locked-task";

export default async function updateRequirementField(
  id: string,
  userId: string,
  input: z.infer<typeof updateRequirementFieldBody>,
) {
  const { field } = input;
  let value = input.value?.trim() || null;
  if (["reference", "type"].includes(field) && !value)
    throw new HTTPException(400, {
      message: "This requirement field is required",
    });
  if (value && field.endsWith("At")) {
    const date = new Date(value);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(date.getTime()))
      throw new HTTPException(400, {
        message: "Invalid requirement timestamp",
      });
    if (
      !field.endsWith("ActualAt") &&
      (date.getUTCMinutes() % 30 !== 0 ||
        date.getUTCSeconds() !== 0 ||
        date.getUTCMilliseconds() !== 0)
    )
      throw new HTTPException(400, {
        message: "Planned times must use half-hour intervals",
      });
    value = date.toISOString();
  } else if (
    value &&
    !["benefit", "notes"].includes(field) &&
    value.length > 256
  ) {
    throw new HTTPException(400, { message: "Requirement field is too long" });
  }
  const { before, after } = await withLockedTask(id, async (tx, task) => {
    const project = await tx.query.projectTable.findFirst({
      where: eq(projectTable.id, task.projectId),
    });
    if (project?.kind !== "requirement")
      throw new HTTPException(400, {
        message: "This field is only available for requirements",
      });
    const oldValue = task.requirementData?.[field] ?? null;
    if (oldValue === value) return task;
    const [updated] = await tx
      .update(taskTable)
      .set({ requirementData: { ...task.requirementData, [field]: value } })
      .where(eq(taskTable.id, id))
      .returning();
    if (!updated)
      throw new HTTPException(500, { message: "Failed to update requirement" });
    if (field === "prodPlannedAt")
      await recordTaskMutation(tx, task, { dueDate: updated.dueDate }, userId);
    await tx.insert(activityTable).values({
      taskId: id,
      userId,
      type: field.endsWith("ActualAt")
        ? "requirement_actual_changed"
        : field.endsWith("At")
          ? "requirement_plan_changed"
          : "requirement_details_changed",
      eventData: { field, oldValue, newValue: value },
    });
    return updated;
  });
  if ((before.requirementData?.[field] ?? null) !== value) {
    await publishEvent("task.updated", {
      taskId: id,
      projectId: after.projectId,
      userId,
    });
    await publishEvent("activity.created", {
      taskId: id,
      projectId: after.projectId,
    });
  }
  return after;
}
