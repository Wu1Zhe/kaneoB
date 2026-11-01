import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { HttpError } from "@/lib/http-error";
import ProjectLayout from "./project-layout";
import type { ProjectRoute } from "@/components/project/views/project-views";

const project = vi.hoisted(() => ({
  canCreate: true,
  overview: { id: "project-1", name: "Full project overview" },
  current: { data: undefined, error: null } as {
    data: { name: string } | undefined;
    error: unknown;
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/board" }),
  useRouter: () => ({
    buildLocation: ({ to }: { to: string }) => ({ href: to }),
  }),
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/components/project/views/use-project-view-shortcuts", () => ({
  useProjectViewShortcuts: () => undefined,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/queries/project/use-get-project", () => ({
  default: () => project.current,
}));
vi.mock("@/hooks/use-project-websocket", () => ({
  useProjectWebSocket: () => undefined,
}));
vi.mock("@/hooks/queries/task/use-get-tasks", () => ({
  useGetTasks: () => ({ data: project.overview }),
}));
vi.mock("@/components/project/insights", () => ({
  ProjectInsightsBar: ({
    project: overview,
  }: {
    project: { id: string; name: string };
  }) => (
    <aside aria-label="Project overview" data-project-id={overview.id}>
      {overview.name}
    </aside>
  ),
}));
vi.mock("@/components/common/layout", () => {
  const Layout = ({ children }: { children: ReactNode }) => <>{children}</>;
  Layout.Header = ({ children }: { children: ReactNode }) => <>{children}</>;
  Layout.Content = ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  );
  return { default: Layout };
});
vi.mock("@/components/ui/sidebar", () => ({ SidebarTrigger: () => null }));
vi.mock("@/components/common/header/mobile-project-nav", () => ({
  default: () => null,
}));
vi.mock("@/components/common/header/project-crumb-select", () => ({
  default: () => null,
}));
vi.mock("@/components/common/header/workspace-crumb-select", () => ({
  default: () => null,
}));
vi.mock("@/components/shared/modals/create-project-modal", () => ({
  default: () => null,
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({ canCreateTasks: () => project.canCreate }),
}));
vi.mock("@/components/shared/modals/create-task-modal", () => ({
  default: ({
    open,
    projectId,
    status,
  }: {
    open: boolean;
    projectId: string;
    status?: string;
  }) =>
    open ? (
      <div
        role="dialog"
        aria-label="Create task"
        data-project-id={projectId}
        data-status={status}
      />
    ) : null,
}));
vi.mock("@/components/page-title", () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  project.canCreate = true;
});

function renderLayout(activeView: ProjectRoute = "board") {
  render(
    <ProjectLayout
      projectId="project-1"
      workspaceId="workspace-1"
      activeView={activeView}
      toolbar={<button type="button">Toolbar action</button>}
      summary={<span>5 tasks</span>}
    >
      <p>Board content</p>
    </ProjectLayout>,
  );
}

describe("ProjectLayout access states", () => {
  it.each([
    "board",
    "backlog",
    "calendar",
    "gantt",
    "hierarchy",
    "insights",
    "ideas",
  ] as const)(
    "shows the full-project overview above the %s toolbar",
    (view) => {
      project.current = { data: { name: "Alpha" }, error: null };
      renderLayout(view);
      const overview = screen.getByRole("complementary", {
        name: "Project overview",
      });
      expect(overview).toHaveTextContent("Full project overview");
      expect(overview).toHaveAttribute("data-project-id", "project-1");
      expect(
        overview.compareDocumentPosition(
          screen.getByRole("button", { name: "Toolbar action" }),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    },
  );
  it("opens task creation for the current project from the right-hand toolbar", () => {
    project.current = { data: { name: "Alpha" }, error: null };
    renderLayout();
    const create = screen.getByRole("button", {
      name: "common:modals.createTask.title",
    });
    expect(
      screen
        .getByRole("button", { name: "Toolbar action" })
        .compareDocumentPosition(create) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.click(create);
    expect(screen.getByRole("dialog", { name: "Create task" })).toHaveAttribute(
      "data-project-id",
      "project-1",
    );
  });

  it("creates planned tasks when the current view is the backlog", () => {
    project.current = { data: { name: "Alpha" }, error: null };
    renderLayout("backlog");
    fireEvent.click(
      screen.getByRole("button", { name: "common:modals.createTask.title" }),
    );
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-status",
      "planned",
    );
  });

  it("hides creation without task creation permission", () => {
    project.current = { data: { name: "Alpha" }, error: null };
    project.canCreate = false;
    renderLayout();
    expect(
      screen.queryByRole("button", { name: "common:modals.createTask.title" }),
    ).toBeNull();
  });
  it("replaces the board with a no-access state on 403", () => {
    project.current = { data: undefined, error: new HttpError(403, "denied") };
    renderLayout();

    expect(
      screen.getByRole("heading", {
        name: "workspace:projects.unavailable.noAccessTitle",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "workspace:projects.unavailable.backToWorkspace",
      }),
    ).toBeVisible();
    expect(screen.queryByText("Board content")).toBeNull();
    expect(screen.queryByText("Toolbar action")).toBeNull();
    expect(
      screen.queryByRole("complementary", { name: "Project overview" }),
    ).toBeNull();
  });

  it("shows a not-found state on 404", () => {
    project.current = { data: undefined, error: new HttpError(404, "gone") };
    renderLayout();

    expect(
      screen.getByRole("heading", {
        name: "workspace:projects.unavailable.notFoundTitle",
      }),
    ).toBeVisible();
  });

  it("renders the project when it loads", () => {
    project.current = { data: { name: "Alpha" }, error: null };
    renderLayout();

    expect(screen.getByText("Board content")).toBeVisible();
    expect(screen.getByText("Toolbar action")).toBeVisible();
    expect(screen.getByText("5 tasks")).toBeVisible();
  });

  it("marks tasks as current and links the backlog", () => {
    project.current = { data: { name: "Alpha" }, error: null };
    renderLayout();

    expect(
      screen
        .getByRole("link", { name: "tasks:title" })
        .getAttribute("aria-current"),
    ).toBe("page");
    const backlog = screen.getByRole("link", { name: "tasks:view.backlog" });
    expect(backlog.getAttribute("aria-current")).toBeNull();
    expect(backlog.getAttribute("href")).toBe(
      "/dashboard/workspace/$workspaceId/project/$projectId/backlog",
    );
  });
});
