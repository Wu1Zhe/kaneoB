import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import db from "../database";
import { portalLinkTable, workspaceTable } from "../database/schema";
import type { z } from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import type { portalBody } from "./schema";

type Input = z.infer<typeof portalBody>;
export const portalScopeCondition = (
  workspaceId: string,
  userId: string,
  scope: Input["scope"],
) =>
  and(
    eq(portalLinkTable.workspaceId, workspaceId),
    scope === "personal"
      ? eq(portalLinkTable.ownerId, userId)
      : isNull(portalLinkTable.ownerId),
  );
const serialize = (row: typeof portalLinkTable.$inferSelect) => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
export async function authorizePortalWrite(c: Context, scope: Input["scope"]) {
  if (scope === "shared")
    await requireWorkspacePermission({ workspace: ["manage_settings"] })(
      c,
      async () => {},
    );
}
export async function listPortal(
  workspaceId: string,
  userId: string,
  scope: Input["scope"],
) {
  return (
    await db
      .select()
      .from(portalLinkTable)
      .where(portalScopeCondition(workspaceId, userId, scope))
      .orderBy(asc(portalLinkTable.position), asc(portalLinkTable.id))
      .limit(200)
  ).map(serialize);
}
export async function savePortal(
  workspaceId: string,
  userId: string,
  input: Input,
  id?: string,
  version?: number,
) {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: workspaceTable.id })
      .from(workspaceTable)
      .where(eq(workspaceTable.id, workspaceId))
      .for("update");
    const { scope, ...fields } = input;
    if (id) {
      const [updated] = await tx
        .update(portalLinkTable)
        .set({ ...fields, version: sql`${portalLinkTable.version}+1` })
        .where(
          and(
            portalScopeCondition(workspaceId, userId, scope),
            eq(portalLinkTable.id, id),
            eq(portalLinkTable.version, version ?? 0),
          ),
        )
        .returning();
      if (!updated)
        throw new HTTPException(409, {
          message: "Entry changed or is unavailable; reload before editing",
        });
      return serialize(updated);
    }
    const entries = await tx
      .select({ id: portalLinkTable.id, position: portalLinkTable.position })
      .from(portalLinkTable)
      .where(portalScopeCondition(workspaceId, userId, scope));
    if (entries.length >= 100)
      throw new HTTPException(400, {
        message: "At most 100 entries are allowed per scope",
      });
    const [created] = await tx
      .insert(portalLinkTable)
      .values({
        ...fields,
        workspaceId,
        ownerId: scope === "personal" ? userId : null,
        position: Math.max(-1, ...entries.map((e) => e.position)) + 1,
      })
      .returning();
    if (!created)
      throw new HTTPException(500, {
        message: "Unable to create portal entry",
      });
    return serialize(created);
  });
}
export async function removePortal(
  workspaceId: string,
  userId: string,
  scope: Input["scope"],
  id: string,
  version: number,
) {
  const rows = await db
    .delete(portalLinkTable)
    .where(
      and(
        portalScopeCondition(workspaceId, userId, scope),
        eq(portalLinkTable.id, id),
        eq(portalLinkTable.version, version),
      ),
    )
    .returning({ id: portalLinkTable.id });
  if (!rows.length)
    throw new HTTPException(409, {
      message: "Entry changed or is unavailable",
    });
  return { success: true };
}
export async function reorderPortal(
  workspaceId: string,
  userId: string,
  scope: Input["scope"],
  entries: { id: string; version: number }[],
) {
  await db.transaction(async (tx) => {
    await tx
      .select({ id: workspaceTable.id })
      .from(workspaceTable)
      .where(eq(workspaceTable.id, workspaceId))
      .for("update");
    const current = await tx
      .select({ id: portalLinkTable.id, version: portalLinkTable.version })
      .from(portalLinkTable)
      .where(portalScopeCondition(workspaceId, userId, scope));
    const versions = new Map(current.map((r) => [r.id, r.version]));
    if (
      entries.length !== current.length ||
      new Set(entries.map((e) => e.id)).size !== entries.length ||
      entries.some((e) => versions.get(e.id) !== e.version)
    )
      throw new HTTPException(409, {
        message: "Portal changed; reload before sorting",
      });
    for (const [position, entry] of entries.entries())
      await tx
        .update(portalLinkTable)
        .set({ position, version: sql`${portalLinkTable.version}+1` })
        .where(
          and(
            portalScopeCondition(workspaceId, userId, scope),
            eq(portalLinkTable.id, entry.id),
          ),
        );
  });
  return { success: true };
}
