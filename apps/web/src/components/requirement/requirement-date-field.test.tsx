import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import type Task from "@/types/task";
import { RequirementDateField } from "./requirement-date-field";

const { save } = vi.hoisted(() => ({ save: vi.fn().mockResolvedValue({}) }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));
vi.mock("@/hooks/mutations/task/use-update-requirement-field", () => ({
  useUpdateRequirementField: () => ({ mutateAsync: save, isPending: false }),
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({ canUpdateTasks: () => true }),
}));
const task: Task = {
  id: "req",
  title: "Requirement",
  number: 1,
  description: null,
  priority: "medium",
  startDate: null,
  dueDate: null,
  position: 0,
  createdAt: "2026-11-01T00:00:00Z",
  userId: null,
  assigneeId: null,
  assigneeName: null,
  projectId: "requirements",
  status: "todo",
  projectKind: "requirement",
  requirementData: {
    devPlannedAt: new Date(2026, 10, 1, 14, 30).toISOString(),
    devActualAt: new Date(2026, 10, 1, 14, 17).toISOString(),
  },
};
afterEach(cleanup);
beforeEach(() => save.mockClear());

describe("requirement node time editor", () => {
  it("offers 48 half-hour planned times and only saves after confirmation", async () => {
    render(
      <RequirementDateField
        task={task}
        field="devPlannedAt"
        label="Dev planned"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dev planned" }));
    const time = await screen.findByRole("combobox", {
      name: "tasks:requirement.time",
    });
    expect(within(time).getAllByRole("option")).toHaveLength(48);
    fireEvent.change(time, { target: { value: "15:30" } });
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "tasks:requirement.save" }),
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        taskId: "req",
        field: "devPlannedAt",
        value: new Date(2026, 10, 1, 15, 30).toISOString(),
      }),
    );
  });
  it("preserves arbitrary actual minutes and supports clearing", async () => {
    render(
      <RequirementDateField
        task={task}
        field="devActualAt"
        label="Dev actual"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dev actual" }));
    const time = await screen.findByLabelText("tasks:requirement.time");
    expect(time).toHaveValue("14:17");
    fireEvent.change(time, { target: { value: "15:23" } });
    fireEvent.click(
      screen.getByRole("button", { name: "tasks:requirement.save" }),
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        taskId: "req",
        field: "devActualAt",
        value: new Date(2026, 10, 1, 15, 23).toISOString(),
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByLabelText("tasks:requirement.time"),
      ).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Dev actual" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "tasks:requirement.clear" }),
    );
    await waitFor(() =>
      expect(save).toHaveBeenLastCalledWith({
        taskId: "req",
        field: "devActualAt",
        value: null,
      }),
    );
  });
});
