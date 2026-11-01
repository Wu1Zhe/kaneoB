import { and, desc, eq, lt, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { requireEntitlement } from "../billing/require-entitlement-middleware";
import { dashboardSnapshotTable } from "../database/schema";
import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { getReport } from "./get-report";
import { reportQuery, reportSchema, snapshotSchema } from "./schema";
const params = z.object({ id: z.string() });
const middleware = [
  workspaceAccess.fromProject(),
  requireWorkspacePermission({ project: ["read"], task: ["read"] }),
] as const;
const errors = {
  400: errorResponse("Invalid reporting interval"),
  403: errorResponse("No project read access"),
  404: errorResponse("Project not found"),
  503: errorResponse("Reporting query timed out"),
};
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Reports"],
  operationId: "getDashboardReport",
  summary: "Get a project-scoped report",
  description:
    "Reports use immutable task revisions and Asia/Shanghai calendar weeks. Missing historical periods are marked unavailable. Only the caller's accessible project is included.",
  middleware: [...middleware],
  request: { params, query: reportQuery },
  responses: { 200: jsonResponse("Report", reportSchema), ...errors },
});
const listRoute = createRoute({
  method: "get",
  path: "/{id}/snapshots",
  tags: ["Reports"],
  operationId: "getDashboardSnapshots",
  summary: "List saved reporting snapshots",
  middleware: [...middleware],
  request: {
    params,
    query: z.object({
      before: z.iso.datetime().optional(),
      beforeId: z.string().optional(),
    }),
  },
  responses: {
    200: jsonResponse(
      "Latest snapshots, at most 50 per page",
      z.array(snapshotSchema),
    ),
    ...errors,
  },
});
const saveRoute = createRoute({
  method: "post",
  path: "/{id}/snapshots",
  tags: ["Reports"],
  operationId: "saveDashboardSnapshot",
  summary: "Save an immutable reporting snapshot",
  middleware: [
    workspaceAccess.fromProject(),
    requireWorkspacePermission({ project: ["read"], task: ["read", "update"] }),
    requireEntitlement,
  ] as const,
  request: {
    params,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: reportQuery.extend({
            staleDays: z.number().int().min(1).max(365).default(3),
            name: z.string().trim().min(1).max(160),
          }),
        },
      },
    },
  },
  responses: { 200: jsonResponse("Saved snapshot", snapshotSchema), ...errors },
});
const reporting = apiRouter()
  .openapi(getRoute, async (c) => {
    const query = c.req.valid("query");
    return c.json(
      await getReport(
        c.req.valid("param").id,
        query.since,
        query.until,
        query.staleDays,
      ),
      200,
    );
  })
  .openapi(listRoute, async (c) => {
    const { before, beforeId } = c.req.valid("query");
    const rows = await db
      .select()
      .from(dashboardSnapshotTable)
      .where(
        and(
          eq(dashboardSnapshotTable.projectId, c.req.valid("param").id),
          before
            ? or(
                lt(dashboardSnapshotTable.createdAt, new Date(before)),
                beforeId
                  ? and(
                      eq(dashboardSnapshotTable.createdAt, new Date(before)),
                      lt(dashboardSnapshotTable.id, beforeId),
                    )
                  : undefined,
              )
            : undefined,
        ),
      )
      .orderBy(
        desc(dashboardSnapshotTable.createdAt),
        desc(dashboardSnapshotTable.id),
      )
      .limit(50);
    return c.json(
      rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        data: reportSchema.parse(row.data),
      })),
      200,
    );
  })
  .openapi(saveRoute, async (c) => {
    const { name, since, until, staleDays } = c.req.valid("json");
    const data = await getReport(
      c.req.valid("param").id,
      since,
      until,
      staleDays,
    );
    const [row] = await db
      .insert(dashboardSnapshotTable)
      .values({
        projectId: data.project.id,
        createdBy: c.get("userId"),
        name,
        data,
      })
      .returning();
    if (!row)
      throw new HTTPException(500, { message: "Could not save snapshot" });
    return c.json(
      { ...row, createdAt: row.createdAt.toISOString(), data },
      200,
    );
  });
export default reporting;
