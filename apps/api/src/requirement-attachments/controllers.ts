import { and, eq, isNull, lt } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { projectTable, requirementAttachmentTable } from "../database/schema";
import { validateExcel } from "./file";
export const attachmentSelection = {
  id: requirementAttachmentTable.id,
  filename: requirementAttachmentTable.filename,
  mimeType: requirementAttachmentTable.mimeType,
  size: requirementAttachmentTable.size,
  taskId: requirementAttachmentTable.taskId,
};
export async function uploadRequirementExcel(
  projectId: string,
  workspaceId: string,
  actor: string,
  file: File,
) {
  if (!(file instanceof File))
    throw new HTTPException(400, { message: "Choose an Excel file" });
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = validateExcel(file.name, bytes);
  const filename = Array.from(file.name)
    .slice(0, 200)
    .map((char) =>
      char.charCodeAt(0) < 32 ||
      char.charCodeAt(0) === 127 ||
      char === "/" ||
      char === "\\"
        ? "_"
        : char,
    )
    .join("");
  return db.transaction(async (tx) => {
    const [project] = await tx
      .select({
        kind: projectTable.kind,
        workspaceId: projectTable.workspaceId,
      })
      .from(projectTable)
      .where(eq(projectTable.id, projectId))
      .for("update");
    if (!project || project.workspaceId !== workspaceId)
      throw new HTTPException(409, {
        message: "Requirement project changed; reload",
      });
    if (project.kind !== "requirement")
      throw new HTTPException(400, {
        message: "Excel attachments are available for requirements",
      });
    await tx
      .delete(requirementAttachmentTable)
      .where(
        and(
          eq(requirementAttachmentTable.createdBy, actor),
          isNull(requirementAttachmentTable.taskId),
          lt(
            requirementAttachmentTable.createdAt,
            new Date(Date.now() - 86400000),
          ),
        ),
      );
    const [created] = await tx
      .insert(requirementAttachmentTable)
      .values({
        projectId,
        createdBy: actor,
        filename,
        mimeType,
        size: bytes.length,
        data: bytes,
      })
      .returning(attachmentSelection);
    return created;
  });
}
export async function getRequirementAttachment(
  projectId: string,
  id: string,
  actor: string,
) {
  const [file] = await db
    .select()
    .from(requirementAttachmentTable)
    .where(
      and(
        eq(requirementAttachmentTable.id, id),
        eq(requirementAttachmentTable.projectId, projectId),
      ),
    );
  if (
    !file ||
    (!file.taskId &&
      (file.createdBy !== actor ||
        file.createdAt.getTime() < Date.now() - 86400000))
  )
    throw new HTTPException(404, { message: "Attachment not found" });
  return file;
}
