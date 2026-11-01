import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { NavProjects } from "./nav-projects";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));
vi.mock("@/hooks/queries/workspace/use-active-workspace", () => ({
  default: () => ({ data: { id: "workspace" } }),
}));
vi.mock("@/hooks/queries/project/use-get-projects", () => ({
  default: () => ({
    data: [
      {
        id: "old",
        name: "Existing project",
        statistics: { completionPercentage: 0 },
      },
      {
        id: "new",
        name: "Only requirement",
        kind: "requirement",
        statistics: { completionPercentage: 0 },
      },
    ],
  }),
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({
    canCreateProjects: () => true,
    canUpdateProjects: () => true,
    canDeleteProjects: () => true,
  }),
}));
vi.mock("@/hooks/mutations/project/use-delete-project", () => ({
  default: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/mutations/project/use-reorder-projects", () => ({
  default: () => vi.fn(),
}));
vi.mock("./shared/modals/create-project-modal", () => ({
  default: ({ open, kind }: { open: boolean; kind: string }) =>
    open ? <div role="dialog" aria-label={kind} /> : null,
}));
vi.mock("@/components/ui/sidebar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/ui/sidebar")>()),
  useSidebar: () => ({ isMobile: false }),
  SidebarMenuButton: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));
afterEach(cleanup);

it("keeps existing projects in the project group and requirements in their own group", () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NavProjects kind="requirement" />
    </QueryClientProvider>,
  );
  expect(
    screen.getByRole("button", { name: "Only requirement" }),
  ).toBeVisible();
  expect(screen.queryByRole("button", { name: "Existing project" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "requirements:add" }));
  expect(
    screen.getByRole("dialog", { name: "requirement" }),
  ).toBeInTheDocument();
});

it("treats cached projects without a category as projects", () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NavProjects />
    </QueryClientProvider>,
  );
  expect(
    screen.getByRole("button", { name: "Existing project" }),
  ).toBeVisible();
  expect(screen.queryByRole("button", { name: "Only requirement" })).toBeNull();
});
