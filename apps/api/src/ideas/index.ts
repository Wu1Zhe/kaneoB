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
import { createIdea, getIdea, listIdeas, updateIdea } from "./controllers";
import { convertIdea } from "./convert-idea";
import {
  convertIdeaBody,
  convertIdeaSchema,
  editIdeaBody,
  ideaBody,
  ideaListSchema,
  ideaSchema,
  listIdeasQuery,
} from "./schema";
const projectParams = z.object({ projectId: z.string() });
const ideaParams = projectParams.extend({ ideaId: z.string() });
const read = [
  workspaceAccess.fromProject("projectId"),
  requireWorkspacePermission({ project: ["read"], task: ["read"] }),
] as const;
const create = [
  ...read,
  requireWorkspacePermission({ task: ["create"] }),
  requireEntitlement,
] as const;
const update = [
  ...read,
  requireWorkspacePermission({ task: ["update"] }),
  requireEntitlement,
] as const;
const errors = {
  400: errorResponse("Invalid idea"),
  403: errorResponse("Insufficient permissions"),
  404: errorResponse("Idea or project not found"),
  409: errorResponse("Idea changed or task already removed"),
};
const jsonBody = <T extends z.ZodType>(schema: T) => ({
  required: true as const,
  content: { "application/json": { schema } },
});
const ideas = apiRouter()
  .openapi(
    createRoute({
      method: "get",
      path: "/{projectId}",
      tags: ["Ideas"],
      operationId: "listProjectIdeas",
      summary: "List project ideas with search, status and tag filters",
      middleware: [...read],
      request: { params: projectParams, query: listIdeasQuery },
      responses: { 200: jsonResponse("Ideas", ideaListSchema), ...errors },
    }),
    async (c) =>
      c.json(
        await listIdeas(c.req.valid("param").projectId, c.req.valid("query")),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/{projectId}/{ideaId}",
      tags: ["Ideas"],
      operationId: "getProjectIdea",
      summary: "Get a project idea",
      middleware: [...read],
      request: { params: ideaParams },
      responses: { 200: jsonResponse("Idea", ideaSchema), ...errors },
    }),
    async (c) => {
      const { projectId, ideaId } = c.req.valid("param");
      return c.json(await getIdea(projectId, ideaId), 200);
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{projectId}",
      tags: ["Ideas"],
      operationId: "createProjectIdea",
      summary: "Capture a project idea without creating a task",
      middleware: [...create],
      request: { params: projectParams, body: jsonBody(ideaBody) },
      responses: { 200: jsonResponse("Created idea", ideaSchema), ...errors },
    }),
    async (c) =>
      c.json(
        await createIdea(
          c.req.valid("param").projectId,
          c.get("userId"),
          c.req.valid("json"),
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "put",
      path: "/{projectId}/{ideaId}",
      tags: ["Ideas"],
      operationId: "updateProjectIdea",
      summary:
        "Edit idea content, tags, pin and state with optimistic concurrency",
      middleware: [...update],
      request: { params: ideaParams, body: jsonBody(editIdeaBody) },
      responses: { 200: jsonResponse("Updated idea", ideaSchema), ...errors },
    }),
    async (c) => {
      const { projectId, ideaId } = c.req.valid("param");
      return c.json(
        await updateIdea(
          projectId,
          ideaId,
          c.get("userId"),
          c.req.valid("json"),
        ),
        200,
      );
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{projectId}/{ideaId}/convert",
      tags: ["Ideas"],
      operationId: "convertProjectIdea",
      summary: "Adopt an idea and create exactly one task",
      description:
        "Atomic and idempotent conversion retains the source idea, copies its attachments and validates required project custom fields. An already converted idea returns its existing task.",
      middleware: [...update, requireWorkspacePermission({ task: ["create"] })],
      request: { params: ideaParams, body: jsonBody(convertIdeaBody) },
      responses: {
        200: jsonResponse("Linked task", convertIdeaSchema),
        ...errors,
      },
    }),
    async (c) => {
      const { projectId, ideaId } = c.req.valid("param");
      return c.json(
        await convertIdea(
          projectId,
          ideaId,
          c.get("userId"),
          c.req.valid("json"),
        ),
        200,
      );
    },
  );
export default ideas;
