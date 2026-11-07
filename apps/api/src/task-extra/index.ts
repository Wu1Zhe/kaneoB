import type { Context } from "hono";
import { requireEntitlement } from "../billing/require-entitlement-middleware";
import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { updateCollaborators } from "../task/collaboration";
import { taskSchema } from "../task/response";
import { setTaskParent } from "../task-relation/parent";

const params = z.object({ id: z.string().min(1) });
const errors = {
  400: errorResponse("Invalid assignment or parent"),
  403: errorResponse("Insufficient permissions"),
  404: errorResponse("Task not found"),
  409: errorResponse("Task changed; retry"),
};
const router = apiRouter()
  .openapi(
    createRoute({
      method: "put",
      path: "/{id}/collaborators",
      operationId: "updateTaskCollaborators",
      tags: ["Tasks"],
      summary:
        "Replace task collaborators; the primary assignee remains separate",
      middleware: [
        workspaceAccess.fromTask(),
        requireWorkspacePermission({ task: ["assign"] }),
        requireEntitlement,
      ],
      request: {
        params,
        body: {
          required: true,
          content: {
            "application/json": {
              schema: z.object({
                collaboratorIds: z.array(z.string().min(1)).max(50),
              }),
            },
          },
        },
      },
      responses: { 200: jsonResponse("Updated task", taskSchema), ...errors },
    }),
    async (c) =>
      c.json(
        await updateCollaborators(
          c.req.valid("param").id,
          c.req.valid("json").collaboratorIds,
          c.get("userId"),
          (c as Context).get("workspaceId") as string,
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "put",
      path: "/{id}/parent",
      operationId: "setTaskParent",
      tags: ["Tasks"],
      summary: "Set, replace or remove a task's single same-project parent",
      middleware: [
        workspaceAccess.fromTask(),
        requireWorkspacePermission({ task: ["update"] }),
        requireEntitlement,
      ],
      request: {
        params,
        body: {
          required: true,
          content: {
            "application/json": {
              schema: z.object({ parentTaskId: z.string().min(1).nullable() }),
            },
          },
        },
      },
      responses: {
        200: jsonResponse(
          "Parent",
          z.object({ parentTaskId: z.string().nullable() }),
        ),
        ...errors,
      },
    }),
    async (c) =>
      c.json(
        await setTaskParent(
          c.req.valid("param").id,
          c.req.valid("json").parentTaskId,
          c.get("userId"),
          (c as Context).get("workspaceId") as string,
        ),
        200,
      ),
  );
export default router;
