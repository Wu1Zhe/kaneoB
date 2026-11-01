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
import { OverdueTasksPanel } from "@/components/project/insights/overdue-tasks-panel";
import { PeopleInsightsPanel } from "@/components/project/insights/people-insights-panel";
import type { InsightProject } from "@/components/project/insights/insights-data";
import type Task from "@/types/task";

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

it("opens personal overdue and per-person tasks in their actual project", async () => {
  const task = {
    id: "late",
    title: "My late requirement",
    projectId: "requirement",
    userId: "me",
    assigneeId: "me",
    assigneeName: "Me",
    status: "to-do",
    dueDate: new Date(Date.now() - 60_000).toISOString(),
  } as Task;
  const model: InsightProject = {
    id: "personal",
    columns: [{ slug: "to-do", name: "To Do", isFinal: false, tasks: [task] }],
  };
  const root = createRootRoute({ component: Outlet });
  const home = createRoute({
    getParentRoute: () => root,
    path: "/my",
    component: () => (
      <>
        <OverdueTasksPanel project={model} workspaceId="workspace" />
        <PeopleInsightsPanel project={model} workspaceId="workspace" />
      </>
    ),
  });
  const details = createRoute({
    getParentRoute: () => root,
    path: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
    component: () => <p>Task details</p>,
  });
  const router = createRouter({
    routeTree: root.addChildren([home, details]),
    history: createMemoryHistory({ initialEntries: ["/my"] }),
  });
  render(<RouterProvider router={router} />);
  expect(
    (await screen.findByRole("link", { name: task.title })).getAttribute(
      "href",
    ),
  ).toBe("/dashboard/workspace/workspace/project/requirement/task/late");
  fireEvent.click(screen.getByRole("button", { name: task.title }));
  await waitFor(() =>
    expect(router.state.location.pathname).toBe(
      "/dashboard/workspace/workspace/project/requirement/task/late",
    ),
  );
});
