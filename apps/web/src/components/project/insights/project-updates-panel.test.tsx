import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import type { ProjectWithTasks } from "@/types/project";
import { ProjectUpdatesPanel } from "./project-updates-panel";
import { InsightsViewProvider } from "./insights-view-provider";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));
vi.mock("./today-changes-panel", () => ({
  TodayChangesPanel: ({ projectId }: { projectId: string }) => (
    <p>Changes for {projectId}</p>
  ),
}));
vi.mock("./task-insights-panel", () => ({
  TaskInsightsPanel: () => <p>Task statistics</p>,
}));
afterEach(cleanup);

it("starts on today's changes and switches to the existing statistics", () => {
  render(
    <ProjectUpdatesPanel
      project={{ id: "requirement-1" } as ProjectWithTasks}
    />,
  );
  expect(screen.getByText("Changes for requirement-1")).toBeVisible();
  fireEvent.click(
    screen.getByRole("tab", { name: "tasks:insights.statsTitle" }),
  );
  expect(screen.getByText("Task statistics")).toBeVisible();
  fireEvent.click(screen.getByRole("tab", { name: "todayChanges:title" }));
  expect(screen.getByText("Changes for requirement-1")).toBeVisible();
});

it("keeps the selected overview tab when task views change and resets for another project", () => {
  const contents = (scope: string, view: string) => (
    <InsightsViewProvider key={scope}>
      <ProjectUpdatesPanel
        key={view}
        project={{ id: scope } as ProjectWithTasks}
      />
    </InsightsViewProvider>
  );
  const page = render(contents("project-1", "hierarchy"));
  fireEvent.click(
    screen.getByRole("tab", { name: "tasks:insights.statsTitle" }),
  );
  page.rerender(contents("project-1", "backlog"));
  expect(
    screen.getByRole("tab", { name: "tasks:insights.statsTitle" }),
  ).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("Task statistics")).toBeVisible();
  page.rerender(contents("project-2", "gantt"));
  expect(screen.getByText("Changes for project-2")).toBeVisible();
});
