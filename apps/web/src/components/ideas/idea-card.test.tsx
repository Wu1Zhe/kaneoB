import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { ReactNode } from "react";
import type { IdeaPreview } from "@/fetchers/ideas";
import { IdeaCard } from "./idea-card";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
  }: {
    children: ReactNode;
    params: Record<string, string>;
  }) => <a href={`/task/${params.taskId}`}>{children}</a>,
}));
const idea: IdeaPreview = {
  id: "idea",
  projectId: "project",
  title: "Improve handover",
  excerpt: "A useful workflow improvement",
  status: "inbox",
  tags: ["Workflow"],
  pinned: false,
  version: 1,
  creatorName: "Example User",
  updatedByName: "Example User",
  createdBy: "user",
  updatedBy: "user",
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
  convertedAt: null,
  convertedTaskId: null,
};
afterEach(cleanup);
describe("idea cards", () => {
  it("opens details, pins and adopts via separate actions", () => {
    const onOpen = vi.fn();
    const onPin = vi.fn();
    const onConvert = vi.fn();
    render(
      <IdeaCard
        idea={idea}
        workspaceId="workspace"
        canEdit
        canConvert
        pinning={false}
        onOpen={onOpen}
        onPin={onPin}
        onConvert={onConvert}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Improve handover/ }));
    fireEvent.click(screen.getByRole("button", { name: "ideas:pin" }));
    fireEvent.click(screen.getByRole("button", { name: "ideas:adopt" }));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onPin).toHaveBeenCalledOnce();
    expect(onConvert).toHaveBeenCalledOnce();
  });
  it("replaces adoption with the existing task link after conversion", () => {
    render(
      <IdeaCard
        idea={{
          ...idea,
          status: "adopted",
          convertedAt: "2026-11-01T01:00:00Z",
          convertedTaskId: "linked-task",
        }}
        workspaceId="workspace"
        canEdit
        canConvert
        pinning={false}
        onOpen={vi.fn()}
        onPin={vi.fn()}
        onConvert={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "ideas:adopt" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "ideas:viewTask" }),
    ).toHaveAttribute("href", "/task/linked-task");
  });
  it("does not offer write actions to a read-only viewer", () => {
    render(
      <IdeaCard
        idea={idea}
        workspaceId="workspace"
        canEdit={false}
        canConvert={false}
        pinning={false}
        onOpen={vi.fn()}
        onPin={vi.fn()}
        onConvert={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "ideas:pin" })).toBeNull();
    expect(screen.queryByRole("button", { name: "ideas:adopt" })).toBeNull();
    expect(
      screen.getByRole("button", { name: /Improve handover/ }),
    ).toBeEnabled();
  });
});
