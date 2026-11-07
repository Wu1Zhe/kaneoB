import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { TaskTableLayout } from "./task-table-layout";
import { ColumnResizeHandle } from "./column-resize-handle";
import { TreeControls } from "./tree-controls";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: "width-test-user" } } }),
  },
}));
function View({ projectId }: { projectId: string }) {
  return (
    <TaskTableLayout projectId={projectId} view="hierarchy">
      <div data-testid="column" style={{ width: 100, position: "relative" }}>
        <ColumnResizeHandle id="assignee" defaultWidth={100} />
      </div>
      <TreeControls onExpand={() => {}} onCollapse={() => {}} />
    </TaskTableLayout>
  );
}
describe("task column resizing", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 100,
      height: 30,
      x: 0,
      y: 0,
      top: 0,
      bottom: 30,
      left: 0,
      right: 100,
      toJSON: () => ({}),
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  it("supports keyboard resizing, persists it, isolates projects and resets to defaults", () => {
    const view = render(<View projectId="first" />);
    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });
    expect(
      JSON.parse(
        localStorage.getItem("kaneo:columns:width-test-user:first:hierarchy")!,
      ),
    ).toEqual({ assignee: 110 });
    expect(screen.getByRole("separator").getAttribute("aria-valuenow")).toBe(
      "110",
    );
    view.rerender(<View projectId="second" />);
    expect(screen.getByRole("separator").getAttribute("aria-valuenow")).toBe(
      "100",
    );
    view.rerender(<View projectId="first" />);
    expect(screen.getByRole("separator").getAttribute("aria-valuenow")).toBe(
      "110",
    );
    fireEvent.click(screen.getByText("tasks:table.resetWidths"));
    expect(
      JSON.parse(
        localStorage.getItem("kaneo:columns:width-test-user:first:hierarchy")!,
      ),
    ).toEqual({});
  });
});
