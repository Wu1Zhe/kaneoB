import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import {
  authorizePortalWrite,
  listPortal,
  removePortal,
  reorderPortal,
  savePortal,
} from "./controllers";
import { portalBody, portalSchema, portalScope } from "./schema";
const params = z.object({ workspaceId: z.string() });
const itemParams = params.extend({ id: z.string() });
const read = [
  workspaceAccess.fromParam(),
  requireWorkspacePermission({ workspace: ["read"] }),
] as const;
const errors = {
  400: errorResponse("Invalid portal entry"),
  403: errorResponse("Insufficient permissions"),
  404: errorResponse("Workspace not found"),
  409: errorResponse("Portal changed; reload"),
};
const body = <T extends z.ZodType>(schema: T) => ({
  required: true as const,
  content: { "application/json": { schema } },
});
const portal = apiRouter()
  .openapi(
    createRoute({
      method: "get",
      path: "/{workspaceId}",
      operationId: "listPortal",
      tags: ["Portal"],
      summary: "List workspace-shared or own personal website links",
      middleware: [...read],
      request: { params, query: z.object({ scope: portalScope }) },
      responses: {
        200: jsonResponse("Links", z.array(portalSchema)),
        ...errors,
      },
    }),
    async (c) =>
      c.json(
        await listPortal(
          c.req.valid("param").workspaceId,
          c.get("userId"),
          c.req.valid("query").scope,
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{workspaceId}",
      operationId: "createPortalLink",
      tags: ["Portal"],
      summary: "Create a website shortcut",
      middleware: [...read],
      request: { params, body: body(portalBody) },
      responses: { 200: jsonResponse("Link", portalSchema), ...errors },
    }),
    async (c) => {
      const input = c.req.valid("json");
      await authorizePortalWrite(c, input.scope);
      return c.json(
        await savePortal(
          c.req.valid("param").workspaceId,
          c.get("userId"),
          input,
        ),
        200,
      );
    },
  )
  .openapi(
    createRoute({
      method: "put",
      path: "/{workspaceId}/{id}",
      operationId: "updatePortalLink",
      tags: ["Portal"],
      summary: "Edit a shortcut with optimistic concurrency",
      middleware: [...read],
      request: {
        params: itemParams,
        body: body(portalBody.extend({ version: z.number().int().positive() })),
      },
      responses: { 200: jsonResponse("Link", portalSchema), ...errors },
    }),
    async (c) => {
      const input = c.req.valid("json");
      await authorizePortalWrite(c, input.scope);
      const { workspaceId, id } = c.req.valid("param");
      return c.json(
        await savePortal(
          workspaceId,
          c.get("userId"),
          input,
          id,
          input.version,
        ),
        200,
      );
    },
  )
  .openapi(
    createRoute({
      method: "delete",
      path: "/{workspaceId}/{id}",
      operationId: "deletePortalLink",
      tags: ["Portal"],
      summary: "Delete a shortcut in the authorized scope",
      middleware: [...read],
      request: {
        params: itemParams,
        body: body(
          z.object({
            scope: portalScope,
            version: z.number().int().positive(),
          }),
        ),
      },
      responses: {
        200: jsonResponse("Deleted", z.object({ success: z.boolean() })),
        ...errors,
      },
    }),
    async (c) => {
      const input = c.req.valid("json");
      await authorizePortalWrite(c, input.scope);
      const { workspaceId, id } = c.req.valid("param");
      return c.json(
        await removePortal(
          workspaceId,
          c.get("userId"),
          input.scope,
          id,
          input.version,
        ),
        200,
      );
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{workspaceId}/reorder",
      operationId: "reorderPortalLinks",
      tags: ["Portal"],
      summary:
        "Reorder every shortcut in a scope without losing concurrent edits",
      middleware: [...read],
      request: {
        params,
        body: body(
          z.object({
            scope: portalScope,
            entries: z
              .array(
                z.object({
                  id: z.string(),
                  version: z.number().int().positive(),
                }),
              )
              .max(100),
          }),
        ),
      },
      responses: {
        200: jsonResponse("Sorted", z.object({ success: z.boolean() })),
        ...errors,
      },
    }),
    async (c) => {
      const input = c.req.valid("json");
      await authorizePortalWrite(c, input.scope);
      return c.json(
        await reorderPortal(
          c.req.valid("param").workspaceId,
          c.get("userId"),
          input.scope,
          input.entries,
        ),
        200,
      );
    },
  );
export default portal;
