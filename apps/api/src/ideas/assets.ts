import { and, eq, inArray, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type db from "../database";
import { assetTable } from "../database/schema";
import { extractAssetIds } from "../storage/cleanup-assets";
import { queueStorageCleanup } from "../storage/cleanup-queue";
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function claimIdeaAssets(
  tx: Transaction,
  context: {
    id: string;
    projectId: string;
    userId: string;
    description: string;
    previous?: string;
  },
) {
  const ids = [...extractAssetIds(context.description)];
  const surface = `idea-${context.id}`;
  if (ids.length) {
    const assets = await tx
      .select()
      .from(assetTable)
      .where(inArray(assetTable.id, ids))
      .for("update");
    if (
      assets.length !== ids.length ||
      assets.some(
        (asset) =>
          asset.projectId !== context.projectId ||
          asset.taskId !== null ||
          (asset.surface !== surface &&
            !(asset.surface === "draft" && asset.createdBy === context.userId)),
      )
    )
      throw new HTTPException(400, {
        message:
          "Idea attachments must belong to this idea or your project drafts",
      });
    await tx
      .update(assetTable)
      .set({ surface })
      .where(inArray(assetTable.id, ids));
  }
  const removed = [...extractAssetIds(context.previous)].filter(
    (id) => !ids.includes(id),
  );
  if (removed.length) {
    const deleted = await tx
      .delete(assetTable)
      .where(
        and(
          inArray(assetTable.id, removed),
          eq(assetTable.projectId, context.projectId),
          eq(assetTable.surface, surface),
          isNull(assetTable.taskId),
        ),
      )
      .returning({ objectKey: assetTable.objectKey });
    await queueStorageCleanup(
      tx,
      deleted.map((asset) => asset.objectKey),
    );
  }
}
