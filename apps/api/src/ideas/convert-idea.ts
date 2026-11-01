import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import {
  assetTable,
  columnTable,
  ideaTable,
  projectTable,
  taskTable,
} from "../database/schema";
import { publishEvent } from "../events";
import { extractAssetIds } from "../storage/cleanup-assets";
import { copyTaskAssetObject, deleteS3Object } from "../storage/s3";
import createTask, {
  publishTaskCreated,
} from "../task/controllers/create-task";
import { assertIdeaProject } from "./controllers";

export async function convertIdea(
  projectId: string,
  ideaId: string,
  userId: string,
  input: {
    version: number;
    customFields?: Array<{ fieldId: string; value: string }>;
  },
) {
  const project = await assertIdeaProject(projectId);
  const copied: string[] = [];
  let committed = false;
  let created: typeof taskTable.$inferSelect | undefined;
  try {
    const result = await db.transaction(async (tx) => {
      // Task creation locks the project before its children. Keep that order.
      await tx
        .select({ id: projectTable.id })
        .from(projectTable)
        .where(eq(projectTable.id, projectId))
        .for("update");
      const [idea] = await tx
        .select()
        .from(ideaTable)
        .where(
          and(eq(ideaTable.id, ideaId), eq(ideaTable.projectId, projectId)),
        )
        .for("update");
      if (!idea) throw new HTTPException(404, { message: "Idea not found" });
      if (idea.convertedAt) {
        if (!idea.convertedTaskId)
          throw new HTTPException(409, {
            message: "The converted task was removed",
          });
        return { taskId: idea.convertedTaskId, existing: true };
      }
      if (idea.version !== input.version)
        throw new HTTPException(409, {
          message: "Idea changed; reload before converting",
        });
      const columns = await tx
        .select()
        .from(columnTable)
        .where(eq(columnTable.projectId, projectId))
        .orderBy(asc(columnTable.position));
      const column = columns.find((item) => !item.isFinal);
      const task = await createTask(
        {
          projectId,
          currentUserId: userId,
          title: idea.title,
          description: idea.description,
          status: column?.slug ?? "planned",
          customFields: input.customFields,
        },
        { database: tx, deferEvent: true },
      );
      let description = idea.description;
      const ids = [...extractAssetIds(description)];
      if (ids.length) {
        const assets = await tx
          .select()
          .from(assetTable)
          .where(
            and(
              inArray(assetTable.id, ids),
              eq(assetTable.projectId, projectId),
              eq(assetTable.surface, `idea-${ideaId}`),
            ),
          );
        if (assets.length !== ids.length)
          throw new HTTPException(409, {
            message: "An idea attachment is no longer available",
          });
        for (const asset of assets) {
          const id = createId();
          const key = await copyTaskAssetObject({
            sourceKey: asset.objectKey,
            destination: {
              workspaceId: project.workspaceId,
              projectId,
              taskId: task.id,
              surface: "description",
              filename: asset.filename,
              contentType: asset.mimeType,
            },
          });
          copied.push(key);
          await tx.insert(assetTable).values({
            ...asset,
            id,
            objectKey: key,
            taskId: task.id,
            surface: "description",
            createdBy: userId,
            createdAt: new Date(),
          });
          description = description.replaceAll(
            `/api/asset/${asset.id}`,
            `/api/asset/${id}`,
          );
        }
      }
      const source = `/dashboard/workspace/${project.workspaceId}/project/${projectId}/ideas?ideaId=${ideaId}`;
      description += `\n\n[💡 ${idea.title.replace(/[[\]\\]/g, "")}](${source})`;
      const [updated] = await tx
        .update(taskTable)
        .set({ description })
        .where(eq(taskTable.id, task.id))
        .returning();
      created = updated;
      await tx
        .update(ideaTable)
        .set({
          status: "adopted",
          convertedTaskId: task.id,
          convertedAt: new Date(),
          updatedBy: userId,
          version: idea.version + 1,
        })
        .where(eq(ideaTable.id, ideaId));
      return { taskId: task.id, existing: false };
    });
    committed = true;
    if (created) await publishTaskCreated(created, userId);
    await publishEvent("idea.changed", { projectId });
    return result;
  } catch (error) {
    // Only remove copied objects when the database transaction failed.
    if (!committed)
      await Promise.allSettled(copied.map((key) => deleteS3Object(key)));
    throw error;
  }
}
