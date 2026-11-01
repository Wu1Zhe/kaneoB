import type {
  DashboardReport,
  DashboardTask,
} from "@/fetchers/reporting/get-report";
export function reportTask(
  overrides: Partial<DashboardTask> = {},
): DashboardTask {
  return {
    id: "req-1",
    projectId: "collection",
    number: 1,
    title: "测试需求",
    description: "Example description",
    status: "dev",
    statusName: "Dev",
    isFinal: false,
    priority: "medium",
    progress: 20,
    weight: 1,
    userId: "person",
    assigneeName: "Example Person",
    creatorName: "Example Creator",
    updaterName: "Example Editor",
    createdAt: "2026-11-01T01:00:00Z",
    updatedAt: "2026-11-01T02:00:00Z",
    startDate: null,
    dueDate: null,
    actualStartAt: null,
    actualEndAt: null,
    requirementData: {
      reference: "REQ-1",
      type: "User",
      category: "Automation",
    },
    enteredAt: null,
    risk: "normal",
    riskDays: 0,
    overdueStages: [],
    stalledDays: null,
    ...overrides,
  };
}
export function reportFixture(tasks = [reportTask()]): DashboardReport {
  return {
    project: {
      id: "collection",
      name: "测试需求集",
      slug: "REQ",
      kind: "requirement",
    },
    since: "2026-10-26T00:00:00Z",
    until: "2026-11-01T12:00:00Z",
    asOf: "2026-11-01T12:00:00Z",
    coverageStart: "2026-10-26T00:00:00Z",
    historyComplete: true,
    version: 1,
    settings: { staleDays: 3 },
    tasks,
    counts: { total: tasks.length, launched: 0, overdue: 0 },
    startCounts: { total: 0, launched: 0, overdue: 0 },
    states: [
      {
        slug: "dev",
        name: "Dev",
        isFinal: false,
        count: tasks.length,
        inflow: 1,
        outflow: 0,
        averageDays: null,
        stalled: 0,
        startCount: 0,
      },
    ],
    weekly: [],
    categories: { Automation: { dev: tasks.length } },
    nodes: [{ id: "dev", label: "Dev", count: 0 }],
  };
}
