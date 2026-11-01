import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { ProjectWithTasks } from "@/types/project";
import { reportTask } from "@/components/reporting/report-fixture.test-helper";
import { RequirementList } from "./requirement-list";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
afterEach(cleanup);
const tasks = [
  reportTask(),
  reportTask({
    id: "req-2",
    number: 2,
    title: "另一条需求",
    status: "uat",
    statusName: "UAT",
  }),
].map((task) => ({
  ...task,
  position: 0,
  assigneeId: task.userId,
  projectKind: "requirement" as const,
}));
const project: ProjectWithTasks = {
  id: "collection",
  name: "Collection",
  slug: "REQ",
  workspaceId: "workspace",
  icon: null,
  description: null,
  isPublic: false,
  archivedTasks: [],
  plannedTasks: [],
  columns: [
    {
      id: "dev",
      slug: "dev",
      name: "Dev",
      icon: null,
      isFinal: false,
      tasks: [tasks[0]!],
    },
    {
      id: "uat",
      slug: "uat",
      name: "UAT",
      icon: null,
      isFinal: false,
      tasks: [tasks[1]!],
    },
  ],
};
describe("requirement table", () => {
  it("shows reference, description and editor fields without project progress or subtasks", () => {
    const open = vi.fn();
    render(<RequirementList project={project} onOpenTask={open} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(16);
    expect(screen.getByText("reporting:columns.updater")).toBeInTheDocument();
    expect(screen.queryByText("进度")).not.toBeInTheDocument();
    expect(
      screen.getByText("Dev").closest("td")?.style.backgroundColor,
    ).not.toBe(screen.getByText("UAT").closest("td")?.style.backgroundColor);
    fireEvent.click(screen.getByRole("button", { name: "测试需求" }));
    expect(open).toHaveBeenCalledWith("req-1");
  });
});
