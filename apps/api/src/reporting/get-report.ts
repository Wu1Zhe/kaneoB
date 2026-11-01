import { boundedTaskRead } from "../task/bounded-read";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  columnTable,
  projectTable,
  taskRevisionTable,
} from "../database/schema";
import { buildReport } from "./build-report";
import { DAY, monday } from "./model";

export async function getReport(
  projectId: string,
  since: string,
  until: string,
  staleDays = 3,
) {
  return boundedTaskRead(async (database) => {
    const project = await database.query.projectTable.findFirst({
      where: eq(projectTable.id, projectId),
    });
    if (!project)
      throw new HTTPException(404, { message: "Project not found" });
    const now = Date.now();
    const start = new Date(since).getTime();
    const end = new Date(until).getTime();
    if (
      !Number.isFinite(start + end) ||
      start > end ||
      end - start > 366 * DAY ||
      start > now
    )
      throw new HTTPException(400, {
        message: "Select a valid reporting interval of at most one year",
      });
    const windowStart = Math.min(
      start,
      monday(Math.min(end, now)) - 12 * 7 * DAY,
    );
    const seed = await database
      .selectDistinctOn([taskRevisionTable.taskId])
      .from(taskRevisionTable)
      .where(
        and(
          eq(taskRevisionTable.projectId, projectId),
          lte(taskRevisionTable.recordedAt, new Date(windowStart)),
        ),
      )
      .orderBy(
        taskRevisionTable.taskId,
        sql`${taskRevisionTable.recordedAt} desc`,
        sql`${taskRevisionTable.id} desc`,
      );
    const changes = await database
      .select()
      .from(taskRevisionTable)
      .where(
        and(
          eq(taskRevisionTable.projectId, projectId),
          gte(taskRevisionTable.recordedAt, new Date(windowStart)),
          lte(taskRevisionTable.recordedAt, new Date(Math.min(end, now))),
        ),
      )
      .orderBy(asc(taskRevisionTable.recordedAt), asc(taskRevisionTable.id));
    const revisions = [
      ...new Map(
        [...seed, ...changes].map((revision) => [revision.id, revision]),
      ).values(),
    ].sort(
      (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime() || a.id - b.id,
    );
    const columns = await database
      .select({
        slug: columnTable.slug,
        name: columnTable.name,
        isFinal: columnTable.isFinal,
      })
      .from(columnTable)
      .where(eq(columnTable.projectId, projectId))
      .orderBy(asc(columnTable.position));
    return buildReport({
      project: {
        id: project.id,
        name: project.name,
        kind: project.kind,
        slug: project.slug,
      },
      revisions,
      columns,
      since: start,
      until: end,
      now,
      coverageStart: project.reportingStartedAt.getTime(),
      staleDays,
    });
  }, "Reporting query took too long; narrow the interval and retry");
}
