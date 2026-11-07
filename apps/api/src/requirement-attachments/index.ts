import { and, eq, isNull } from "drizzle-orm";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { requirementAttachmentTable, taskTable } from "../database/schema";
import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { boundedRequestBody } from "../utils/bounded-request-body";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import {
  attachmentSelection,
  getRequirementAttachment,
  uploadRequirementExcel,
} from "./controllers";
import { MAX_EXCEL_BYTES } from "./file";
const params = z.object({ projectId: z.string() });
const fileParams = params.extend({ id: z.string() });
const fileSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  taskId: z.string().nullable(),
});
const read = [
  workspaceAccess.fromProject("projectId"),
  requireWorkspacePermission({ task: ["read"] }),
] as const;
const errors = {
  400: errorResponse("Invalid Excel attachment"),
  403: errorResponse("Insufficient permissions"),
  404: errorResponse("Attachment not found"),
  409: errorResponse("Project changed; retry"),
  413: errorResponse("Excel file too large"),
};
const attachments = apiRouter()
  .openapi(
    createRoute({
      method: "post",
      path: "/{projectId}/draft",
      operationId: "uploadRequirementExcel",
      tags: ["Requirements"],
      summary:
        "Stage a private Excel attachment for a new requirement, stored in the database",
      middleware: [
        ...read,
        requireWorkspacePermission({ task: ["create"] }),
        boundedRequestBody(MAX_EXCEL_BYTES + 65536, 30000),
      ],
      request: {
        params,
        body: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: z.object({
                file: z
                  .custom<File>()
                  .openapi({ type: "string", format: "binary" }),
              }),
            },
          },
        },
      },
      responses: { 200: jsonResponse("Attachment", fileSchema), ...errors },
    }),
    async (c) =>
      c.json(
        await uploadRequirementExcel(
          c.req.valid("param").projectId,
          (c as Context).get("workspaceId") as string,
          c.get("userId"),
          c.req.valid("form").file,
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/{projectId}/task/{id}",
      operationId: "listRequirementAttachments",
      tags: ["Requirements"],
      summary: "List a requirement's saved Excel attachments",
      middleware: [...read],
      request: { params: fileParams },
      responses: {
        200: jsonResponse("Attachments", z.array(fileSchema)),
        ...errors,
      },
    }),
    async (c) => {
      const { projectId, id } = c.req.valid("param");
      const [task] = await db
        .select({ id: taskTable.id })
        .from(taskTable)
        .where(and(eq(taskTable.id, id), eq(taskTable.projectId, projectId)));
      if (!task)
        throw new HTTPException(404, { message: "Requirement not found" });
      return c.json(
        await db
          .select(attachmentSelection)
          .from(requirementAttachmentTable)
          .where(
            and(
              eq(requirementAttachmentTable.projectId, projectId),
              eq(requirementAttachmentTable.taskId, id),
            ),
          ),
        200,
      );
    },
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/{projectId}/file/{id}",
      operationId: "downloadRequirementAttachment",
      tags: ["Requirements"],
      summary: "Download an authorized Excel attachment",
      middleware: [...read],
      request: { params: fileParams },
      responses: {
        200: {
          description: "Excel attachment",
          content: {
            "application/octet-stream": {
              schema: z.string().openapi({ format: "binary" }),
            },
          },
        },
        ...errors,
      },
    }),
    async (c) => {
      const { projectId, id } = c.req.valid("param");
      const file = await getRequirementAttachment(
        projectId,
        id,
        c.get("userId"),
      );
      c.header("Content-Type", file.mimeType);
      c.header(
        "Content-Disposition",
        `attachment; filename="attachment.${file.filename.toLowerCase().endsWith(".xlsx") ? "xlsx" : "xls"}"; filename*=UTF-8''${encodeURIComponent(file.filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16)}`)}`,
      );
      c.header("Cache-Control", "private, no-store");
      c.header("X-Content-Type-Options", "nosniff");
      return c.body(new Uint8Array(file.data), 200);
    },
  )
  .openapi(
    createRoute({
      method: "delete",
      path: "/{projectId}/file/{id}",
      operationId: "deleteRequirementAttachment",
      tags: ["Requirements"],
      summary: "Remove an Excel attachment or own staged upload",
      middleware: [...read],
      request: { params: fileParams },
      responses: {
        200: jsonResponse("Removed", z.object({ success: z.boolean() })),
        ...errors,
      },
    }),
    async (c) => {
      const { projectId, id } = c.req.valid("param");
      const file = await getRequirementAttachment(
        projectId,
        id,
        c.get("userId"),
      );
      await requireWorkspacePermission({
        task: [file.taskId ? "update" : "create"],
      })(c, async () => {});
      const removed = await db
        .delete(requirementAttachmentTable)
        .where(
          and(
            eq(requirementAttachmentTable.projectId, projectId),
            eq(requirementAttachmentTable.id, id),
            file.taskId
              ? eq(requirementAttachmentTable.taskId, file.taskId)
              : isNull(requirementAttachmentTable.taskId),
          ),
        )
        .returning({ id: requirementAttachmentTable.id });
      if (!removed.length)
        throw new HTTPException(409, { message: "Attachment changed; retry" });
      return c.json({ success: true }, 200);
    },
  );
export default attachments;
