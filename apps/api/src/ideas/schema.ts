import { pagingNumber, z } from "../openapi";
export const ideaStatus = z.enum(["inbox", "evaluating", "adopted", "parked"]);
export const ideaBody = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(100000).default(""),
    status: ideaStatus.default("inbox"),
    tags: z.array(z.string().trim().min(1).max(32)).max(12).default([]),
    pinned: z.boolean().default(false),
  })
  .strict();
export const editIdeaBody = ideaBody.extend({
  version: z.number().int().positive(),
});
export const listIdeasQuery = z.object({
  search: z.string().trim().max(200).default(""),
  status: ideaStatus.optional(),
  tag: z.string().trim().max(32).optional(),
  page: pagingNumber(1, 100000).default(1),
});
export const ideaSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  description: z.string(),
  status: ideaStatus,
  tags: z.array(z.string()),
  pinned: z.boolean(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  creatorName: z.string().nullable(),
  updatedByName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  convertedTaskId: z.string().nullable(),
  convertedAt: z.string().nullable(),
});
export const ideaListSchema = z.object({
  items: z.array(
    ideaSchema.omit({ description: true }).extend({ excerpt: z.string() }),
  ),
  total: z.number(),
  page: z.number(),
  pages: z.number(),
  counts: z.object({
    all: z.number(),
    inbox: z.number(),
    evaluating: z.number(),
    adopted: z.number(),
    parked: z.number(),
  }),
  tags: z.array(z.string()),
});
export const convertIdeaBody = z.object({
  version: z.number().int().positive(),
  customFields: z
    .array(z.object({ fieldId: z.string(), value: z.string() }))
    .max(100)
    .optional(),
});
export const convertIdeaSchema = z.object({
  taskId: z.string(),
  existing: z.boolean(),
});
