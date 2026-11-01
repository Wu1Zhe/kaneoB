import { pagingNumber, z } from "../openapi";
export const reportQuery = z.object({
  staleDays: pagingNumber(1, 365).default(3),
  since: z.iso.datetime(),
  until: z.iso.datetime(),
});
const nullableText = z.string().nullable();
export const reportTaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  number: z.number().nullable(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  statusName: z.string(),
  isFinal: z.boolean(),
  priority: z.string(),
  progress: z.number(),
  weight: z.number(),
  userId: nullableText,
  assigneeName: nullableText,
  creatorName: nullableText,
  updaterName: nullableText,
  createdAt: z.string(),
  updatedAt: z.string(),
  startDate: nullableText,
  dueDate: nullableText,
  actualStartAt: nullableText,
  actualEndAt: nullableText,
  requirementData: z.record(z.string(), nullableText).nullable(),
  enteredAt: nullableText,
  risk: z.string(),
  riskDays: z.number(),
  overdueStages: z.array(z.string()),
  stalledDays: z.number().nullable(),
});
const counts = z.object({
  total: z.number(),
  launched: z.number(),
  overdue: z.number(),
});
export const reportSchema = z
  .object({
    project: z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      kind: z.enum(["project", "requirement"]),
    }),
    since: z.string(),
    until: z.string(),
    asOf: z.string(),
    coverageStart: z.string(),
    historyComplete: z.boolean(),
    version: z.number(),
    settings: z.object({ staleDays: z.number() }),
    tasks: z.array(reportTaskSchema),
    counts,
    startCounts: counts.nullable(),
    states: z.array(
      z.object({
        slug: z.string(),
        name: z.string(),
        isFinal: z.boolean(),
        count: z.number(),
        inflow: z.number(),
        outflow: z.number(),
        averageDays: z.number().nullable(),
        stalled: z.number(),
        startCount: z.number().nullable(),
      }),
    ),
    weekly: z.array(
      z.object({
        start: z.string(),
        end: z.string(),
        available: z.boolean(),
        partial: z.boolean(),
        created: z.number().nullable(),
        pirun: z.number().nullable(),
        prod: z.number().nullable(),
        launched: z.number().nullable(),
        unlaunched: z.number().nullable(),
        overdue: z.number().nullable(),
        createdTasks: z.array(reportTaskSchema),
        composition: z.record(z.string(), z.record(z.string(), z.number())),
      }),
    ),
    categories: z.record(z.string(), z.record(z.string(), z.number())),
    nodes: z.array(
      z.object({ id: z.string(), label: z.string(), count: z.number() }),
    ),
  })
  .openapi("DashboardReport");
export const snapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  createdBy: z.string().nullable(),
  data: reportSchema,
});
