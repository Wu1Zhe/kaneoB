import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { z } from "../openapi";
import db from "../database";
import { ideaTable, projectTable } from "../database/schema";
import { publishEvent } from "../events";
import { claimIdeaAssets } from "./assets";
import { ideaExcerpt } from "./excerpt";
import type { editIdeaBody, ideaBody, listIdeasQuery } from "./schema";
const selection = {
  ...getTableColumns(ideaTable),
  creatorName: sql<
    string | null
  >`(select name from "user" where id=${ideaTable.createdBy})`,
  updatedByName: sql<
    string | null
  >`(select name from "user" where id=${ideaTable.updatedBy})`,
};
type IdeaRow = typeof ideaTable.$inferSelect & {
  creatorName: string | null;
  updatedByName: string | null;
};
function serialize(row: IdeaRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    convertedAt: row.convertedAt?.toISOString() ?? null,
  };
}
export async function assertIdeaProject(projectId: string) {
  const project = await db.query.projectTable.findFirst({
    where: eq(projectTable.id, projectId),
  });
  if (!project || project.kind !== "project")
    throw new HTTPException(404, {
      message: "Ideas are available for projects only",
    });
  return project;
}
export async function getIdea(projectId: string, ideaId: string) {
  await assertIdeaProject(projectId);
  const [idea] = await db
    .select(selection)
    .from(ideaTable)
    .where(and(eq(ideaTable.id, ideaId), eq(ideaTable.projectId, projectId)));
  if (!idea) throw new HTTPException(404, { message: "Idea not found" });
  return serialize(idea);
}
export async function listIdeas(
  projectId: string,
  query: z.infer<typeof listIdeasQuery>,
) {
  await assertIdeaProject(projectId);
  const escaped = query.search.replace(/[\\%_]/g, "\\$&");
  const base = and(
    eq(ideaTable.projectId, projectId),
    query.search
      ? or(
          ilike(ideaTable.title, `%${escaped}%`),
          ilike(ideaTable.description, `%${escaped}%`),
        )
      : undefined,
    query.tag
      ? sql`${ideaTable.tags} @> ${JSON.stringify([query.tag])}::jsonb`
      : undefined,
  );
  const filter = and(
    base,
    query.status ? eq(ideaTable.status, query.status) : undefined,
  );
  const result = await db.transaction(
    async (tx) => {
      const counts = { all: 0, inbox: 0, evaluating: 0, adopted: 0, parked: 0 };
      const grouped = await tx
        .select({ status: ideaTable.status, count: count() })
        .from(ideaTable)
        .where(base)
        .groupBy(ideaTable.status);
      for (const row of grouped) {
        counts[row.status] = row.count;
        counts.all += row.count;
      }
      const total = query.status ? counts[query.status] : counts.all;
      const rows = await tx
        .select({
          ...selection,
          description: sql<string>`left(${ideaTable.description}, 1500)`,
        })
        .from(ideaTable)
        .where(filter)
        .orderBy(
          desc(ideaTable.pinned),
          desc(ideaTable.updatedAt),
          asc(ideaTable.id),
        )
        .limit(24)
        .offset((query.page - 1) * 24);
      const tags = await tx
        .selectDistinct({
          value: sql<string>`jsonb_array_elements_text(${ideaTable.tags})`,
        })
        .from(ideaTable)
        .where(eq(ideaTable.projectId, projectId))
        .orderBy(sql`1`)
        .limit(300);
      return {
        items: rows.map((row) => {
          const { description, ...idea } = serialize(row);
          return { ...idea, excerpt: ideaExcerpt(description) };
        }),
        total,
        page: query.page,
        pages: Math.ceil(total / 24),
        counts,
        tags: tags.map((row) => row.value),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
  return result;
}
export async function createIdea(
  projectId: string,
  userId: string,
  body: z.infer<typeof ideaBody>,
) {
  await assertIdeaProject(projectId);
  const idea = await db.transaction(async (tx) => {
    await tx
      .select({ id: projectTable.id })
      .from(projectTable)
      .where(eq(projectTable.id, projectId))
      .for("update");
    const [row] = await tx
      .insert(ideaTable)
      .values({
        ...body,
        tags: [...new Set(body.tags)],
        projectId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    if (!row)
      throw new HTTPException(500, { message: "Could not create idea" });
    await claimIdeaAssets(tx, {
      id: row.id,
      projectId,
      userId,
      description: body.description,
    });
    return row;
  });
  await publishEvent("idea.changed", { projectId });
  return getIdea(projectId, idea.id);
}
export async function updateIdea(
  projectId: string,
  ideaId: string,
  userId: string,
  body: z.infer<typeof editIdeaBody>,
) {
  await assertIdeaProject(projectId);
  await db.transaction(async (tx) => {
    await tx
      .select({ id: projectTable.id })
      .from(projectTable)
      .where(eq(projectTable.id, projectId))
      .for("update");
    const [previous] = await tx
      .select()
      .from(ideaTable)
      .where(and(eq(ideaTable.id, ideaId), eq(ideaTable.projectId, projectId)))
      .for("update");
    if (!previous) throw new HTTPException(404, { message: "Idea not found" });
    if (previous.version !== body.version)
      throw new HTTPException(409, {
        message: "Idea changed; reload before saving",
      });
    if (previous.convertedAt && body.status !== "adopted")
      throw new HTTPException(409, {
        message: "A converted idea keeps its adopted state",
      });
    await claimIdeaAssets(tx, {
      id: ideaId,
      projectId,
      userId,
      description: body.description,
      previous: previous.description,
    });
    await tx
      .update(ideaTable)
      .set({
        ...body,
        tags: [...new Set(body.tags)],
        version: previous.version + 1,
        updatedBy: userId,
      })
      .where(eq(ideaTable.id, ideaId));
  });
  await publishEvent("idea.changed", { projectId });
  return getIdea(projectId, ideaId);
}
