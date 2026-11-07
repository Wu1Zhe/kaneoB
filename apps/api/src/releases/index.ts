import { eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { releaseReadTable } from "../database/schema";
import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { releaseNotes } from "./notes";
const localized = z.object({ zh: z.string(), en: z.string() });
const noteSchema = z.object({
  sequence: z.number(),
  version: z.string(),
  date: z.string(),
  title: localized,
  items: z.object({ zh: z.array(z.string()), en: z.array(z.string()) }),
});
const releases = apiRouter()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      operationId: "getReleaseNotes",
      tags: ["Releases"],
      summary: "Read platform update history and this account's read position",
      responses: {
        200: jsonResponse(
          "Updates",
          z.object({
            notes: z.array(noteSchema),
            lastReadSequence: z.number(),
          }),
        ),
      },
    }),
    async (c) => {
      const [read] = await db
        .select()
        .from(releaseReadTable)
        .where(eq(releaseReadTable.userId, c.get("userId")));
      return c.json(
        {
          notes: [...releaseNotes]
            .sort((a, b) => b.sequence - a.sequence)
            .map((note) => ({
              ...note,
              items: { zh: [...note.items.zh], en: [...note.items.en] },
            })),
          lastReadSequence: read?.releaseSequence ?? 0,
        },
        200,
      );
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/read",
      operationId: "acknowledgeReleaseNotes",
      tags: ["Releases"],
      summary:
        "Mark a known release and all preceding releases read for this account",
      request: {
        body: {
          required: true,
          content: {
            "application/json": {
              schema: z.object({ sequence: z.number().int().positive() }),
            },
          },
        },
      },
      responses: {
        200: jsonResponse("Acknowledged", z.object({ success: z.boolean() })),
        400: errorResponse("Unknown release"),
      },
    }),
    async (c) => {
      const { sequence } = c.req.valid("json");
      if (!releaseNotes.some((note) => note.sequence === sequence))
        throw new HTTPException(400, { message: "Unknown release" });
      await db
        .insert(releaseReadTable)
        .values({ userId: c.get("userId"), releaseSequence: sequence })
        .onConflictDoUpdate({
          target: releaseReadTable.userId,
          set: {
            releaseSequence: sql`greatest(${releaseReadTable.releaseSequence}, ${sequence})`,
            readAt: new Date(),
          },
        });
      return c.json({ success: true }, 200);
    },
  );
export default releases;
