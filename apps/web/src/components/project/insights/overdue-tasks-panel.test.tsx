import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";
import { OverdueTasksPanel } from "./overdue-tasks-panel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));
vi.mock("@/hooks/mutations/notification/use-nudge-task", () => ({
  useNudgeTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/components/task/task-due-date-popover", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(cleanup);

it("opens an overdue task while keeping the project's existing search state", async () => {
  const task: Task = {
    id: "late-task",
    title: "Late task",
    number: 1,
    description: null,
    status: "to-do",
    priority: "low",
    startDate: null,
    dueDate: new Date(Date.now() - 60_000).toISOString(),
    position: 0,
    createdAt: new Date().toISOString(),
    userId: null,
    assigneeId: null,
    assigneeName: null,
    projectId: "project-1",
  };
  const project = {
    columns: [{ slug: "to-do", name: "To Do", isFinal: false, tasks: [task] }],
  } as ProjectWithTasks;
  const root = createRootRoute({ component: Outlet });
  const route = createRoute({
    getParentRoute: () => root,
    path: "/project",
    validateSearch: (search: Record<string, unknown>) => search,
    component: () => <OverdueTasksPanel project={project} />,
  });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({
      initialEntries: ["/project?filter=urgent"],
    }),
  });
  render(<RouterProvider router={router} />);
  const link = await screen.findByRole("link", { name: "Late task" });
  expect(link.getAttribute("href")).toContain("taskId=late-task");
  fireEvent.click(link);
  await waitFor(() =>
    expect(router.state.location.search).toEqual({
      filter: "urgent",
      taskId: "late-task",
    }),
  );
});
