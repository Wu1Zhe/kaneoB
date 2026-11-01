import { pagingNumber, z } from "../openapi";

export const activitiesQuery = z.object({
  limit: pagingNumber(1, 100).optional().openapi({
    description: "Maximum number of recent activities; omit for the full feed.",
  }),
});

export const taskIdParam = z.object({ taskId: z.string() });

export const workspaceIdParam = z.object({ workspaceId: z.string().min(1) });

export const projectChangesQuery = z
  .object({
    kind: z.enum(["project", "requirement"]).optional(),
    since: z.iso.datetime(),
    until: z.iso.datetime(),
    before: z.iso.datetime().optional(),
    beforeId: z.string().min(1).max(128).optional(),
    limit: pagingNumber(1, 100).default(50),
  })
  .refine(
    (query) => {
      const duration = Date.parse(query.until) - Date.parse(query.since);
      return duration > 0 && duration <= 26 * 60 * 60 * 1000;
    },
    {
      message: "The requested window must be at most one local day (26 hours).",
    },
  )
  .refine((query) => Boolean(query.before) === Boolean(query.beforeId), {
    message: "Both cursor fields must be supplied together.",
  });

export const createActivityBody = z.object({
  taskId: z.string(),
  message: z.string().nullable().openapi({
    description:
      "Free-text body. Null for events whose meaning is in eventData.",
  }),
  type: z.string().openapi({
    description: "The event kind, e.g. status_changed or assignee_changed.",
  }),
  eventData: z.record(z.string(), z.unknown()).nullable().optional().openapi({
    description: "Type-specific payload stored alongside the event.",
  }),
});

export const createCommentBody = z.object({
  taskId: z.string(),
  comment: z.string().max(10_000),
});

export const updateCommentBody = z.object({
  activityId: z.string(),
  comment: z.string().max(10_000),
});

export const deleteCommentBody = z.object({ activityId: z.string() });
