import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { projectTable, taskRelationTable, taskTable } from "../database/schema";
import { publishEvent } from "../events";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function validateParentLink(
  tx: Transaction,
  parentId: string,
  childId: string,
  projectId: string,
) {
  if (parentId === childId)
    throw new HTTPException(400, {
      message: "A task cannot be its own parent",
    });
  const [parent] = await tx
    .select({ id: taskTable.id, projectId: taskTable.projectId })
    .from(taskTable)
    .where(eq(taskTable.id, parentId));
  if (!parent || parent.projectId !== projectId)
    throw new HTTPException(400, {
      message: "The parent must belong to the same project",
    });
  const cycles = await tx.execute(sql`with recursive descendants(id) as (
    select ${childId}::text
    union select r.target_task_id from task_relation r join descendants d on r.source_task_id=d.id where r.relation_type='subtask'
  ) select id from descendants where id=${parentId} limit 1`);
  if (cycles.rows.length)
    throw new HTTPException(400, {
      message: "This parent would create a task cycle",
    });
}

export async function setParentInTransaction(
  tx: Transaction,
  childId: string,
  parentId: string | null,
  projectId: string,
) {
  const [project] = await tx
    .select({ kind: projectTable.kind })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .for("update");
  if (!project || project.kind === "requirement")
    throw new HTTPException(400, {
      message: "Requirements cannot have parent tasks",
    });
  if (parentId) await validateParentLink(tx, parentId, childId, projectId);
  await tx
    .delete(taskRelationTable)
    .where(
      and(
        eq(taskRelationTable.targetTaskId, childId),
        eq(taskRelationTable.relationType, "subtask"),
      ),
    );
  if (parentId)
    await tx.insert(taskRelationTable).values({
      sourceTaskId: parentId,
      targetTaskId: childId,
      relationType: "subtask",
    });
}

export async function setTaskParent(
  taskId: string,
  parentId: string | null,
  actor: string,
  workspaceId: string,
) {
  const [task] = await db
    .select({ projectId: taskTable.projectId })
    .from(taskTable)
    .where(eq(taskTable.id, taskId));
  if (!task) throw new HTTPException(404, { message: "Task not found" });
  await db.transaction(async (tx) => {
    const [lockedProject] = await tx
      .select({ id: projectTable.id, workspaceId: projectTable.workspaceId })
      .from(projectTable)
      .where(eq(projectTable.id, task.projectId))
      .for("update");
    if (!lockedProject || lockedProject.workspaceId !== workspaceId)
      throw new HTTPException(409, { message: "Project moved; reload" });
    const [current] = await tx
      .select({ projectId: taskTable.projectId })
      .from(taskTable)
      .where(eq(taskTable.id, taskId))
      .for("update");
    if (!current || current.projectId !== task.projectId)
      throw new HTTPException(409, { message: "Task moved; retry" });
    await setParentInTransaction(tx, taskId, parentId, task.projectId);
  });
  await publishEvent("task-relation.refresh", {
    projectId: task.projectId,
    userId: actor,
  });
  await publishEvent("subtask-parents.refresh", {
    projects: [{ projectId: task.projectId }],
  });
  return { parentTaskId: parentId };
}
