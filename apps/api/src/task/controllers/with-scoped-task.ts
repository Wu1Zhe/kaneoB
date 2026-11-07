import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable, taskTable } from "../../database/schema";
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function withScopedTask<T>(
  id: string,
  workspaceId: string,
  mutate: (tx: Transaction, task: typeof taskTable.$inferSelect) => Promise<T>,
) {
  const [scope] = await db
    .select({ projectId: taskTable.projectId })
    .from(taskTable)
    .where(eq(taskTable.id, id));
  if (!scope) throw new HTTPException(404, { message: "Task not found" });
  return db.transaction(async (tx) => {
    // Match the project-before-task lock order used by project moves.
    const [project] = await tx
      .select({ workspaceId: projectTable.workspaceId })
      .from(projectTable)
      .where(eq(projectTable.id, scope.projectId))
      .for("share");
    if (!project || project.workspaceId !== workspaceId)
      throw new HTTPException(409, {
        message: "Project moved; reload before assigning",
      });
    const [task] = await tx
      .select()
      .from(taskTable)
      .where(
        and(eq(taskTable.id, id), eq(taskTable.projectId, scope.projectId)),
      )
      .for("update");
    if (!task) throw new HTTPException(409, { message: "Task moved; retry" });
    return { before: task, after: await mutate(tx, task) };
  });
}
